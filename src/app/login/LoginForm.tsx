"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const input = "h-[52px] rounded-[14px] border bg-surface-2 px-4 text-base text-text outline-none placeholder:text-text-4 focus:border-amber";
const inputStyle = { borderColor: "rgba(255,255,255,0.12)" };

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-text-2c">Tu email</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="tu@email.com" className={input} style={inputStyle} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-text-2c">Contraseña</span>
        <input name="password" type="password" required autoComplete="current-password" className={input} style={inputStyle} />
      </label>
      {state.error && <span className="text-[13px] text-red">{state.error}</span>}
      <button disabled={pending} className="press h-[52px] cursor-pointer rounded-[14px] border-none bg-amber text-[15px] font-semibold text-amber-ink disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
