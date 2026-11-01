"use client";

import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/Card";
import { SearchInput, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Pagination, Table, type Column } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { adminApi } from "@/lib/api";
import { cx, formatDay, formatPhone, formatRelative, hoursSince, initials } from "@/lib/format";
import { PROFESSION_LABELS, professionLabel } from "@/lib/labels";
import { useDebounced, useResource } from "@/lib/useResource";
import { useUrlParam } from "@/lib/useUrlParam";
import type { AdminProfessionalDetail, AdminProfessionalListItem } from "@/lib/types";

import { ProfessionalDrawer } from "./ProfessionalDrawer";

export type StatusTab = "pending" | "in_review" | "approved" | "rejected" | "all";

const PAGE_SIZE = 20;

const PROFESSION_OPTIONS = Object.entries(PROFESSION_LABELS).map(([value, label]) => ({ value, label }));

export function ProfessionalsBrowser({
  defaultTab,
  counts,
  onChanged,
}: {
  defaultTab: StatusTab;
  /** Per-status counts for the tab badges (from the stats endpoint). */
  counts?: Record<string, number> | null;
  onChanged?: () => void;
}) {
  const urlQ = useUrlParam("q");
  const [tab, setTab] = useState<StatusTab>(urlQ ? "all" : defaultTab);
  const [q, setQ] = useState(urlQ);
  const [profession, setProfession] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useDebounced(q.trim(), 300);

  useEffect(() => {
    if (urlQ) {
      setQ(urlQ);
      setTab("all");
    }
  }, [urlQ]);

  useEffect(() => setPage(1), [tab, query, profession]);

  const list = useResource(
    () =>
      adminApi.professionals({
        status: tab === "all" ? undefined : tab,
        professional_type: profession || undefined,
        q: query || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    [tab, query, profession, page]
  );

  function handleChanged(p: AdminProfessionalDetail) {
    // Update the row in place; it may also have left this tab — a refetch sorts that out.
    list.setData((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => (i.id === p.id ? { ...i, ...p } : i)) } : prev
    );
    void list.reload();
    onChanged?.();
  }

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  const queue = tab === "pending" || tab === "in_review";

  const columns: Column<AdminProfessionalListItem>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (r) => r.full_name.toLowerCase(),
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            {initials(r.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{r.full_name}</p>
            <p className="truncate text-xs text-slate-500">{r.city ?? r.email ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "profession",
      header: "Profession",
      sortValue: (r) => r.professional_type,
      cell: (r) => professionLabel(r.professional_type),
    },
    { key: "phone", header: "Phone", hideBelow: "md", cell: (r) => <span className="whitespace-nowrap">{formatPhone(r.phone_number)}</span> },
    {
      key: "reg",
      header: "Registration no.",
      hideBelow: "lg",
      cell: (r) =>
        r.council_registration_number || r.license_number ? (
          <span className="font-mono text-xs">{r.council_registration_number ?? r.license_number}</span>
        ) : (
          <span className="text-xs text-warning-700">Missing</span>
        ),
    },
    {
      key: "exp",
      header: "Exp.",
      align: "right",
      hideBelow: "md",
      sortValue: (r) => r.years_of_experience,
      cell: (r) => `${r.years_of_experience} yr`,
    },
    {
      key: "docs",
      header: "Docs",
      align: "right",
      hideBelow: "sm",
      sortValue: (r) => r.documents_count,
      cell: (r) => (
        <span className={cx("inline-flex items-center gap-1", r.documents_count === 0 && "text-warning-700")}>
          <Icon name="file" size={14} className="text-slate-400" />
          {r.documents_count}
        </span>
      ),
    },
    {
      key: "signed",
      header: queue ? "Waiting" : "Signed up",
      sortValue: (r) => r.created_at,
      hideBelow: "sm",
      cell: (r) => {
        const h = hoursSince(r.created_at) ?? 0;
        return (
          <span className={cx("whitespace-nowrap", queue && h > 48 && "font-medium text-danger-700", queue && h > 24 && h <= 48 && "text-warning-700")}>
            {queue ? formatRelative(r.created_at) : formatDay(r.created_at)}
          </span>
        );
      },
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.verification_status} /> },
  ];

  return (
    <>
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs<StatusTab>
            ariaLabel="Verification status"
            value={tab}
            onChange={setTab}
            items={[
              { value: "pending", label: "Pending", count: counts?.pending },
              { value: "in_review", label: "In review", count: counts?.in_review },
              { value: "approved", label: "Approved", count: counts?.approved },
              { value: "rejected", label: "Rejected", count: counts?.rejected },
              { value: "all", label: "All", count: total },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search name, phone, email or registration no."
            className="w-full sm:max-w-sm"
          />
          <Select
            aria-label="Profession"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            options={PROFESSION_OPTIONS}
            placeholder="All professions"
            className="w-full sm:w-52"
          />
          <Button variant="ghost" icon="refresh" onClick={() => void list.reload()} className="sm:ml-auto" aria-label="Refresh list">
            <span className="sm:hidden lg:inline">Refresh</span>
          </Button>
        </div>
        {list.error && <ErrorState message={list.error} onRetry={list.reload} className="m-4" />}
        <Table
          caption="Professionals"
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          onRowClick={(r) => setOpenId(r.id)}
          selectedKey={openId}
          empty={
            query || profession
              ? { icon: "search", title: "No matches", description: "Try a different name, phone or profession." }
              : tab === "pending"
                ? { icon: "check-circle", title: "Queue is clear", description: "No professionals are waiting for review." }
                : { icon: "stethoscope", title: "No professionals here yet" }
          }
        />
        {list.data && list.data.total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} />
        )}
      </Card>
      <ProfessionalDrawer professionalId={openId} onClose={() => setOpenId(null)} onChanged={handleChanged} />
    </>
  );
}
