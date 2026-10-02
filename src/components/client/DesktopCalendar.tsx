"use client";

import Link from "next/link";
import { useState } from "react";
import { CHANNELS } from "@/lib/constants";
import { addDays, dayKey, keyParts, MESES, shortLabel, urgency, weekStart, type DayKey } from "@/lib/dates";
import { cardStyle, currentWeek, isClientsTurn, isPending, plural, thisWeekPending } from "@/lib/pieces";
import type { PieceFull } from "@/lib/types";
import { ActionButtons, BriefTab, DetailHeader, DetailTabs, GuionTab, RefsTab, useDetailOverlays, type Tab } from "./PieceDetail";
import { OverdueStrip } from "./shared";
import { useApp } from "./state";
import { AgencyAvatar, ChannelChips, ClientAvatar, Pill, StatusLegend, UrgencyText } from "./ui";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function DesktopCalendar() {
  const { pieces, now, tz, client, agency, filter, setFilter, select, base } = useApp();
  const today = dayKey(now, tz);
  const [ym, setYm] = useState(() => ({ y: keyParts(today).y, m: keyParts(today).m }));
  const week = currentWeek(now, tz);

  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const goToday = () => setYm({ y: keyParts(today).y, m: keyParts(today).m });
  const openPiece = (id: string) => {
    const p = pieces.find((x) => x.id === id);
    if (p) {
      const k = keyParts(dayKey(p.record_due_at, tz));
      setYm({ y: k.y, m: k.m });
    }
    setFilter("all");
    select(id);
  };

  // Calendar grid: Monday before the 1st → Sunday after the last day.
  const pad = (n: number) => String(n).padStart(2, "0");
  const first = `${ym.y}-${pad(ym.m + 1)}-01`;
  const lastDay = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const start = weekStart(first);
  const end = addDays(weekStart(`${ym.y}-${pad(ym.m + 1)}-${pad(lastDay)}`), 6);
  const byDay = new Map<DayKey, PieceFull[]>();
  for (const p of pieces) {
    const k = dayKey(p.record_due_at, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }
  const days: DayKey[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) days.push(k);

  const wk = thisWeekPending(pieces, now, tz);
  const lastDue = wk.at(-1);
  const nextDue = wk[0];

  return (
    <div className="box-border flex min-h-screen flex-wrap items-start gap-7 p-7">
      <div className="max-w-[1440px] min-w-0 flex-[1_1_880px] overflow-clip rounded-[14px] border bg-surface" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="sticky top-0 z-[5] flex flex-col gap-4 border-b bg-surface px-6 pt-[22px] pb-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <OverdueStrip variant="desktop" onOpen={openPiece} />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex flex-col gap-2.5">
              <div className="text-xs tracking-[0.02em] text-text-3">{client.name} · Calendario de contenido · con {agency.name}</div>
              <div className="flex items-center gap-3.5">
                <h1 className="m-0 min-w-[220px] text-[30px] font-semibold tracking-[-0.02em]">{MESES[ym.m]} {ym.y}</h1>
                <div className="flex gap-1.5">
                  <NavBtn label="Mes anterior" onClick={() => shift(-1)}>‹</NavBtn>
                  <NavBtn label="Mes siguiente" onClick={() => shift(1)}>›</NavBtn>
                  <button onClick={goToday} className="h-[34px] cursor-pointer rounded-lg border bg-transparent px-3 text-[13px] text-text-2c hover:text-white" style={{ borderColor: "rgba(255,255,255,0.1)" }}>Hoy</button>
                </div>
              </div>
            </div>

            <div className="flex min-w-[340px] items-center gap-[18px] rounded-xl border border-amber bg-amber-block px-[18px] py-3.5">
              <div className="flex flex-col gap-1">
                <div className="text-[13px]" style={{ color: "#F2DDB0" }}>Lo que tienes que grabar esta semana</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[34px] leading-none font-bold tracking-[-0.02em] text-amber">{wk.length}</span>
                  <span className="text-lg font-semibold" style={{ color: "#FFF4DE" }}>{plural(wk.length, "pieza", "piezas")}</span>
                </div>
                <div className="text-[13px]" style={{ color: "#FFF4DE" }}>
                  Entrega: <strong className="font-semibold">{lastDue ? `antes del ${shortLabel(dayKey(lastDue.record_due_at, tz))}, 20:00` : "nada pendiente"}</strong>
                </div>
                {nextDue && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "#F2DDB0" }}>
                    Lo próximo: <UrgencyText u={urgency(nextDue.record_due_at, now, tz)} size={12} />
                  </div>
                )}
              </div>
              <div className="ml-auto flex flex-col gap-2">
                <button
                  onClick={() => wk[0] && openPiece(wk[0].id)}
                  disabled={!wk.length}
                  className="h-[38px] cursor-pointer rounded-lg border-none bg-amber px-3.5 text-[13px] font-semibold text-amber-ink hover:bg-amber-hover disabled:cursor-default disabled:opacity-50"
                >
                  Ver brief
                </button>
                {wk.length > 1 && (
                  <Link href={`${base}/grabar`} className="flex h-[34px] items-center justify-center rounded-lg border px-3 text-[13px] font-medium no-underline hover:bg-white/5" style={{ borderColor: "rgba(245,184,61,0.5)", color: "#FFF4DE" }}>
                    Grabar todo de corrido
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-3.5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <ChannelChips filter={filter} setFilter={setFilter} />
          <StatusLegend />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] px-6 text-[11px] font-medium tracking-[0.08em] text-text-4 uppercase">
              {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2.5">{d}</div>)}
            </div>
            <div className="mx-6 mb-6 grid grid-cols-[repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-[10px] border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.05)" }}>
              {days.map((k) => (
                <DayCell key={k} k={k} inMonth={keyParts(k).m === ym.m} isToday={k === today} thisWeek={k >= week.start && k <= week.end} items={byDay.get(k) ?? []} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <DetailPanel />
    </div>
  );
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="size-[34px] cursor-pointer rounded-lg border bg-card text-base text-text hover:bg-[#1C1D21]" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
      {children}
    </button>
  );
}

