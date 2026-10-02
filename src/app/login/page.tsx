import type { Metadata } from "next";
import Link from "next/link";
import { isDemo } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em]">Tu calendario de contenido</h1>
        <p className="m-0 text-[15px] leading-[1.5] text-text-2c">Entra con tu email y tu contraseña. Si no la tienes, pídesela a tu agencia.</p>
      </div>
      {error && <p className="m-0 text-[13px] text-red">El enlace caducó o ya se usó. Entra con tu contraseña.</p>}
      {isDemo ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4 text-sm leading-[1.5] text-text-2c">
          <span>Modo demo (sin Supabase configurado). Entra directo:</span>
          <Link href="/" className="font-semibold">Calendario del cliente →</Link>
          <Link href="/agencia" className="font-semibold">Panel de la agencia →</Link>
        </div>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
