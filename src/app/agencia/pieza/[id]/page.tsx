import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { PieceEditor } from "../editor";

export default async function PiecePage({ params }: PageProps<"/agencia/pieza/[id]">) {
  const { id } = await params;
  const s = await repo.agencySession();
  const p = await repo.agencyPiece(id);
  const client = p && s?.clients.find((c) => c.id === p.client_id);
  if (!p || !client) notFound();
  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <Link href={`/agencia/${client.id}`} className="text-[13px] no-underline">‹ {client.name}</Link>
      <PieceEditor piece={p} tz={client.tz} now={new Date().toISOString()} />
    </div>
  );
}
