"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import * as agencyActions from "@/app/agencia/actions";
import * as actions from "@/app/actions";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { addDays, dayIndex, dayKey, DEADLINE_TIME, zonedTime, type DayKey } from "@/lib/dates";
import type { Agency, Channel, Client, PieceFull, Status } from "@/lib/types";

export type UploadState = { state: "uploading" } | { state: "done"; at: string } | { state: "error"; retry: () => void };

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

/** Agency panel: same calendar, but pieces can be created, dragged and edited. */
export interface AgencyEdit {
  create: (day: DayKey) => void;
  move: (id: string, day: DayKey) => void;
  panel: (p: PieceFull) => ReactNode;
  busy: boolean;
}

interface Ctx {
  client: Client;
  agency: Agency;
  tz: string;
  now: Date;
  pieces: PieceFull[];
  /** Where this calendar lives: "" for the client, "/calendario/<id>" for the agency preview. */
  base: string;
  /** Agency preview: everything is visible but nothing can be changed. */
  readOnly: boolean;
  /** Tells the agency that the preview can't change anything. */
  blocked: () => void;
  edit: AgencyEdit | null;
  byId: (id: string) => PieceFull | undefined;
  filter: Channel | "all";
  setFilter: (f: Channel | "all") => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  markRecorded: (id: string) => void;
  toggleShot: (pieceId: string, shotId: string) => void;
  toggleBlock: (pieceId: string, blockId: string) => void;
  uploadReference: (pieceId: string, refId: string, file: File) => void;
  uploads: Record<string, UploadState>;
  toast: Toast | null;
  showToast: (text: string, undo?: () => void) => void;
  dismissToast: () => void;
}

const C = createContext<Ctx | null>(null);

export function useApp() {
  const v = useContext(C);
  if (!v) throw new Error("useApp fuera de ClientState");
  return v;
}

async function putFile(pieceId: string, file: File): Promise<string> {
  const prep = await actions.prepareUpload(pieceId, file.name);
  if (prep.demo) {
    await new Promise((r) => setTimeout(r, 900));
    return prep.path;
  }
  const { error } = await supabaseBrowser().storage.from("material").uploadToSignedUrl(prep.path, prep.token, file);
  if (error) throw error;
  return prep.path;
}

