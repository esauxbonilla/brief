"use client";

import { useRef, useState } from "react";
import { firstUrl, siteName, withoutUrls } from "@/lib/links";
import { CHANNELS, isTask } from "@/lib/constants";
import { dayKey, dayMonth, hhmm, shortLabel, urgency } from "@/lib/dates";
import { cardStyle, isClientsTurn, isPending } from "@/lib/pieces";
import type { PieceFull, PieceReference } from "@/lib/types";
import { ImageViewer, ReadingMode } from "./overlays";
import { useApp } from "./state";
import { AgencyAvatar, ClientAvatar, Pill, SectionLabel, Stepper, UrgencyText } from "./ui";

export type Tab = "brief" | "guion" | "refs";
type Variant = "desktop" | "mobile";

export function pendingRefs(p: PieceFull) {
  return p.references.filter((r) => r.requested_from_client && !r.uploaded_url).length;
}

export function scriptSeconds(p: PieceFull) {
  const s = p.blocks.reduce((acc, b) => acc + (parseInt(b.duration ?? "", 10) || 0), 0);
  return s ? Math.max(10, Math.round(s / 10) * 10) : 0;
}

/** Channel, status pill, title and who has the ball. */
export function DetailHeader({ p, variant }: { p: PieceFull; variant: Variant }) {
  const { now, tz, client, agency } = useApp();
  const st = cardStyle(p, now, tz);
  const ch = CHANNELS[p.channel];
  const mine = isClientsTurn(p);
  const pill = mine ? { bg: st.pillBg === "#F5B83D1F" ? "#F5B83D" : st.pillBg, fg: st.pillBg === "#F5B83D1F" ? "#1A1205" : st.pillFg } : { bg: st.pillBg, fg: st.pillFg };
  const u = urgency(p.record_due_at, now, tz);

  if (variant === "desktop") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-xs font-semibold" style={{ color: ch.color }}>{ch.name}</span>
          <Pill size={12} bg={pill.bg} fg={pill.fg}>{st.pill}</Pill>
        </div>
        <h2 className="m-0 text-2xl leading-[1.15] font-semibold tracking-[-0.015em]" style={{ textWrap: "balance" }}>{p.title}</h2>
        <div className="flex items-center gap-2 text-[13px] text-text-2c">
          {mine ? <ClientAvatar initials={client.initials} size={20} /> : <AgencyAvatar initials={agency.initials} size={20} />}
          <span>{mine ? (isTask(p) ? "Te toca a ti" : "Te toca a ti grabarlo") : `Lo tiene ${agency.name}`}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="w-1 flex-none self-stretch rounded-sm" style={{ background: ch.color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: ch.color }}>{ch.name}</span>
          <Pill size={12} bg={pill.bg} fg={pill.fg}>{st.pill}</Pill>
        </div>
        <h2 className="m-0 text-[22px] leading-[1.15] font-semibold tracking-[-0.015em]" style={{ textWrap: "balance" }}>{p.title}</h2>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-text-2c">
          {mine ? (
            <>
              <span>Te toca a ti ·</span>
              <UrgencyText u={u} size={13} />
            </>
          ) : (
            <span>Lo tiene {agency.name} · se publica el {shortLabel(dayKey(p.publish_at, tz))}</span>
          )}
        </span>
      </div>
    </div>
  );
}

