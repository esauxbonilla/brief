import type { Metadata } from "next";
import { PasswordForm } from "../ui";

export const metadata: Metadata = { title: "Mi contraseña" };

export default function AccountPage() {
  return (
    <div className="flex max-w-[560px] flex-col gap-4">
      <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em]">Mi contraseña</h1>
      <p className="m-0 text-[13px] leading-[1.5] text-text-3">Con ella entras desde /login junto con tu email, sin esperar ningún correo.</p>
      <PasswordForm label="Nueva contraseña" />
    </div>
  );
}
