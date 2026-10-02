"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ClientApp } from "@/components/client/ClientApp";
import type { Agency, Client, PieceFull } from "@/lib/types";
import { PieceEditor } from "../pieza/editor";
import { ClientBoard } from "../ui";

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
        <Link href={`/calendario/${client.id}`} className="text-[13px] no-underline">Ver como lo ve {client.name.split(" ")[0]} →</Link>
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
