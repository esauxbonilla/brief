"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { CHANNELS } from "@/lib/constants";
import { urgency } from "@/lib/dates";
import { plural } from "@/lib/pieces";
import { useLens } from "./lens";
import { useApp } from "./state";
import { ClientAvatar } from "./ui";

/** Sticky red strip with overdue pieces. Sits above the "esta semana" block. */
export function OverdueStrip({ variant, onOpen }: { variant: "desktop" | "mobile"; onOpen: (id: string) => void }) {
  const { now, tz, base } = useApp();
  const lens = useLens();
  const list = lens.overdue;
  if (!list.length) return null;
  const mobile = variant === "mobile";
  return (
    <div
      role="region"
      aria-label="Piezas atrasadas"
      className="flex flex-col gap-2 border"
      style={{ background: "#2A1214", borderColor: "#FF5C5C", borderRadius: mobile ? 14 : 12, padding: mobile ? "12px 14px" : "12px 16px" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold" style={{ color: "#FFE3E3" }}>
          {lens.publish ? "Sin publicar" : "Atrasadas"}: {list.length} {plural(list.length, "pieza", "piezas")}
        </span>
        {!lens.publish && <Link
          href={`${base}/grabar`}
          className="flex h-8 flex-none items-center rounded-lg px-3 text-[13px] font-semibold no-underline hover:opacity-90"
          style={{ background: "#FF5C5C", color: "#1A0506" }}
        >
          Grabar todo de corrido
        </Link>}
      </div>
      <div className={mobile ? "no-scrollbar -mx-3.5 flex gap-1.5 overflow-x-auto px-3.5" : "flex flex-wrap gap-x-2 gap-y-1"}>
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="flex min-h-9 flex-none cursor-pointer items-center gap-2 rounded-lg border-none px-2 text-left text-[13px] whitespace-nowrap hover:bg-white/5"
            style={{ background: "rgba(255,92,92,0.08)", color: "#FFE3E3" }}
          >
            <span className="h-3 w-[3px] flex-none rounded-sm" style={{ background: CHANNELS[p.channel].color }} />
            <span className="font-medium">{p.title}</span>
            <span className="ml-auto pl-1 text-xs font-semibold whitespace-nowrap text-red">{urgency(lens.dueOf(p), now, tz).text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toast() {
  const { toast, dismissToast } = useApp();
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-7 left-4 z-[70] mx-auto flex h-[52px] max-w-[440px] items-center justify-between gap-3 rounded-[14px] bg-text pr-2 pl-4 text-sm font-medium text-surface"
      style={{
        transition: "transform .3s cubic-bezier(.2,.8,.2,1), opacity .3s",
        transform: toast ? "translateY(0)" : "translateY(140%)",
        opacity: toast ? 1 : 0,
        pointerEvents: toast ? "auto" : "none",
      }}
    >
      <span className="truncate">{toast?.text}</span>
      {toast?.undo && (
        <button
          onClick={() => { toast.undo!(); dismissToast(); }}
          className="h-10 flex-none cursor-pointer rounded-[10px] border-none bg-transparent px-3 text-sm font-bold text-surface"
        >
          Deshacer
        </button>
      )}
    </div>
  );
}

/** The client's avatar; tapping it opens "Cerrar sesión". Plain avatar in the agency preview. */
export function AccountMenu({ size, align }: { size: number; align: "left" | "right" }) {
  const { client, readOnly } = useApp();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (readOnly) return <ClientAvatar initials={client.initials} size={size} />;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Tu cuenta" aria-expanded={open} className="flex cursor-pointer rounded-full border-none bg-transparent p-0">
        <ClientAvatar initials={client.initials} size={size} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full z-[41] mt-2 flex min-w-[190px] flex-col rounded-xl border bg-surface-2 p-1.5 shadow-lg ${align === "right" ? "right-0" : "left-0"}`}
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            <span className="px-3 py-2 text-xs text-text-3">{client.name}</span>
            <button
              disabled={pending}
              onClick={() => start(() => signOut())}
              className="h-10 cursor-pointer rounded-lg border-none bg-transparent px-3 text-left text-sm font-medium text-red hover:bg-white/5 disabled:opacity-60"
            >
              {pending ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
