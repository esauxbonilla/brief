import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { ClientBoard } from "../ui";

export default async function ClientPage({ params }: PageProps<"/agencia/[clientId]">) {
  const { clientId } = await params;
  const s = await repo.agencySession();
  const client = s?.clients.find((c) => c.id === clientId);
  if (!client) notFound();
  const pieces = await repo.agencyPieces(client.id);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-3">Cliente</span>
          <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em]">{client.name}</h1>
        </div>
        <Link href={`/agencia/pieza/nueva?client=${client.id}`} className="flex h-10 items-center rounded-[10px] bg-amber px-4 text-sm font-semibold text-amber-ink no-underline hover:bg-amber-hover hover:text-amber-ink">
          + Nueva pieza
        </Link>
      </div>
      <ClientBoard pieces={pieces} tz={client.tz} serverNow={new Date().toISOString()} />
    </div>
  );
}
