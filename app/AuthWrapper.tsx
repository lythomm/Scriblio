"use client";

import React from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import LoginPage from "./components/LoginPage";
import { Loader2 } from "lucide-react";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen items-center justify-center bg-canvas-soft text-ink">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
      <Authenticated>
        {children}
      </Authenticated>
    </>
  );
}