function DayCell({ k, inMonth, isToday, thisWeek, items }: { k: DayKey; inMonth: boolean; isToday: boolean; thisWeek: boolean; items: PieceFull[] }) {
  return (
    <div className="flex min-h-[136px] min-w-0 flex-col gap-1.5 p-2" style={{ background: thisWeek ? "#110F0A" : "#0B0B0D" }}>
      <div className="flex h-5 items-center gap-1.5">
        <span
          className="rounded-[5px] px-[5px] py-px text-xs tabular-nums"
          style={{ fontWeight: isToday ? 700 : 500, color: isToday ? "#0B0B0D" : inMonth ? "#8A8D93" : "#3A3D42", background: isToday ? "#E8E9EB" : "transparent" }}
        >
          {keyParts(k).d}
        </span>
        {isToday && <span className="text-[11px] text-text-2c">Hoy</span>}
      </div>
      {items.map((p) => <MonthCard key={p.id} p={p} inMonth={inMonth} />)}
    </div>
  );
}

function MonthCard({ p, inMonth }: { p: PieceFull; inMonth: boolean }) {
  const { now, tz, filter, selectedId, select, client, agency } = useApp();
  const st = cardStyle(p, now, tz);
  const dim = filter !== "all" && filter !== p.channel;
  const sel = selectedId === p.id;
  const mine = isClientsTurn(p);
  return (
    <button
      onClick={() => select(p.id)}
      aria-pressed={sel}
      className="flex cursor-pointer overflow-hidden rounded-md border p-0 text-left text-inherit"
      style={{ transition: "opacity .2s", opacity: dim ? 0.25 : inMonth ? 1 : 0.55, background: st.bg, borderColor: sel ? "#FFFFFF" : st.border, boxShadow: st.shadow }}
    >
      <div className="w-[3px] flex-none self-stretch" style={{ background: CHANNELS[p.channel].color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-[7px] py-[7px] pr-2 pl-[9px]">
        <div className="title-wrap text-[13px] leading-[1.25]" style={{ fontWeight: st.titleWeight, color: st.titleColor }}>{p.title}</div>
        {mine && <div className="leading-[1.5]"><UrgencyText u={urgency(p.record_due_at, now, tz)} size={11} wrap /></div>}
        <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-[5px]">
          <Pill bg={st.pillBg} fg={st.pillFg}>{st.pill}</Pill>
          {mine ? <ClientAvatar initials={client.initials} title="Te toca a ti" /> : <AgencyAvatar initials={agency.initials} title={`Lo tiene ${agency.name}`} />}
        </div>
      </div>
    </button>
  );
}

function DetailPanel() {
  const { byId, selectedId, now, tz } = useApp();
  const p = selectedId ? byId(selectedId) : undefined;
  const [tab, setTab] = useState<Tab>("brief");
  const [lastId, setLastId] = useState(selectedId);
  if (lastId !== selectedId) {
    setLastId(selectedId);
    setTab("brief");
  }
  const { openRef, openReading, overlays } = useDetailOverlays(p);
  const st = p ? cardStyle(p, now, tz) : null;
  const action = p && isPending(p);

  return (
    <div className="sticky top-7 flex min-w-[320px] flex-[0_1_420px] flex-col gap-2.5">
      <div className="font-mono text-[11px] tracking-[0.06em] text-text-4 uppercase">Detalle · tarjeta abierta</div>
      {!p ? (
        <div className="rounded-[14px] border bg-sheet p-6 text-sm text-text-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          Toca una pieza del calendario para ver su brief.
        </div>
      ) : (
        <div className="flex max-h-[calc(100vh-80px)] overflow-hidden rounded-[14px] border bg-sheet" style={{ borderColor: st!.bg === "#2A1214" ? "rgba(255,92,92,0.6)" : action ? "rgba(245,184,61,0.55)" : "rgba(255,255,255,0.08)" }}>
          <div className="w-1 flex-none" style={{ background: CHANNELS[p.channel].color }} />
          <div className="no-scrollbar flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-[22px] pt-[22px] pb-5">
            <DetailHeader p={p} variant="desktop" />
            <DetailTabs p={p} tab={tab} setTab={setTab} />
            {tab === "brief" && <BriefTab p={p} variant="desktop" />}
            {tab === "guion" && <GuionTab p={p} onOpenRef={openRef} onRead={openReading} />}
            {tab === "refs" && <RefsTab p={p} onOpenRef={openRef} />}
            {action && tab === "brief" && <ActionButtons p={p} variant="desktop" />}
          </div>
        </div>
      )}
      {overlays}
    </div>
  );
}
