"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { cx } from "@/lib/format";

import { Icon, type IconName } from "./Icon";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, IconName> = { success: "check-circle", error: "alert", info: "info" };
const TONES: Record<ToastTone, string> = {
  success: "text-success-600",
  error: "text-danger-600",
  info: "text-brand-600",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = next.current++;
      setItems((all) => [...all.slice(-3), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card border border-slate-200 bg-white px-4 py-3 shadow-lift"
          >
            <Icon name={ICONS[t.tone]} size={18} className={cx("mt-0.5", TONES[t.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-slate-500">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
