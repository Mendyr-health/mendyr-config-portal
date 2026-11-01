"use client";

import { useEffect, useState } from "react";

import { BookingDrawer } from "@/components/bookings/BookingDrawer";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState, PageHeader } from "@/components/ui/Card";
import { Field, Input, SearchInput } from "@/components/ui/Field";
import { Pagination, Table, type Column } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { adminApi, dashboardApi } from "@/lib/api";
import { formatDay, formatINR, formatPhone, formatTime } from "@/lib/format";
import { useDebounced, useResource } from "@/lib/useResource";
import { useUrlParam } from "@/lib/useUrlParam";
import type { AdminBookingListItem } from "@/lib/types";

const PAGE_SIZE = 25;

const TABS = [
  { value: "all", label: "All" },
  { value: "searching", label: "Searching" },
  { value: "assigned", label: "Assigned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "en_route", label: "On the way" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "No pro available" },
  { value: "no_show", label: "Missed" },
];

/** A YYYY-MM-DD from a date input as the start/end of that day in IST. */
const dayStart = (d: string) => (d ? `${d}T00:00:00+05:30` : undefined);
const dayEnd = (d: string) => (d ? `${d}T23:59:59+05:30` : undefined);

export default function BookingsPage() {
  const urlQ = useUrlParam("q");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState(urlQ);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useDebounced(q.trim(), 300);

  useEffect(() => {
    if (urlQ) setQ(urlQ);
  }, [urlQ]);
  useEffect(() => setPage(1), [status, query, from, to]);

  const counts = useResource(() => dashboardApi.getOverview(), []);
  const list = useResource(
    () =>
      adminApi.bookings({
        status: status === "all" ? undefined : status,
        q: query || undefined,
        date_from: dayStart(from),
        date_to: dayEnd(to),
        page,
        page_size: PAGE_SIZE,
      }),
    [status, query, from, to, page]
  );

  // Exactly one matching booking from a code search → open it straight away.
  useEffect(() => {
    if (!urlQ || !list.data || list.loading) return;
    if (list.data.items.length === 1 && list.data.items[0]!.booking_code.toLowerCase() === urlQ.toLowerCase()) {
      setOpenId(list.data.items[0]!.id);
    }
  }, [urlQ, list.data, list.loading]);

  const byStatus = counts.data?.bookings_by_status;
  const total = byStatus ? Object.values(byStatus).reduce((a, b) => a + b, 0) : undefined;

  const columns: Column<AdminBookingListItem>[] = [
    {
      key: "code",
      header: "Booking",
      sortValue: (r) => r.booking_code,
      cell: (r) => (
        <div>
          <p className="font-mono text-[13px] font-semibold text-slate-900">{r.booking_code}</p>
          <p className="truncate text-xs text-slate-500">{r.service_name}</p>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      sortValue: (r) => r.patient_name.toLowerCase(),
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{r.patient_name}</p>
          <p className="whitespace-nowrap text-xs text-slate-500">{formatPhone(r.patient_phone)}</p>
        </div>
      ),
    },
    {
      key: "when",
      header: "Scheduled",
      sortValue: (r) => r.scheduled_start_at,
      cell: (r) => (
        <div className="whitespace-nowrap">
          <p className="text-slate-800">{formatDay(r.scheduled_start_at)}</p>
          <p className="text-xs text-slate-500">{formatTime(r.scheduled_start_at)}</p>
        </div>
      ),
    },
    {
      key: "pro",
      header: "Professional",
      hideBelow: "lg",
      cell: (r) => r.professional_name ?? <span className="text-slate-400">Unassigned</span>,
    },
    { key: "city", header: "City", hideBelow: "lg", cell: (r) => r.city ?? "—" },
    { key: "amount", header: "Amount", align: "right", hideBelow: "sm", sortValue: (r) => r.total_amount, cell: (r) => formatINR(r.total_amount) },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Bookings"
        description="Every visit, live and past. Open one for its timeline, people and price — cancel on a patient's behalf or put it back on the board."
        actions={
          <Button variant="secondary" icon="refresh" onClick={() => void list.reload()}>
            Refresh
          </Button>
        }
      />
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs
            ariaLabel="Booking status"
            value={status}
            onChange={setStatus}
            items={TABS.map((t) => ({ ...t, count: t.value === "all" ? total : byStatus?.[t.value] }))}
          />
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-end">
          <Field label="Search" className="w-full md:max-w-sm">
            {() => <SearchInput value={q} onChange={setQ} placeholder="Code, patient, phone or service" />}
          </Field>
          <div className="flex gap-3">
            <Field label="From">
              {(id) => <Input id={id} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />}
            </Field>
            <Field label="To">
              {(id) => <Input id={id} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />}
            </Field>
          </div>
          {(from || to || q) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFrom("");
                setTo("");
                setQ("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        {list.error && <ErrorState message={list.error} onRetry={list.reload} className="m-4" />}
        <Table
          caption="Bookings"
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          onRowClick={(r) => setOpenId(r.id)}
          selectedKey={openId}
          empty={
            query || from || to
              ? { icon: "search", title: "No bookings match", description: "Try another code, name or date range." }
              : { icon: "calendar", title: "No bookings here" }
          }
        />
        {list.data && list.data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} />}
      </Card>
      <BookingDrawer
        bookingId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          void list.reload();
          void counts.reload();
        }}
      />
    </>
  );
}
