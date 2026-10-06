"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CHANNEL_KEYS, CHANNELS, EDIT_DAYS, GENERIC, MAX_TITLE_WORDS } from "@/lib/constants";
import { addDays, DEFAULT_BUFFER_DAYS, dayKey, SHOW_DEADLINE_TIME } from "@/lib/dates";
import { displayStatus } from "@/lib/pieces";
import { firstUrl, siteName, withoutUrls } from "@/lib/links";
import { blockToBox } from "@/lib/script-parse";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isDemo } from "@/lib/supabase/config";
import type { Channel, PieceFull } from "@/lib/types";
import * as A from "../actions";
import { Btn, ChannelTag, ReceivedActions, StatusPill, useAct } from "../ui";

const field = "w-full rounded-[10px] border bg-surface-2 px-3 text-sm text-text outline-none focus:border-amber placeholder:text-text-4";
const fieldStyle = { borderColor: "rgba(255,255,255,0.12)" };

function F({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2 text-[13px] text-text-2c">
        {label}
        {hint && <span className="text-xs text-text-3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export interface PieceFormInit {
  id?: string;
  client_id: string;
  channel: Channel;
  title: string;
  format: string;
  objective: string;
  hook: string;
  notes: string;
  shots: string;
  publish_date: string;
  record_due_date: string;
  edit_days: number;
  final_url?: string;
  caption?: string;
}

export function PieceForm({ init }: { init: PieceFormInit }) {
  const [state, action, pending] = useActionState<A.SaveState, FormData>(A.savePiece, {});
  const [channel, setChannel] = useState(init.channel);
  const [title, setTitle] = useState(init.title);
  const [publish, setPublish] = useState(init.publish_date);
  const [editDays, setEditDays] = useState(init.edit_days);
  const [due, setDue] = useState(init.record_due_date);
  const [dueTouched, setDueTouched] = useState(!!init.id);
  const words = title.trim() ? title.trim().split(/\s+/).length : 0;

  const recalc = (pub: string, ed: number) => {
    if (!dueTouched && pub) setDue(addDays(pub, -(ed + DEFAULT_BUFFER_DAYS)));
  };

  // Existing pieces save themselves ~0.8 s after you stop typing.
  const autosave = !!init.id;
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [saving, startSave] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const scheduleSave = () => {
    if (!autosave) return;
    setSaveState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      const fd = new FormData(form);
      startSave(async () => {
        try {
          const res = await A.savePiece({}, fd);
          setSaveError(res.error ?? null);
          setSaveState(res.error ? "error" : "saved");
        } catch {
          setSaveError("No se pudo guardar. Revisa tu conexión.");
          setSaveState("error");
        }
      });
    }, 800);
  };

  const status = saving || saveState === "dirty" ? "Guardando…" : saveState === "saved" ? "Guardado ✓" : null;

  return (
    <form
      ref={formRef}
      action={action}
      onChange={scheduleSave}
      // With autosave, Enter just saves now instead of submitting the form.
      onSubmit={autosave ? (e) => { e.preventDefault(); scheduleSave(); } : undefined}
      className="flex flex-col gap-4"
    >
      {init.id && <input type="hidden" name="id" value={init.id} />}
      <input type="hidden" name="client_id" value={init.client_id} />
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <F label="Canal">
          <select
            name="channel"
            value={channel}
            onChange={(e) => {
              const c = e.target.value as Channel;
              setChannel(c);
              if (!init.id) {
                setEditDays(EDIT_DAYS[c]);
                recalc(publish, EDIT_DAYS[c]);
              }
            }}
            className={`${field} h-10`}
            style={fieldStyle}
          >
            {CHANNEL_KEYS.map((k) => <option key={k} value={k}>{CHANNELS[k].name}</option>)}
          </select>
        </F>
        <F label="Título" hint={<span style={{ color: words > MAX_TITLE_WORDS ? "#FF5C5C" : undefined }}>{words}/{MAX_TITLE_WORDS} palabras</span>}>
          <input name="title" value={title} placeholder="Sin título" onChange={(e) => setTitle(e.target.value)} className={`${field} h-10`} style={fieldStyle} />
        </F>
      </div>

      {channel === "extra" ? (
        <F label="Para cuándo">
          <input type="hidden" name="publish_date" value={due} />
          <input type="hidden" name="edit_days" value={0} />
          <input type="date" name="record_due_date" value={due} onChange={(e) => { setDue(e.target.value); setDueTouched(true); }} className={`${field} h-10 max-w-[220px]`} style={fieldStyle} />
        </F>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <F label="Se publica el">
            <input type="date" name="publish_date" value={publish} onChange={(e) => { setPublish(e.target.value); recalc(e.target.value, editDays); }} className={`${field} h-10`} style={fieldStyle} />
          </F>
          <F label="Días de edición">
            <input type="number" min={0} max={60} name="edit_days" value={editDays} onChange={(e) => { const n = Number(e.target.value) || 0; setEditDays(n); recalc(publish, n); }} className={`${field} h-10`} style={fieldStyle} />
          </F>
          <F label={SHOW_DEADLINE_TIME ? "Grabar antes del (20:00)" : "Grabar el"} hint={dueTouched ? <button type="button" className="cursor-pointer border-none bg-transparent p-0 text-xs text-amber" onClick={() => { setDueTouched(false); setDue(addDays(publish, -(editDays + DEFAULT_BUFFER_DAYS))); scheduleSave(); }}>recalcular</button> : "calculada"}>
            <input type="date" name="record_due_date" value={due} onChange={(e) => { setDue(e.target.value); setDueTouched(true); }} className={`${field} h-10`} style={fieldStyle} />
          </F>
        </div>
      )}

      {channel !== "extra" && (
        <F label="Formato">
          <input name="format" defaultValue={init.format} placeholder={GENERIC[channel].format} className={`${field} h-10`} style={fieldStyle} />
        </F>
      )}
      <F label={channel === "extra" ? "Qué necesito que haga" : "Para qué sirve (objetivo)"}>
        <textarea name="objective" defaultValue={init.objective} rows={channel === "extra" ? 4 : 2} className={`${field} py-2.5`} style={fieldStyle} placeholder={channel === "extra" ? "Ej. Mándame 5 fotos tuyas entrenando para la portada" : undefined} />
      </F>
      {channel !== "extra" && (
        <F label="Primera frase a cámara (gancho)">
          <input name="hook" defaultValue={init.hook} className={`${field} h-10`} style={fieldStyle} />
        </F>
      )}
      <div className={channel === "extra" ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        {channel !== "extra" && (
          <F label="Tomas que necesitamos" hint="una por línea">
            <textarea name="shots" defaultValue={init.shots} rows={6} className={`${field} py-2.5`} style={fieldStyle} />
          </F>
        )}
        <F label="Ten en cuenta" hint="una por línea">
          <textarea name="notes" defaultValue={init.notes} rows={6} className={`${field} py-2.5`} style={fieldStyle} />
        </F>
      </div>
      {channel !== "extra" && (
        <div className="flex flex-col gap-3 rounded-xl border p-3.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="text-[11px] font-semibold tracking-[0.08em] text-text-3 uppercase">Para publicar</div>
          <F label="Link del final (Drive)" hint="lo abre el cliente para descargarlo">
            <input type="url" name="final_url" defaultValue={init.final_url ?? ""} placeholder="https://drive.google.com/…" className={`${field} h-10`} style={fieldStyle} />
          </F>
          <F label="Texto para publicar (caption)" hint="el cliente lo copia">
            <textarea name="caption" defaultValue={init.caption ?? ""} rows={4} className={`${field} py-2.5`} style={fieldStyle} />
          </F>
        </div>
      )}
      {(autosave ? saveError : state.error) && <span className="text-[13px] text-red">{autosave ? saveError : state.error}</span>}
      {autosave ? (
        <div className="h-5 text-[13px] text-text-3" aria-live="polite">{status}</div>
      ) : (
        <div>
          <button disabled={pending || words > MAX_TITLE_WORDS} className="h-10 cursor-pointer rounded-[10px] border-none bg-amber px-5 text-sm font-semibold text-amber-ink hover:bg-amber-hover disabled:opacity-50">
            {pending ? "Guardando…" : "Crear borrador"}
          </button>
        </div>
      )}
    </form>
  );
}

/**
 * The script as boxes. One box is fine; add more to split it. No labels: whatever
 * you want to call each part, write it inside the box. Saves itself as you type.
 */
export function ScriptEditor({ piece }: { piece: PieceFull }) {
  const [boxes, setBoxes] = useState<string[]>(() => (piece.blocks.length ? piece.blocks.map(blockToBox) : [""]));
  const [status, setStatus] = useState<"idle" | "dirty" | "saved" | "error">("idle");
  const [saving, startSave] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (next: string[]) => {
    setBoxes(next);
    setStatus("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startSave(async () => {
        try {
          await A.saveScriptBoxes(piece.id, next);
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      });
    }, 800);
  };

  const label = saving || status === "dirty" ? "Guardando…" : status === "saved" ? "Guardado ✓" : status === "error" ? "No se pudo guardar. Revisa tu conexión." : null;

  return (
    <div className="flex flex-col gap-2.5">
      {boxes.map((text, i) => {
        const rec = piece.blocks[i]?.recorded;
        return (
          <div key={i} className="flex flex-col gap-1.5 rounded-xl bg-surface-2 px-3 pt-2.5 pb-3">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-mono text-text-4">{String(i + 1).padStart(2, "0")}</span>
              {rec && <span className="font-semibold text-green">✓ grabado</span>}
              {boxes.length > 1 && (
                <button
                  type="button"
                  onClick={() => (!text.trim() || confirm("¿Quitar este cuadro?")) && update(boxes.filter((_, j) => j !== i))}
                  className="ml-auto cursor-pointer border-none bg-transparent p-0 text-xs text-text-3 hover:text-red"
                >
                  Quitar
                </button>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => update(boxes.map((t, j) => (j === i ? e.target.value : t)))}
              rows={Math.min(24, Math.max(3, text.split("\n").length + 1))}
              placeholder={i === 0 ? "Pega o escribe el guion aquí." : "Siguiente parte del guion"}
              className={`${field} resize-y py-2 text-sm leading-[1.5]`}
              style={fieldStyle}
            />
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={() => update([...boxes, ""])}>+ Añadir cuadro</Btn>
        <span className="text-xs text-text-3">Para dividir al pegar, pon una línea con --- entre partes.</span>
      </div>
      {label && <div className="text-[13px]" style={{ color: status === "error" ? "#FF5C5C" : "#7C8087" }} aria-live="polite">{label}</div>}
    </div>
  );
}

/** Screenshots go straight from the browser to Storage, shrunk to ~100 KB WebP. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("No se pudo procesar la imagen"))), "image/webp", 0.82));
}

async function uploadImage(piece: PieceFull, file: File): Promise<string> {
  const blob = await shrink(file);
  if (isDemo) {
    return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(blob); });
  }
  const sb = supabaseBrowser();
  const path = `${piece.client_id}/${piece.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await sb.storage.from("referencias").upload(path, blob, { contentType: "image/webp" });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return sb.storage.from("referencias").getPublicUrl(path).data.publicUrl;
}

const imagesOf = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));

export function References({ piece }: { piece: PieceFull }) {
  const { pending, run } = useAct();
  const [requested, setRequested] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const blockNo = (id: string | null) => {
    const i = piece.blocks.findIndex((b) => b.id === id);
    return i >= 0 ? `Bloque ${i + 1}` : null;
  };
  const addImages = (files: File[]) => {
    if (!files.length) return;
    setImages((l) => [...l, ...files]);
    setPreviews((l) => [...l, ...files.map((f) => URL.createObjectURL(f))]);
  };
  const clearImages = () => {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setImages([]);
    setPreviews([]);
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      if (requested || !images.length) {
        await A.addReference(fd);
      } else {
        for (const f of images) {
          const one = new FormData(form.current!);
          one.set("image_url", await uploadImage(piece, f));
          await A.addReference(one);
        }
      }
      form.current?.reset();
      setRequested(false);
      clearImages();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {piece.references.map((r) => {
        const img = r.uploaded_url ?? r.image_url;
        const url = firstUrl(r.note, r.title);
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
            {img ? (
              <a href={img} target="_blank" rel="noopener noreferrer" className="flex-none" aria-label="Ver imagen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-16 w-10 rounded-md object-cover" />
              </a>
            ) : (
              <span className="flex h-16 w-10 flex-none items-center justify-center rounded-md border border-dashed text-[10px] text-text-3" style={{ borderColor: "rgba(245,184,61,0.5)" }}>{url ? "link" : "foto"}</span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold">{withoutUrls(r.title) || "Referencia"}</span>
              <span className="text-xs text-text-3">
                {r.requested_from_client ? (r.uploaded_url ? "El cliente ya la envió ✓" : "Pedida al cliente · pendiente") : "De la agencia"}
                {blockNo(r.block_id) && ` · ${blockNo(r.block_id)}`}
                {withoutUrls(r.note) && ` · ${withoutUrls(r.note)}`}
              </span>
              {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs">Abrir en {siteName(url)} ↗</a>}
            </div>
            <Btn kind="danger" disabled={pending} onClick={() => confirm("¿Borrar la referencia?") && run(() => A.deleteReference(piece.id, r.id))}>Borrar</Btn>
          </div>
        );
      })}
      <form
        ref={form}
        onSubmit={submit}
        onPaste={(e) => !requested && addImages(imagesOf(e.clipboardData?.files))}
        className="flex flex-col gap-3 rounded-xl border p-3.5"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <input type="hidden" name="piece_id" value={piece.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Título"><input name="title" className={`${field} h-10`} style={fieldStyle} placeholder={requested ? "Foto de Ramiro hace 3 meses" : "Formato pantalla dividida"} /></F>
          <F label="Bloque del guion">
            <select name="block_id" className={`${field} h-10`} style={fieldStyle} defaultValue="">
              <option value="">— Ninguno —</option>
              {piece.blocks.map((b, i) => <option key={b.id} value={b.id}>Cuadro {i + 1}{b.label ? ` · ${b.label}` : ""}</option>)}
            </select>
          </F>
        </div>
        <F label="Link o nota"><input name="note" className={`${field} h-10`} style={fieldStyle} placeholder="https://www.instagram.com/p/…" /></F>
        <label className="flex items-center gap-2 text-[13px] text-text-2c">
          <input type="checkbox" name="requested" checked={requested} onChange={(e) => setRequested(e.target.checked)} className="size-4 accent-amber" />
          Pedirle este material al cliente (él sube la foto)
        </label>
        {!requested && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addImages(imagesOf(e.dataTransfer.files)); }}
            className="flex flex-col gap-2.5 rounded-[10px] border border-dashed p-3"
            style={{ borderColor: "rgba(255,255,255,0.18)" }}
          >
            <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(imagesOf(e.target.files)); e.target.value = ""; }} />
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-3">
              <Btn onClick={() => picker.current?.click()}>Elegir imágenes</Btn>
              <span>o pega (⌘V) / arrastra screenshots aquí</span>
            </div>
            {previews.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previews.map((u) => <img key={u} src={u} alt="" className="h-16 w-10 rounded-md object-cover" />)}
                <button type="button" onClick={clearImages} className="cursor-pointer border-none bg-transparent text-xs text-text-3 hover:text-white">Quitar</button>
              </div>
            )}
          </div>
        )}
        <div>
          <Btn type="submit" kind="primary" disabled={pending}>
            {pending ? "Subiendo…" : images.length > 1 && !requested ? `Añadir ${images.length} referencias` : "Añadir referencia"}
          </Btn>
        </div>
      </form>
    </div>
  );
}

export function PieceStatusActions({ piece }: { piece: PieceFull }) {
  const { pending, run } = useAct();
  const s = piece.status;
  return (
    <div className="flex flex-wrap gap-2">
      {s === "borrador" && <Btn kind="primary" disabled={pending} onClick={() => run(() => A.sendBriefs([piece.id]))}>Enviar brief</Btn>}
      {s === "edicion" && <Btn kind="primary" disabled={pending} onClick={() => run(() => A.setStatus(piece.id, "listo"))}>Marcar como listo</Btn>}
      {piece.channel !== "extra" && ["borrador", "grabar", "rehacer", "grabado"].includes(s) && (
        <Btn
          disabled={pending}
          onClick={() =>
            (piece.final_url || confirm("Aún no pusiste el link del final. ¿Marcarla lista para publicar de todos modos?")) &&
            run(() => A.markReadyToPublish(piece.id))
          }
        >
          Ya está lista, solo publicar
        </Btn>
      )}
      {s === "listo" && <Btn kind="primary" disabled={pending} onClick={() => run(() => A.setStatus(piece.id, "publicado"))}>Marcar como publicado</Btn>}
      {s !== "cancelado" && s !== "publicado" && (
        <Btn kind="danger" disabled={pending} onClick={() => confirm("¿Cancelar esta pieza? Desaparece del calendario del cliente.") && run(() => A.cancelPiece(piece.id))}>Cancelar pieza</Btn>
      )}
      <Btn kind="danger" disabled={pending} onClick={() => confirm("¿Borrar la pieza definitivamente?") && run(() => A.deletePiece(piece.id))}>Borrar</Btn>
    </div>
  );
}

export function UploadsList({ piece }: { piece: PieceFull }) {
  const open = async (path: string) => {
    const url = await A.fileLink(piece.id, path);
    window.open(url, "_blank", "noopener");
  };
  if (!piece.uploads.length) return <span className="text-[13px] text-text-3">El material lo sube a su carpeta de Drive.</span>;
  return (
    <div className="flex flex-col gap-1.5">
      {piece.uploads.map((u) => (
        <button key={u.id} onClick={() => open(u.file_url)} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border-none bg-surface-2 px-3 py-2 text-left text-[13px] text-text hover:bg-surface-3">
          <span>{u.file_name || u.file_url.split("/").pop()}</span>
          <span className="text-xs text-text-3">{new Date(u.uploaded_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[14px] border bg-sheet p-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <h2 className="m-0 text-[11px] font-semibold tracking-[0.08em] text-text-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** Everything about one piece, editable: used by the calendar side panel and /agencia/pieza/[id]. */
export function PieceEditor({ piece: p, tz, now }: { piece: PieceFull; tz: string; now: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <ChannelTag ch={p.channel} />
          <StatusPill s={displayStatus(p, new Date(now))} />
          {p.brief_sent_at ? <span className="text-xs text-text-3">Brief enviado</span> : <span className="text-xs text-amber">El cliente aún no la ve</span>}
        </div>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.015em]">{p.title}</h1>
        <PieceStatusActions piece={p} />
      </div>

      {p.status === "grabado" && (
        <Section title="Material recibido">
          <UploadsList piece={p} />
          <ReceivedActions id={p.id} received={!!p.received_at} />
        </Section>
      )}

      <Section title="Brief">
        <PieceForm
          key={p.id}
          init={{
            id: p.id, client_id: p.client_id, channel: p.channel, title: p.title === "Sin título" ? "" : p.title, format: p.format ?? "", objective: p.objective ?? "",
            hook: p.hook ?? "", notes: p.notes.join("\n"), shots: p.shots.map((x) => x.text).join("\n"),
            publish_date: dayKey(p.publish_at, tz), record_due_date: dayKey(p.record_due_at, tz), edit_days: p.edit_days,
            final_url: p.final_url ?? "", caption: p.caption ?? "",
          }}
        />
      </Section>
      {p.channel !== "extra" && (
        <Section title="Guion">
          <ScriptEditor piece={p} />
        </Section>
      )}
      <Section title="Referencias">
        <References piece={p} />
      </Section>
      {p.status !== "grabado" && p.channel !== "extra" && (
        <Section title="Material del cliente">
          <UploadsList piece={p} />
        </Section>
      )}
    </div>
  );
}
