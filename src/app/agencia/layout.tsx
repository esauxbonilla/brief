import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/data";
import { isDemo } from "@/lib/supabase/config";
import { SignOutButton } from "./ui";

export const metadata: Metadata = { title: "Panel agencia" };

export default async function AgencyLayout({ children }: LayoutProps<"/agencia">) {
  await connection();
  const s = await repo.agencySession();
  if (!s) redirect("/login");
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-surface px-6 py-3.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/agencia" className="flex items-center gap-2 text-text no-underline hover:text-white">
          <span className="flex size-6 items-center justify-center rounded-[5px] bg-[#24262B] font-mono text-[10px] text-[#8A8D93]">{s.agency.initials}</span>
          <span className="text-sm font-semibold">{s.agency.name}</span>
          <span className="text-xs text-text-3">· Panel</span>
        </Link>
        <nav className="flex flex-wrap gap-1.5">
          {s.clients.map((c) => (
            <Link key={c.id} href={`/agencia/${c.id}`} className="rounded-full border px-3 py-1 text-[13px] text-text-2b no-underline hover:text-white" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-[13px]">
          {isDemo && <Link href="/" className="no-underline">Ver como cliente →</Link>}
          <SignOutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
