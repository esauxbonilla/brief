"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repo } from "@/lib/data";
import { EDIT_DAYS, MAX_TITLE_WORDS } from "@/lib/constants";
import { addDays, computeRecordDue, DEADLINE_TIME, DEFAULT_BUFFER_DAYS, dayIndex, dayKey, hhmm, shortLabel, zonedTime } from "@/lib/dates";
import { parseScript } from "@/lib/script-parse";
import type { Channel, PieceFull } from "@/lib/types";

// Agency actions. RLS restricts writes to the agency's own clients; we also
// check here so errors are clear and the demo store behaves the same way.

async function agency() {
  const s = await repo.agencySession();
  if (!s) throw new Error("Solo la agencia puede hacer esto");
  return s;
}

async function ownPiece(id: string): Promise<PieceFull> {
  const s = await agency();
  const p = await repo.agencyPiece(id);
  if (!p || !s.clients.some((c) => c.id === p.client_id)) throw new Error("Pieza no encontrada");
  return p;
}

async function clientTz(clientId: string) {
  const s = await agency();
  const c = s.clients.find((x) => x.id === clientId);
  if (!c) throw new Error("Cliente no encontrado");
  return c.tz;
}

const refresh = (clientId?: string) => {
  revalidatePath("/agencia", "layout");
  revalidatePath("/", "layout");
  if (clientId) revalidatePath(`/agencia/${clientId}`);
};

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export type SaveState = { error?: string };

const UNTITLED = "Sin título";
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Every field is optional: missing ones get sensible defaults. */
export async function savePiece(_: SaveState, form: FormData): Promise<SaveState> {
  const id = text(form.get("id")) ?? undefined;
  const client_id = String(form.get("client_id"));
  const tz = await clientTz(client_id);
  if (id) await ownPiece(id);

  const title = String(form.get("title") ?? "").trim().replace(/\s+/g, " ") || UNTITLED;
  if (title.split(" ").length > MAX_TITLE_WORDS) return { error: `El título debe tener ${MAX_TITLE_WORDS} palabras como máximo.` };
  const channel = (String(form.get("channel") ?? "") || "reel") as Channel;
  const rawEdit = String(form.get("edit_days") ?? "");
  const editDays = rawEdit === "" ? EDIT_DAYS[channel] : Math.max(0, Number(rawEdit) | 0);
  const gap = editDays + DEFAULT_BUFFER_DAYS;
  let publishDay = String(form.get("publish_date") ?? "");
  let dueDay = String(form.get("record_due_date") ?? "");
  if (!isDay(publishDay) && !isDay(dueDay)) publishDay = addDays(dayKey(new Date(), tz), 10);
  if (!isDay(publishDay)) publishDay = addDays(dueDay, gap);
  if (!isDay(dueDay)) dueDay = addDays(publishDay, -gap);

  const pieceId = await repo.savePiece({
    id,
    client_id,
    channel,
    title,
    format: text(form.get("format")),
    objective: text(form.get("objective")),
    hook: text(form.get("hook")),
    notes: lines(form.get("notes")),
    shots: lines(form.get("shots")),
    publish_at: zonedTime(publishDay, "12:00", tz).toISOString(),
    record_due_at: zonedTime(dueDay, DEADLINE_TIME, tz).toISOString(),
    edit_days: editDays,
  });
  refresh(client_id);
  if (!id) redirect(`/agencia/pieza/${pieceId}`);
  return {};
}

/** One click on a calendar day: an empty draft of that type, to record that day. */
export async function quickCreate(clientId: string, recordDay: string, channel: Channel = "reel"): Promise<string> {
  const tz = await clientTz(clientId);
  if (!isDay(recordDay)) throw new Error("Fecha inválida");
  if (!(channel in EDIT_DAYS)) throw new Error("Tipo inválido");
  const editDays = EDIT_DAYS[channel];
  const id = await repo.savePiece({
    client_id: clientId,
    channel,
    title: UNTITLED,
    format: null,
    objective: null,
    hook: null,
    notes: [],
    shots: [],
    publish_at: zonedTime(addDays(recordDay, editDays + DEFAULT_BUFFER_DAYS), "12:00", tz).toISOString(),
    record_due_at: zonedTime(recordDay, DEADLINE_TIME, tz).toISOString(),
    edit_days: editDays,
  });
  refresh(clientId);
  return id;
}

/** Drag and drop: the recording day moves and the publish day moves with it. */
export async function movePiece(id: string, recordDay: string) {
  const p = await ownPiece(id);
  if (!isDay(recordDay)) throw new Error("Fecha inválida");
  const tz = await clientTz(p.client_id);
  const delta = dayIndex(recordDay) - dayIndex(dayKey(p.record_due_at, tz));
  if (!delta) return;
  const publishDay = addDays(dayKey(p.publish_at, tz), delta);
  await repo.reschedule(id, zonedTime(publishDay, hhmm(p.publish_at, tz), tz).toISOString(), zonedTime(recordDay, DEADLINE_TIME, tz).toISOString());
  refresh(p.client_id);
}