export function DetailTabs({ p, tab, setTab }: { p: PieceFull; tab: Tab; setTab: (t: Tab) => void }) {
  const badge = pendingRefs(p);
  const tabs: [Tab, string][] = [["brief", "Brief"], ["guion", "Guión"], ["refs", "Referencias"]];
  return (
    <div role="tablist" className="flex gap-1 rounded-[11px] bg-surface-4 p-[3px]">
      {tabs.map(([k, label]) => {
        const a = tab === k;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={a}
            onClick={() => setTab(k)}
            className="flex h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none text-sm transition-colors duration-200"
            style={{ fontWeight: a ? 600 : 500, background: a ? "#2A2C31" : "transparent", color: a ? "#FFFFFF" : "#9DA1A8" }}
          >
            {label}
            {k === "refs" && badge > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-amber text-[11px] font-bold text-amber-ink">{badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RedoBox({ reason }: { reason: string }) {
  return (
    <div className="rounded-xl border px-3.5 py-3 text-sm leading-[1.45]" style={{ background: "#1E180C", borderColor: "rgba(245,184,61,0.55)", color: "#FFF4DE" }}>
      <span className="font-semibold">Hay que repetirlo:</span> {reason}
    </div>
  );
}

export function UploadStatus({ p }: { p: PieceFull }) {
  const { uploads, tz } = useApp();
  const u = uploads[p.id];
  if (u?.state === "uploading") return <div className="text-[13px] text-text-2c">Subiendo…</div>;
  if (u?.state === "error")
    return (
      <div className="text-[13px] text-red">
        No se pudo subir.{" "}
        <button onClick={u.retry} className="cursor-pointer border-none bg-transparent p-0 font-semibold text-red underline">Reintentar</button>
      </div>
    );
  const last = p.uploads.at(-1);
  if (!last && u?.state !== "done") return null;
  const at = u?.state === "done" ? u.at : last!.uploaded_at;
  return (
    <div className="flex flex-col gap-1 text-[13px]">
      <span className="font-semibold text-green">Recibido ✓ <span className="font-normal text-text-3">a las {hhmm(at, tz)}</span></span>
      {p.received_at && <span className="text-green">Revisado por la agencia ✓</span>}
    </div>
  );
}

export function BriefTab({ p, variant }: { p: PieceFull; variant: Variant }) {
  const { now, tz, toggleShot } = useApp();
  const pending = isPending(p);
  const u = urgency(p.record_due_at, now, tz);
  const done = p.shots.filter((s) => s.done || !pending).length;
  const mobile = variant === "mobile";

  return (
    <div className="flex flex-col gap-5">
      {p.status === "rehacer" && p.redo_reason && <RedoBox reason={p.redo_reason} />}

      {isTask(p) ? (
        <div className="flex flex-col gap-[3px] rounded-lg bg-surface-2 px-3 py-2.5">
          <span className="text-[11px] text-text-3">Para el</span>
          <span className="text-sm font-semibold">{shortLabel(dayKey(p.record_due_at, tz))}</span>
          {pending && <span className="mt-0.5"><UrgencyText u={u} size={12} /></span>}
        </div>
      ) : mobile ? (
        <div className="flex gap-2">
          {p.format && <span className="rounded-lg bg-surface-4 px-2.5 py-1.5 text-xs text-text-2">{p.format}</span>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="flex flex-col gap-[3px] bg-surface-2 px-3 py-2.5">
            <span className="text-[11px] text-text-3">{pending ? "Grábalo antes del" : "Se publica el"}</span>
            <span className="text-sm font-semibold">{shortLabel(dayKey(pending ? p.record_due_at : p.publish_at, tz))}</span>
            {pending && <span className="mt-0.5"><UrgencyText u={u} size={12} /></span>}
          </div>
          <div className="flex flex-col gap-[3px] bg-surface-2 px-3 py-2.5">
            <span className="text-[11px] text-text-3">Formato</span>
            <span className="text-sm font-semibold">{p.format ?? "—"}</span>
          </div>
        </div>
      )}

      {p.objective && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>{isTask(p) ? "Qué necesitamos que hagas" : "Para qué sirve"}</SectionLabel>
          <p className="m-0 leading-[1.5] text-text-2" style={{ fontSize: mobile ? 15 : 14, textWrap: "pretty" }}>{p.objective}</p>
        </div>
      )}

      {p.hook && (
        <div className={mobile ? "flex flex-col gap-1.5 rounded-xl bg-surface-3 p-3.5" : "flex flex-col gap-1.5"}>
          <SectionLabel>Primera frase a cámara</SectionLabel>
          <p className="m-0 leading-[1.45] font-medium text-white" style={{ fontSize: mobile ? 16 : 15, textWrap: "pretty" }}>{p.hook}</p>
        </div>
      )}

      {p.shots.length > 0 && (
        <div className={mobile ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
          <div className="flex items-baseline justify-between" style={{ paddingBottom: mobile ? 4 : 0 }}>
            <SectionLabel>Tomas que necesitamos</SectionLabel>
            <span className="text-xs tabular-nums text-text-2c">{done} de {p.shots.length}{mobile ? "" : " listas"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {p.shots.map((s) => {
              const dn = pending ? s.done : true;
              const box = dn ? (pending ? "#F5B83D" : "#3A3D42") : "transparent";
              const border = dn ? box : "#5E6168";
              return (
                <button
                  key={s.id}
                  onClick={() => pending && toggleShot(p.id, s.id)}
                  disabled={!pending}
                  role="checkbox"
                  aria-checked={dn}
                  className={
                    mobile
                      ? "-mx-2.5 flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[10px] border-none bg-transparent px-2.5 py-1.5 text-left transition-colors active:bg-surface-4 disabled:cursor-default"
                      : "flex cursor-pointer items-start gap-[11px] rounded-[7px] border-none bg-transparent px-2 py-[9px] text-left hover:bg-surface-3 disabled:cursor-default disabled:hover:bg-transparent"
                  }
                >
                  <span
                    className="flex flex-none items-center justify-center font-bold text-amber-ink"
                    style={{
                      width: mobile ? 24 : 18, height: mobile ? 24 : 18, borderRadius: mobile ? 7 : 5, marginTop: mobile ? 0 : 1,
                      fontSize: mobile ? 14 : 12, background: box, border: `1.5px solid ${border}`,
                      transition: "background .18s, border-color .18s, transform .18s", transform: mobile && dn && pending ? "scale(1.06)" : "scale(1)",
                    }}
                  >
                    {dn ? "✓" : ""}
                  </span>
                  <span
                    className="leading-[1.4]"
                    style={{ fontSize: mobile ? 15 : 14, color: dn && (mobile || !pending) ? "#7C8087" : "#E8E9EB", textDecoration: dn && pending ? "line-through" : "none", transition: "color .18s" }}
                  >
                    {s.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {p.notes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Ten en cuenta</SectionLabel>
          {p.notes.map((n, i) => (
            <div key={i} className="flex gap-2 leading-[1.45] text-text-2c" style={{ fontSize: mobile ? 14 : 13 }}>
              <span className="text-text-4">—</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}

      {!isTask(p) && <Stepper status={p.status} small={mobile} />}

      <UploadStatus p={p} />

      {!isClientsTurn(p) && (
        <div className={mobile ? "rounded-xl bg-surface-3 p-3.5 text-sm leading-[1.45] text-[#9DA1A8]" : "rounded-lg bg-surface-2 p-3 text-[13px] text-text-3"}>
          No tienes que hacer nada con esta pieza. Te avisaremos si necesitamos algo.
        </div>
      )}

      {pending && !isTask(p) && <div className="text-xs text-text-3">Se publica el {dayMonth(dayKey(p.publish_at, tz))}</div>}
    </div>
  );
}

export function GuionTab({ p, onOpenRef, onRead, showCta = true }: { p: PieceFull; onOpenRef: (r: PieceReference) => void; onRead: () => void; showCta?: boolean }) {
  const { toggleBlock } = useApp();
  if (!p.blocks.length) {
    return <div className="py-10 text-center text-sm text-text-3">La agencia aún no ha subido el guion de esta pieza.</div>;
  }
  const n = p.blocks.filter((b) => b.recorded).length;
  const secs = scriptSeconds(p);
  const pending = isPending(p);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold">{p.blocks.length} bloques{secs ? ` · unos ${secs} s` : ""}</span>
          <span className="text-xs text-text-3">{n ? `${n} de ${p.blocks.length} grabados` : "Ninguno grabado todavía"}</span>
        </div>
        <span className="block h-1 w-24 overflow-hidden rounded-sm bg-[#24262B]">
          <span className="block h-full bg-amber transition-[width] duration-[350ms]" style={{ width: `${Math.round((n / p.blocks.length) * 100)}%` }} />
        </span>
      </div>
      <div className="text-[13px] leading-[1.45] text-[#9DA1A8]">Graba cada bloque por separado. Si te equivocas, repite solo ese bloque.</div>
      {p.blocks.map((b, i) => (
        <ScriptBlockCard key={b.id} p={p} i={i} onOpenRef={onOpenRef} onToggle={pending ? () => toggleBlock(p.id, b.id) : undefined} />
      ))}
      {showCta && (
        <button onClick={onRead} className="press mt-1 h-[52px] w-full cursor-pointer rounded-[14px] border-none bg-amber text-[15px] font-semibold text-amber-ink hover:bg-amber-hover">
          Leer mientras grabo
        </button>
      )}
    </div>
  );
}

export function ScriptBlockCard({ p, i, onOpenRef, onToggle, big = false }: { p: PieceFull; i: number; onOpenRef: (r: PieceReference) => void; onToggle?: () => void; big?: boolean }) {
  const b = p.blocks[i];
  const d = b.recorded;
  const ref = p.references.find((r) => r.block_id === b.id && r.image_url && !r.requested_from_client);
  return (
    <div
      className="flex flex-col gap-3 rounded-[14px] border p-3.5"
      style={{ background: d ? "#121A14" : "#17181B", borderColor: d ? "rgba(79,217,138,0.35)" : "rgba(255,255,255,0.06)", transition: "background .2s, border-color .2s" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-text-4">{String(i + 1).padStart(2, "0")}</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: d ? "#4FD98A" : "#C9CCD1" }}>{b.label}</span>
        </span>
        {b.duration && <span className="text-xs text-text-3">{b.duration}</span>}
      </div>
      {ref && (
        <button
          onClick={() => onOpenRef(ref)}
          className="flex cursor-pointer items-center gap-3 rounded-[10px] border p-2 text-left text-inherit"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0F1012" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ref.image_url!} alt="Referencia" className="h-[72px] w-11 flex-none rounded-md object-cover" />
          <span className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-[13px] font-semibold">{ref.title}</span>
            <span className="text-xs leading-[1.35] text-[#9DA1A8]">{ref.note ? `${ref.note.split(".")[0]}. ` : ""}Toca para verla.</span>
          </span>
        </button>
      )}
      <div className="flex flex-col gap-2.5">
        {b.lines.map((l, j) => (
          <p key={j} className="m-0 leading-[1.45] font-medium transition-colors duration-200" style={{ fontSize: big ? 19 : 17, textWrap: "pretty", color: d ? "#7C8087" : "#F2F3F5" }}>{l}</p>
        ))}
      </div>
      {b.note && (
        <div className="flex gap-1.5 text-xs leading-[1.4] text-[#9DA1A8]">
          <span className="text-text-4">Nota:</span>
          <span>{b.note}</span>
        </div>
      )}
      {onToggle && (
        <button
          onClick={onToggle}
          className="press flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border text-sm font-semibold"
          style={{ background: d ? "rgba(79,217,138,0.14)" : "transparent", color: d ? "#4FD98A" : "#E8E9EB", borderColor: d ? "transparent" : "rgba(255,255,255,0.14)", transition: "background .2s, color .2s, transform .12s" }}
        >
          {d ? "✓ Grabado" : "Marcar como grabado"}
        </button>
      )}
    </div>
  );
}

export function RefsTab({ p, onOpenRef }: { p: PieceFull; onOpenRef: (r: PieceReference) => void }) {
  const { uploadReference, uploads } = useApp();
  const requested = p.references.filter((r) => r.requested_from_client);
  const fromAgency = p.references.filter((r) => !r.requested_from_client);
  const blockNo = (r: PieceReference) => {
    const i = p.blocks.findIndex((b) => b.id === r.block_id);
    return i >= 0 ? i + 1 : null;
  };
  if (!p.references.length) return <div className="py-10 text-center text-sm text-text-3">Esta pieza no tiene referencias.</div>;

  return (
    <div className="flex flex-col gap-4">
      {requested.map((r) => (
        <RequestedRef key={r.id} r={r} state={uploads[`ref:${r.id}`]} onFile={(f) => uploadReference(p.id, r.id, f)} onOpen={() => onOpenRef(r)} />
      ))}
      {fromAgency.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <SectionLabel>De la agencia</SectionLabel>
          {fromAgency.map((r) => {
            const url = firstUrl(r.note, r.title);
            const note = withoutUrls(r.note);
            return (
              <div key={r.id} className="flex flex-col overflow-hidden rounded-[14px] border bg-surface-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                {r.image_url && (
                  <button onClick={() => onOpenRef(r)} aria-label={`Ver ${r.title} en grande`} className="press block cursor-zoom-in border-none bg-transparent p-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image_url} alt={r.title} className="block h-[300px] w-full object-cover object-top" />
                  </button>
                )}
                <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5">
                  <span className="text-sm font-semibold">{withoutUrls(r.title) || "Referencia"}</span>
                  {note && <span className="text-[13px] leading-[1.4] text-[#9DA1A8]">{note}</span>}
                  {blockNo(r) && <span className="mt-1 text-xs text-blue">Se usa en el bloque {blockNo(r)}</span>}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press mt-2 flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-white/[0.07] text-sm font-semibold text-text no-underline hover:bg-white/10 hover:text-text"
                    >
                      Abrir en {siteName(url)} ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequestedRef({ r, state, onFile, onOpen }: { r: PieceReference; state?: ReturnType<typeof useApp>["uploads"][string]; onFile: (f: File) => void; onOpen: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { readOnly, blocked } = useApp();
  const sent = !!r.uploaded_url;
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border p-3.5" style={{ borderColor: sent ? "rgba(79,217,138,0.35)" : "rgba(245,184,61,0.55)", background: sent ? "#121A14" : "#1E180C" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: sent ? "#E8E9EB" : "#FFF4DE" }}>{r.title}</span>
        {sent ? <Pill bg="rgba(79,217,138,0.14)" fg="#4FD98A">Enviada ✓</Pill> : <Pill bg="#F5B83D" fg="#1A1205">Envíala tú</Pill>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {sent ? (
        <button onClick={onOpen} className="h-[120px] cursor-pointer overflow-hidden rounded-[10px] border-none p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.uploaded_url!} alt={r.title} className="h-full w-full object-cover" />
        </button>
      ) : (
        <button
          onClick={() => (readOnly ? blocked() : input.current?.click())}
          className="flex h-[120px] cursor-pointer items-center justify-center rounded-[10px] border border-dashed font-mono text-xs"
          style={{ borderColor: "rgba(245,184,61,0.5)", background: "repeating-linear-gradient(135deg, rgba(245,184,61,0.06) 0 8px, transparent 8px 16px)", color: "#C9B38A" }}
        >
          {state?.state === "uploading" ? "Subiendo…" : state?.state === "error" ? "No se pudo subir. Toca para reintentar" : "Toca para subir la foto"}
        </button>
      )}
      {r.note && <span className="text-xs leading-[1.4]" style={{ color: sent ? "#7C8087" : "#C9B38A" }}>{r.note}</span>}
    </div>
  );
}

/** "Subir a Drive" (the agency's folder) + "Ya lo grabé". */
export function ActionButtons({ p, variant, onRecorded }: { p: PieceFull; variant: Variant; onRecorded?: () => void }) {
  const { markRecorded, client } = useApp();
  const drive = isTask(p) ? null : client.drive_url;
  const doneLabel = isTask(p) ? "Hecho ✓" : "Ya lo grabé";
  const recorded = () => { markRecorded(p.id); onRecorded?.(); };
  if (variant === "mobile") {
    return (
      <div className="flex flex-none gap-2.5 border-t bg-sheet-mobile px-[18px] pt-3 pb-[max(30px,env(safe-area-inset-bottom))]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {drive ? (
          <>
            <button onClick={recorded} className="h-[52px] flex-1 cursor-pointer rounded-[14px] border bg-transparent text-[15px] font-medium text-text transition-transform active:scale-[0.97]" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
              {doneLabel}
            </button>
            <a href={drive} target="_blank" rel="noopener noreferrer" className="flex h-[52px] flex-[1.3] items-center justify-center rounded-[14px] bg-amber text-[15px] font-semibold text-amber-ink no-underline transition-transform active:scale-[0.97] hover:text-amber-ink">
              Subir a Drive ↗
            </a>
          </>
        ) : (
          <button onClick={recorded} className="h-[52px] flex-1 cursor-pointer rounded-[14px] border-none bg-amber text-[15px] font-semibold text-amber-ink transition-transform active:scale-[0.97]">
            {doneLabel}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {drive && (
        <a href={drive} target="_blank" rel="noopener noreferrer" className="flex h-11 flex-[1_1_160px] items-center justify-center rounded-[9px] bg-amber text-sm font-semibold text-amber-ink no-underline hover:bg-amber-hover hover:text-amber-ink">
          Subir a Drive ↗
        </a>
      )}
      <button
        onClick={recorded}
        className={`h-11 flex-[1_1_140px] cursor-pointer rounded-[9px] text-sm ${drive ? "border bg-transparent font-medium text-text hover:bg-surface-3" : "border-none bg-amber font-semibold text-amber-ink hover:bg-amber-hover"}`}
        style={drive ? { borderColor: "rgba(255,255,255,0.14)" } : undefined}
      >
        {doneLabel}
      </button>
    </div>
  );
}

/** Image viewer + reading mode state, shared by desktop panel and mobile sheet. */
export function useDetailOverlays(p: PieceFull | undefined) {
  const [viewer, setViewer] = useState<PieceReference | null>(null);
  const [reading, setReading] = useState(false);
  const overlays = (
    <>
      <ImageViewer src={viewer?.uploaded_url ?? viewer?.image_url ?? null} caption={viewer?.note} open={!!viewer} onClose={() => setViewer(null)} />
      <ReadingMode blocks={p?.blocks ?? []} open={reading} onClose={() => setReading(false)} />
    </>
  );
  return { openRef: setViewer, openReading: () => setReading(true), overlays };
}
