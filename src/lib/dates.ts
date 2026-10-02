// Date logic. Everything that depends on "which day" is computed in the
// client's timezone, so "hoy", "mañana", the Monday–Sunday week and the 20:00
// deadline match what the coach sees on their phone.

export const DEFAULT_TZ = "America/Mexico_City";
/**
 * Deadlines are day-only for now: the hour is hidden everywhere and a piece is
 * due until the end of its day. Set to true to show and use "antes de las 20:00" again.
 */
export const SHOW_DEADLINE_TIME = false;
export const DEADLINE_TIME = SHOW_DEADLINE_TIME ? "20:00" : "23:59";

/** ", 20:00" after a date when deadline times are shown; nothing otherwise. */
export const deadlineSuffix = (time: string = DEADLINE_TIME) => (SHOW_DEADLINE_TIME ? `, ${time}` : "");
export const DEFAULT_BUFFER_DAYS = 1;

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const DIAS_LETRA = ["D", "L", "M", "X", "J", "V", "S"];

/** A calendar day, "YYYY-MM-DD". */
export type DayKey = string;

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFmt.set(tz, f);
  }
  return f;
}

function zonedParts(date: Date, tz: string) {
  const p: Record<string, number> = {};
  for (const { type, value } of fmt(tz).formatToParts(date)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute, s: p.second };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(date: Date | string, tz: string): DayKey {
  const { y, m, d } = zonedParts(new Date(date), tz);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Days since 1970-01-01 for a day key (timezone-free arithmetic). */
export function dayIndex(key: DayKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
}

export function keyFromIndex(i: number): DayKey {
  const dt = new Date(i * 864e5);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(key: DayKey, n: number): DayKey {
  return keyFromIndex(dayIndex(key) + n);
}

export function keyParts(key: DayKey) {
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m: m - 1, d, dow };
}

/** Monday of the week containing `key`. Weeks start on Monday. */
export function weekStart(key: DayKey): DayKey {
  const { dow } = keyParts(key);
  return addDays(key, -((dow + 6) % 7));
}

/** The instant at which the wall clock in `tz` reads `time` on `key`. */
export function zonedTime(key: DayKey, time: string, tz: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wanted;
  // Two passes settle DST transitions.
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), tz);
    const seen = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
    guess += wanted - seen;
  }
  return new Date(guess);
}

/** record_due_at = publish_at − edit_days − buffer, at DEADLINE_TIME local. */
export function computeRecordDue(
  publishAt: Date | string,
  editDays: number,
  tz: string,
  bufferDays = DEFAULT_BUFFER_DAYS,
): Date {
  const key = addDays(dayKey(publishAt, tz), -(editDays + bufferDays));
  return zonedTime(key, DEADLINE_TIME, tz);
}

/** "sáb 3 oct" */
export function shortLabel(key: DayKey): string {
  const { m, d, dow } = keyParts(key);
  return `${DIAS_CORTOS[dow]} ${d} ${MESES_CORTOS[m]}`;
}

/** "15 oct" */
export function dayMonth(key: DayKey): string {
  const { m, d } = keyParts(key);
  return `${d} ${MESES_CORTOS[m]}`;
}

/** "jueves 1" */
export function longDayLabel(key: DayKey): string {
  const { d, dow } = keyParts(key);
  return `${DIAS[dow]} ${d}`;
}

/** "28 sep – 4 oct" */
export function weekRangeLabel(start: DayKey): string {
  return `${dayMonth(start)} – ${dayMonth(addDays(start, 6))}`;
}

export function hhmm(date: Date | string, tz: string): string {
  const { h, min } = zonedParts(new Date(date), tz);
  return `${pad(h)}:${pad(min)}`;
}

export type UrgencyTone = "calm" | "soon" | "urgent" | "overdue";

export interface Urgency {
  tone: UrgencyTone;
  text: string;
  /** Calendar days from today to the due day (negative = past). */
  days: number;
}

/**
 * Time left until a recording deadline, phrased as the client should feel it.
 * - vencido → "Venció hace 2 días" (rojo)
 * - hoy / mañana → "Hoy antes de las 20:00" (ámbar sólido)
 * - 2–3 días → "En 2 días" (ámbar)
 * - más de 3 → "Para el sábado 3" (gris)
 */
export function urgency(due: Date | string, now: Date, tz: string): Urgency {
  const dueDate = new Date(due);
  const dueKey = dayKey(dueDate, tz);
  const days = dayIndex(dueKey) - dayIndex(dayKey(now, tz));
  const time = hhmm(dueDate, tz);

  if (now.getTime() > dueDate.getTime()) {
    if (days >= 0) return { tone: "overdue", text: "Venció hoy", days };
    const n = -days;
    return { tone: "overdue", text: n === 1 ? "Venció ayer" : `Venció hace ${n} días`, days };
  }
  if (days === 0) return { tone: "urgent", text: SHOW_DEADLINE_TIME ? `Hoy antes de las ${time}` : "Para hoy", days };
  if (days === 1) return { tone: "urgent", text: SHOW_DEADLINE_TIME ? `Mañana antes de las ${time}` : "Para mañana", days };
  if (days <= 3) return { tone: "soon", text: `En ${days} días`, days };
  const { d, dow } = keyParts(dueKey);
  return { tone: "calm", text: `Para el ${DIAS[dow]} ${d}`, days };
}

export const URGENCY_STYLE: Record<UrgencyTone, { fg: string; bg: string }> = {
  calm: { fg: "#B5B8BE", bg: "transparent" },
  soon: { fg: "#F5B83D", bg: "transparent" },
  urgent: { fg: "#1A1205", bg: "#F5B83D" },
  overdue: { fg: "#FF5C5C", bg: "transparent" },
};