/** The client's Drive folder (any link); their "Subir a Drive" button opens it. */
export async function setClientDrive(clientId: string, url: string): Promise<{ error?: string }> {
  await clientTz(clientId);
  try {
    await repo.setClientDrive(clientId, url.trim() || null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/drive_url/.test(msg)) return { error: "Falta correr en Supabase: alter table clients add column drive_url text;" };
    return { error: `No se pudo guardar: ${msg}` };
  }
  refresh(clientId);
  return {};
}

export async function deletePiece(id: string) {
  const p = await ownPiece(id);
  await repo.deletePiece(id);
  refresh(p.client_id);
  redirect(`/agencia/${p.client_id}`);
}

/** Sends one or more briefs: they appear in the client's calendar and one grouped notice is queued. */
export async function sendBriefs(ids: string[]) {
  if (!ids.length) return;
  const pieces = await Promise.all(ids.map(ownPiece));
  await repo.sendBriefs(ids);
  const byClient = new Map<string, PieceFull[]>();
  for (const p of pieces) byClient.set(p.client_id, [...(byClient.get(p.client_id) ?? []), p]);
  const s = await agency();
  for (const [clientId, list] of byClient) {
    const tz = s.clients.find((c) => c.id === clientId)!.tz;
    const last = list.map((p) => p.record_due_at).sort().at(-1)!;
    const n = list.length;
    await repo.enqueueNotification({
      client_id: clientId,
      kind: "brief",
      piece_id: n === 1 ? list[0].id : null,
      message: `Nuevo brief: ${n} ${n === 1 ? "pieza" : "piezas"} para grabar antes del ${shortLabel(dayKey(last, tz))}`,
    });
  }
  refresh(pieces[0].client_id);
}

export async function approve(id: string) {
  const p = await ownPiece(id);
  await repo.setStatus(id, "edicion");
  refresh(p.client_id);
}

export async function requestRedo(id: string, reason: string) {
  const p = await ownPiece(id);
  const r = reason.trim();
  if (!r) throw new Error("El motivo es obligatorio");
  await repo.setStatus(id, "rehacer", r);
  await repo.enqueueNotification({ client_id: p.client_id, kind: "redo", piece_id: id, message: `Hay que repetir «${p.title}»: ${r}` });
  refresh(p.client_id);
}

export async function setStatus(id: string, status: "listo" | "publicado" | "edicion" | "grabado") {
  const p = await ownPiece(id);
  await repo.setStatus(id, status);
  refresh(p.client_id);
}

export async function markReceived(id: string) {
  const p = await ownPiece(id);
  await repo.markReceived(id);
  refresh(p.client_id);
}

export async function cancelPiece(id: string) {
  const p = await ownPiece(id);
  await repo.setStatus(id, "cancelado");
  refresh(p.client_id);
}

/** Moves publish_at and recalculates record_due_at (publish − edit_days − 1, 20:00). */
export async function reschedule(id: string, publishDay: string) {
  const p = await ownPiece(id);
  const tz = await clientTz(p.client_id);
  const publish = zonedTime(publishDay, "12:00", tz);
  await repo.reschedule(id, publish.toISOString(), computeRecordDue(publish, p.edit_days, tz).toISOString());
  refresh(p.client_id);
}

export async function saveScript(id: string, raw: string) {
  const p = await ownPiece(id);
  const blocks = parseScript(raw);
  if (!blocks.length) throw new Error("El guion está vacío.");
  await repo.setBlocks(id, blocks);
  refresh(p.client_id);
  return blocks.length;
}

export async function addReference(form: FormData) {
  const pieceId = String(form.get("piece_id"));
  const p = await ownPiece(pieceId);
  const title = String(form.get("title") ?? "").trim() || "Referencia";
  const requested = form.get("requested") === "on";
  // Images are uploaded from the browser (see References in pieza/editor.tsx).
  const image_url = text(form.get("image_url"));
  await repo.addReference({
    piece_id: pieceId,
    block_id: text(form.get("block_id")),
    image_url: requested ? null : image_url,
    title,
    note: text(form.get("note")),
    requested_from_client: requested,
  });
  refresh(p.client_id);
}

export async function deleteReference(pieceId: string, refId: string) {
  const p = await ownPiece(pieceId);
  if (!p.references.some((r) => r.id === refId)) throw new Error("Referencia no encontrada");
  await repo.deleteReference(refId);
  refresh(p.client_id);
}

/** Signed/public URL to open an uploaded file from the panel. */
export async function fileLink(pieceId: string, path: string) {
  const p = await ownPiece(pieceId);
  if (!p.uploads.some((u) => u.file_url === path) && !p.references.some((r) => r.uploaded_url === path)) throw new Error("Archivo no encontrado");
  return repo.fileUrl(path);
}
