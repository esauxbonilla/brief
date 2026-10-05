// In-memory store used when Supabase isn't configured. Seeded from the
// prototype data with dates relative to today. Lives for the server process.

import { addDays, DEADLINE_TIME, dayKey, zonedTime } from "../dates";
import { isPending, isVisibleToClient } from "../pieces";
import { SEED_AGENCY, SEED_CLIENT, SEED_PIECES, seedDefaults } from "../seed-data";
import type { Agency, Client, Piece, PieceFull, PieceReference, ScriptBlock, Shot, Status, Upload } from "../types";
import type { Notification, Repo } from "./repo";

interface Db {
  agency: Agency;
  client: Client;
  pieces: Piece[];
  shots: Shot[];
  blocks: ScriptBlock[];
  refs: PieceReference[];
  uploads: Upload[];
  notifications: Notification[];
}

let seq = 0;
const uid = (p: string) => `${p}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function seed(): Db {
  const agency: Agency = { id: "agency-en", name: SEED_AGENCY.name, initials: SEED_AGENCY.initials, logo_url: null };
  const client: Client = { id: "client-mr", agency_id: agency.id, name: SEED_CLIENT.name, initials: SEED_CLIENT.initials, avatar_url: null, phone: SEED_CLIENT.phone, tz: SEED_CLIENT.tz };
  const today = dayKey(new Date(), client.tz);
  const at = (offset: number) => zonedTime(addDays(today, offset), DEADLINE_TIME, client.tz).toISOString();
  const db: Db = { agency, client, pieces: [], shots: [], blocks: [], refs: [], uploads: [], notifications: [] };

  for (const s of SEED_PIECES) {
    const d = seedDefaults(s);
    const id = `piece-${s.key}`;
    db.pieces.push({
      id, client_id: client.id, channel: s.channel, title: s.title, status: s.status,
      format: d.format, objective: d.objective, hook: d.hook, notes: d.notes,
      publish_at: at(s.due + d.editDays + 1), record_due_at: at(s.due), edit_days: d.editDays,
      brief_sent_at: d.briefSent ? at(s.due - 7) : null, redo_reason: s.redoReason ?? null, received_at: null,
      final_url: s.status === "listo" ? "https://drive.google.com/drive/folders/demo-final" : null,
      caption: s.status === "listo" ? `${s.title} 💪\n\nGuárdalo para tu próximo entreno y compártelo con quien lo necesite.\n\n#fitness #entrenamiento` : null,
      published_at: null,
    });
    d.shots.forEach((text, i) => db.shots.push({ id: uid("shot"), piece_id: id, position: i, text, done: !isPending(s) }));
    const blockIds = (s.blocks ?? []).map((b, i) => {
      const bid = uid("block");
      db.blocks.push({ id: bid, piece_id: id, position: i, label: b.label, duration: b.duration, lines: b.lines, note: b.note ?? null, recorded: false });
      return bid;
    });
    for (const r of s.references ?? []) {
      db.refs.push({ id: uid("ref"), piece_id: id, block_id: r.block != null ? blockIds[r.block] : null, image_url: r.image ?? null, title: r.title, note: r.note, requested_from_client: !!r.requested, uploaded_url: null });
    }
  }
  return db;
}

const g = globalThis as unknown as { __briefDemo?: Db };
const db = () => (g.__briefDemo ??= seed());

function full(p: Piece): PieceFull {
  const d = db();
  const byPos = <T extends { position: number }>(a: T[]) => a.sort((x, y) => x.position - y.position);
  return {
    ...p,
    shots: byPos(d.shots.filter((s) => s.piece_id === p.id)),
    blocks: byPos(d.blocks.filter((b) => b.piece_id === p.id)),
    references: d.refs.filter((r) => r.piece_id === p.id),
    uploads: d.uploads.filter((u) => u.piece_id === p.id),
  };
}

function piece(id: string) {
  const p = db().pieces.find((x) => x.id === id);
  if (!p) throw new Error("pieza no encontrada");
  return p;
}

function clientPiece(id: string, pendingOnly = false) {
  const p = piece(id);
  if (!isVisibleToClient(p)) throw new Error("pieza no encontrada");
  if (pendingOnly && !isPending(p)) throw new Error("la pieza no está pendiente de grabar");
  return p;
}

