import type { Metadata } from "next";
import { ClientApp } from "@/components/client/ClientApp";
import { thisWeekPending } from "@/lib/pieces";
import { loadPreview, PreviewBar } from "./preview";

export const metadata: Metadata = { title: "Calendario del cliente" };

export default async function CalendarPreviewPage({ params }: PageProps<"/calendario/[clientId]">) {
  const { clientId } = await params;
  const { client, agency, pieces } = await loadPreview(clientId);
  const now = new Date();
  const first = thisWeekPending(pieces, now, client.tz)[0];
  return (
    <>
      <PreviewBar clientId={client.id} name={client.name} />
      <ClientApp
        client={client}
        agency={agency}
        initialPieces={pieces}
        serverNow={now.toISOString()}
        initialSelected={first?.id ?? null}
        base={`/calendario/${client.id}`}
        readOnly
      />
    </>
  );
}
