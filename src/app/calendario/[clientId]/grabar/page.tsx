import type { Metadata } from "next";
import { ClientShell } from "@/components/client/ClientApp";
import { RecordingSession } from "@/components/client/RecordingSession";
import { loadPreview, PreviewBar } from "../preview";

export const metadata: Metadata = { title: "Sesión de grabación del cliente" };

export default async function RecordingPreviewPage({ params }: PageProps<"/calendario/[clientId]/grabar">) {
  const { clientId } = await params;
  const { client, agency, pieces } = await loadPreview(clientId);
  return (
    <>
      <PreviewBar clientId={client.id} name={client.name} />
      <ClientShell client={client} agency={agency} initialPieces={pieces} serverNow={new Date().toISOString()} base={`/calendario/${client.id}`} readOnly>
        <RecordingSession />
      </ClientShell>
    </>
  );
}
