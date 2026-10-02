import { describe, expect, it } from "vitest";
import { parseScript } from "./script-parse";

describe("parseScript", () => {
  it("splits by headings, one line per paragraph", () => {
    const text = `Guion reel verano

Gancho (5 s)
¿Sigues sin poder quitarte la playera?
Nota: Mira directo a cámara.

PROBLEMA:
En enero muchos se prometieron un físico fuerte.

Y siempre escucho las mismas excusas.
Solucion
Son excusas.
**Prueba social** – 15 seg
Mi paciente Ramiro estaba así.
cta
Comenta “Ramiro”.`;
    const blocks = parseScript(text);
    expect(blocks.map((b) => b.label)).toEqual(["Gancho", "Problema", "Solución", "Prueba social", "CTA"]);
    expect(blocks[0]).toEqual({ label: "Gancho", duration: "5 s", lines: ["¿Sigues sin poder quitarte la playera?"], note: "Mira directo a cámara." });
    expect(blocks[1].lines).toHaveLength(2);
    expect(blocks[4].lines).toEqual(["Comenta “Ramiro”."]);
  });

  it("does not treat sentences that start with a heading word as headings", () => {
    const blocks = parseScript("Gancho\nProblema de muchos: no tienen tiempo.");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].lines).toEqual(["Problema de muchos: no tienen tiempo."]);
  });
});
