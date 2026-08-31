"use client";

import { useEffect, useState } from "react";

import { ApiError, dashboardApi } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { SignupTrendChart } from "@/components/SignupTrendChart";
import type { DashboardFilters, DashboardOverview } from "@/lib/types";

const EMPTY_FILTERS: DashboardFilters = {};

const VERIFICATION_COLORS: Record<string, string> = {
  approved: "bg-success",
  pending: "bg-warning",
  in_review: "bg-brand-400",
  rejected: "bg-destructive",
};

const BOOKING_COLORS: Record<string, string> = {
  completed: "bg-success",
  in_progress: "bg-brand-400",
  confirmed: "bg-brand-300",
  assigned: "bg-brand-200",
  en_route: "bg-brand-400",
  searching: "bg-warning",
  created: "bg-slate-300",
  cancelled: "bg-destructive",
  no_show: "bg-destructive",
  failed: "bg-destructive",
};

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-2xl font-bold text-slate-900 tabular-nums">
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" /> : value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function StatusBreakdown({
  title,
  counts,
  colors,
}: {
  title: string;
  counts: Record<string, number>;
  colors: Record<string, string>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const rows = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="font-display font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map(([key, count]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-slate-500 capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${colors[key] ?? "bg-brand-600"}`}
                  style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-900 tabular-nums">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationList({ locations }: { locations: DashboardOverview["top_locations"] }) {
  const max = Math.max(1, ...locations.map((l) => l.patient_count));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="font-display font-semibold text-slate-900">Patients by location</h3>
      {locations.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No addresses on file yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {locations.map((loc) => (
            <div key={`${loc.city}-${loc.state}`} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm font-medium text-slate-900">
                {loc.city}
                <span className="font-normal text-slate-500">, {loc.state}</span>
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${(loc.patient_count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-900 tabular-nums">
                {loc.patient_count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({
  onApply,
}: {
  onApply: (filters: DashboardFilters) => void;
}) {
  const [draft, setDraft] = useState<DashboardFilters>(EMPTY_FILTERS);
  const hasActive = Object.values(draft).some(Boolean);

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="min-w-[140px] flex-1">
        <label className="block text-xs text-slate-500">City</label>
        <input
          value={draft.city ?? ""}
          onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          placeholder="e.g. Bengaluru"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="min-w-[140px] flex-1">
        <label className="block text-xs text-slate-500">State</label>
        <input
          value={draft.state ?? ""}
          onChange={(e) => setDraft({ ...draft, state: e.target.value })}
          placeholder="e.g. Karnataka"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="min-w-[130px]">
        <label className="block text-xs text-slate-500">From</label>
        <input
          type="date"
          value={draft.date_from ?? ""}
          onChange={(e) => setDraft({ ...draft, date_from: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="min-w-[130px]">
        <label className="block text-xs text-slate-500">To</label>
        <input
          type="date"
          value={draft.date_to ?? ""}
          onChange={(e) => setDraft({ ...draft, date_to: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        onClick={() => onApply(draft)}
        className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Apply
      </button>
      {hasActive && (
        <button
          onClick={() => {
            setDraft(EMPTY_FILTERS);
            onApply(EMPTY_FILTERS);
          }}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function DashboardPageInner() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(filters: DashboardFilters) {
    setLoading(true);
    setError(null);
    try {
      setData(await dashboardApi.getOverview(filters));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(EMPTY_FILTERS);
  }, []);

  const d = data ?? {
    total_patients: 0,
    total_professionals: 0,
    professionals_by_verification_status: {},
    total_bookings: 0,
    bookings_by_status: {},
    daily_signups: [],
    top_locations: [],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registrations, bookings, and where your patients are.
        </p>
      </div>

      <FilterBar onApply={load} />

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Patients" value={d.total_patients} loading={loading} />
        <StatCard label="Total Nurses" value={d.total_professionals} loading={loading} />
        <StatCard
          label="Verified Nurses"
          value={d.professionals_by_verification_status.approved ?? 0}
          loading={loading}
        />
        <StatCard label="Total Bookings" value={d.total_bookings} loading={loading} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-slate-900">Signups over time</h3>
          <div className="mt-4">
            <SignupTrendChart data={d.daily_signups} />
          </div>
        </div>
        <LocationList locations={d.top_locations} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StatusBreakdown
          title="Nurse verification status"
          counts={d.professionals_by_verification_status}
          colors={VERIFICATION_COLORS}
        />
        <StatusBreakdown
          title="Booking status"
          counts={d.bookings_by_status}
          colors={BOOKING_COLORS}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppHeader />
      <DashboardPageInner />
    </AuthGuard>
  );
}
