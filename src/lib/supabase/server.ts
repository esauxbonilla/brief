import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** Supabase client acting as the signed-in user (RLS applies). One per request. */
export const supabaseServer = cache(async () => {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
});

/**
 * Signed-in user id, verified from the session JWT. With asymmetric signing
 * keys this needs no call to the Auth server (getUser always made one).
 */
export const currentUserId = cache(async (): Promise<string | null> => {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/** Service-role client. Bypasses RLS: only for trusted server jobs (avisos). */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
