"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { CHANNEL_KEYS, CHANNELS, FLOW, STATUS } from "@/lib/constants";
import { URGENCY_STYLE, type Urgency } from "@/lib/dates";
import type { Channel, Status } from "@/lib/types";

export function ClientAvatar({ initials, size = 18, title }: { initials: string; size?: number; title?: string }) {
  return (
    <span
      title={title}
      className="flex flex-none items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: "#E9D3A8", color: "#2A1F0C", fontSize: size >= 36 ? 12 : size >= 20 ? 9 : 8 }}
    >
      {initials}
    </span>
  );
}

export function AgencyAvatar({ initials, size = 18, title }: { initials: string; size?: number; title?: string }) {
  return (
    <span
      title={title}
      className="flex flex-none items-center justify-center font-mono"
      style={{ width: size, height: size, borderRadius: size >= 20 ? 5 : 4, background: "#24262B", color: "#8A8D93", fontSize: size >= 20 ? 9 : 8 }}
    >
      {initials}
    </span>
  );
}

export function Pill({ children, bg, fg, size = 11, style }: { children: ReactNode; bg: string; fg: string; size?: 11 | 12; style?: CSSProperties }) {
  return (
    <span
      className="whitespace-nowrap rounded-full font-semibold"
      style={{ fontSize: size, padding: size === 11 ? "2px 7px" : "3px 10px", background: bg, color: fg, ...style }}
    >
      {children}
    </span>
  );
}

/** Urgency phrase with its tone (gris / ámbar / ámbar sólido / rojo). */
export function UrgencyText({ u, size = 12, solidPad = "1px 6px", wrap = false }: { u: Urgency; size?: number; solidPad?: string; wrap?: boolean }) {
  const s = URGENCY_STYLE[u.tone];
  const solid = u.tone === "urgent";
  return (
    <span
      className={wrap ? "font-semibold" : "whitespace-nowrap font-semibold"}
      style={{ fontSize: size, color: s.fg, background: s.bg, borderRadius: solid ? 999 : 0, padding: solid ? solidPad : 0, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
    >
      {u.text}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="label-caps">{children}</div>;
}

export function ChannelChips({
  filter, setFilter, height = 32, scroll = false,
}: { filter: Channel | "all"; setFilter: (f: Channel | "all") => void; height?: number; scroll?: boolean }) {
  const defs: [Channel | "all", string, string][] = [["all", "Todo", "#E8E9EB"], ...CHANNEL_KEYS.map((k) => [k, CHANNELS[k].name, CHANNELS[k].color] as [Channel, string, string])];
  return (
    <div className={scroll ? "no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3" : "flex flex-wrap gap-2"}>
      {defs.map(([k, label, color]) => {
        const a = filter === k;
        return (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={a}
            className="flex flex-none cursor-pointer items-center gap-2 rounded-full text-[13px] transition-colors"
            style={{ height, padding: "0 14px", fontWeight: a ? 600 : 500, background: a ? color : "transparent", color: a ? "#0B0B0D" : "#C9CCD1", border: `1px solid ${a ? color : "rgba(255,255,255,0.12)"}` }}
          >
            <span className="size-2 rounded-full" style={{ background: a ? "#0B0B0D" : color }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3.5 text-xs text-text-3">
      {[...FLOW, "rehacer" as const, "atrasado" as const].map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="rounded-full" style={{ width: 7, height: 7, background: STATUS[k].color }} />
          {STATUS[k].name}
        </span>
      ))}
    </div>
  );
}

/** 5-segment stepper of the status flow. */
export function Stepper({ status, small = false }: { status: Status; small?: boolean }) {
  const cur = status === "rehacer" ? 0 : FLOW.indexOf(status);
  return (
    <div className="grid grid-cols-5 gap-1">
      {FLOW.map((k, i) => (
        <div key={k} className="flex flex-col gap-[5px]">
          <div className="h-[3px] rounded-sm" style={{ background: i < cur ? "#3A3D42" : i === cur ? STATUS[k].color : "#1F2024" }} />
          <span style={{ fontSize: small ? 10 : 10.5, color: i === cur ? STATUS[k].color : "#5E6168", fontWeight: i === cur ? 600 : 500 }}>{STATUS[k].name}</span>
        </div>
      ))}
    </div>
  );
}

const NEW_LABEL: Record<Channel, string> = { reel: "Reel", story: "Story", lead: "Lead magnet", carrusel: "Carrusel", extra: "Extra (tarea)" };

/**
 * "+" that asks which kind of piece to create. The menu is fixed-positioned so
 * calendar cells (overflow hidden) don't clip it.
 */
export function NewPieceButton({ onPick, disabled, label, className, children }: {
  onPick: (c: Channel) => void;
  disabled?: boolean;
  label: string;
  className: string;
  children: ReactNode;
}) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={!!at}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setAt(at ? null : { top: Math.min(r.bottom + 6, window.innerHeight - 236), left: Math.max(8, Math.min(r.right - 200, window.innerWidth - 208)) });
        }}
        className={className}
      >
        {children}
      </button>
      {at && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setAt(null)} />
          <div className="fixed z-[81] flex w-[200px] flex-col rounded-xl border bg-surface-2 p-1.5 shadow-lg" style={{ top: at.top, left: at.left, borderColor: "rgba(255,255,255,0.1)" }}>
            <span className="px-2.5 pt-1 pb-1.5 text-[11px] text-text-3">Crear</span>
            {CHANNEL_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { setAt(null); onPick(k); }}
                className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 text-left text-sm text-text hover:bg-white/5"
              >
                <span className="size-2 rounded-full" style={{ background: CHANNELS[k].color }} />
                {NEW_LABEL[k]}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** "Grabar | Publicar": which date the calendar is organized by. */
export function ModeToggle({ mode, setMode, counts, full = false }: { mode: "grabar" | "publicar"; setMode: (m: "grabar" | "publicar") => void; counts: { grabar: number; publicar: number }; full?: boolean }) {
  const opts: ["grabar" | "publicar", string][] = [["grabar", "Grabar"], ["publicar", "Publicar"]];
  return (
    <div role="tablist" aria-label="Ver calendario por" className={`flex gap-1 rounded-[11px] bg-surface-4 p-[3px] ${full ? "w-full" : ""}`}>
      {opts.map(([k, label]) => {
        const a = mode === k;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={a}
            onClick={() => setMode(k)}
            className={`flex h-[34px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none px-3.5 text-sm transition-colors duration-200 ${full ? "flex-1" : ""}`}
            style={{ fontWeight: a ? 600 : 500, background: a ? "#2A2C31" : "transparent", color: a ? "#FFFFFF" : "#9DA1A8" }}
          >
            {label}
            {counts[k] > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-amber px-1 text-[11px] font-bold text-amber-ink">{counts[k]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
