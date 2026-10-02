"use server";

import { redirect } from "next/navigation";
import { isDemo } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Escribe un email válido." };
  if (!password) return { error: "Escribe tu contraseña." };
  if (isDemo) return { error: "Modo demo: no hay inicio de sesión. Entra directo al calendario." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[login] signInWithPassword", error.status, error.code, error.message);
    if (error.code === "invalid_credentials") return { error: "Email o contraseña incorrectos." };
    return { error: `No pudimos entrar (${error.code ?? error.status}: ${error.message})` };
  }
  // "/" sends agency members on to /agencia.
  redirect("/");
}

export async function signOut() {
  if (isDemo) return;
  const sb = await supabaseServer();
  await sb.auth.signOut();
}