export const demoRepo: Repo = {
  async clientSession() {
    return { client: db().client, agency: db().agency };
  },
  async agencySession() {
    return { agency: db().agency, clients: [db().client] };
  },

  async clientPieces(clientId) {
    return db().pieces.filter((p) => p.client_id === clientId && isVisibleToClient(p)).map(full);
  },
  async setRecorded(id, recorded) {
    const p = clientPiece(id);
    if (recorded && isPending(p)) p.status = "grabado";
    else if (!recorded && p.status === "grabado" && !p.received_at) p.status = p.redo_reason ? "rehacer" : "grabar";
    return p.status;
  },
  async setPublished(id, published) {
    const p = clientPiece(id);
    if (p.channel === "extra") return p.status;
    if (published && p.status === "listo") Object.assign(p, { status: "publicado", published_at: new Date().toISOString() });
    else if (!published && p.status === "publicado" && p.published_at) Object.assign(p, { status: "listo", published_at: null });
    return p.status;
  },
  async toggleShot(shotId, done) {
    const s = db().shots.find((x) => x.id === shotId);
    if (!s) throw new Error("toma no encontrada");
    clientPiece(s.piece_id, true);
    s.done = done;
  },
  async toggleBlock(blockId, recorded) {
    const b = db().blocks.find((x) => x.id === blockId);
    if (!b) throw new Error("bloque no encontrado");
    clientPiece(b.piece_id, true);
    b.recorded = recorded;
  },
  async addUpload(pieceId, path, name) {
    const p = clientPiece(pieceId);
    const u: Upload = { id: uid("upload"), piece_id: pieceId, file_url: path, file_name: name, uploaded_at: new Date().toISOString() };
    db().uploads.push(u);
    if (isPending(p)) p.status = "grabado";
    return u;
  },
  async uploadReference(refId, path) {
    const r = db().refs.find((x) => x.id === refId && x.requested_from_client);
    if (!r) throw new Error("referencia no encontrada");
    clientPiece(r.piece_id);
    r.uploaded_url = path;
  },
  async fileUrl(path) {
    return path;
  },

  async agencyPieces(clientId) {
    return db().pieces.filter((p) => p.client_id === clientId).map(full);
  },
  async agencyPiece(id) {
    const p = db().pieces.find((x) => x.id === id);
    return p ? full(p) : null;
  },
  async savePiece(input) {
    const d = db();
    const { shots, id: givenId, ...fields } = input;
    let id = givenId;
    if (id) {
      Object.assign(piece(id), fields);
      const existing = d.shots.filter((s) => s.piece_id === id);
      d.shots = d.shots.filter((s) => s.piece_id !== id);
      shots.forEach((text, i) => d.shots.push({ id: uid("shot"), piece_id: id!, position: i, text, done: existing.find((s) => s.text === text)?.done ?? false }));
    } else {
      id = uid("piece");
      d.pieces.push({ ...fields, id, status: "borrador", brief_sent_at: null, redo_reason: null, received_at: null });
      shots.forEach((text, i) => d.shots.push({ id: uid("shot"), piece_id: id!, position: i, text, done: false }));
    }
    return id;
  },
  async deletePiece(id) {
    const d = db();
    d.pieces = d.pieces.filter((p) => p.id !== id);
  },
  async sendBriefs(ids) {
    const now = new Date().toISOString();
    for (const id of ids) {
      const p = piece(id);
      p.brief_sent_at = now;
      if (p.status === "borrador") p.status = "grabar";
    }
  },
  async setStatus(id, status: Status, redoReason) {
    const p = piece(id);
    p.status = status;
    if (status === "rehacer") {
      p.redo_reason = redoReason ?? p.redo_reason;
      p.received_at = null;
      db().shots.filter((s) => s.piece_id === id).forEach((s) => (s.done = false));
      db().blocks.filter((b) => b.piece_id === id).forEach((b) => (b.recorded = false));
    }
    if (status === "edicion") p.redo_reason = null;
  },
  async setClientDrive(clientId, url) {
    if (db().client.id === clientId) db().client.drive_url = url;
  },
  async reschedule(id, publishAt, recordDueAt) {
    const p = piece(id);
    p.publish_at = publishAt;
    p.record_due_at = recordDueAt;
  },
  async markReceived(id) {
    piece(id).received_at = new Date().toISOString();
  },
  async setBlocks(pieceId, blocks) {
    // Update in place by position: ids, "recorded" checks and references survive edits.
    const d = db();
    const old = d.blocks.filter((b) => b.piece_id === pieceId).sort((x, y) => x.position - y.position);
    blocks.forEach((b, i) => {
      if (old[i]) Object.assign(old[i], { position: i, label: b.label, duration: b.duration, lines: b.lines, note: b.note });
      else d.blocks.push({ id: uid("block"), piece_id: pieceId, position: i, label: b.label, duration: b.duration, lines: b.lines, note: b.note, recorded: false });
    });
    const gone = new Set(old.slice(blocks.length).map((b) => b.id));
    d.blocks = d.blocks.filter((b) => !gone.has(b.id));
    for (const r of d.refs) if (r.block_id && gone.has(r.block_id)) r.block_id = null;
  },
  async addReference(input) {
    db().refs.push({ ...input, id: uid("ref"), uploaded_url: null });
  },
  async deleteReference(id) {
    const d = db();
    d.refs = d.refs.filter((r) => r.id !== id);
  },
  async enqueueNotification(n) {
    db().notifications.push({ ...n, id: uid("notif"), created_at: new Date().toISOString(), sent_at: null });
  },
  async pendingNotifications() {
    return db().notifications.filter((n) => !n.sent_at);
  },
};
