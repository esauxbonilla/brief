"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from "react";
import { CHANNELS } from "@/lib/constants";
import { addDays, dayIndex, dayKey, DIAS_LETRA, keyParts, longDayLabel, MESES, shortLabel, urgency, weekRangeLabel, weekStart, type DayKey } from "@/lib/dates";
import { cardStyle, currentWeek, inWeek, isClientsTurn, isPending, plural, thisWeekPending } from "@/lib/pieces";
import type { PieceFull } from "@/lib/types";
import { ActionButtons, BriefTab, DetailHeader, DetailTabs, GuionTab, RefsTab, useDetailOverlays, type Tab } from "./PieceDetail";
import { AccountMenu, OverdueStrip } from "./shared";
import { useApp } from "./state";
import { AgencyAvatar, ChannelChips, ClientAvatar, UrgencyText } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");

export function MobileCalendar() {
  const { pieces, now, tz, client, filter, setFilter, select, selectedId, base, edit } = useApp();
  const today = dayKey(now, tz);
  const thisWeek = currentWeek(now, tz).start;
  const [off, setOff] = useState(0);
  const [fade, setFade] = useState(false);
  const [active, setActive] = useState<DayKey | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [miniM, setMiniM] = useState<{ y: number; m: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const swipeX = useRef(0);

  const ws = addDays(thisWeek, 7 * off);
  const mid = addDays(ws, 3);
  const byDay = new Map<DayKey, PieceFull[]>();
  for (const p of pieces) {
    const k = dayKey(p.record_due_at, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }

  const scrollToDay = (k: DayKey) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-day="${k}"]`) as HTMLElement | null;
      const h = stickyRef.current?.offsetHeight ?? 0;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - h, behavior: "smooth" });
    });
  };
  const scrollToList = () => {
    const h = stickyRef.current;
    if (h && window.scrollY > h.offsetTop) window.scrollTo({ top: h.offsetTop, behavior: "smooth" });
  };

  const goWeek = (n: number, k?: DayKey) => {
    if (n === off) {
      setActive(k ?? null);
      if (k) scrollToDay(k);
      return;
    }
    setFade(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setOff(n);
      setFade(false);
      setActive(k ?? null);
      if (k) scrollToDay(k);
      else scrollToList();
    }, 160);
  };
  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const open = (id: string) => {
    select(id);
    setSheetOpen(true);
  };

  // Week block: pending this week + what was already recorded this week.
  const left = thisWeekPending(pieces, now, tz);
  const recorded = pieces.filter((p) => p.status === "grabado" && inWeek(p, thisWeek, tz));
  const total = left.length + recorded.length;
  const lastDue = left.at(-1);

  // Mini month.
  const mm = miniM ?? { y: keyParts(mid).y, m: keyParts(mid).m };
  const mFirst = `${mm.y}-${pad(mm.m + 1)}-01`;
  const mLast = `${mm.y}-${pad(mm.m + 1)}-${pad(new Date(Date.UTC(mm.y, mm.m + 1, 0)).getUTCDate())}`;
  const mini: DayKey[] = [];
  for (let k = weekStart(mFirst); k <= addDays(weekStart(mLast), 6); k = addDays(k, 1)) mini.push(k);

  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const sel = selectedId ? pieces.find((p) => p.id === selectedId) : undefined;

  return (
    <div className="min-h-dvh bg-surface pb-10">
      <div className="flex flex-col gap-3.5 px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-3">Hola, {client.name.split(" ")[0]}</span>
            <button
              onClick={() => { setMonthOpen((o) => !o); setMiniM(null); }}
              aria-expanded={monthOpen}
              className="flex min-h-11 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[26px] font-semibold tracking-[-0.02em] text-text"
            >
              {MESES[keyParts(mid).m]}
              <span className="inline-block text-sm text-text-3 transition-transform duration-[250ms]" style={{ transform: monthOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>
          </div>
          <AccountMenu size={36} align="right" />
        </div>

        <div
          className="overflow-hidden"
          style={{ maxHeight: monthOpen ? 380 : 0, opacity: monthOpen ? 1 : 0, transition: "max-height .32s cubic-bezier(.2,.8,.2,1), opacity .2s" }}
        >
          <div className="flex flex-col gap-1.5 pt-1 pb-1.5">
            <div className="flex items-center justify-between">
              <button aria-label="Mes anterior" onClick={() => setMiniM(() => { const d = new Date(Date.UTC(mm.y, mm.m - 1, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; })} className="h-9 w-11 cursor-pointer border-none bg-transparent text-lg text-text-2c">‹</button>
              <span className="text-[13px] text-text-2c">{MESES[mm.m]} {mm.y} · toca un día</span>
              <button aria-label="Mes siguiente" onClick={() => setMiniM(() => { const d = new Date(Date.UTC(mm.y, mm.m + 1, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; })} className="h-9 w-11 cursor-pointer border-none bg-transparent text-lg text-text-2c">›</button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] text-text-4">
              {["L", "M", "X", "J", "V", "S", "D"].map((l) => <span key={l}>{l}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {mini.map((k) => {
                const list = byDay.get(k) ?? [];
                const inM = keyParts(k).m === mm.m;
                const isToday = k === today;
                const shown = k >= ws && k <= addDays(ws, 6);
                const hasG = list.some(isPending);
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setMonthOpen(false);
                      setMiniM(null);
                      goWeek(Math.round((dayIndex(weekStart(k)) - dayIndex(thisWeek)) / 7), k);
                    }}
                    className="flex h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border-none text-[13px] font-medium"
                    style={{
                      background: isToday ? "#E8E9EB" : shown ? "#1B1C1F" : "transparent",
                      color: isToday ? "#0B0B0D" : inM ? "#C9CCD1" : "#3A3D42",
                      boxShadow: hasG && inM && !isToday ? "inset 0 0 0 1px rgba(245,184,61,.55)" : "none",
                    }}
                  >
                    {keyParts(k).d}
                    <span className="flex h-1 gap-0.5">
                      {inM && [...new Set(list.map((p) => CHANNELS[p.channel].color))].slice(0, 3).map((c) => <span key={c} className="size-1 rounded-full" style={{ background: c }} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => { if (left[0]) open(left[0].id); if (off !== 0) goWeek(0); }}
          onKeyDown={(e) => e.key === "Enter" && left[0] && open(left[0].id)}
          className="press flex cursor-pointer flex-col gap-3 rounded-2xl border border-amber bg-amber-block p-4 text-left"
        >
          <span className="text-[13px]" style={{ color: "#F2DDB0" }}>Lo que tienes que grabar esta semana</span>
          <span className="flex w-full items-end justify-between gap-3">
            <span className="flex flex-col gap-1.5">
              <span className="flex items-baseline gap-2">
                <span className="text-[40px] leading-none font-bold tracking-[-0.02em] text-amber">{left.length}</span>
                <span className="text-[19px] font-semibold" style={{ color: "#FFF4DE" }}>{plural(left.length, "pieza", "piezas")}</span>
              </span>
              <span className="text-[13px]" style={{ color: "#FFF4DE" }}>
                {left[0] ? <UrgencyText u={urgency(left[0].record_due_at, now, tz)} size={13} solidPad="2px 8px" /> : <>Entrega: <strong className="font-semibold">nada pendiente</strong></>}
              </span>
            </span>
            {left.length > 0 && <span className="flex h-10 flex-none items-center rounded-[10px] bg-amber px-3.5 text-sm font-semibold text-amber-ink">Empezar</span>}
          </span>
          {total > 0 && (
            <span className="flex w-full flex-col gap-1.5">
              <span className="block h-1 overflow-hidden rounded-sm" style={{ background: "rgba(245,184,61,0.18)" }}>
                <span className="block h-full rounded-sm bg-amber transition-[width] duration-[400ms]" style={{ width: `${Math.round((recorded.length / total) * 100)}%` }} />
              </span>
              <span className="text-xs" style={{ color: "#C9B38A" }}>
                {recorded.length ? `${recorded.length} de ${total} grabadas` : "Aún no has grabado ninguna"}
                {lastDue && ` · última entrega ${shortLabel(dayKey(lastDue.record_due_at, tz))}, 20:00`}
              </span>
            </span>
          )}
          {left.length > 1 && (
            <Link
              href={`${base}/grabar`}
              onClick={(e) => e.stopPropagation()}
              className="flex h-11 items-center justify-center rounded-xl border text-sm font-semibold no-underline"
              style={{ borderColor: "rgba(245,184,61,0.5)", color: "#FFF4DE" }}
            >
              Grabar todo de corrido
            </Link>
          )}
        </div>
      </div>

      <div ref={stickyRef} className="sticky top-0 z-[2] border-b bg-surface" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="px-3 pt-2 empty:hidden">
          <OverdueStrip variant="mobile" onOpen={open} />
        </div>
        <div className="flex items-center justify-between px-2.5 pt-1">
          <button aria-label="Semana anterior" onClick={() => goWeek(off - 1)} className="h-10 w-11 cursor-pointer border-none bg-transparent text-xl text-text-2c">‹</button>
          <span className="text-[13px] font-medium" style={{ color: off === 0 ? "#F2DDB0" : "#B5B8BE" }}>
            {off === 0 ? "Esta semana · " : ""}{weekRangeLabel(ws)}
          </span>
          <button aria-label="Semana siguiente" onClick={() => goWeek(off + 1)} className="h-10 w-11 cursor-pointer border-none bg-transparent text-xl text-text-2c">›</button>
        </div>
        <div
          onTouchStart={(e: TouchEvent) => { swipeX.current = e.touches[0].clientX; }}
          onTouchEnd={(e: TouchEvent) => { const dx = e.changedTouches[0].clientX - swipeX.current; if (Math.abs(dx) > 50) goWeek(off + (dx < 0 ? 1 : -1)); }}
          className="grid grid-cols-7 gap-1 px-3 pt-0.5 pb-2.5"
        >
          {days.map((k) => {
            const list = byDay.get(k) ?? [];
            const isToday = k === today;
            const hasNow = list.some((p) => isPending(p) && inWeek(p, thisWeek, tz));
            const { d, dow, m } = keyParts(k);
            return (
              <button
                key={k}
                onClick={() => goWeek(off, k)}
                className="flex h-[62px] cursor-pointer flex-col items-center justify-center gap-[3px] rounded-xl border transition-colors duration-200"
                style={{
                  background: isToday ? "#E8E9EB" : hasNow ? "#231B0B" : "transparent",
                  color: isToday ? "#0B0B0D" : m === keyParts(mid).m ? "#E8E9EB" : "#5E6168",
                  borderColor: hasNow && !isToday ? "rgba(245,184,61,0.6)" : active === k && !isToday ? "rgba(255,255,255,0.3)" : "transparent",
                }}
              >
                <span className="text-[11px] opacity-70">{DIAS_LETRA[dow]}</span>
                <span className="text-base font-semibold">{d}</span>
                <span className="flex h-[5px] gap-0.5">
                  {[...new Set(list.map((p) => CHANNELS[p.channel].color))].slice(0, 3).map((c) => <span key={c} className="size-[5px] rounded-full" style={{ background: c }} />)}
                </span>
              </button>
            );
          })}
        </div>
        <ChannelChips filter={filter} setFilter={setFilter} height={36} scroll />
      </div>

      <div className="pt-1" style={{ opacity: fade ? 0 : 1, transform: fade ? "translateY(6px)" : "translateY(0)", transition: "opacity .22s, transform .22s" }}>
        {days.map((k) => {
          const items = byDay.get(k) ?? [];
          const isToday = k === today;
          return (
            <div key={k} data-day={k} className="flex flex-col gap-2 px-4 pt-3.5 pb-1" style={{ background: active === k ? "rgba(255,255,255,0.025)" : "transparent" }}>
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold capitalize" style={{ color: items.length ? (isToday ? "#FFFFFF" : "#C9CCD1") : "#45484E" }}>{longDayLabel(k)}</span>
                {isToday && <span className="rounded-full bg-text px-[7px] py-px text-[11px] font-semibold text-surface">Hoy</span>}
                {!items.length && <span className="text-xs text-text-5">· Nada programado</span>}
                {edit && (
                  <button onClick={() => edit.create(k)} disabled={edit.busy} aria-label={`Nueva pieza el ${longDayLabel(k)}`} className="ml-auto h-7 cursor-pointer rounded-lg border-none bg-white/5 px-2.5 text-[13px] text-text-2c">+ Pieza</button>
                )}
              </div>
              {items.map((p) => <WeekCard key={p.id} p={p} onOpen={() => open(p.id)} />)}
            </div>
          );
        })}
      </div>

      <BottomSheet p={sel} open={sheetOpen && !!sel} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

function WeekCard({ p, onOpen }: { p: PieceFull; onOpen: () => void }) {
  const { now, tz, filter, client, agency } = useApp();
  const st = cardStyle(p, now, tz, true);
  const mine = isClientsTurn(p);
  const n = p.shots.filter((s) => s.done).length;
  const dim = filter !== "all" && filter !== p.channel;
  return (
    <button
      onClick={onOpen}
      className="flex cursor-pointer items-stretch overflow-hidden rounded-xl border p-0 text-left text-inherit active:scale-[0.98]"
      style={{ transition: "opacity .2s, transform .12s", opacity: dim ? 0.25 : 1, background: st.bg, borderColor: st.border, boxShadow: st.shadow }}
    >
      <div className="w-[3px] flex-none" style={{ background: CHANNELS[p.channel].color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pr-2 pl-[13px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: CHANNELS[p.channel].color }}>{CHANNELS[p.channel].name}</span>
          {mine ? <ClientAvatar initials={client.initials} size={20} /> : <AgencyAvatar initials={agency.initials} size={20} />}
        </div>
        <div className="title-wrap text-base leading-[1.25]" style={{ fontWeight: st.titleWeight, color: st.titleColor }}>{p.title}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-[9px] py-[3px] text-xs font-semibold" style={{ background: st.pillBg, color: st.pillFg }}>{st.pill}</span>
          {mine && (
            <>
              <UrgencyText u={urgency(p.record_due_at, now, tz)} size={12} />
              {p.shots.length > 0 && <span className="text-xs" style={{ color: "#E2C78F" }}>{n} de {p.shots.length} tomas</span>}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center pr-3 pl-1 text-lg text-text-5">›</div>
    </button>
  );
}

function BottomSheet({ p, open, onClose }: { p: PieceFull | undefined; open: boolean; onClose: () => void }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<Tab>("brief");
  const [lastId, setLastId] = useState(p?.id);
  const y0 = useRef(0);
  const { openRef, openReading, overlays } = useDetailOverlays(p);
  const { edit } = useApp();

  if (lastId !== p?.id) {
    setLastId(p?.id);
    setTab("brief");
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    y0.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };
  const move = (e: PointerEvent) => dragging && setDragY(Math.max(0, e.clientY - y0.current));
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragY > 110) onClose();
    setDragY(0);
  };

  const action = p && isPending(p);
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[5]"
        style={{ background: "rgba(0,0,0,.6)", transition: "opacity .3s", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={p?.title}
        className="fixed right-0 bottom-0 left-0 z-[6] flex h-[90dvh] flex-col overflow-hidden rounded-t-3xl border-t bg-sheet-mobile"
        style={{ borderColor: "rgba(255,255,255,0.08)", transform: open ? `translateY(${dragY}px)` : "translateY(105%)", transition: dragging ? "none" : "transform .36s cubic-bezier(.2,.85,.25,1)" }}
      >
        {p && (
          <>
            <div
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              className="flex flex-none cursor-grab touch-none flex-col gap-3.5 border-b px-[18px] pt-2.5 pb-3.5"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="h-[5px] w-10 self-center rounded-[3px] bg-text-6" />
              <DetailHeader p={p} variant="mobile" />
            </div>
            {edit ? (
              <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-8">{edit.panel(p)}</div>
            ) : (
            <>
            <div className="flex-none px-[18px] pt-3.5">
              <DetailTabs p={p} tab={tab} setTab={setTab} />
            </div>
            <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto overscroll-contain px-[18px] pt-[18px] pb-6">
              {tab === "brief" && <BriefTab p={p} variant="mobile" />}
              {tab === "guion" && <GuionTab p={p} onOpenRef={openRef} onRead={openReading} showCta={false} />}
              {tab === "refs" && <RefsTab p={p} onOpenRef={openRef} />}
            </div>
            {tab === "guion" && p.blocks.length > 0 ? (
              <div className="flex-none border-t px-[18px] pt-3 pb-[max(30px,env(safe-area-inset-bottom))]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button onClick={openReading} className="press h-[52px] w-full cursor-pointer rounded-[14px] border-none bg-amber text-[15px] font-semibold text-amber-ink">Leer mientras grabo</button>
              </div>
            ) : (
              action && tab === "brief" && <ActionButtons p={p} variant="mobile" onRecorded={onClose} />
            )}
            </>
            )}
          </>
        )}
      </div>
      {overlays}
    </>
  );
}
