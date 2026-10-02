"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repo } from "@/lib/data";
import { computeRecordDue, dayKey, shortLabel, zonedTime } from "@/lib/dates";
import { parseScript } from "@/lib/script-parse";
import { isDemo } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
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

export async function savePiece(_: SaveState, form: FormData): Promise<SaveState> {
  const id = text(form.get("id")) ?? undefined;
  const client_id = String(form.get("client_id"));
  const tz = await clientTz(client_id);
  if (id) await ownPiece(id);

  const title = String(form.get("title") ?? "").trim().replace(/\s+/g, " ");
  if (!title) return { error: "Falta el título." };
  if (title.split(" ").length > 5) return { error: "El título debe tener 5 palabras como máximo." };
  const publishDay = String(form.get("publish_date") ?? "");
  const dueDay = String(form.get("record_due_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDay) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDay)) return { error: "Revisa las fechas." };
  if (dueDay > publishDay) return { error: "La fecha de grabación no puede ser después de la de publicación." };
  const editDays = Math.max(0, Number(form.get("edit_days") ?? 0) | 0);

  const pieceId = await repo.savePiece({
    id,
    client_id,
    channel: String(form.get("channel")) as Channel,
    title,
    format: text(form.get("format")),
    objective: text(form.get("objective")),
    hook: text(form.get("hook")),
    notes: lines(form.get("notes")),
    shots: lines(form.get("shots")),
    publish_at: zonedTime(publishDay, "12:00", tz).toISOString(),
    record_due_at: zonedTime(dueDay, "20:00", tz).toISOString(),
    edit_days: editDays,
  });
  refresh(client_id);
  if (!id) redirect(`/agencia/pieza/${pieceId}`);
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
  const title = String(form.get("title") ?? "").trim();
  if (!title) throw new Error("Falta el título de la referencia");
  const requested = form.get("requested") === "on";
  let image_url = text(form.get("image_url"));
  const file = form.get("image");
  if (!requested && file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) throw new Error("La referencia debe ser una imagen");
    if (isDemo) {
      image_url = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
    } else {
      const sb = await supabaseServer();
      const path = `${p.client_id}/${p.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await sb.storage.from("referencias").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      image_url = sb.storage.from("referencias").getPublicUrl(path).data.publicUrl;
    }
  }
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