export function ClientState({
  client, agency, initialPieces, serverNow, initialSelected, base = "", readOnly = false, agencyPanel, children,
}: {
  client: Client;
  agency: Agency;
  initialPieces: PieceFull[];
  serverNow: string;
  initialSelected?: string | null;
  base?: string;
  readOnly?: boolean;
  /** Turns on agency editing; renders the editor for the open piece. */
  agencyPanel?: (p: PieceFull) => ReactNode;
  children: ReactNode;
}) {
  const [pieces, setPieces] = useState(initialPieces);
  const [now, setNow] = useState(() => new Date(serverNow));
  const [filter, setFilter] = useState<Channel | "all">("all");
  const [selectedId, select] = useState<string | null>(initialSelected ?? null);
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Server data wins whenever it changes (after revalidation).
  const [serverPieces, setServerPieces] = useState(initialPieces);
  if (serverPieces !== initialPieces) {
    setServerPieces(initialPieces);
    setPieces(initialPieces);
  }
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const patch = useCallback((id: string, fn: (p: PieceFull) => PieceFull) => {
    setPieces((list) => list.map((p) => (p.id === id ? fn(p) : p)));
  }, []);

  const byId = useCallback((id: string) => pieces.find((p) => p.id === id), [pieces]);

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((text: string, undo?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fail = useCallback((e: unknown) => {
    console.error(e);
    showToast("No se pudo guardar. Revisa tu conexión.");
  }, [showToast]);

  const blocked = useCallback(() => {
    showToast("Vista previa: solo el cliente puede hacer cambios.");
  }, [showToast]);

  const markRecorded = useCallback((id: string) => {
    if (readOnly) return blocked();
    const p = pieces.find((x) => x.id === id);
    if (!p) return;
    const prev: Status = p.status;
    patch(id, (x) => ({ ...x, status: "grabado" }));
    actions.setRecorded(id, true).catch((e) => {
      patch(id, (x) => ({ ...x, status: prev }));
      fail(e);
    });
    showToast(`«${p.title}» marcado como grabado`, () => {
      patch(id, (x) => ({ ...x, status: prev }));
      actions.setRecorded(id, false).catch(fail);
    });
  }, [readOnly, blocked, pieces, patch, showToast, fail]);

  const toggleShot = useCallback((pieceId: string, shotId: string) => {
    if (readOnly) return blocked();
    const value = !pieces.find((p) => p.id === pieceId)?.shots.find((s) => s.id === shotId)?.done;
    patch(pieceId, (p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? { ...s, done: value } : s)) }));
    actions.toggleShot(shotId, value).catch(fail);
  }, [readOnly, blocked, pieces, patch, fail]);

  const toggleBlock = useCallback((pieceId: string, blockId: string) => {
    if (readOnly) return blocked();
    const value = !pieces.find((p) => p.id === pieceId)?.blocks.find((b) => b.id === blockId)?.recorded;
    patch(pieceId, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, recorded: value } : b)) }));
    actions.toggleBlock(blockId, value).catch(fail);
  }, [readOnly, blocked, pieces, patch, fail]);

  const uploadReference = useCallback((pieceId: string, refId: string, file: File) => {
    if (readOnly) return blocked();
    const key = `ref:${refId}`;
    const run = async () => {
      setUploads((u) => ({ ...u, [key]: { state: "uploading" } }));
      try {
        const path = await putFile(pieceId, file);
        await actions.confirmReferenceUpload(refId, path);
        const preview = URL.createObjectURL(file);
        patch(pieceId, (p) => ({ ...p, references: p.references.map((r) => (r.id === refId ? { ...r, uploaded_url: preview } : r)) }));
        setUploads((u) => ({ ...u, [key]: { state: "done", at: new Date().toISOString() } }));
      } catch (e) {
        console.error(e);
        setUploads((u) => ({ ...u, [key]: { state: "error", retry: () => void run() } }));
      }
    };
    void run();
  }, [readOnly, blocked, patch]);

  const [busy, startEdit] = useTransition();
  const edit = useMemo<AgencyEdit | null>(() => {
    if (!agencyPanel) return null;
    return {
      busy,
      panel: agencyPanel,
      create: (day) => startEdit(async () => {
        try {
          select(await agencyActions.quickCreate(client.id, day));
        } catch (e) {
          fail(e);
        }
      }),
      move: (id, day) => {
        const p = pieces.find((x) => x.id === id);
        if (!p) return;
        const delta = dayIndex(day) - dayIndex(dayKey(p.record_due_at, client.tz));
        if (!delta) return;
        const publish = zonedTime(addDays(dayKey(p.publish_at, client.tz), delta), "12:00", client.tz).toISOString();
        patch(id, (x) => ({ ...x, record_due_at: zonedTime(day, DEADLINE_TIME, client.tz).toISOString(), publish_at: publish }));
        startEdit(async () => {
          try {
            await agencyActions.movePiece(id, day);
          } catch (e) {
            patch(id, () => p);
            fail(e);
          }
        });
      },
    };
  }, [agencyPanel, busy, client.id, client.tz, pieces, patch, fail]);

  const value = useMemo<Ctx>(() => ({
    client, agency, tz: client.tz, now, pieces, base, readOnly, blocked, edit, byId, filter, setFilter, selectedId, select,
    markRecorded, toggleShot, toggleBlock, uploadReference, uploads, toast, showToast, dismissToast,
  }), [client, agency, now, pieces, base, readOnly, blocked, edit, byId, filter, selectedId, markRecorded, toggleShot, toggleBlock, uploadReference, uploads, toast, showToast, dismissToast]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
