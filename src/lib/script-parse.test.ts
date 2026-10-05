import { describe, expect, it } from "vitest";
import { blockToBox, boxesToBlocks, parseScript } from "./script-parse";

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

  it("keeps a script without headings as a single block", () => {
    const blocks = parseScript("¿Sigues sin poder quitarte la playera?\n\nEn enero muchos se prometieron un físico fuerte.\nNota: Habla lento.");
    expect(blocks).toEqual([{
      label: "Guion",
      duration: null,
      lines: ["¿Sigues sin poder quitarte la playera?", "En enero muchos se prometieron un físico fuerte."],
      note: "Habla lento.",
    }]);
  });

  it("returns no blocks for blank text", () => {
    expect(parseScript("  \n\n ")).toEqual([]);
  });
});

describe("editor boxes", () => {
  it("keeps one box per textarea, no labels, drops empties", () => {
    expect(boxesToBlocks(["Gancho\nHola a todos\n\nSegunda línea", "  ", "CTA: comenta"])).toEqual([
      { label: "", duration: null, lines: ["Gancho", "Hola a todos", "Segunda línea"], note: null },
      { label: "", duration: null, lines: ["CTA: comenta"], note: null },
    ]);
  });
  it("splits a pasted box on --- lines", () => {
    expect(boxesToBlocks(["uno\n---\ndos\n\n———\ntres"]).map((b) => b.lines)).toEqual([["uno"], ["dos"], ["tres"]]);
  });
  it("turns old labelled blocks into plain text", () => {
    expect(blockToBox({ label: "Gancho", duration: "5 s", lines: ["Hola"], note: "Mira a cámara" })).toBe("Gancho (5 s)\nHola\nNota: Mira a cámara");
    expect(blockToBox({ label: "Guion", duration: null, lines: ["Hola"], note: null })).toBe("Hola");
    expect(blockToBox({ label: "", duration: null, lines: ["a", "b"], note: null })).toBe("a\nb");
  });
});
