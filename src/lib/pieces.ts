import { isTask, STATUS, type DisplayStatus } from "./constants";
import { addDays, dayKey, weekStart, type DayKey } from "./dates";
import type { Piece, Status } from "./types";

export const PENDING: Status[] = ["grabar", "rehacer"];

export const isPending = (p: Pick<Piece, "status">) => PENDING.includes(p.status);

/** The client only sees pieces whose brief was sent, and never drafts or cancelled ones. */
export function isVisibleToClient(p: Pick<Piece, "status" | "brief_sent_at">): boolean {
  return p.brief_sent_at !== null && p.status !== "borrador" && p.status !== "cancelado";
}

/** Derived: pending and past its recording deadline. */
export function isOverdue(p: Pick<Piece, "status" | "record_due_at">, now: Date): boolean {
  return isPending(p) && now.getTime() > new Date(p.record_due_at).getTime();
}

export function displayStatus(p: Pick<Piece, "status" | "record_due_at">, now: Date): DisplayStatus {
  return isOverdue(p, now) ? "atrasado" : p.status;
}

/** Who has the ball: the client only while there's something to record. */
export const isClientsTurn = (p: Pick<Piece, "status">) => isPending(p);

export function currentWeek(now: Date, tz: string): { start: DayKey; end: DayKey } {
  const start = weekStart(dayKey(now, tz));
  return { start, end: addDays(start, 6) };
}

export function inWeek(p: Pick<Piece, "record_due_at">, start: DayKey, tz: string): boolean {
  const k = dayKey(p.record_due_at, tz);
  return k >= start && k <= addDays(start, 6);
}

const byDue = (a: Pick<Piece, "record_due_at">, b: Pick<Piece, "record_due_at">) =>
  new Date(a.record_due_at).getTime() - new Date(b.record_due_at).getTime();

/** Header counter: pending pieces whose recording deadline falls this week. */
export function thisWeekPending<P extends Piece>(pieces: P[], now: Date, tz: string): P[] {
  const { start } = currentWeek(now, tz);
  return pieces.filter((p) => isPending(p) && inWeek(p, start, tz)).sort(byDue);
}

export function overduePieces<P extends Piece>(pieces: P[], now: Date): P[] {
  return pieces.filter((p) => isOverdue(p, now)).sort(byDue);
}

/** Recording session order: overdue first, then by deadline. */
export function sessionQueue<P extends Piece>(pieces: P[], now: Date): P[] {
  const pending = pieces.filter(isPending);
  const over = pending.filter((p) => isOverdue(p, now)).sort(byDue);
  const rest = pending.filter((p) => !isOverdue(p, now)).sort(byDue);
  return [...over, ...rest];
}

/** Visual tier for cards: the core hierarchy rule of the design. */
export type Tier = "overdue" | "now" | "later" | "context";

export function tier(p: Piece, now: Date, tz: string): Tier {
  if (isOverdue(p, now)) return "overdue";
  if (!isPending(p)) return "context";
  return inWeek(p, currentWeek(now, tz).start, tz) ? "now" : "later";
}

export interface CardStyle {
  bg: string;
  border: string;
  shadow: string;
  titleColor: string;
  titleWeight: number;
  pillBg: string;
  pillFg: string;
  pill: string;
}

/** An "Extra" is pending or done; the content pipeline names don't apply. */
export function taskStatusName(s: Status): string {
  return s === "grabar" || s === "rehacer" ? "Pendiente" : s === "borrador" || s === "cancelado" ? STATUS[s].name : "Hecho";
}

export function cardStyle(p: Piece, now: Date, tz: string, mobile = false): CardStyle {
  const t = tier(p, now, tz);
  const ds = displayStatus(p, now);
  const S = STATUS[ds];
  const pill = isTask(p) && t !== "overdue" ? taskStatusName(p.status) : p.status === "rehacer" && t !== "overdue" ? STATUS.rehacer.name : S.name;
  switch (t) {
    case "overdue":
      return { bg: "#2A1214", border: "#FF5C5C", shadow: "0 0 0 3px rgba(255,92,92,0.12)", titleColor: "#FFE3E3", titleWeight: 600, pillBg: "#FF5C5C", pillFg: "#1A0506", pill };
    case "now":
      return {
        bg: "#2A2110", border: "#F5B83D",
        shadow: mobile ? "0 0 0 3px rgba(245,184,61,0.12)" : "0 0 0 3px rgba(245,184,61,0.12), 0 6px 18px rgba(0,0,0,0.4)",
        titleColor: "#FFF4DE", titleWeight: 600, pillBg: "#F5B83D", pillFg: "#1A1205", pill,
      };
    case "later":
      return {
        bg: "#19160F", border: "rgba(245,184,61,0.4)", shadow: "none", titleColor: "#E6DFD0", titleWeight: 600,
        pillBg: p.status === "rehacer" ? "#F5B83D" : "#F5B83D1F", pillFg: p.status === "rehacer" ? "#1A1205" : "#F5B83D", pill,
      };
    default:
      return {
        bg: "#141518", border: mobile ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.04)", shadow: "none",
        titleColor: p.status === "publicado" ? "#62666D" : mobile ? "#A9ACB2" : "#9DA1A8", titleWeight: 500,
        pillBg: p.status === "publicado" ? "rgba(255,255,255,0.05)" : S.color + "1F", pillFg: S.color, pill,
      };
  }
}

export function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}
