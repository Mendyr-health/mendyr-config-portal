"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { errorMessage } from "@/lib/api";
import { PORTAL_ROLES, useAuth } from "@/lib/AuthProvider";

// Every successful sign-in (and an already signed-in visit to /login) lands on the overview,
// the same place "/" redirects to.
const AFTER_LOGIN = "/dashboard";

export default function LoginPage() {
  const { login, logout, role, isPortalUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (role && isPortalUser) router.replace(AFTER_LOGIN);
  }, [role, isPortalUser, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await login(email.trim(), password);
      if (!r || !(PORTAL_ROLES as readonly string[]).includes(r)) {
        logout();
        setError("This account doesn't have access to the admin console.");
        return;
      }
      router.replace(AFTER_LOGIN);
    } catch (err) {
      setError(errorMessage(err, "Sign-in failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 18V7l8 7 8-7v11" />
            </svg>
          </span>
          <span className="font-display text-xl font-semibold">Mendyr</span>
        </div>
        <div className="mt-auto max-w-md">
          <h1 className="text-[34px] font-semibold leading-tight">Trusted care at home starts with the right people.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">
            Verify professionals, keep visits on track and shape what patients and pros see in the app — all from one
            console.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            {[
              ["shield", "Verification queue with documents and decision history"],
              ["calendar", "Live bookings, cancellations and reassignment"],
              ["sliders", "Typed app config with previews and one-click reset"],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Icon name={icon as "shield"} size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-accent-500/30" />
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-display text-2xl font-semibold text-brand-700">Mendyr</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Sign in to the admin console</h2>
          <p className="mt-1.5 text-sm text-slate-500">Use your Mendyr admin, super admin or ops account.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <Field label="Work email">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  icon="mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@mendyr.com"
                />
              )}
            </Field>
            <Field label="Password">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  required
                  icon="lock"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-700">
                <Icon name="alert" size={16} className="mt-0.5" />
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={submitting} disabled={!email || !password}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-400">Sessions end when you close this tab.</p>
        </div>
      </div>
    </div>
  );
}
