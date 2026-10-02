import { redirect } from "next/navigation";
import { ClientApp } from "@/components/client/ClientApp";
import { repo } from "@/lib/data";
import { thisWeekPending } from "@/lib/pieces";

export default async function Home() {
  const session = await repo.clientSession();
  if (!session) redirect((await repo.agencySession()) ? "/agencia" : "/login");
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
