import { describe, expect, it } from "vitest";
import { zonedTime } from "./dates";
import { composeDailyMessage } from "./notify";
import type { Piece } from "./types";

const TZ = "America/Mexico_City";
const NOW = zonedTime("2026-10-01", "09:00", TZ);
const piece = (due: string, status: Piece["status"] = "grabar"): Piece => ({
  id: due + status, client_id: "c", channel: "reel", title: "T", status, format: null, objective: null, hook: null, notes: [],
  publish_at: zonedTime(due, "12:00", TZ).toISOString(), record_due_at: zonedTime(due, "20:00", TZ).toISOString(),
  edit_days: 3, brief_sent_at: "2026-09-20T00:00:00Z", redo_reason: null, received_at: null,
});

describe("composeDailyMessage", () => {
  it("joins queued events, reminders and overdue in one message", () => {
    const msg = composeDailyMessage(
      [piece("2026-10-03"), piece("2026-10-03"), piece("2026-09-29"), piece("2026-10-03", "grabado")],
      [{ kind: "brief", message: "Nuevo brief: 3 piezas para grabar antes del jue 8 oct" }],
      NOW,
      TZ,
    );
    expect(msg).toBe("Nuevo brief: 3 piezas para grabar antes del jue 8 oct. Te faltan 2 piezas, vencen pasado mañana. Tienes 1 pieza atrasada.");
  });

  it("returns null when there's nothing to say", () => {
    expect(composeDailyMessage([piece("2026-10-10")], [], NOW, TZ)).toBeNull();
  });
});
