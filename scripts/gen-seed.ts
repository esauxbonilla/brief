// Generates supabase/seed.sql from src/lib/seed-data.ts.
// Run: npx tsx scripts/gen-seed.ts  (or npm run seed:gen)
// Dates are relative to the day the seed runs, so the demo always looks current.

import { writeFileSync } from "node:fs";
import { SEED_AGENCY, SEED_CLIENT, SEED_PIECES, seedDefaults } from "../src/lib/seed-data";
import { isPending } from "../src/lib/pieces";

const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const arr = (a: string[]) => `array[${a.map(q).join(", ")}]::text[]`;
const at = (offset: number) => `((current_date + ${offset})::timestamp + time '20:00') at time zone ${q(SEED_CLIENT.tz)}`;

const out: string[] = [
  "-- Generado por scripts/gen-seed.ts — no editar a mano.",
  "-- Datos de ejemplo de los prototipos. Fechas relativas al día en que se ejecuta.",
  "",
  "do $$",
  "declare a uuid; c uuid; p uuid; b uuid;",
  "begin",
  `insert into agencies (name, initials) values (${q(SEED_AGENCY.name)}, ${q(SEED_AGENCY.initials)}) returning id into a;`,
  `insert into clients (agency_id, name, initials, phone, tz, email) values (a, ${q(SEED_CLIENT.name)}, ${q(SEED_CLIENT.initials)}, ${q(SEED_CLIENT.phone)}, ${q(SEED_CLIENT.tz)}, 'marco@example.com') returning id into c;`,
];

for (const s of SEED_PIECES) {
  const d = seedDefaults(s);
  const publish = s.due + d.editDays + 1;
  const pending = isPending({ status: s.status });
  out.push(
    "",
    `-- ${s.title}`,
    `insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)`,
    `values (c, '${s.channel}', ${q(s.title)}, '${s.status}', ${q(d.format)}, ${q(d.objective)}, ${q(d.hook)}, ${arr(d.notes)},`,
    `  ${at(publish)}, ${at(s.due)}, ${d.editDays}, ${d.briefSent ? `${at(s.due - 7)}` : "null"}, ${q(s.redoReason)}) returning id into p;`,
  );
  d.shots.forEach((t, i) => out.push(`insert into shots (piece_id, position, text, done) values (p, ${i}, ${q(t)}, ${!pending});`));
  const blockIds: string[] = [];
  (s.blocks ?? []).forEach((bl, i) => {
    out.push(`insert into script_blocks (piece_id, position, label, duration, lines, note) values (p, ${i}, ${q(bl.label)}, ${q(bl.duration)}, ${arr(bl.lines)}, ${q(bl.note)}) returning id into b;`);
    out.push(`perform set_config('seed.b${i}', b::text, true);`);
    blockIds.push(`current_setting('seed.b${i}')::uuid`);
  });
  for (const r of s.references ?? []) {
    out.push(
      `insert into piece_references (piece_id, block_id, image_url, title, note, requested_from_client) values (p, ${r.block != null ? blockIds[r.block] : "null"}, ${q(r.image)}, ${q(r.title)}, ${q(r.note)}, ${!!r.requested});`,
    );
  }
}

out.push("end $$;", "");
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out.join("\n"));
console.log("supabase/seed.sql written");
