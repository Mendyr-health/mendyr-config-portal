import type { ReactNode } from "react";

import { cx } from "@/lib/format";

import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cx("rounded-card border border-slate-200/80 bg-white shadow-soft", padded && "p-5", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: IconName;
  className?: string;
}) {
  return (
    <div className={cx("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon name={icon} size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Page heading with optional actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "brand",
  loading,
  trend,
  href,
  footer,
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  tone?: "brand" | "accent" | "success" | "warning" | "danger" | "neutral";
  loading?: boolean;
  trend?: ReactNode;
  href?: string;
  footer?: ReactNode;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    accent: "bg-accent-50 text-accent-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    danger: "bg-danger-50 text-danger-700",
    neutral: "bg-slate-100 text-slate-600",
  };
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {icon && (
          <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <div className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
        {loading ? <span className="skeleton inline-block h-8 w-20 align-middle" /> : value}
      </div>
      {(hint || trend) && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {trend}
          {hint && <span>{loading ? <span className="skeleton inline-block h-3 w-24" /> : hint}</span>}
        </div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </>
  );
  const cls = "block rounded-card border border-slate-200/80 bg-white p-5 shadow-soft";
  if (href) {
    return (
      <a href={href} className={cx(cls, "press transition-shadow hover:shadow-lift")}>
        {body}
      </a>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-3 font-display text-[15px] font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-wrap items-center gap-3 rounded-card border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700",
        className
      )}
    >
      <Icon name="alert" size={18} />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" icon="refresh" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function Callout({
  tone = "brand",
  icon = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "brand" | "warning" | "danger" | "success" | "neutral";
  icon?: IconName;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    brand: "border-brand-100 bg-brand-50/70 text-brand-800",
    warning: "border-warning-100 bg-warning-50 text-warning-700",
    danger: "border-danger-100 bg-danger-50 text-danger-700",
    success: "border-success-100 bg-success-50 text-success-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return (
    <div className={cx("flex flex-wrap items-start gap-3 rounded-card border px-4 py-3 text-sm", tones[tone], className)}>
      <Icon name={icon} size={18} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title ? "mt-0.5 opacity-90" : undefined)}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx("skeleton block", className)} />;
}

/** Definition list row for detail drawers. */
export function DetailRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}
