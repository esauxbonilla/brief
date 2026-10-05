// Turns a script pasted from Google Docs into blocks. A block starts at a
// known heading (Gancho, Problema, Solución, Prueba social, CTA); every
// non-empty paragraph after it is one line. "Nota: …" paragraphs become the
// block note. An optional duration may follow the heading: "Gancho (5 s)".
// Headings are optional: a script without any becomes a single "Guion" block.

export const HEADINGS = ["Gancho", "Problema", "Solución", "Prueba social", "CTA"];

export interface ParsedBlock {
  label: string;
  duration: string | null;
  lines: string[];
  note: string | null;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const NORM_HEADINGS = new Map(HEADINGS.map((h) => [norm(h), h]));

function matchHeading(raw: string): { label: string; duration: string | null } | null {
  // Strip bullets/numbering/markdown and trailing colon: "1. **Gancho** (5 s):"
  const s = raw.replace(/^[\s#*\-•\d.)]+/, "").replace(/\*\*/g, "").trim();
  // Label, then optionally a duration in brackets or after a separator.
  const m = s.match(/^([^(\[:–—-]+?)\s*(?:[(\[]\s*([^)\]]+?)\s*[)\]]|[:–—-]\s*(\d+\s*(?:s|seg|segundos)\.?))?\s*[:–—-]?\s*$/i);
  if (!m) return null;
  const label = NORM_HEADINGS.get(norm(m[1]));
  if (!label) return null;
  const dur = m[2] ?? m[3];
  return { label, duration: dur ? dur.replace(/\s*(seg(undos)?\.?|s)$/i, " s") : null };
}

export function parseScript(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const paragraphs = text.replace(/\r\n?/g, "\n").replace(/ /g, " ").split("\n");
  const hasHeadings = paragraphs.some((raw) => matchHeading(raw.trim()));
  if (!hasHeadings && paragraphs.some((raw) => raw.trim())) {
    blocks.push({ label: "Guion", duration: null, lines: [], note: null });
  }
  for (const raw of paragraphs) {
    const p = raw.trim();
    if (!p) continue;
    const h = matchHeading(p);
    if (h) {
      blocks.push({ label: h.label, duration: h.duration, lines: [], note: null });
      continue;
    }
    if (!blocks.length) continue; // text before the first heading is ignored
    const cur = blocks[blocks.length - 1];
    const note = p.match(/^nota\s*:\s*(.+)$/i);
    if (note) cur.note = cur.note ? `${cur.note} ${note[1]}` : note[1];
    else cur.lines.push(p);
  }
  return blocks;
}

/** A line with only dashes/underscores (---, ___, ——) splits a box in two when pasting. */
const SEPARATOR = /^\s*(?:-{3,}|_{3,}|—{2,}|–{2,})\s*$/;

/**
 * The editor's boxes, as typed: no labels, each non-empty paragraph is a line.
 * Empty boxes are dropped and "---" lines split a box into several.
 */
export function boxesToBlocks(texts: string[]): ParsedBlock[] {
  const out: ParsedBlock[] = [];
  for (const text of texts) {
    let cur: string[] = [];
    const flush = () => {
      if (cur.length) out.push({ label: "", duration: null, lines: cur, note: null });
      cur = [];
    };
    for (const raw of text.replace(/\r\n?/g, "\n").replace(/ /g, " ").split("\n")) {
      if (SEPARATOR.test(raw)) flush();
      else if (raw.trim()) cur.push(raw.trim());
    }
    flush();
  }
  return out;
}

/** Text for an editor box from a stored block (older blocks keep their label as the first line). */
export function blockToBox(b: { label: string; duration: string | null; lines: string[]; note: string | null }): string {
  const head = b.label && b.label !== "Guion" ? [b.duration ? `${b.label} (${b.duration})` : b.label] : [];
  const tail = b.note ? [`Nota: ${b.note}`] : [];
  return [...head, ...b.lines, ...tail].join("\n");
}
