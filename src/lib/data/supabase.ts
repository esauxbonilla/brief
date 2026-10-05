import "server-only";
import { cache } from "react";
import { currentUserId, supabaseServer } from "../supabase/server";
import type { PieceFull } from "../types";
import type { Repo } from "./repo";

const PIECE_SELECT = "*, shots(*), blocks:script_blocks(*), references:piece_references(*), uploads(*)";

function sortChildren(p: PieceFull): PieceFull {
  p.shots.sort((a, b) => a.position - b.position);
  p.blocks.sort((a, b) => a.position - b.position);
  return p;
}

const isStoragePath = (u: string | null): u is string => !!u && !/^(https?:|data:|\/)/.test(u);

/** Photos the client sent live in the private bucket: swap paths for signed URLs. */
async function signReferences(rows: PieceFull[]) {
  const paths = rows.flatMap((p) => p.references.map((r) => r.uploaded_url)).filter(isStoragePath);
  if (!paths.length) return rows;
  const sb = await supabaseServer();
  const { data } = await sb.storage.from("material").createSignedUrls(paths, 60 * 60);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  for (const p of rows) for (const r of p.references) if (isStoragePath(r.uploaded_url)) r.uploaded_url = map.get(r.uploaded_url) ?? null;
  return rows;
}

// No generated DB types yet: rows are typed by the Repo interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function check(res: { data: unknown; error: { message: string } | null }): any {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// Sessions are memoized per request: layout, page and actions share one lookup.
const clientSession = cache(async () => {
  const uid = await currentUserId();
  if (!uid) return null;
  const sb = await supabaseServer();
  // Filter by user: an agency member can also read every client of the agency.
  const own = () => sb.from("clients").select("*, agency:agencies(*)").eq("user_id", uid).maybeSingle();
  let row = check(await own());
  // First login: link the auth user to the client row with the same email.
  if (!row && check(await sb.rpc("claim_client"))) row = check(await own());
  if (!row) return null;
  const { agency, ...client } = row;
  return { client, agency };
});

const agencySession = cache(async () => {
  const uid = await currentUserId();
  if (!uid) return null;
  const sb = await supabaseServer();
  const m = check(await sb.from("agency_members").select("agency:agencies(*, clients(*))").eq("user_id", uid).limit(1).maybeSingle());
  if (!m?.agency) return null;
  const { clients, ...agency } = m.agency;
  return { agency, clients: [...clients].sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)) };
});

