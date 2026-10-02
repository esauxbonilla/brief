// Daily notice per client: at most one message a day, joining everything due.
// Queued events (brief sent, redo) come from the notifications table; reminders
// (due in 2 days) and overdue are computed from the pieces on each run.

import { dayIndex, dayKey } from "./dates";
import { isOverdue, isPending, plural } from "./pieces";
import type { Piece } from "./types";

export interface QueuedNotice {
  kind: string;
  message: string;
}

export function composeDailyMessage(pieces: Piece[], queued: QueuedNotice[], now: Date, tz: string): string | null {
  const parts: string[] = [];
  // Queued first, in order: "Nuevo brief…", "Hay que repetir…"
  for (const q of queued) parts.push(q.message);

  const today = dayIndex(dayKey(now, tz));
  const pending = pieces.filter(isPending);
  const inTwo = pending.filter((p) => !isOverdue(p, now) && dayIndex(dayKey(p.record_due_at, tz)) - today === 2);
  if (inTwo.length) parts.push(`Te ${plural(inTwo.length, "falta", "faltan")} ${inTwo.length} ${plural(inTwo.length, "pieza", "piezas")}, ${plural(inTwo.length, "vence", "vencen")} pasado mañana`);

  const overdue = pending.filter((p) => isOverdue(p, now));
  if (overdue.length) parts.push(`Tienes ${overdue.length} ${plural(overdue.length, "pieza atrasada", "piezas atrasadas")}`);

  if (!parts.length) return null;
  return parts.join(". ") + ".";
}

/** WhatsApp Cloud API. Without credentials, logs instead of sending. */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log(`[avisos] (sin WhatsApp configurado) → ${to}: ${body}`);
    return true;
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/[^\d]/g, ""), type: "text", text: { body } }),
  });
  if (!res.ok) console.error("[avisos] WhatsApp error", res.status, await res.text());
  return res.ok;
}
