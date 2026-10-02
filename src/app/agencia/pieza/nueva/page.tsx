import Link from "next/link";
import { notFound } from "next/navigation";
import { EDIT_DAYS } from "@/lib/constants";
import { addDays, DEFAULT_BUFFER_DAYS, dayKey } from "@/lib/dates";
import { repo } from "@/lib/data";
import { PieceForm } from "../editor";

export default async function NewPiece({ searchParams }: PageProps<"/agencia/pieza/nueva">) {
  const { client: clientId } = await searchParams;
  const s = await repo.agencySession();
  const client = s?.clients.find((c) => c.id === clientId);
  if (!client) notFound();
  // Drafts are created ~10 days before publishing (see the notices table in the handoff).
  const publish = addDays(dayKey(new Date(), client.tz), 10);
  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <Link href={`/agencia/${client.id}`} className="text-[13px] no-underline">‹ {client.name}</Link>
      <h1 className="m-0 text-2xl font-semibold tracking-[-0.015em]">Nueva pieza</h1>
      <PieceForm
        init={{
          client_id: client.id, channel: "reel", title: "", format: "", objective: "", hook: "", notes: "", shots: "",
          publish_date: publish, edit_days: EDIT_DAYS.reel, record_due_date: addDays(publish, -(EDIT_DAYS.reel + DEFAULT_BUFFER_DAYS)),
        }}
      />
    </div>
  );
}
