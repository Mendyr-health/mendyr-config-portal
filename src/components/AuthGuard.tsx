"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/AuthProvider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { role, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role === null) router.replace("/login");
  }, [role, router]);

  if (role === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (role === null) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Admins only</p>
        <p className="max-w-sm text-sm text-slate-500">
          Your account role is <span className="font-mono">{role}</span>. Config management is
          restricted to admin accounts — ask an existing admin to promote you.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
