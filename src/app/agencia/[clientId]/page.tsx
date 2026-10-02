import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { ClientWorkspace } from "./workspace";

export default async function ClientPage({ params }: PageProps<"/agencia/[clientId]">) {
  const { clientId } = await params;
  const s = await repo.agencySession();
  const client = s?.clients.find((c) => c.id === clientId);
  if (!s || !client) notFound();
  const pieces = await repo.agencyPieces(client.id);
  return <ClientWorkspace client={client} agency={s.agency} pieces={pieces} serverNow={new Date().toISOString()} />;
}
