"use client";

import { dayKey, type DayKey } from "@/lib/dates";
import {
  cardStyle, currentWeek, inPublishView, isClientsTurn, isToPublish, overduePieces, overdueToPublish,
  publishCardStyle, publishDeadline, thisWeekPending, thisWeekToPublish, type CardStyle,
} from "@/lib/pieces";
import type { PieceFull } from "@/lib/types";
import { useApp } from "./state";

/**
 * The calendar seen through the current mode. "grabar" places pieces on their
 * recording date; "publicar" on their publish date, and the client's job there is
 * to publish what the agency delivered.
 */
export function useLens() {
  const { mode, pieces, now, tz } = useApp();
  const publish = mode === "publicar";
  const { start, end } = currentWeek(now, tz);
  const dateOf = (p: PieceFull) => (publish ? p.publish_at : p.record_due_at);
  return {
    publish,
    pieces: publish ? pieces.filter(inPublishView) : pieces,
    dateOf,
    dayOf: (p: PieceFull): DayKey => dayKey(dateOf(p), tz),
    /** Deadline used for urgency texts. */
    dueOf: (p: PieceFull) => (publish ? publishDeadline(p, tz) : p.record_due_at),
    style: (p: PieceFull, mobile = false): CardStyle => (publish ? publishCardStyle(p, now, tz, mobile) : cardStyle(p, now, tz, mobile)),
    /** The client has something to do with it in this mode. */
    mine: (p: PieceFull) => (publish ? isToPublish(p) : isClientsTurn(p)),
    inThisWeek: (p: PieceFull) => { const k = dayKey(dateOf(p), tz); return k >= start && k <= end; },
    week: publish ? thisWeekToPublish(pieces, now, tz) : thisWeekPending(pieces, now, tz),
    overdue: publish ? overdueToPublish(pieces, now, tz) : overduePieces(pieces, now),
  };
}
