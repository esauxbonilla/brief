import "server-only";
import { supabaseServer } from "../supabase/server";
import type { PieceFull } from "../types";
import type { Repo } from "./repo";

const PIECE_SELECT = "*, shots(*), blocks:script_blocks(*), references:piece_references(*), uploads(*)";

function sortChildren(p: PieceFull): PieceFull {
  p.shots.sort((a, b) => a.position - b.position);
  p.blocks.sort((a, b) => a.position - b.position);
  return p;
}

// No generated DB types yet: rows are typed by the Repo interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function check(res: { data: unknown; error: { message: string } | null }): any {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export const supabaseRepo: Repo = {
  async clientSession() {
    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return null;
    const clientId = check(await sb.rpc("claim_client")) as string | null;
    if (!clientId) return null;
    const client = check(await sb.from("clients").select("*").eq("id", clientId).single());
    const agency = check(await sb.from("agencies").select("*").eq("id", client.agency_id).single());
    return { client, agency };
  },
  async agencySession() {
    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return null;
    const m = check(await sb.from("agency_members").select("agency_id").eq("user_id", auth.user.id).limit(1));
    if (!m.length) return null;
    const agency = check(await sb.from("agencies").select("*").eq("id", m[0].agency_id).single());
    const clients = check(await sb.from("clients").select("*").eq("agency_id", agency.id).order("name"));
    return { agency, clients };
  },

  async clientPieces(clientId) {
    // RLS already limits to visible pieces; the filters keep the intent explicit.
    const sb = await supabaseServer();
    const rows = check(
      await sb.from("pieces").select(PIECE_SELECT).eq("client_id", clientId).not("brief_sent_at", "is", null)
        .not("status", "in", "(borrador,cancelado)").order("record_due_at"),
    ) as PieceFull[];
    return rows.map(sortChildren);
  },
  async setRecorded(pieceId, recorded) {
    const sb = await supabaseServer();
    return check(await sb.rpc("client_set_recorded", { pid: pieceId, recorded }));
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
    return rows.map(sortChildren);
  },
  async agencyPiece(id) {
    const sb = await supabaseServer();
    const row = check(await sb.from("pieces").select(PIECE_SELECT).eq("id", id).maybeSingle()) as PieceFull | null;
    return row ? sortChildren(row) : null;
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
  async markReceived(id) {
    const sb = await supabaseServer();
    check(await sb.from("pieces").update({ received_at: new Date().toISOString() }).eq("id", id));
  },
  async setBlocks(pieceId, blocks) {
    const sb = await supabaseServer();
    const old = check(await sb.from("script_blocks").select("id, position").eq("piece_id", pieceId)) as { id: string; position: number }[];
    const refs = check(await sb.from("piece_references").select("id, block_id").eq("piece_id", pieceId).not("block_id", "is", null)) as { id: string; block_id: string }[];
    const fresh = blocks.length
      ? (check(await sb.from("script_blocks").insert(blocks.map((b, position) => ({ piece_id: pieceId, position, ...b }))).select("id, position")) as { id: string; position: number }[])
      : [];
    // Keep references attached to the block in the same position.
    for (const r of refs) {
      const pos = old.find((b) => b.id === r.block_id)?.position;
      const target = fresh.find((b) => b.position === pos);
      check(await sb.from("piece_references").update({ block_id: target?.id ?? null }).eq("id", r.id));
    }
    if (old.length) check(await sb.from("script_blocks").delete().in("id", old.map((b) => b.id)));
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
