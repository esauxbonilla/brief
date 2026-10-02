import { connection } from "next/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { repo } from "@/lib/data";

/** Agency-only: the client's calendar exactly as they see it, read-only. */
export async function loadPreview(clientId: string) {
  await connection();
  const s = await repo.agencySession();
  if (!s) redirect("/login");
  const client = s.clients.find((c) => c.id === clientId);
  if (!client) notFound();
  const pieces = await repo.clientPieces(client.id);
  return { client, agency: s.agency, pieces };
}

export function PreviewBar({ clientId, name }: { clientId: string; name: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b bg-[#1A1508] px-4 py-2 text-[13px]" style={{ borderColor: "rgba(245,184,61,0.25)", color: "#FFF4DE" }}>
      <span>Así lo ve <strong className="font-semibold">{name}</strong> · solo lectura</span>
      <Link href={`/agencia/${clientId}`} className="flex-none no-underline hover:text-white" style={{ color: "#F5B83D" }}>‹ Volver al panel</Link>
    </div>
  );
}
