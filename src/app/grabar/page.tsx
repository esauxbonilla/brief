import { connection } from "next/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClientShell } from "@/components/client/ClientApp";
import { RecordingSession } from "@/components/client/RecordingSession";
import { repo } from "@/lib/data";

export const metadata: Metadata = { title: "Sesión de grabación" };

export default async function GrabarPage() {
  await connection();
  const session = await repo.clientSession();
  if (!session) redirect("/login");
  const pieces = await repo.clientPieces(session.client.id);
  return (
    <ClientShell client={session.client} agency={session.agency} initialPieces={pieces} serverNow={new Date().toISOString()}>
      <RecordingSession />
    </ClientShell>
  );
}
