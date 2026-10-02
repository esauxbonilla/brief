"use server";

import { redirect } from "next/navigation";
import { isDemo } from "@/lib/supabase/config";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const MIN_PASSWORD = 6;

type Admin = ReturnType<typeof supabaseAdmin>;

async function findUser(admin: Admin, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) return user ?? null;
  }
}

/** Only emails in `clients` or agency members may get an account. */
async function isAllowed(admin: Admin, email: string, userId: string | undefined) {
  const { data: clients } = await admin.from("clients").select("email").ilike("email", email);
  if (clients?.some((c) => c.email?.trim().toLowerCase() === email)) return true;
  if (!userId) return false;
  const { data: member } = await admin.from("agency_members").select("user_id").eq("user_id", userId).limit(1);
  return !!member?.length;
}

/**
 * Email + password, no emails sent. The first time someone signs in, the
 * password they type becomes theirs (app_metadata.password_set marks it), as
 * long as their email is in `clients` or they are an agency member.
 */
export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Escribe un email válido." };
  if (!password) return { error: "Escribe tu contraseña." };
  if (isDemo) return { error: "Modo demo: no hay inicio de sesión. Entra directo al calendario." };
  const sb = await supabaseServer();
  const first = await sb.auth.signInWithPassword({ email, password });
  if (!first.error) {
    // Password set outside this flow (e.g. Supabase dashboard): lock it in.
    const user = first.data.user;
    if (!user.app_metadata?.password_set && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await supabaseAdmin().auth.admin.updateUserById(user.id, { app_metadata: { password_set: true } });
    }
    redirect("/");
  }
  if (first.error.code !== "invalid_credentials") {
    console.error("[login] signInWithPassword", first.error.status, first.error.code, first.error.message);
    return { error: `No pudimos entrar (${first.error.code ?? first.error.status}: ${first.error.message})` };
  }

  // Wrong password, or first time: set it up.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en Vercel para crear cuentas nuevas." };
  }
  const admin = supabaseAdmin();
  const user = await findUser(admin, email);
  if (user?.app_metadata?.password_set) return { error: "Contraseña incorrecta." };
  if (!(await isAllowed(admin, email, user?.id))) return { error: "Ese email no está dado de alta. Pídele a tu agencia que te agregue." };
  if (password.length < MIN_PASSWORD) return { error: `Primera vez: elige una contraseña de al menos ${MIN_PASSWORD} caracteres.` };
  const attrs = { password, email_confirm: true, app_metadata: { password_set: true } };
  const { error } = user
    ? await admin.auth.admin.updateUserById(user.id, attrs)
    : await admin.auth.admin.createUser({ email, ...attrs });
  if (error) return { error: `No se pudo crear la cuenta (${error.message}).` };
  const retry = await sb.auth.signInWithPassword({ email, password });
  if (retry.error) return { error: `No pudimos entrar (${retry.error.message}).` };
  // "/" sends agency members on to /agencia.
  redirect("/");
}

export async function signOut() {
  if (!isDemo) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  redirect("/login");
}
