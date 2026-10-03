import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ClientApp } from "@/components/client/ClientApp";
import { repo } from "@/lib/data";
import { thisWeekPending } from "@/lib/pieces";

export default async function Home() {
  await connection();
  // Both lookups at once: an agency user opening the app doesn't wait for two rounds.
  const [session, agency] = await Promise.all([repo.clientSession(), repo.agencySession()]);
  if (!session) redirect(agency?.clients.length ? `/agencia/${agency.clients[0].id}` : agency ? "/agencia" : "/login");
  const pieces = await repo.clientPieces(session.client.id);
  const now = new Date();
  const first = thisWeekPending(pieces, now, session.client.tz)[0];
  return (
    <ClientApp
      client={session.client}
      agency={session.agency}
      initialPieces={pieces}
      serverNow={now.toISOString()}
      initialSelected={first?.id ?? null}
    />
  );
}
