"use client";

import Link from "next/link";
import { useState } from "react";
import { CHANNELS } from "@/lib/constants";
import { urgency } from "@/lib/dates";
import { isPending, plural, sessionQueue } from "@/lib/pieces";
import type { PieceFull, PieceReference } from "@/lib/types";
import { ImageViewer, ReadingMode } from "./overlays";
import { ScriptBlockCard } from "./PieceDetail";
import { useApp } from "./state";
import { Pill, UrgencyText } from "./ui";

/**
 * Record everything in one go: all pending pieces (overdue first, then by
 * deadline) in a single continuous list, then upload the material in bulk.
 */
export function RecordingSession() {
  const { pieces, now, base } = useApp();
  // Freeze the queue when the session starts so finished pieces stay in place.
  const [ids] = useState(() => sessionQueue(pieces, now).map((p) => p.id));
  const queue = ids.map((id) => pieces.find((p) => p.id === id)).filter((p): p is PieceFull => !!p);
  const done = queue.filter((p) => !isPending(p)).length;
  const [viewer, setViewer] = useState<PieceReference | null>(null);
  const [reading, setReading] = useState<PieceFull | null>(null);

  return (
    <div className="mx-auto min-h-dvh max-w-[680px] bg-surface pb-16 md:my-7 md:min-h-0 md:rounded-[14px] md:border md:border-white/[0.06]">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-surface px-[18px] pt-[max(12px,env(safe-area-inset-top))] pb-3.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <Link href={base || "/"} className="-ml-2 flex h-11 items-center px-2 text-sm text-text-2c no-underline hover:text-white">‹ Calendario</Link>
          <span className="text-xs text-text-3">Sesión de grabación</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[22px] font-semibold tracking-[-0.015em]">
            {done} de {queue.length} {plural(queue.length, "pieza", "piezas")}
          </span>
          <span className="block h-1 w-28 overflow-hidden rounded-sm" style={{ background: "rgba(245,184,61,0.18)" }}>
            <span className="block h-full bg-amber transition-[width] duration-[400ms]" style={{ width: queue.length ? `${Math.round((done / queue.length) * 100)}%` : "0%" }} />
          </span>
        </div>
      </header>

      {!queue.length ? (
        <div className="px-6 py-16 text-center text-sm text-text-3">No tienes nada pendiente de grabar. 🎉</div>
      ) : (
        <div className="flex flex-col gap-10 px-[18px] pt-5">
          <p className="m-0 text-[13px] leading-[1.45] text-[#9DA1A8]">
            Todo lo que te falta, en orden: primero lo atrasado. Graba cada bloque por separado y márcalo. Al final subes todo de una vez.
          </p>
          {queue.map((p, i) => (
            <SessionPiece key={p.id} p={p} n={i + 1} onOpenRef={setViewer} onRead={() => setReading(p)} />
          ))}
          <BulkUpload queue={queue} />
        </div>
      )}

      <ImageViewer src={viewer?.uploaded_url ?? viewer?.image_url ?? null} caption={viewer?.note} open={!!viewer} onClose={() => setViewer(null)} />
      <ReadingMode blocks={reading?.blocks ?? []} open={!!reading} onClose={() => setReading(null)} />
    </div>
  );
}

