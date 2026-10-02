import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { supabaseServer } from "@/lib/supabase/server";

// Magic link lands here: exchange the code for a session, then route by role.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=1", url));
  const sb = await supabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=1", url));
  const agency = await repo.agencySession();
  return NextResponse.redirect(new URL(agency ? "/agencia" : "/", url));
}
