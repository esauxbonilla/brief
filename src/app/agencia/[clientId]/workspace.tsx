"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ClientApp } from "@/components/client/ClientApp";
import { NewPieceButton } from "@/components/client/ui";
import { dayKey } from "@/lib/dates";
import type { Agency, Channel, Client, PieceFull } from "@/lib/types";
import { PieceEditor } from "../pieza/editor";
import * as A from "../actions";
import { Btn, ClientBoard, Popover, useAct } from "../ui";

type View = "calendario" | "lista";

/**
 * One client in the agency panel: the client's own calendar (same look), but
 * editable — "+" creates, cards drag between days, the side panel edits.
 * The grouped list stays as a secondary view.
 */
export function ClientWorkspace({ client, agency, pieces, serverNow }: {
  client: Client;
  agency: Agency;
  pieces: PieceFull[];
  serverNow: string;
}) {
  const [view, setView] = useState<View>("calendario");
  // A new piece opens in the calendar's side panel: remount it with that selection.
  const [opened, setOpened] = useState<{ id: string | null; n: number }>({ id: null, n: 0 });
  const { pending, run } = useAct();
  const create = (channel: Channel) =>
    run(async () => {
      const id = await A.quickCreate(client.id, dayKey(new Date(), client.tz), channel);
      setOpened((o) => ({ id, n: o.n + 1 }));
      setView("calendario");
    });
  const panel = useCallback((p: PieceFull) => <PieceEditor piece={p} tz={client.tz} now={serverNow} />, [client.tz, serverNow]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 md:px-7 md:pt-5">
        <div className="flex items-center gap-2">
          <div className="flex rounded-[10px] bg-surface-2 p-1">
            {(["calendario", "lista"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="h-8 cursor-pointer rounded-lg border-none px-3 text-[13px] font-medium capitalize md:px-4"
                style={{ background: view === v ? "#2A2C31" : "transparent", color: view === v ? "#F3F4F6" : "#8A8D93" }}
              >
                {v}
              </button>
            ))}
          </div>
          <NewPieceButton
            onPick={create}
            disabled={pending}
            label="Nueva pieza"
            className="flex h-10 cursor-pointer items-center rounded-[10px] border-none bg-amber px-3 text-sm font-semibold whitespace-nowrap text-amber-ink hover:bg-amber-hover disabled:opacity-60 md:px-4"
          >
            {pending ? "Creando…" : "+ Nueva"}
          </NewPieceButton>
        </div>
        <Popover
          label="Más opciones"
          trigger={
            <span className="relative flex size-10 items-center justify-center rounded-[10px] bg-surface-2 text-lg text-text-2c hover:text-white">
              ⋯
              {!client.drive_url && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-amber" />}
            </span>
          }
        >
          {(close) => (
            <div className="flex w-[min(320px,calc(100vw-32px))] flex-col gap-3 p-1">
              <DriveField client={client} onSaved={close} />
              <Link href={`/calendario/${client.id}`} className="text-[13px] no-underline">Ver como lo ve {client.name.split(" ")[0]} →</Link>
            </div>
          )}
        </Popover>
      </div>

      {view === "lista" ? (
        <div className="mx-auto w-full max-w-[1100px] px-7 py-6">
          <ClientBoard pieces={pieces} tz={client.tz} serverNow={serverNow} />
        </div>
      ) : (
        <ClientApp
          key={opened.n}
          initialSelected={opened.id}
          client={client}
          agency={agency}
          initialPieces={pieces.filter((p) => p.status !== "cancelado")}
          serverNow={serverNow}
          base={`/calendario/${client.id}`}
          readOnly
          agencyPanel={panel}
        />
      )}
    </div>
  );
}

/** Where the client uploads the videos: their "Subir a Drive" button opens this link. */
function DriveField({ client, onSaved }: { client: Client; onSaved: () => void }) {
  const [url, setUrl] = useState(client.drive_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const save = () =>
    start(async () => {
      const r = await A.setClientDrive(client.id, url);
      setError(r.error ?? null);
      if (!r.error) {
        router.refresh();
        onSaved();
      }
    });
  return (
    <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <span className="text-[13px] text-text-3">Drive del cliente (donde sube los videos)</span>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega el link de la carpeta"
          className="h-9 min-w-0 flex-1 rounded-lg border bg-surface px-2.5 text-[13px] text-text outline-none placeholder:text-text-4 focus:border-amber"
          style={{ borderColor: "rgba(255,255,255,0.14)" }}
        />
        <Btn type="submit" kind="primary" disabled={pending}>{pending ? "…" : "Guardar"}</Btn>
      </div>
      {error && <span className="text-xs leading-[1.4] text-red">{error}</span>}
    </form>
  );
}
