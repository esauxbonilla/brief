import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { supabaseServer } from "@/lib/supabase/server";

// Magic link via token_hash: works even if the link opens in a different
// browser than the one that asked for it (e.g. the Gmail app on a phone).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  if (!token_hash) return NextResponse.redirect(new URL("/login?error=1", url));
  const sb = await supabaseServer();
  const { error } = await sb.auth.verifyOtp({ token_hash, type });
  if (error) return NextResponse.redirect(new URL("/login?error=1", url));
  const agency = await repo.agencySession();
  return NextResponse.redirect(new URL(agency ? "/agencia" : "/", url));
}
