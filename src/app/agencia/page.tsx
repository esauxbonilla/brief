import { redirect } from "next/navigation";
import { repo } from "@/lib/data";

export default async function AgencyHome() {
  const s = await repo.agencySession();
  if (!s) redirect("/login");
  if (!s.clients.length) return <p className="text-sm text-text-3">Todavía no hay clientes.</p>;
  redirect(`/agencia/${s.clients[0].id}`);
}
