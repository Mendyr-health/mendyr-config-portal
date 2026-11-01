"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonClass } from "@/components/ui/Button";
import { Card, CardHeader, ErrorState, PageHeader, StatCard } from "@/components/ui/Card";
import { BarChart, BreakdownBars, CHART_COLORS, Donut, Legend, LineChart } from "@/components/ui/charts";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { dashboardApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { cx, formatINR, formatINRCompact, formatNumber, formatPct, formatShortDate } from "@/lib/format";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, VERIFICATION_COLORS, VERIFICATION_LABELS } from "@/lib/labels";
import { useResource } from "@/lib/useResource";
import type { DashboardFilters } from "@/lib/types";

const BOOKING_SERIES = [
  { key: "completed", label: "Completed", color: CHART_COLORS.success },
  { key: "cancelled", label: "Cancelled", color: CHART_COLORS.slate },
  { key: "created", label: "Created", color: CHART_COLORS.primary },
];

export default function DashboardPage() {
  const { me } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [draft, setDraft] = useState<DashboardFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const res = useResource(() => dashboardApi.getOverview(filters), [JSON.stringify(filters)]);
  const d = res.data;
  const k = d?.kpis ?? null;
  const loading = !d;
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const hour = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dailyBookings = (k?.daily_bookings ?? []).map((x) => ({
    label: formatShortDate(x.day),
    created: x.created,
    completed: x.completed,
    cancelled: x.cancelled,
  }));
  const signups = (d?.daily_signups ?? []).map((x) => ({ label: formatShortDate(x.signup_date), patients: x.patients, professionals: x.professionals }));

  return (
    <>
      <PageHeader
        eyebrow={greeting}
        title={me ? `Welcome back, ${me.full_name.split(" ")[0]}` : "Overview"}
        description="How the marketplace is doing right now — money, fulfilment and quality."
        actions={
          <>
            <Button variant={activeFilters ? "subtle" : "secondary"} icon="filter" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              Filters{activeFilters ? ` · ${activeFilters}` : ""}
            </Button>
            <Button variant="secondary" icon="refresh" onClick={() => void res.reload()} loading={res.loading && !!d}>
              Refresh
            </Button>
          </>
        }
      />

      {showFilters && (
        <Card className="mb-6 animate-fade-in">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters(draft);
            }}
          >
            <Field label="City" className="min-w-[150px] flex-1">
              {(id) => <Input id={id} value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="e.g. Bengaluru" />}
            </Field>
            <Field label="State" className="min-w-[150px] flex-1">
              {(id) => <Input id={id} value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value })} placeholder="e.g. Karnataka" />}
            </Field>
            <Field label="Signups from">
              {(id) => <Input id={id} type="date" value={draft.date_from ?? ""} onChange={(e) => setDraft({ ...draft, date_from: e.target.value })} />}
            </Field>
            <Field label="To">
              {(id) => <Input id={id} type="date" value={draft.date_to ?? ""} onChange={(e) => setDraft({ ...draft, date_to: e.target.value })} />}
            </Field>
            <Button type="submit" variant="primary">
              Apply
            </Button>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft({});
                  setFilters({});
                }}
              >
                Clear
              </Button>
            )}
          </form>
          <p className="mt-3 text-xs text-slate-500">City/state filter patient counts and locations; dates set the signup trend window. Business KPIs are always marketplace-wide.</p>
        </Card>
      )}

      {res.error && <ErrorState message={res.error} onRetry={res.reload} className="mb-6" />}

      {k && k.pending_verifications > 0 && (
        <Link
          href="/verification"
          className="press mb-6 flex items-center gap-3 rounded-card border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700 transition-shadow hover:shadow-soft"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning text-white">
            <Icon name="shield" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold">
              {k.pending_verifications} {k.pending_verifications === 1 ? "professional is" : "professionals are"} waiting for verification
            </span>
            <span className="block text-warning-700/80">They can&apos;t take visits until someone reviews them.</span>
          </span>
          <span className="hidden font-semibold sm:inline">Review now</span>
          <Icon name="arrow-right" size={16} />
        </Link>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV (completed visits)" icon="rupee" loading={loading} value={k ? formatINRCompact(k.gmv_completed) : "—"} hint={k ? formatINR(k.gmv_completed) : undefined} />
        <StatCard label="Platform revenue" icon="trend" tone="success" loading={loading} value={k ? formatINRCompact(k.platform_revenue) : "—"} hint={k ? `${formatINR(k.platform_revenue)} in commission` : undefined} />
        <StatCard label="Bookings today" icon="calendar" tone="accent" loading={loading} value={formatNumber(k?.bookings_today)} hint={k ? `${k.active_visits} visits active right now` : undefined} />
        <StatCard
          label="Average rating"
          icon="star"
          tone="warning"
          loading={loading}
          value={k?.average_rating ? k.average_rating.toFixed(2) : "—"}
          hint={k?.average_rating ? "Across rated visits" : "No ratings yet"}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RateCard label="Fill rate" pct={k?.fill_rate_pct ?? null} loading={loading} color={CHART_COLORS.success} hint="Requests that found a professional" good="high" />
        <RateCard label="Cancellation rate" pct={k?.cancellation_rate_pct ?? null} loading={loading} color={CHART_COLORS.danger} hint="Of resolved bookings" good="low" />
        <StatCard
          label="Avg. time to assign"
          icon="timer"
          tone="brand"
          loading={loading}
          value={k?.avg_minutes_to_assign !== null && k?.avg_minutes_to_assign !== undefined ? `${Math.round(k.avg_minutes_to_assign)} min` : "—"}
          hint="Request to professional accepting"
        />
        <StatCard
          label="Pending verifications"
          icon="shield"
          tone={k && k.pending_verifications > 0 ? "warning" : "success"}
          loading={loading}
          value={formatNumber(k?.pending_verifications)}
          href="/verification"
          hint="Open the queue →"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Bookings, last 14 days" description="Created, completed and cancelled per day" icon="calendar" actions={<Legend series={BOOKING_SERIES} />} />
          {dailyBookings.length ? (
            <BarChart ariaLabel="Bookings per day over the last 14 days" data={dailyBookings} series={BOOKING_SERIES} height={240} />
          ) : (
            <div className={cx("h-[240px] w-full", loading ? "skeleton" : "flex items-center justify-center text-sm text-slate-400")}>{!loading && "No bookings in this window."}</div>
          )}
        </Card>
        <Card>
          <CardHeader title="Booking status" description={d ? `${formatNumber(d.total_bookings)} bookings all-time` : undefined} icon="activity" />
          {d ? (
            <BreakdownBars
              rows={Object.entries(d.bookings_by_status)
                .filter(([, n]) => n > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([s, n]) => ({ key: s, label: BOOKING_STATUS_LABELS[s] ?? s, value: n, color: BOOKING_STATUS_COLORS[s] }))}
            />
          ) : (
            <div className="skeleton h-48 w-full" />
          )}
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Patients" icon="users" loading={loading} value={formatNumber(d?.total_patients)} />
        <StatCard label="Professionals" icon="stethoscope" tone="accent" loading={loading} value={formatNumber(d?.total_professionals)} hint={d ? `${d.professionals_by_verification_status.approved ?? 0} verified` : undefined} />
        <StatCard label="Bookings (all-time)" icon="calendar" tone="neutral" loading={loading} value={formatNumber(d?.total_bookings)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Signups"
            description="New patients and professionals per day"
            icon="trend"
            actions={
              <Legend
                series={[
                  { key: "p", label: "Patients", color: CHART_COLORS.primary },
                  { key: "pr", label: "Professionals", color: CHART_COLORS.accent },
                ]}
              />
            }
          />
          {signups.length ? (
            <LineChart
              ariaLabel="Daily signups"
              data={signups}
              series={[
                { key: "patients", label: "Patients", color: CHART_COLORS.primary },
                { key: "professionals", label: "Professionals", color: CHART_COLORS.accent },
              ]}
              height={220}
            />
          ) : (
            <div className={cx("h-[220px] w-full", loading ? "skeleton" : "flex items-center justify-center text-sm text-slate-400")}>{!loading && "No signups in this window."}</div>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Patients by location" icon="map" />
            {d ? (
              <BreakdownBars
                rows={d.top_locations.map((l) => ({ key: `${l.city}-${l.state}`, label: `${l.city}, ${l.state}`, value: l.patient_count }))}
                empty="No addresses on file yet."
              />
            ) : (
              <div className="skeleton h-32 w-full" />
            )}
          </Card>
          <Card>
            <CardHeader title="Professional verification" icon="shield" actions={<Link href="/verification" className={buttonClass("ghost", "sm")}>Open</Link>} />
            {d ? (
              <BreakdownBars
                rows={["approved", "in_review", "pending", "rejected"].map((s) => ({
                  key: s,
                  label: VERIFICATION_LABELS[s],
                  value: d.professionals_by_verification_status[s] ?? 0,
                  color: VERIFICATION_COLORS[s],
                }))}
              />
            ) : (
              <div className="skeleton h-32 w-full" />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function RateCard({
  label,
  pct,
  loading,
  color,
  hint,
  good,
}: {
  label: string;
  pct: number | null;
  loading: boolean;
  color: string;
  hint: string;
  good: "high" | "low";
}) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-slate-200/80 bg-white p-5 shadow-soft">
      <Donut pct={pct} color={color} size={56} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <p className="font-display text-[26px] font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
          {loading ? <span className="skeleton inline-block h-7 w-16 align-middle" /> : formatPct(pct)}
        </p>
        <p className="text-xs text-slate-500">
          {hint}
          <span className="sr-only">{good === "high" ? " (higher is better)" : " (lower is better)"}</span>
        </p>
      </div>
    </div>
  );
}
