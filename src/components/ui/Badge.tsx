import type { ReactNode } from "react";

import { cx, humanize } from "@/lib/format";

export type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  accent: "bg-accent-50 text-accent-700 ring-accent-100",
  success: "bg-success-50 text-success-700 ring-success-100",
  warning: "bg-warning-50 text-warning-700 ring-warning-100",
  danger: "bg-danger-50 text-danger-700 ring-danger-100",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-slate-400",
  brand: "bg-brand-600",
  accent: "bg-accent-500",
  success: "bg-success-600",
  warning: "bg-warning",
  danger: "bg-danger-600",
};

export function Badge({
  tone = "neutral",
  dot,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}

/** Status → tone, per the contract's status colours. */
const STATUS_TONES: Record<string, Tone> = {
  // verification
  pending: "warning",
  in_review: "brand",
  approved: "success",
  rejected: "danger",
  // bookings
  created: "neutral",
  searching: "warning",
  assigned: "brand",
  confirmed: "brand",
  en_route: "accent",
  in_progress: "accent",
  completed: "success",
  cancelled: "neutral",
  failed: "danger",
  no_show: "danger",
  // users
  active: "success",
  suspended: "danger",
  deleted: "neutral",
};

const STATUS_LABELS: Record<string, string> = {
  failed: "No pro available",
  no_show: "Missed visit",
  en_route: "On the way",
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? "neutral";
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={statusTone(status)} dot className={className}>
      {STATUS_LABELS[status] ?? humanize(status)}
    </Badge>
  );
}

export function RoleChip({ role }: { role: string }) {
  const tone: Tone = role === "super_admin" ? "accent" : role === "admin" ? "brand" : role === "ops" ? "warning" : "neutral";
  const label = role === "super_admin" ? "Super admin" : role === "ops" ? "Ops" : humanize(role);
  return <Badge tone={tone}>{label}</Badge>;
}
