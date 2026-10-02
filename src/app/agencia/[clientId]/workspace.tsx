"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CHANNELS } from "@/lib/constants";
import { addDays, dayIndex, dayKey, keyParts, MESES, shortLabel, weekStart, zonedTime, type DayKey } from "@/lib/dates";
import { displayStatus } from "@/lib/pieces";
import type { PieceFull } from "@/lib/types";
import * as A from "../actions";
import { PieceEditor } from "../pieza/editor";
import { ClientBoard, StatusPill } from "../ui";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const pad = (n: number) => String(n).padStart(2, "0");

type View = "calendario" | "lista";

/** One client in the agency panel: the month calendar first, the list as a secondary view. */
export function ClientWorkspace({ client, pieces: serverPieces, serverNow }: {
  client: { id: string; name: string; tz: string };
  pieces: PieceFull[];
  serverNow: string;
}) {
  const tz = client.tz;
  const now = new Date(serverNow);
  const today = dayKey(now, tz);
  const [view, setView] = useState<View>("calendario");
  const [ym, setYm] = useState(() => ({ y: keyParts(today).y, m: keyParts(today).m }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<DayKey | null>(null);
  const [pending, start] = useTransition();

  // Optimistic moves; fresh server data replaces them.
  const [pieces, setPieces] = useState(serverPieces);
  const [lastServer, setLastServer] = useState(serverPieces);
  if (lastServer !== serverPieces) {
    setLastServer(serverPieces);
    setPieces(serverPieces);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const first = `${ym.y}-${pad(ym.m + 1)}-01`;
  const lastDay = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const days: DayKey[] = [];
  for (let k = weekStart(first), end = addDays(weekStart(`${ym.y}-${pad(ym.m + 1)}-${pad(lastDay)}`), 6); k <= end; k = addDays(k, 1)) days.push(k);

  const byDay = new Map<DayKey, PieceFull[]>();
  for (const p of pieces) {
    if (p.status === "cancelado") continue;
    const k = dayKey(p.record_due_at, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }

  const create = (day: DayKey) =>
    start(async () => {
      try {
        const id = await A.quickCreate(client.id, day);
        setView("calendario");
        setOpenId(id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "No se pudo crear la pieza");
      }
    });

  const move = (id: string, day: DayKey) => {
    const p = pieces.find((x) => x.id === id);
    if (!p || dayKey(p.record_due_at, tz) === day) return;
    const delta = dayIndex(day) - dayIndex(dayKey(p.record_due_at, tz));
    const shifted = (iso: string) => new Date(new Date(iso).getTime() + delta * 86_400_000).toISOString();
    setPieces((list) => list.map((x) => (x.id === id ? { ...x, record_due_at: zonedTime(day, "20:00", tz).toISOString(), publish_at: shifted(x.publish_at) } : x)));
    start(async () => {
      try {
        await A.movePiece(id, day);
      } catch (e) {
        setPieces(serverPieces);
        alert(e instanceof Error ? e.message : "No se pudo mover la pieza");
      }
    });
  };

  const open = openId ? pieces.find((p) => p.id === openId) : undefined;

  return (
    <div className={`flex flex-col gap-5 ${openId ? "xl:pr-[540px]" : ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-3">Cliente</span>
          <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em]">{client.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/calendario/${client.id}`} className="flex h-10 items-center rounded-[10px] border px-4 text-sm font-medium text-text no-underline hover:bg-white/5 hover:text-text" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
            Vista del cliente
          </Link>
          <button disabled={pending} onClick={() => create(today)} className="flex h-10 cursor-pointer items-center rounded-[10px] border-none bg-amber px-4 text-sm font-semibold text-amber-ink hover:bg-amber-hover disabled:opacity-60">
            + Nueva pieza
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-[10px] bg-surface-2 p-1">
          {(["calendario", "lista"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="h-8 cursor-pointer rounded-lg border-none px-4 text-[13px] font-medium capitalize"
              style={{ background: view === v ? "#2A2C31" : "transparent", color: view === v ? "#F3F4F6" : "#8A8D93" }}
            >
              {v}
            </button>
          ))}
        </div>
        {view === "calendario" && (
          <div className="flex items-center gap-2">
            <span className="min-w-[150px] text-right text-lg font-semibold">{MESES[ym.m]} {ym.y}</span>
            <NavBtn label="Mes anterior" onClick={() => shift(-1)}>‹</NavBtn>
            <NavBtn label="Mes siguiente" onClick={() => shift(1)}>›</NavBtn>
            <button onClick={() => setYm({ y: keyParts(today).y, m: keyParts(today).m })} className="h-[34px] cursor-pointer rounded-lg border bg-transparent px-3 text-[13px] text-text-2c hover:text-white" style={{ borderColor: "rgba(255,255,255,0.1)" }}>Hoy</button>
          </div>
        )}
      </div>

      {view === "lista" ? (
        <ClientBoard pieces={pieces} tz={tz} serverNow={serverNow} onOpen={setOpenId} />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] text-[11px] font-medium tracking-[0.08em] text-text-4 uppercase">
              {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-[10px] border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.05)" }}>
              {days.map((k) => {
                const inMonth = keyParts(k).m === ym.m;
                const isOver = overDay === k && dragId !== null;
                return (
                  <div
                    key={k}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overDay !== k) setOverDay(k); }}
                    onDragLeave={() => setOverDay((d) => (d === k ? null : d))}
                    onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); setOverDay(null); setDragId(null); if (id) move(id, k); }}
                    className="group flex min-h-[124px] min-w-0 flex-col gap-1.5 p-1.5"
                    style={{ background: isOver ? "#1D1A12" : "#0B0B0D", outline: isOver ? "1px solid rgba(245,184,61,0.6)" : "none", outlineOffset: -1 }}
                  >
                    <div className="flex h-6 items-center justify-between gap-1.5 px-0.5">
                      <span
                        className="rounded-[5px] px-[5px] py-px text-xs tabular-nums"
                        style={{ fontWeight: k === today ? 700 : 500, color: k === today ? "#0B0B0D" : inMonth ? "#8A8D93" : "#3A3D42", background: k === today ? "#E8E9EB" : "transparent" }}
                      >
                        {keyParts(k).d}
                      </span>
                      <button
                        onClick={() => create(k)}
                        disabled={pending}
                        aria-label={`Nueva pieza el ${shortLabel(k)}`}
                        className="flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-base text-text-3 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white focus:opacity-100"
                      >
                        +
                      </button>
                    </div>
                    {(byDay.get(k) ?? []).map((p) => (
                      <Card
                        key={p.id}
                        p={p}
                        tz={tz}
                        now={now}
                        dim={!inMonth}
                        selected={p.id === openId}
                        dragging={p.id === dragId}
                        onOpen={() => setOpenId(p.id)}
                        onDragStart={() => setDragId(p.id)}
                        onDragEnd={() => { setDragId(null); setOverDay(null); }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-text-3">Arrastra una tarjeta para cambiar el día de grabación (la publicación se mueve igual). Pasa el mouse sobre un día y toca + para crear una pieza.</p>
          </div>
        </div>
      )}

      {openId && (
        <aside
          className="fixed top-0 right-0 bottom-0 z-30 flex w-[min(560px,100vw)] flex-col border-l bg-surface shadow-[-12px_0_32px_rgba(0,0,0,0.5)]"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="font-mono text-[11px] tracking-[0.06em] text-text-4 uppercase">Pieza</span>
            <div className="flex items-center gap-3">
              {open && <Link href={`/agencia/pieza/${open.id}`} className="text-[13px] no-underline">Abrir en página</Link>}
              <button onClick={() => setOpenId(null)} aria-label="Cerrar" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-lg text-text-2c hover:bg-white/10 hover:text-white">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {open ? <PieceEditor piece={open} tz={tz} now={serverNow} /> : <span className="text-sm text-text-3">Cargando…</span>}
          </div>
        </aside>
      )}
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

function Card({ p, tz, now, dim, selected, dragging, onOpen, onDragStart, onDragEnd }: {
  p: PieceFull;
  tz: string;
  now: Date;
  dim: boolean;
  selected: boolean;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const ds = displayStatus(p, now);
  const overdue = ds === "atrasado";
  const draft = p.status === "borrador";
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className="flex cursor-grab overflow-hidden rounded-md border text-left active:cursor-grabbing"
      style={{
        background: overdue ? "#2A1214" : "#141518",
        borderColor: selected ? "#FFFFFF" : overdue ? "#FF5C5C" : draft ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
        borderStyle: draft && !selected ? "dashed" : "solid",
        opacity: dragging ? 0.35 : dim ? 0.55 : 1,
      }}
    >
      <div className="w-[3px] flex-none self-stretch" style={{ background: CHANNELS[p.channel].color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1.5 pr-1.5 pl-2">
        <div className="title-wrap text-[13px] leading-[1.25] font-semibold" style={{ color: overdue ? "#FFE3E3" : p.status === "publicado" ? "#62666D" : "#E6E7E9" }}>{p.title}</div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <StatusPill s={ds} />
          <span className="text-[11px] text-text-3">Publica {shortLabel(dayKey(p.publish_at, tz))}</span>
        </div>
      </div>
    </div>
  );
}