function SessionPiece({ p, n, onOpenRef, onRead }: { p: PieceFull; n: number; onOpenRef: (r: PieceReference) => void; onRead: () => void }) {
  const { now, tz, toggleBlock, toggleShot, markRecorded } = useApp();
  const pending = isPending(p);
  const ch = CHANNELS[p.channel];
  const u = urgency(p.record_due_at, now, tz);
  const images = p.references.filter((r) => r.image_url || r.uploaded_url);

  return (
    <section aria-label={p.title} className="flex flex-col gap-3.5" style={{ opacity: pending ? 1 : 0.6, transition: "opacity .3s" }}>
      <div className="flex gap-3">
        <div className="w-1 flex-none rounded-sm" style={{ background: ch.color }} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold" style={{ color: ch.color }}>
              <span className="mr-2 font-mono text-text-4">{String(n).padStart(2, "0")}</span>
              {ch.name}
            </span>
            {pending ? <UrgencyText u={u} size={12} solidPad="2px 8px" /> : <Pill size={12} bg="rgba(79,217,138,0.14)" fg="#4FD98A">✓ Grabada</Pill>}
          </div>
          <h2 className="title-wrap m-0 text-[22px] leading-[1.2] font-semibold tracking-[-0.015em]">{p.title}</h2>
          {p.format && <span className="text-[13px] text-text-2c">{p.format}</span>}
        </div>
      </div>

      {p.status === "rehacer" && p.redo_reason && (
        <div className="rounded-xl border px-3.5 py-3 text-sm leading-[1.45]" style={{ background: "#1E180C", borderColor: "rgba(245,184,61,0.55)", color: "#FFF4DE" }}>
          <span className="font-semibold">Hay que repetirlo:</span> {p.redo_reason}
        </div>
      )}

      {images.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((r) => (
            <button key={r.id} onClick={() => onOpenRef(r)} className="flex-none cursor-pointer overflow-hidden rounded-lg border p-0" style={{ borderColor: "rgba(255,255,255,0.08)" }} aria-label={`Ver referencia: ${r.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.uploaded_url ?? r.image_url!} alt={r.title} className="block h-[88px] w-[54px] object-cover object-top" />
            </button>
          ))}
        </div>
      )}

      {p.hook && !p.blocks.length && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface-3 p-3.5">
          <div className="label-caps">Primera frase a cámara</div>
          <p className="m-0 text-[19px] leading-[1.4] font-medium text-white">{p.hook}</p>
        </div>
      )}

      {p.blocks.length > 0 ? (
        <>
          {p.blocks.map((b, i) => (
            <ScriptBlockCard key={b.id} p={p} i={i} big onOpenRef={onOpenRef} onToggle={pending ? () => toggleBlock(p.id, b.id) : undefined} />
          ))}
          <button onClick={onRead} className="h-11 cursor-pointer rounded-[10px] border bg-transparent text-sm font-medium text-text" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
            Leer mientras grabo
          </button>
        </>
      ) : (
        p.shots.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {p.shots.map((s) => {
              const dn = pending ? s.done : true;
              return (
                <button
                  key={s.id}
                  role="checkbox"
                  aria-checked={dn}
                  disabled={!pending}
                  onClick={() => toggleShot(p.id, s.id)}
                  className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[10px] border-none bg-transparent px-1 text-left active:bg-surface-4 disabled:cursor-default"
                >
                  <span className="flex size-6 flex-none items-center justify-center rounded-[7px] text-sm font-bold text-amber-ink" style={{ background: dn ? "#F5B83D" : "transparent", border: `1.5px solid ${dn ? "#F5B83D" : "#5E6168"}` }}>
                    {dn ? "✓" : ""}
                  </span>
                  <span className="text-[17px] leading-[1.4]" style={{ color: dn ? "#7C8087" : "#F2F3F5", textDecoration: dn && pending ? "line-through" : "none" }}>{s.text}</span>
                </button>
              );
            })}
          </div>
        )
      )}

      {pending && (
        <button onClick={() => markRecorded(p.id)} className="press h-[52px] cursor-pointer rounded-[14px] border-none bg-amber text-[15px] font-semibold text-amber-ink">
          Pieza grabada
        </button>
      )}
    </section>
  );
}

/** Pick the files for each piece, then upload everything at once. */
function BulkUpload({ queue }: { queue: PieceFull[] }) {
  const { uploadMaterial, uploads, showToast } = useApp();
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [busy, setBusy] = useState(false);
  const total = Object.values(files).reduce((n, f) => n + f.length, 0);

  const uploadAll = async () => {
    setBusy(true);
    const entries = Object.entries(files).filter(([, f]) => f.length);
    const results = await Promise.all(entries.map(([id, f]) => uploadMaterial(id, f)));
    setBusy(false);
    const ok = results.filter(Boolean).length;
    setFiles(Object.fromEntries(entries.filter((_, i) => !results[i])));
    showToast(ok === entries.length ? "Material recibido ✓" : `Se subieron ${ok} de ${entries.length}. Reintenta las que fallaron.`);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#121315" }}>
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold">Subir todo el material</span>
        <span className="text-[13px] leading-[1.45] text-[#9DA1A8]">Elige los vídeos de cada pieza y súbelos de una vez.</span>
      </div>
      {queue.map((p) => {
        const u = uploads[p.id];
        const picked = files[p.id]?.length ?? 0;
        return (
          <label key={p.id} className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl bg-surface-3 px-3 py-2">
            <span className="h-6 w-[3px] flex-none rounded-sm" style={{ background: CHANNELS[p.channel].color }} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">{p.title}</span>
              <span className="text-xs" style={{ color: u?.state === "done" ? "#4FD98A" : u?.state === "error" ? "#FF5C5C" : "#7C8087" }}>
                {u?.state === "uploading" ? "Subiendo…" : u?.state === "done" ? "Recibido ✓" : u?.state === "error" ? "No se pudo subir" : picked ? `${picked} ${plural(picked, "archivo", "archivos")}` : p.uploads.length ? "Recibido ✓" : "Sin archivos"}
              </span>
            </span>
            <span className="flex-none text-[13px] font-semibold text-amber">{picked ? "Cambiar" : "Elegir"}</span>
            <input type="file" accept="video/*,image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); setFiles((cur) => ({ ...cur, [p.id]: f })); }} />
          </label>
        );
      })}
      <button
        disabled={!total || busy}
        onClick={uploadAll}
        className="press h-[52px] cursor-pointer rounded-[14px] border-none bg-amber text-[15px] font-semibold text-amber-ink disabled:cursor-default disabled:opacity-40"
      >
        {busy ? "Subiendo…" : total ? `Subir todo (${total} ${plural(total, "archivo", "archivos")})` : "Subir todo"}
      </button>
    </section>
  );
}
