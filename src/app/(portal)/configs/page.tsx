"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminOnly } from "@/components/AuthGuard";
import { ConfigFormDialog } from "@/components/ConfigFormDialog";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card, ErrorState, PageHeader } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/Overlay";
import { Switch } from "@/components/ui/Switch";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { configsApi, errorMessage, registryApi } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useResource } from "@/lib/useResource";
import type { ConfigCreateInput, ConfigEntry, ConfigUpdateInput } from "@/lib/types";

export default function CustomConfigsPage() {
  return (
    <AdminOnly what="Config">
      <CustomConfigs />
    </AdminOnly>
  );
}

function preview(v: unknown): string {
  const s = JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

function CustomConfigs() {
  const toast = useToast();
  const data = useResource(async () => {
    const [configs, registry] = await Promise.all([configsApi.list(), registryApi.list()]);
    return { configs, reserved: registry.map((r) => r.key) };
  }, []);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ConfigEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ConfigEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const reserved = data.data?.reserved ?? [];
  const rows = (data.data?.configs ?? [])
    .filter((c) => !reserved.includes(c.key))
    .filter((c) => !q || c.key.toLowerCase().includes(q.toLowerCase()) || (c.description ?? "").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.key.localeCompare(b.key));

  async function toggle(c: ConfigEntry) {
    try {
      const next = await configsApi.toggle(c.id);
      data.setData((d) => (d ? { ...d, configs: d.configs.map((x) => (x.id === c.id ? next : x)) } : d));
    } catch (err) {
      toast.error("Couldn't toggle", errorMessage(err));
    }
  }

  const columns: Column<ConfigEntry>[] = [
    {
      key: "key",
      header: "Key",
      sortValue: (c) => c.key,
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-medium text-slate-900">{c.key}</p>
          {c.description && <p className="truncate text-xs text-slate-500">{c.description}</p>}
        </div>
      ),
    },
    { key: "value", header: "Value", hideBelow: "md", cell: (c) => <code className="block max-w-xs truncate text-xs text-slate-600">{preview(c.value)}</code> },
    {
      key: "active",
      header: "Active",
      cell: (c) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch size="sm" ariaLabel={`Active: ${c.key}`} checked={c.is_active} onChange={() => void toggle(c)} />
        </span>
      ),
    },
    { key: "updated", header: "Updated", hideBelow: "sm", sortValue: (c) => c.updated_at, cell: (c) => formatRelative(c.updated_at) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" aria-label={`Edit ${c.key}`} onClick={() => setEditing(c)}>
            <Icon name="edit" size={16} />
          </Button>
          <Button size="icon" variant="ghost" aria-label={`Delete ${c.key}`} className="hover:bg-danger-50 hover:text-danger-600" onClick={() => setDeleting(c)}>
            <Icon name="trash" size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="App Config"
        title="Custom keys"
        description="Free-form JSON entries the backend or apps read by name. Registered keys (theme, banners, booking rules…) have typed editors in App Config."
        actions={
          <>
            <Link href="/app-config" className={buttonClass("secondary")}>
              <Icon name="sliders" size={17} />
              App Config
            </Link>
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
              New key
            </Button>
          </>
        }
      />
      {data.error && <ErrorState message={data.error} onRetry={data.reload} className="mb-4" />}
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search keys" className="w-full sm:max-w-xs" />
          {reserved.length > 0 && (
            <p className="text-xs text-slate-500">
              <Badge>{reserved.length}</Badge> registered keys hidden
            </p>
          )}
        </div>
        <Table
          caption="Custom config keys"
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          loading={data.loading}
          onRowClick={setEditing}
          empty={{ icon: "code", title: q ? "No matching keys" : "No custom keys", description: "Create one for anything the registry doesn't cover yet." }}
        />
      </Card>

      {(creating || editing) && (
        <ConfigFormDialog
          config={editing ?? undefined}
          reservedKeys={reserved}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (input) => {
            if (editing) await configsApi.update(editing.id, input as ConfigUpdateInput);
            else await configsApi.create(input as ConfigCreateInput);
            toast.success(editing ? `${editing.key} saved` : "Key created");
            setCreating(false);
            setEditing(null);
            await data.reload();
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        busy={busy}
        tone="danger"
        title={`Delete ${deleting?.key}?`}
        description="Anything that reads this key falls back to its own default. This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await configsApi.remove(deleting.id);
            toast.success(`${deleting.key} deleted`);
            setDeleting(null);
            await data.reload();
          } catch (err) {
            toast.error("Couldn't delete", errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
