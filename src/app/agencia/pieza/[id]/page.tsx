import Link from "next/link";
import { notFound } from "next/navigation";
import { dayKey } from "@/lib/dates";
import { repo } from "@/lib/data";
import { displayStatus } from "@/lib/pieces";
import { PieceForm, PieceStatusActions, References, ScriptEditor, UploadsList } from "../editor";
import { ChannelTag, ReceivedActions, StatusPill } from "../../ui";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[14px] border bg-sheet p-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <h2 className="m-0 text-[11px] font-semibold tracking-[0.08em] text-text-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default async function PiecePage({ params }: PageProps<"/agencia/pieza/[id]">) {
  const { id } = await params;
  const s = await repo.agencySession();
  const p = await repo.agencyPiece(id);
  const client = p && s?.clients.find((c) => c.id === p.client_id);
  if (!p || !client) notFound();
  const tz = client.tz;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/agencia/${client.id}`} className="text-[13px] no-underline">‹ {client.name}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <ChannelTag ch={p.channel} />
            <StatusPill s={displayStatus(p, new Date())} />
            {p.brief_sent_at ? <span className="text-xs text-text-3">Brief enviado</span> : <span className="text-xs text-amber">El cliente aún no la ve</span>}
          </div>
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.015em]">{p.title}</h1>
        </div>
        <PieceStatusActions piece={p} />
      </div>

      {p.status === "grabado" && (
        <Card title="Material recibido">
          <UploadsList piece={p} />
          <ReceivedActions id={p.id} received={!!p.received_at} />
        </Card>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_420px]">
        <Card title="Brief">
          <PieceForm
            key={p.id + p.publish_at + p.record_due_at}
            init={{
              id: p.id, client_id: p.client_id, channel: p.channel, title: p.title, format: p.format ?? "", objective: p.objective ?? "",
              hook: p.hook ?? "", notes: p.notes.join("\n"), shots: p.shots.map((x) => x.text).join("\n"),
              publish_date: dayKey(p.publish_at, tz), record_due_date: dayKey(p.record_due_at, tz), edit_days: p.edit_days,
            }}
          />
        </Card>
        <div className="flex flex-col gap-5">
          <Card title="Guion">
            <ScriptEditor piece={p} />
          </Card>
          <Card title="Referencias">
            <References piece={p} />
          </Card>
          {p.status !== "grabado" && (
            <Card title="Material del cliente">
              <UploadsList piece={p} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
