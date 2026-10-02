"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});
  if (state.sent) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber bg-amber-block p-4">
        <span className="text-base font-semibold" style={{ color: "#FFF4DE" }}>Revisa tu correo</span>
        <span className="text-sm leading-[1.45]" style={{ color: "#F2DDB0" }}>
          Te enviamos un enlace a <strong>{state.sent}</strong>. Ábrelo desde este dispositivo para entrar.
        </span>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-text-2c">Tu email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="tu@email.com"
          className="h-[52px] rounded-[14px] border bg-surface-2 px-4 text-base text-text outline-none placeholder:text-text-4 focus:border-amber"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        />
      </label>
      {state.error && <span className="text-[13px] text-red">{state.error}</span>}
      <button disabled={pending} className="press h-[52px] cursor-pointer rounded-[14px] border-none bg-amber text-[15px] font-semibold text-amber-ink disabled:opacity-60">
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
