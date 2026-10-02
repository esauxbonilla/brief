import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { ClientBoard, PasswordForm } from "../ui";

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
        <div className="flex gap-2">
          <Link href={`/calendario/${client.id}`} className="flex h-10 items-center rounded-[10px] border px-4 text-sm font-medium text-text no-underline hover:bg-white/5 hover:text-text" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
            Ver calendario
          </Link>
          <Link href={`/agencia/pieza/nueva?client=${client.id}`} className="flex h-10 items-center rounded-[10px] bg-amber px-4 text-sm font-semibold text-amber-ink no-underline hover:bg-amber-hover hover:text-amber-ink">
            + Nueva pieza
          </Link>
        </div>
      </div>
      <ClientBoard pieces={pieces} tz={client.tz} serverNow={new Date().toISOString()} />
      <section className="flex max-w-[560px] flex-col gap-3 border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <h2 className="m-0 text-lg font-semibold">Acceso del cliente</h2>
        <p className="m-0 text-[13px] leading-[1.5] text-text-3">
          Entra con <strong className="text-text-2b">{client.email ?? "su email"}</strong> y la contraseña que pongas aquí. Pásasela por WhatsApp.
        </p>
        <PasswordForm clientId={client.id} label="Contraseña del cliente" />
      </section>
    </div>
  );
}
