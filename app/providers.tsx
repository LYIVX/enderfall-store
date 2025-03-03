"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { UserSettingsProvider } from "@/lib/context/UserSettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserSettingsProvider>{children}</UserSettingsProvider>
    </SessionProvider>
  );
}
