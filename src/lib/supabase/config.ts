// Tolerate a pasted REST URL (".../rest/v1/") or trailing slash: keep only the origin.
function origin(u: string | undefined) {
  try {
    return u ? new URL(u.trim()).origin : "";
  } catch {
    return "";
  }
}

export const SUPABASE_URL = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** Without Supabase credentials the app runs on the in-memory demo store. */
export const isDemo = !SUPABASE_URL || !SUPABASE_ANON_KEY;