export const supabaseRepo: Repo = {
  clientSession: () => clientSession(),
  agencySession: () => agencySession(),

  async clientPieces(clientId) {
    // RLS already limits to visible pieces; the filters keep the intent explicit.
    const sb = await supabaseServer();
    const rows = check(
      await sb.from("pieces").select(PIECE_SELECT).eq("client_id", clientId).not("brief_sent_at", "is", null)
        .not("status", "in", "(borrador,cancelado)").order("record_due_at"),
    ) as PieceFull[];
    return signReferences(rows.map(sortChildren));
  },
  async setRecorded(pieceId, recorded) {
    const sb = await supabaseServer();
    return check(await sb.rpc("client_set_recorded", { pid: pieceId, recorded }));
  },
  async setPublished(pieceId, published) {
    const sb = await supabaseServer();
    return check(await sb.rpc("client_set_published", { pid: pieceId, published }));
  },
  async toggleShot(shotId, done) {
    const sb = await supabaseServer();
    check(await sb.rpc("client_toggle_shot", { sid: shotId, value: done }));
  },
  async toggleBlock(blockId, recorded) {
    const sb = await supabaseServer();
    check(await sb.rpc("client_toggle_block", { bid: blockId, value: recorded }));
  },
  async addUpload(pieceId, path, name) {
    const sb = await supabaseServer();
    return check(await sb.rpc("client_add_upload", { pid: pieceId, path, name }));
  },
  async uploadReference(refId, path) {
    const sb = await supabaseServer();
    check(await sb.rpc("client_upload_reference", { rid: refId, path }));
  },
  async fileUrl(path) {
    if (/^(https?:)?\//.test(path)) return path;
    const sb = await supabaseServer();
    const { data } = await sb.storage.from("material").createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? "";
  },

  async agencyPieces(clientId) {
    const sb = await supabaseServer();
    const rows = check(await sb.from("pieces").select(PIECE_SELECT).eq("client_id", clientId).order("record_due_at")) as PieceFull[];
    return signReferences(rows.map(sortChildren));
  },
  async agencyPiece(id) {
    const sb = await supabaseServer();
    const row = check(await sb.from("pieces").select(PIECE_SELECT).eq("id", id).maybeSingle()) as PieceFull | null;
    return row ? (await signReferences([sortChildren(row)]))[0] : null;
  },
  async savePiece(input) {
    const sb = await supabaseServer();
    const { shots, id, ...fields } = input;
    let pieceId = id;
    if (pieceId) {
      check(await sb.from("pieces").update(fields).eq("id", pieceId));
      const existing = check(await sb.from("shots").select("text, done").eq("piece_id", pieceId)) as { text: string; done: boolean }[];
      check(await sb.from("shots").delete().eq("piece_id", pieceId));
      if (shots.length) {
        check(await sb.from("shots").insert(shots.map((text, position) => ({ piece_id: pieceId, position, text, done: existing.find((s) => s.text === text)?.done ?? false }))));
      }
    } else {
      const row = check(await sb.from("pieces").insert({ ...fields, status: "borrador" }).select("id").single());
      pieceId = row.id as string;
      if (shots.length) check(await sb.from("shots").insert(shots.map((text, position) => ({ piece_id: pieceId, position, text }))));
    }
    return pieceId!;
  },
  async deletePiece(id) {
    const sb = await supabaseServer();
    check(await sb.from("pieces").delete().eq("id", id));
  },
  async sendBriefs(ids) {
    const sb = await supabaseServer();
    const now = new Date().toISOString();
    check(await sb.from("pieces").update({ brief_sent_at: now, status: "grabar" }).in("id", ids).eq("status", "borrador"));
    check(await sb.from("pieces").update({ brief_sent_at: now }).in("id", ids).is("brief_sent_at", null));
  },
  async setStatus(id, status, redoReason) {
    const sb = await supabaseServer();
    const patch: Record<string, unknown> = { status };
    if (status === "rehacer") {
      patch.redo_reason = redoReason;
      patch.received_at = null;
      check(await sb.from("shots").update({ done: false }).eq("piece_id", id));
      check(await sb.from("script_blocks").update({ recorded: false }).eq("piece_id", id));
    }
    if (status === "edicion") patch.redo_reason = null;
    check(await sb.from("pieces").update(patch).eq("id", id));
  },
  async reschedule(id, publishAt, recordDueAt) {
    const sb = await supabaseServer();
    check(await sb.from("pieces").update({ publish_at: publishAt, record_due_at: recordDueAt }).eq("id", id));
  },
  async setClientDrive(clientId, url) {
    const sb = await supabaseServer();
    check(await sb.from("clients").update({ drive_url: url }).eq("id", clientId));
  },
  async markReceived(id) {
    const sb = await supabaseServer();
    check(await sb.from("pieces").update({ received_at: new Date().toISOString() }).eq("id", id));
  },
  async setBlocks(pieceId, blocks) {
    // Update in place by position: ids, "recorded" checks and references survive edits.
    const sb = await supabaseServer();
    const old = (check(await sb.from("script_blocks").select("id, position").eq("piece_id", pieceId).order("position")) as { id: string; position: number }[]);
    await Promise.all(blocks.slice(0, old.length).map(async (b, i) => check(await sb.from("script_blocks").update({ ...b, position: i }).eq("id", old[i].id))));
    if (blocks.length > old.length) {
      check(await sb.from("script_blocks").insert(blocks.slice(old.length).map((b, i) => ({ piece_id: pieceId, position: old.length + i, ...b }))));
    }
    // References of removed boxes are detached by the FK (on delete set null).
    if (old.length > blocks.length) check(await sb.from("script_blocks").delete().in("id", old.slice(blocks.length).map((b) => b.id)));
  },
  async addReference(input) {
    const sb = await supabaseServer();
    check(await sb.from("piece_references").insert(input));
  },
  async deleteReference(id) {
    const sb = await supabaseServer();
    check(await sb.from("piece_references").delete().eq("id", id));
  },
  async enqueueNotification(n) {
    const sb = await supabaseServer();
    check(await sb.from("notifications").insert(n));
  },
  async pendingNotifications() {
    const sb = await supabaseServer();
    return check(await sb.from("notifications").select("*").is("sent_at", null).order("created_at"));
  },
};
