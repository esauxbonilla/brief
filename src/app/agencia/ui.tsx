"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { CHANNELS, STATUS, type DisplayStatus } from "@/lib/constants";
import { dayIndex, dayKey, shortLabel, urgency } from "@/lib/dates";
import { displayStatus, isOverdue, isPending } from "@/lib/pieces";
import type { PieceFull } from "@/lib/types";
import { signOut } from "../login/actions";
import * as A from "./actions";

export const MIN_LEAD_DAYS = 7;

export function StatusPill({ s }: { s: DisplayStatus }) {
  const c = STATUS[s].color;
  const solid = s === "atrasado" || s === "rehacer";
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ background: solid ? c : c + "1F", color: solid ? (s === "atrasado" ? "#1A0506" : "#1A1205") : c }}>
      {STATUS[s].name}
    </span>
  );
}

export function ChannelTag({ ch }: { ch: keyof typeof CHANNELS }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap" style={{ color: CHANNELS[ch].color }}>
      <span className="size-2 rounded-full" style={{ background: CHANNELS[ch].color }} />
      {CHANNELS[ch].name}
    </span>
  );
}

export function Btn({
  children, onClick, kind = "ghost", disabled, type = "button",
}: { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; type?: "button" | "submit" }) {
  const styles = {
    primary: "bg-amber text-amber-ink border-transparent hover:bg-amber-hover font-semibold",
    ghost: "bg-transparent text-text border-white/15 hover:bg-surface-3 font-medium",
    danger: "bg-transparent text-red border-red/40 hover:bg-red/10 font-medium",
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`h-8 cursor-pointer rounded-lg border px-3 text-[13px] whitespace-nowrap disabled:cursor-default disabled:opacity-50 ${styles}`}>
      {children}
    </button>
  );
}

/** Runs a server action with a pending state and an error alert. */
export function useAct() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Algo salió mal");
      }
    });
  return { pending, run };
}

export function ReceivedActions({ id, received }: { id: string; received: boolean }) {
  const { pending, run } = useAct();
  const [redo, setRedo] = useState(false);
  const [reason, setReason] = useState("");
  if (redo) {
    return (
      <form
        className="flex w-full flex-wrap items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); run(() => A.requestRedo(id, reason)); }}
      >
        <input
          autoFocus
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (lo verá el cliente)"
          className="h-8 min-w-[220px] flex-1 rounded-lg border bg-surface-2 px-2.5 text-[13px] text-text outline-none focus:border-amber"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        />
        <Btn type="submit" kind="primary" disabled={pending || !reason.trim()}>Devolver</Btn>
        <Btn onClick={() => setRedo(false)}>Cancelar</Btn>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {!received && <Btn onClick={() => run(() => A.markReceived(id))} disabled={pending}>Revisado ✓</Btn>}
      <Btn kind="primary" onClick={() => run(() => A.approve(id))} disabled={pending}>Aprobar</Btn>
      <Btn onClick={() => setRedo(true)} disabled={pending}>Pedir que lo repita</Btn>
    </div>
  );
}

export function OverdueActions({ id, publishDay }: { id: string; publishDay: string }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(publishDay);
  if (open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-text-3">Nueva publicación</label>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-8 rounded-lg border bg-surface-2 px-2 text-[13px] text-text" style={{ borderColor: "rgba(255,255,255,0.12)" }} />
        <Btn kind="primary" disabled={pending} onClick={() => run(() => A.reschedule(id, day))}>Guardar</Btn>
        <Btn onClick={() => setOpen(false)}>Cancelar</Btn>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Btn onClick={() => setOpen(true)} disabled={pending}>Reprogramar</Btn>
      <Btn kind="danger" disabled={pending} onClick={() => confirm("¿Cancelar esta pieza? Desaparece del calendario del cliente.") && run(() => A.cancelPiece(id))}>Cancelar</Btn>
    </div>
  );
}

function Row({ p, tz, now, lead, actions, onOpen }: { p: PieceFull; tz: string; now: Date; lead?: ReactNode; actions?: ReactNode; onOpen?: (id: string) => void }) {
  const ds = displayStatus(p, now);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-3.5 py-2.5" style={{ borderColor: isOverdue(p, now) ? "rgba(255,92,92,0.5)" : "rgba(255,255,255,0.06)" }}>
      {lead}
      <div className="flex min-w-[240px] flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <ChannelTag ch={p.channel} />
          <StatusPill s={ds} />
          {p.status === "grabado" && p.uploads.length > 0 && <span className="text-[11px] text-green">{p.uploads.length} archivo{p.uploads.length > 1 ? "s" : ""}</span>}
        </div>
        {onOpen ? (
          <button onClick={() => onOpen(p.id)} className="cursor-pointer border-none bg-transparent p-0 text-left text-[15px] font-semibold text-text hover:text-white">{p.title}</button>
        ) : (
          <Link href={`/agencia/pieza/${p.id}`} className="text-[15px] font-semibold text-text no-underline hover:text-white">{p.title}</Link>
        )}
        <span className="text-xs text-text-3">
          Grabar: {shortLabel(dayKey(p.record_due_at, tz))}
          {isPending(p) && <> · {urgency(p.record_due_at, now, tz).text}</>} · Publica: {shortLabel(dayKey(p.publish_at, tz))}
          {p.status === "rehacer" && p.redo_reason && <> · Motivo: {p.redo_reason}</>}
        </span>
      </div>
      {actions}
    </div>
  );
}

