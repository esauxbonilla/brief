import { describe, expect, it } from "vitest";
import { addDays, computeRecordDue, DEADLINE_TIME, dayKey, hhmm, SHOW_DEADLINE_TIME, urgency, weekStart, zonedTime } from "./dates";
import { cardStyle, displayStatus, inPublishView, isOverdue, isPublishOverdue, isToPublish, isVisibleToClient, publishCardStyle, publishTier, sessionQueue, thisWeekPending, thisWeekToPublish, tier } from "./pieces";
import type { Piece } from "./types";

const TZ = "America/Mexico_City";
// Thursday 1 Oct 2026, 10:00 in Mexico City
const NOW = zonedTime("2026-10-01", "10:00", TZ);
const due = (key: string) => zonedTime(key, "20:00", TZ);

describe("calendar helpers", () => {
  it("week starts on Monday", () => {
    expect(weekStart("2026-10-01")).toBe("2026-09-28");
    expect(weekStart("2026-10-04")).toBe("2026-09-28"); // Sunday
    expect(weekStart("2026-10-05")).toBe("2026-10-05"); // Monday
  });

  it("dayKey uses the client's timezone", () => {
    // 03:00 UTC on Oct 2 is still Oct 1 in Mexico City
    expect(dayKey(new Date("2026-10-02T03:00:00Z"), TZ)).toBe("2026-10-01");
    expect(dayKey(new Date("2026-10-02T03:00:00Z"), "Europe/Madrid")).toBe("2026-10-02");
  });

  it("zonedTime round-trips wall time", () => {
    const d = zonedTime("2026-10-08", "20:00", "Europe/Madrid");
    expect(hhmm(d, "Europe/Madrid")).toBe("20:00");
    expect(dayKey(d, "Europe/Madrid")).toBe("2026-10-08");
    // across the DST change (Madrid, 25 Oct 2026)
    const w = zonedTime("2026-10-26", "20:00", "Europe/Madrid");
    expect(hhmm(w, "Europe/Madrid")).toBe("20:00");
  });

  it("record_due_at = publish − edit_days − buffer at the deadline time", () => {
    const d = computeRecordDue(zonedTime("2026-10-15", "12:00", TZ), 5, TZ);
    expect(dayKey(d, TZ)).toBe("2026-10-09");
    expect(hhmm(d, TZ)).toBe(DEADLINE_TIME);
    expect(dayKey(computeRecordDue(zonedTime("2026-10-15", "12:00", TZ), 5, TZ, 0), TZ)).toBe("2026-10-10");
  });

  it("addDays crosses months", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("urgency text", () => {
  it("today and tomorrow are urgent", () => {
    expect(urgency(due("2026-10-01"), NOW, TZ)).toMatchObject({ tone: "urgent", text: SHOW_DEADLINE_TIME ? "Hoy antes de las 20:00" : "Para hoy" });
    expect(urgency(due("2026-10-02"), NOW, TZ)).toMatchObject({ tone: "urgent", text: SHOW_DEADLINE_TIME ? "Mañana antes de las 20:00" : "Para mañana" });
  });
  it("2–3 days is soon", () => {
    expect(urgency(due("2026-10-03"), NOW, TZ)).toMatchObject({ tone: "soon", text: "En 2 días" });
    expect(urgency(due("2026-10-04"), NOW, TZ)).toMatchObject({ tone: "soon", text: "En 3 días" });
  });
  it("more than 3 days is calm, with weekday", () => {
    expect(urgency(due("2026-10-10"), NOW, TZ)).toMatchObject({ tone: "calm", text: "Para el sábado 10" });
  });
  it("past deadline is overdue", () => {
    expect(urgency(due("2026-09-29"), NOW, TZ)).toMatchObject({ tone: "overdue", text: "Venció hace 2 días" });
    expect(urgency(due("2026-09-30"), NOW, TZ)).toMatchObject({ tone: "overdue", text: "Venció ayer" });
    const late = zonedTime("2026-10-01", "21:00", TZ);
    expect(urgency(due("2026-10-01"), late, TZ)).toMatchObject({ tone: "overdue", text: "Venció hoy" });
  });
});

const piece = (over: Partial<Piece>): Piece => ({
  id: "x", client_id: "c", channel: "reel", title: "T", status: "grabar", format: null, objective: null, hook: null,
  notes: [], publish_at: due("2026-10-10").toISOString(), record_due_at: due("2026-10-02").toISOString(), edit_days: 3,
  brief_sent_at: "2026-09-25T00:00:00Z", redo_reason: null, received_at: null, ...over,
});

describe("piece rules", () => {
  it("visibility requires a sent brief and hides drafts/cancelled", () => {
    expect(isVisibleToClient(piece({}))).toBe(true);
    expect(isVisibleToClient(piece({ brief_sent_at: null }))).toBe(false);
    expect(isVisibleToClient(piece({ status: "borrador" }))).toBe(false);
    expect(isVisibleToClient(piece({ status: "cancelado" }))).toBe(false);
  });

  it("atrasado is derived for grabar and rehacer only", () => {
    const past = due("2026-09-29").toISOString();
    expect(isOverdue(piece({ record_due_at: past }), NOW)).toBe(true);
    expect(isOverdue(piece({ record_due_at: past, status: "rehacer" }), NOW)).toBe(true);
    expect(isOverdue(piece({ record_due_at: past, status: "grabado" }), NOW)).toBe(false);
    expect(displayStatus(piece({ record_due_at: past }), NOW)).toBe("atrasado");
  });

  it("week counter only counts pending pieces due this week", () => {
    const list = [
      piece({ id: "a" }),
      piece({ id: "b", status: "rehacer", record_due_at: due("2026-10-04").toISOString() }),
      piece({ id: "c", status: "grabado" }),
      piece({ id: "d", record_due_at: due("2026-10-05").toISOString() }), // next week
    ];
    expect(thisWeekPending(list, NOW, TZ).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("session queue puts overdue first", () => {
    const list = [
      piece({ id: "late", record_due_at: due("2026-10-08").toISOString() }),
      piece({ id: "old", record_due_at: due("2026-09-29").toISOString() }),
      piece({ id: "soon" }),
      piece({ id: "done", status: "listo" }),
    ];
    expect(sessionQueue(list, NOW).map((p) => p.id)).toEqual(["old", "soon", "late"]);
  });

  it("tiers drive the visual hierarchy", () => {
    expect(tier(piece({}), NOW, TZ)).toBe("now");
    expect(tier(piece({ record_due_at: due("2026-10-12").toISOString() }), NOW, TZ)).toBe("later");
    expect(tier(piece({ status: "edicion" }), NOW, TZ)).toBe("context");
    expect(cardStyle(piece({ record_due_at: due("2026-09-29").toISOString() }), NOW, TZ).bg).toBe("#2A1214");
  });
});

describe("publish view", () => {
  const pub = (key: string, status: Piece["status"] = "listo", channel: Piece["channel"] = "reel") =>
    piece({ id: key + status, status, channel, publish_at: zonedTime(key, "12:00", TZ).toISOString() });

  it("only ready content can be published; tasks never", () => {
    expect(isToPublish(pub("2026-10-02"))).toBe(true);
    expect(isToPublish(pub("2026-10-02", "edicion"))).toBe(false);
    expect(isToPublish(pub("2026-10-02", "listo", "extra"))).toBe(false);
    expect(inPublishView(pub("2026-10-02", "listo", "extra"))).toBe(false);
  });

  it("is overdue only after the publish day ends", () => {
    expect(isPublishOverdue(pub("2026-10-01"), NOW, TZ)).toBe(false); // today
    expect(isPublishOverdue(pub("2026-09-30"), NOW, TZ)).toBe(true);
    expect(isPublishOverdue(pub("2026-09-30", "publicado"), NOW, TZ)).toBe(false);
  });

  it("week list and tiers follow the publish date", () => {
    const list = [pub("2026-10-03"), pub("2026-10-01"), pub("2026-10-06"), pub("2026-10-02", "edicion")];
    expect(thisWeekToPublish(list, NOW, TZ).map((p) => p.publish_at.slice(0, 10))).toEqual(["2026-10-01", "2026-10-03"]);
    expect(publishTier(pub("2026-10-06"), NOW, TZ)).toBe("later");
    expect(publishTier(pub("2026-09-29"), NOW, TZ)).toBe("overdue");
    expect(publishCardStyle(pub("2026-10-02"), NOW, TZ).pill).toBe("Por publicar");
    expect(publishCardStyle(piece({ status: "grabar" }), NOW, TZ).bg).toBe("#141518");
  });
});
