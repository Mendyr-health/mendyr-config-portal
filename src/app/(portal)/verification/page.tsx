"use client";

import Link from "next/link";

import { ProfessionalsBrowser } from "@/components/professionals/ProfessionalsBrowser";
import { Button } from "@/components/ui/Button";
import { Callout, Card, CardHeader, ErrorState, PageHeader, StatCard } from "@/components/ui/Card";
import { BarChart, Legend, Sparkline, CHART_COLORS } from "@/components/ui/charts";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { formatDuration, formatNumber, formatShortDate, hoursSince } from "@/lib/format";
import { VERIFICATION_COLORS, VERIFICATION_LABELS, professionLabel } from "@/lib/labels";
import { useResource } from "@/lib/useResource";
import type { VerificationStats } from "@/lib/types";

export default function VerificationPage() {
  const stats = useResource(() => adminApi.professionalStats(), []);
  const s = stats.data;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Verification"
        description="Every new professional starts here. Check their registration and documents, then approve or reject with a reason they'll see."
        actions={
          <Button variant="secondary" icon="refresh" onClick={() => void stats.reload()} loading={stats.loading && !!s}>
            Refresh
          </Button>
        }
      />

      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} className="mb-4" />}

      <AutoApproveBanner stats={s} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Onboarded"
          icon="users"
          loading={!s}
          value={formatNumber(s?.total)}
          hint={s ? `${s.onboarded_today} today · ${s.onboarded_7d} in 7d · ${s.onboarded_30d} in 30d` : undefined}
          footer={s ? <Sparkline values={s.daily.map((d) => d.onboarded)} width={200} ariaLabel="Onboarding, last 30 days" /> : undefined}
        />
        <StatCard
          label="In queue"
          icon="clock"
          tone="warning"
          loading={!s}
          value={s ? formatNumber((s.by_status.pending ?? 0) + (s.by_status.in_review ?? 0)) : "—"}
          hint={
            s
              ? s.oldest_pending_at
                ? `${s.by_status.pending ?? 0} pending · ${s.by_status.in_review ?? 0} in review · oldest waiting ${formatDuration(hoursSince(s.oldest_pending_at))}`
                : "Nobody is waiting"
              : undefined
          }
        />
        <StatCard
          label="Approved"
          icon="check-circle"
          tone="success"
          loading={!s}
          value={formatNumber(s?.by_status.approved)}
          hint={s ? `${s.approved_7d} approved in the last 7 days` : undefined}
        />
        <StatCard
          label="Rejected"
          icon="x-circle"
          tone="danger"
          loading={!s}
          value={formatNumber(s?.by_status.rejected)}
          hint={s ? `${s.rejected_7d} rejected in the last 7 days` : undefined}
        />
        <StatCard
          label="Median time to approve"
          icon="timer"
          tone="accent"
          loading={!s}
          value={s ? formatDuration(s.median_hours_to_approve) : "—"}
          hint="Signup to approval, last 30 days"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Onboarding, last 30 days" description="New professional signups per day" icon="trend" />
          {s ? (
            <BarChart
              ariaLabel="Professionals onboarded per day over the last 30 days"
              data={s.daily.map((d) => ({ label: formatShortDate(d.date), onboarded: d.onboarded }))}
              series={[{ key: "onboarded", label: "Onboarded", color: CHART_COLORS.primary }]}
              height={200}
            />
          ) : (
            <div className="skeleton h-[200px] w-full" />
          )}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="By profession" description="Verification status per profession" icon="stethoscope" />
          <ByProfession stats={s} />
        </Card>
      </div>

      <ProfessionalsBrowser defaultTab="pending" counts={s?.by_status} onChanged={() => void stats.reload()} />
    </>
  );
}

function AutoApproveBanner({ stats }: { stats: VerificationStats | null }) {
  const { canWrite } = useAuth();
  if (!stats) return null;
  const link = canWrite ? (
    <Link href="/app-config?key=verification" className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline">
      Verification policy →
    </Link>
  ) : null;
  return stats.auto_approve ? (
    <Callout tone="warning" icon="bolt" title="Auto-approve is ON" action={link} className="mb-6">
      New professionals are approved the moment they sign up and start receiving requests without a manual check.
    </Callout>
  ) : (
    <Callout tone="brand" icon="shield" title="Manual verification is on" action={link} className="mb-6">
      New professionals stay pending and receive no visit requests until someone approves them here.
    </Callout>
  );
}

function ByProfession({ stats }: { stats: VerificationStats | null }) {
  if (!stats) return <div className="skeleton h-40 w-full" />;
  const rows = Object.entries(stats.by_type)
    .map(([type, counts]) => ({ type, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  if (!rows.length) return <p className="py-4 text-sm text-slate-500">No professionals yet.</p>;
  const order = ["approved", "in_review", "pending", "rejected"];
  const series = order.map((k) => ({ key: k, label: VERIFICATION_LABELS[k]!, color: VERIFICATION_COLORS[k]! }));
  return (
    <div>
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li key={r.type}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="font-medium text-slate-700">{professionLabel(r.type)}</span>
              <span className="tabular-nums text-slate-500">
                <span className="font-semibold text-slate-900">{r.total}</span>
                {(r.counts.pending ?? 0) + (r.counts.in_review ?? 0) > 0 && (
                  <span className="ml-2 text-warning-700">{(r.counts.pending ?? 0) + (r.counts.in_review ?? 0)} waiting</span>
                )}
              </span>
            </div>
            <div
              className="flex h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={order.map((k) => `${VERIFICATION_LABELS[k]} ${r.counts[k] ?? 0}`).join(", ")}
            >
              {order.map((k) =>
                r.counts[k] ? (
                  <span key={k} style={{ width: `${(r.counts[k]! / r.total) * 100}%`, background: VERIFICATION_COLORS[k] }} />
                ) : null
              )}
            </div>
          </li>
        ))}
      </ul>
      <Legend series={series} className="mt-4" />
    </div>
  );
}