function Section({ title, hint, children, empty }: { title: string; hint?: string; children: ReactNode; empty?: boolean }) {
  if (empty) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-3">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        {hint && <span className="text-xs text-text-3">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** One client's pieces grouped by what the agency has to do with them. */
export function ClientBoard({ pieces, tz, serverNow, onOpen }: { pieces: PieceFull[]; tz: string; serverNow: string; onOpen?: (id: string) => void }) {
  const now = new Date(serverNow);
  const [sel, setSel] = useState<string[]>([]);
  const { pending, run } = useAct();
  const today = dayIndex(dayKey(now, tz));
  const leadDays = (p: PieceFull) => dayIndex(dayKey(p.record_due_at, tz)) - today;

  const overdue = pieces.filter((p) => isOverdue(p, now));
  const received = pieces.filter((p) => p.status === "grabado");
  const drafts = pieces.filter((p) => p.status === "borrador");
  const waiting = pieces.filter((p) => isPending(p) && !isOverdue(p, now));
  const production = pieces.filter((p) => p.status === "edicion" || p.status === "listo");
  const done = pieces.filter((p) => p.status === "publicado" || p.status === "cancelado");
  const short = drafts.filter((d) => sel.includes(d.id) && leadDays(d) < MIN_LEAD_DAYS);

  const send = () => {
    if (short.length) {
      const names = short.map((d) => `• ${d.title} (${leadDays(d)} días)`).join("\n");
      if (!confirm(`Estas piezas salen con menos de ${MIN_LEAD_DAYS} días para grabar:\n${names}\n\n¿Enviar igualmente?`)) return;
    }
    run(async () => {
      await A.sendBriefs(sel);
      setSel([]);
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <Section title={`Atrasadas (${overdue.length})`} hint="Reprograma o cancela: que no se acumulen en rojo." empty={!overdue.length}>
        {overdue.map((p) => <Row key={p.id} p={p} tz={tz} now={now} onOpen={onOpen} actions={<OverdueActions id={p.id} publishDay={dayKey(p.publish_at, tz)} />} />)}
      </Section>

      <Section title={`Material recibido (${received.length})`} hint="Aprobar pasa a edición. Pedir que lo repita lo devuelve al cliente." empty={!received.length}>
        {received.map((p) => <Row key={p.id} p={p} tz={tz} now={now} onOpen={onOpen} actions={<ReceivedActions id={p.id} received={!!p.received_at} />} />)}
      </Section>

      <Section title={`Borradores (${drafts.length})`} hint="El cliente no los ve hasta que envías el brief.">
        {!drafts.length && <span className="text-[13px] text-text-3">No hay borradores.</span>}
        {drafts.map((p) => (
          <Row
            key={p.id}
            p={p}
            tz={tz}
            now={now}
            onOpen={onOpen}
            lead={
              <input
                type="checkbox"
                aria-label={`Seleccionar ${p.title}`}
                checked={sel.includes(p.id)}
                onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                className="size-4 accent-amber"
              />
            }
            actions={leadDays(p) < MIN_LEAD_DAYS ? <span className="text-xs text-amber">⚠ {leadDays(p)} días para grabar</span> : undefined}
          />
        ))}
        {drafts.length > 0 && (
          <div className="flex items-center gap-3 pt-1">
            <Btn kind="primary" disabled={!sel.length || pending} onClick={send}>
              {pending ? "Enviando…" : `Enviar brief${sel.length > 1 ? "s" : ""}${sel.length ? ` (${sel.length})` : ""}`}
            </Btn>
            {short.length > 0 && <span className="text-xs text-amber">⚠ {short.length} con menos de {MIN_LEAD_DAYS} días de anticipación</span>}
          </div>
        )}
      </Section>

      <Section title={`Esperando al cliente (${waiting.length})`} empty={!waiting.length}>
        {waiting.map((p) => <Row key={p.id} p={p} tz={tz} now={now} onOpen={onOpen} />)}
      </Section>

      <Section title={`En producción (${production.length})`} empty={!production.length}>
        {production.map((p) => <Row key={p.id} p={p} tz={tz} now={now} onOpen={onOpen} />)}
      </Section>

      <Section title={`Publicadas y canceladas (${done.length})`} empty={!done.length}>
        {done.map((p) => <Row key={p.id} p={p} tz={tz} now={now} onOpen={onOpen} />)}
      </Section>
    </div>
  );
}

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => signOut())}
      className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-text-3 hover:text-white disabled:opacity-60"
    >
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
