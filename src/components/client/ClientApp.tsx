"use client";

import type { ReactNode } from "react";
import { DesktopCalendar } from "./DesktopCalendar";
import { MobileCalendar } from "./MobileCalendar";
import { Toast } from "./shared";
import { ClientState } from "./state";

type Props = Omit<Parameters<typeof ClientState>[0], "children">;

export function ClientApp(props: Props) {
  return (
    <ClientState {...props}>
      <div className="md:hidden">
        <MobileCalendar />
      </div>
      <div className="hidden md:block">
        <DesktopCalendar />
      </div>
      <Toast />
    </ClientState>
  );
}

export function ClientShell({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <ClientState {...props}>
      {children}
      <Toast />
    </ClientState>
  );
}
