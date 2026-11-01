"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge, RoleChip, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState, PageHeader } from "@/components/ui/Card";
import { Field, SearchInput, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/Overlay";
import { Pagination, Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { adminApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { formatDay, formatPhone, formatRelative, initials } from "@/lib/format";
import { useDebounced, useResource } from "@/lib/useResource";
import { useUrlParam } from "@/lib/useUrlParam";
import type { AdminUserListItem } from "@/lib/types";

const PAGE_SIZE = 25;

const ROLE_OPTIONS = [
  { value: "patient", label: "Patients" },
  { value: "professional", label: "Professionals" },
  { value: "ops", label: "Ops" },
  { value: "admin", label: "Admins" },
  { value: "super_admin", label: "Super admins" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
];

export default function UsersPage() {
  const { canWrite, me } = useAuth();
  const toast = useToast();
  const urlQ = useUrlParam("q");
  const [q, setQ] = useState(urlQ);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminUserListItem | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useDebounced(q.trim(), 300);

  useEffect(() => {
    if (urlQ) setQ(urlQ);
  }, [urlQ]);
  useEffect(() => setPage(1), [query, role, status]);

  const list = useResource(
    () => adminApi.users({ q: query || undefined, role: role || undefined, status: status || undefined, page, page_size: PAGE_SIZE }),
    [query, role, status, page]
  );

  const suspending = target?.status === "active";

  async function confirm() {
    if (!target) return;
    setBusy(true);
    setActionError(null);
    try {
      const next = suspending ? "suspended" : "active";
      const res = await adminApi.setUserStatus(target.id, next, reason.trim() || undefined);
      list.setData((d) => (d ? { ...d, items: d.items.map((u) => (u.id === target.id ? { ...u, status: next } : u)) } : d));
      toast.success(res.message ?? `${target.full_name} updated`, suspending ? "They've been signed out everywhere." : undefined);
      setTarget(null);
      setReason("");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminUserListItem>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (u) => u.full_name.toLowerCase(),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {initials(u.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{u.full_name}</p>
            <p className="truncate text-xs text-slate-500">{u.email ?? "No email"}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", hideBelow: "md", cell: (u) => <span className="whitespace-nowrap">{formatPhone(u.phone_number)}</span> },
    { key: "role", header: "Role", sortValue: (u) => u.role, cell: (u) => <RoleChip role={u.role} /> },
    { key: "bookings", header: "Bookings", align: "right", hideBelow: "sm", sortValue: (u) => u.bookings_count, cell: (u) => u.bookings_count },
    { key: "joined", header: "Joined", hideBelow: "lg", sortValue: (u) => u.created_at, cell: (u) => formatDay(u.created_at) },
    { key: "seen", header: "Last sign-in", hideBelow: "lg", sortValue: (u) => u.last_login_at ?? "", cell: (u) => (u.last_login_at ? formatRelative(u.last_login_at) : "Never") },
    { key: "status", header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          {(u.role === "patient" || u.role === "professional") && (
            <Link
              href={`/${u.role === "patient" ? "bookings" : "professionals"}?q=${encodeURIComponent(u.phone_number)}`}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={u.role === "patient" ? `Bookings for ${u.full_name}` : `Profile of ${u.full_name}`}
              title={u.role === "patient" ? "Their bookings" : "Professional profile"}
            >
              <Icon name={u.role === "patient" ? "calendar" : "stethoscope"} size={16} />
            </Link>
          )}
          {canWrite && u.status !== "deleted" && u.id !== me?.id && (
            <Button
              size="sm"
              variant={u.status === "active" ? "ghost" : "subtle"}
              className={u.status === "active" ? "text-danger-700 hover:bg-danger-50" : undefined}
              icon={u.status === "active" ? "user-x" : "user-check"}
              onClick={() => {
                setTarget(u);
                setReason("");
                setActionError(null);
              }}
            >
              {u.status === "active" ? "Suspend" : "Reactivate"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Users"
        description="Patients, professionals and staff accounts. Suspending someone signs them out everywhere and stops new bookings or requests."
      />
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, phone or email" className="w-full sm:max-w-sm" />
          <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} options={ROLE_OPTIONS} placeholder="All roles" className="w-full sm:w-44" />
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} placeholder="Any status" className="w-full sm:w-40" />
          {list.data && (
            <Badge className="sm:ml-auto">
              {list.data.total.toLocaleString("en-IN")} {list.data.total === 1 ? "user" : "users"}
            </Badge>
          )}
        </div>
        {list.error && <ErrorState message={list.error} onRetry={list.reload} className="m-4" />}
        <Table
          caption="Users"
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(u) => u.id}
          loading={list.loading}
          empty={{ icon: query ? "search" : "users", title: query ? "No users match" : "No users yet" }}
        />
        {list.data && list.data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} />}
      </Card>

      <ConfirmModal
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={confirm}
        busy={busy}
        tone={suspending ? "danger" : "primary"}
        title={suspending ? `Suspend ${target?.full_name}?` : `Reactivate ${target?.full_name}?`}
        description={
          suspending
            ? "They're signed out on every device and can't sign in, book or take visits until reactivated."
            : "They can sign in again straight away."
        }
        confirmLabel={suspending ? "Suspend account" : "Reactivate"}
      >
        <Field label="Reason" aside="optional · kept in the activity log">
          {(id) => <Textarea id={id} data-autofocus value={reason} maxLength={300} rows={2} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {actionError && <ErrorState message={actionError} className="mt-3" />}
      </ConfirmModal>
    </>
  );
}
