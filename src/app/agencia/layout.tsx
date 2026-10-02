import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/data";
import { isDemo } from "@/lib/supabase/config";
import { UserMenu } from "./ui";

export const metadata: Metadata = { title: "Panel agencia" };

export default async function AgencyLayout({ children }: LayoutProps<"/agencia">) {
  await connection();
  const s = await repo.agencySession();
  if (!s) redirect("/login");
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-surface px-4 py-2.5 md:gap-6 md:px-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/agencia" className="flex flex-none items-center gap-2 text-text no-underline hover:text-white">
          <span className="flex size-6 items-center justify-center rounded-[5px] bg-[#24262B] font-mono text-[10px] text-[#8A8D93]">{s.agency.initials}</span>
          <span className="hidden text-sm font-semibold sm:inline">{s.agency.name}</span>
          <span className="hidden text-xs text-text-3 md:inline">· Panel</span>
        </Link>
        <nav className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {s.clients.map((c) => (
            <Link key={c.id} href={`/agencia/${c.id}`} className="flex-none rounded-full border px-3 py-1 text-[13px] whitespace-nowrap text-text-2b no-underline hover:text-white" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="flex flex-none items-center gap-4 text-[13px]">
          {isDemo && <Link href="/" className="hidden no-underline md:inline">Ver como cliente →</Link>}
          <UserMenu />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
