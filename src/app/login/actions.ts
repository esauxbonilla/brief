"use server";

import { headers } from "next/headers";
import { isDemo } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export type LoginState = { sent?: string; error?: string };

export async function sendMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Escribe un email válido." };
  if (isDemo) return { error: "Modo demo: no hay inicio de sesión. Entra directo al calendario." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });
  if (error) {
    console.error("[login] signInWithOtp", error.status, error.code, error.message);
    const reason =
      error.status === 429 || /rate limit/i.test(error.message)
        ? "Se alcanzó el límite de correos. Espera unos minutos."
        : /not authorized|not allowed/i.test(error.message)
          ? "El servidor de correo no tiene permiso para enviar a este email. Hay que configurar SMTP en Supabase."
          : "No pudimos enviar el enlace.";
    return { error: `${reason} (${error.code ?? error.status}: ${error.message})` };
  }
  return { sent: email };
}

export async function signOut() {
  if (isDemo) return;
  const sb = await supabaseServer();
  await sb.auth.signOut();
}
