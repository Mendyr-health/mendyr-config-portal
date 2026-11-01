"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { useAuth } from "@/lib/AuthProvider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { role, isPortalUser, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role === null) router.replace("/login");
  }, [role, router]);

  if (role === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <span className="skeleton h-10 w-10 rounded-xl" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (role === null) return null;

  if (!isPortalUser) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          icon="lock"
          title="This console is for Mendyr staff"
          description={
            <>
              Your account role is <span className="font-mono">{role}</span>. Ask a super admin to give you an admin
              or ops role.
            </>
          }
          action={
            <Button variant="secondary" icon="logout" onClick={logout}>
              Sign out
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}

/** Wrap admin-only screens (the backend rejects ops for these endpoints). */
export function AdminOnly({ children, what = "This section" }: { children: ReactNode; what?: string }) {
  const { canWrite } = useAuth();
  if (canWrite) return <>{children}</>;
  return (
    <EmptyState
      icon="lock"
      title="Admins only"
      description={`${what} needs an admin or super admin account. Ops accounts can view operations screens.`}
      className="py-24"
    />
  );
}
