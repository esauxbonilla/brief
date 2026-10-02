import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { composeDailyMessage, sendWhatsApp } from "@/lib/notify";
import { isVisibleToClient } from "@/lib/pieces";
import { isDemo } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Client, Piece } from "@/lib/types";

// Daily job (vercel.json): one WhatsApp per client at most, joining every
// pending notice. Protected with CRON_SECRET, which Vercel sends as a bearer token.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isDemo && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const sent: { client: string; message: string }[] = [];

  if (isDemo) {
    const s = await repo.agencySession();
    const queued = await repo.pendingNotifications();
    for (const c of s?.clients ?? []) {
      const pieces = (await repo.agencyPieces(c.id)).filter(isVisibleToClient);
      const msg = composeDailyMessage(pieces, queued.filter((q) => q.client_id === c.id), now, c.tz);
      if (msg && c.phone && (await sendWhatsApp(c.phone, msg))) sent.push({ client: c.name, message: msg });
    }
    return NextResponse.json({ sent });
  }

  const sb = supabaseAdmin();
  const { data: clients, error } = await sb.from("clients").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  for (const c of clients as Client[]) {
    const [{ data: pieces }, { data: queued }] = await Promise.all([
      sb.from("pieces").select("*").eq("client_id", c.id).not("brief_sent_at", "is", null).not("status", "in", "(borrador,cancelado)"),
      sb.from("notifications").select("id, kind, message").eq("client_id", c.id).is("sent_at", null).order("created_at"),
    ]);
    const msg = composeDailyMessage((pieces ?? []) as Piece[], queued ?? [], now, c.tz);
    if (!msg || !c.phone) continue;
    if (await sendWhatsApp(c.phone, msg)) {
      sent.push({ client: c.name, message: msg });
      if (queued?.length) await sb.from("notifications").update({ sent_at: now.toISOString() }).in("id", queued.map((q) => q.id));
    }
  }
  return NextResponse.json({ sent });
}
