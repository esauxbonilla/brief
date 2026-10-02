"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ClientApp } from "@/components/client/ClientApp";
import type { Agency, Client, PieceFull } from "@/lib/types";
import { PieceEditor } from "../pieza/editor";
import * as A from "../actions";
import { Btn, ClientBoard, useAct } from "../ui";

type View = "calendario" | "lista";

/**
 * One client in the agency panel: the client's own calendar (same look), but
 * editable — "+" creates, cards drag between days, the side panel edits.
 * The grouped list stays as a secondary view.
 */
export function ClientWorkspace({ client, agency, pieces, serverNow }: {
  client: Client;
  agency: Agency;
  pieces: PieceFull[];
  serverNow: string;
}) {
  const [view, setView] = useState<View>("calendario");
  const panel = useCallback((p: PieceFull) => <PieceEditor piece={p} tz={client.tz} now={serverNow} />, [client.tz, serverNow]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-7 pt-5">
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
        <div className="flex flex-wrap items-center gap-4">
          <DriveField client={client} />
          <Link href={`/calendario/${client.id}`} className="text-[13px] no-underline">Ver como lo ve {client.name.split(" ")[0]} →</Link>
        </div>
      </div>

      {view === "lista" ? (
        <div className="mx-auto w-full max-w-[1100px] px-7 py-6">
          <ClientBoard pieces={pieces} tz={client.tz} serverNow={serverNow} />
        </div>
      ) : (
        <ClientApp
          client={client}
          agency={agency}
          initialPieces={pieces.filter((p) => p.status !== "cancelado")}
          serverNow={serverNow}
          base={`/calendario/${client.id}`}
          readOnly
          agencyPanel={panel}
        />
      )}
    </div>
  );
}

/** Where the client uploads the videos: their "Subir a Drive" button opens this link. */
function DriveField({ client }: { client: Client }) {
  const { pending, run } = useAct();
  const [url, setUrl] = useState(client.drive_url ?? "");
  const saved = (client.drive_url ?? "") === url.trim();
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => A.setClientDrive(client.id, url)); }}>
      <span className="text-[13px] text-text-3">Drive del cliente</span>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://drive.google.com/…"
        className="h-8 w-[260px] rounded-lg border bg-surface-2 px-2.5 text-[13px] text-text outline-none placeholder:text-text-4 focus:border-amber"
        style={{ borderColor: client.drive_url ? "rgba(79,217,138,0.4)" : "rgba(245,184,61,0.5)" }}
      />
      {!saved && <Btn type="submit" kind="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Btn>}
    </form>
  );
}
