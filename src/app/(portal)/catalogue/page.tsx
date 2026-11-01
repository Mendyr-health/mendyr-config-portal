"use client";

import { useMemo, useState } from "react";

import { ServiceEditor } from "@/components/catalogue/ServiceEditor";
import { ImageUrlField, NumberField, TextField } from "@/components/config/kit";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState, PageHeader } from "@/components/ui/Card";
import { Field, SearchInput, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Overlay";
import { Switch } from "@/components/ui/Switch";
import { Table, type Column } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { adminApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { formatINR } from "@/lib/format";
import { professionLabel } from "@/lib/labels";
import { useResource } from "@/lib/useResource";
import type { CategoryAdmin, CategoryWriteInput, ServiceAdmin } from "@/lib/types";

type Tab = "services" | "categories";

export default function CataloguePage() {
  const { canWrite } = useAuth();
  const data = useResource(async () => {
    const [categories, services] = await Promise.all([adminApi.categories(), adminApi.services()]);
    return { categories: [...categories].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)), services };
  }, []);
  const [tab, setTab] = useState<Tab>("services");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<ServiceAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [catEditing, setCatEditing] = useState<CategoryAdmin | "new" | null>(null);

  const categories = useMemo(() => data.data?.categories ?? [], [data.data]);
  const services = data.data?.services ?? [];
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const rows = services
    .filter((s) => !cat || s.category_id === cat)
    .filter((s) => !q || `${s.name} ${s.tagline ?? ""} ${s.slug}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));

  const serviceColumns: Column<ServiceAdmin>[] = [
    {
      key: "name",
      header: "Service",
      sortValue: (s) => s.name.toLowerCase(),
      cell: (s) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-300">
            {s.image_url ? <img src={s.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="heart" size={18} />}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium text-slate-900">
              {s.name}
              {s.badge && <Badge tone="warning">{s.badge}</Badge>}
            </p>
            <p className="truncate text-xs text-slate-500">{s.tagline ?? catName(s.category_id)}</p>
          </div>
        </div>
      ),
    },
    { key: "cat", header: "Category", hideBelow: "lg", sortValue: (s) => catName(s.category_id), cell: (s) => catName(s.category_id) },
    { key: "pro", header: "Profession", hideBelow: "md", cell: (s) => professionLabel(s.required_professional_type) },
    { key: "dur", header: "Duration", align: "right", hideBelow: "md", sortValue: (s) => s.duration_minutes, cell: (s) => `${s.duration_minutes} min` },
    { key: "price", header: "Price", align: "right", sortValue: (s) => s.base_price, cell: (s) => formatINR(s.base_price) },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      hideBelow: "lg",
      sortValue: (s) => s.rating_avg ?? 0,
      cell: (s) =>
        s.rating_count ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="star" size={13} className="fill-warning text-warning" />
            {s.rating_avg?.toFixed(1)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    { key: "bookings", header: "Bookings", align: "right", hideBelow: "sm", sortValue: (s) => s.bookings_count, cell: (s) => s.bookings_count },
    { key: "active", header: "Status", cell: (s) => (s.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge dot>Hidden</Badge>) },
  ];

  const categoryColumns: Column<CategoryAdmin>[] = [
    { key: "order", header: "#", align: "right", sortValue: (c) => c.display_order, cell: (c) => c.display_order, className: "w-12" },
    {
      key: "name",
      header: "Category",
      sortValue: (c) => c.name.toLowerCase(),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-50 text-accent-600">
            {c.icon_url ? <img src={c.icon_url} alt="" className="h-full w-full object-cover" /> : <Icon name="grid" size={16} />}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{c.name}</p>
            <p className="truncate text-xs text-slate-500">{c.description ?? c.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "count", header: "Services", align: "right", sortValue: (c) => services.filter((s) => s.category_id === c.id).length, cell: (c) => services.filter((s) => s.category_id === c.id).length },
    { key: "active", header: "Status", cell: (c) => (c.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge dot>Hidden</Badge>) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Product"
        title="Catalogue"
        description="Categories and services patients can book — with the images, highlights and FAQs the apps show."
        actions={
          canWrite ? (
            tab === "services" ? (
              <Button variant="primary" icon="plus" onClick={() => setCreating(true)} disabled={!categories.length}>
                New service
              </Button>
            ) : (
              <Button variant="primary" icon="plus" onClick={() => setCatEditing("new")}>
                New category
              </Button>
            )
          ) : undefined
        }
      />
      {data.error && <ErrorState message={data.error} onRetry={data.reload} className="mb-4" />}
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs<Tab>
            ariaLabel="Catalogue"
            value={tab}
            onChange={setTab}
            items={[
              { value: "services", label: "Services", count: data.data ? services.length : null },
              { value: "categories", label: "Categories", count: data.data ? categories.length : null },
            ]}
          />
        </div>
        {tab === "services" ? (
          <>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
              <SearchInput value={q} onChange={setQ} placeholder="Search services" className="w-full sm:max-w-xs" />
              <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="All categories" className="w-full sm:w-56" />
            </div>
            <Table
              caption="Services"
              columns={serviceColumns}
              rows={rows}
              rowKey={(s) => s.id}
              loading={data.loading}
              onRowClick={setEditing}
              selectedKey={editing?.id}
              empty={{ icon: "package", title: q || cat ? "No services match" : "No services yet", description: canWrite && !q && !cat ? "Create the first one to show it in the apps." : undefined }}
            />
          </>
        ) : (
          <Table
            caption="Categories"
            columns={categoryColumns}
            rows={categories}
            rowKey={(c) => c.id}
            loading={data.loading}
            onRowClick={canWrite ? (c) => setCatEditing(c) : undefined}
            empty={{ icon: "grid", title: "No categories yet" }}
          />
        )}
      </Card>

      <ServiceEditor
        open={creating || !!editing}
        service={editing}
        categories={categories}
        canWrite={canWrite}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(saved) => {
          data.setData((d) =>
            d
              ? {
                  ...d,
                  services: d.services.some((s) => s.id === saved.id) ? d.services.map((s) => (s.id === saved.id ? saved : s)) : [...d.services, saved],
                }
              : d
          );
          setCreating(false);
          setEditing(null);
        }}
      />

      {catEditing && (
        <CategoryModal
          category={catEditing === "new" ? null : catEditing}
          onClose={() => setCatEditing(null)}
          onSaved={() => {
            setCatEditing(null);
            void data.reload();
          }}
        />
      )}
    </>
  );
}

function CategoryModal({ category, onClose, onSaved }: { category: CategoryAdmin | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<CategoryWriteInput>({
    name: category?.name ?? "",
    description: category?.description ?? null,
    icon_url: category?.icon_url ?? null,
    display_order: category?.display_order ?? 0,
    is_active: category?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<CategoryWriteInput>) => setForm((f) => ({ ...f, ...p }));
  const invalid = form.name.trim().length < 2 || Number.isNaN(form.display_order);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, name: form.name.trim() };
      if (category) await adminApi.updateCategory(category.id, body);
      else await adminApi.createCategory(body);
      toast.success(category ? `${body.name} saved` : `${body.name} created`);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title={category ? `Edit ${category.name}` : "New category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={busy} disabled={invalid}>
            {category ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" required value={form.name} maxLength={150} onChange={(v) => set({ name: v ?? "" })} />
        <Field label="Description" aside="optional">
          {(id) => <Textarea id={id} rows={2} maxLength={500} value={form.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} />}
        </Field>
        <ImageUrlField label="Icon URL" value={form.icon_url} onChange={(v) => set({ icon_url: v })} />
        <div className="grid grid-cols-2 items-end gap-4">
          <NumberField label="Display order" min={0} max={1000} value={form.display_order} onChange={(v) => set({ display_order: v })} hint="Lower shows first." />
          <Switch label="Active" checked={form.is_active} onChange={(v) => set({ is_active: v })} className="pb-6" />
        </div>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
