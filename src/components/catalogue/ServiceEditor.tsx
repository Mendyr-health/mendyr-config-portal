"use client";

import { useEffect, useState } from "react";

import { EditorSection, ImageUrlField, NumberField, StringListEditor, TextField } from "@/components/config/kit";
import { FaqListEditor } from "@/components/config/editors/content";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/Card";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Drawer } from "@/components/ui/Overlay";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { adminApi, errorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { PROFESSION_LABELS } from "@/lib/labels";
import type { CategoryAdmin, ServiceAdmin, ServiceWriteInput } from "@/lib/types";

type Tab = "basics" | "content" | "faqs";

function toInput(s: ServiceAdmin | null, categories: CategoryAdmin[]): ServiceWriteInput {
  return {
    category_id: s?.category_id ?? categories[0]?.id ?? "",
    name: s?.name ?? "",
    description: s?.description ?? null,
    required_professional_type: s?.required_professional_type ?? "nurse",
    duration_minutes: s?.duration_minutes ?? 60,
    base_price: s?.base_price ?? 0,
    is_recurring_eligible: s?.is_recurring_eligible ?? false,
    requires_prescription: s?.requires_prescription ?? false,
    display_order: s?.display_order ?? 0,
    is_active: s?.is_active ?? true,
    image_url: s?.image_url ?? null,
    tagline: s?.tagline ?? null,
    badge: s?.badge ?? null,
    includes: s?.includes ?? [],
    excludes: s?.excludes ?? [],
    faqs: s?.faqs ?? [],
  };
}

export function ServiceEditor({
  open,
  service,
  categories,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = new service */
  service: ServiceAdmin | null;
  categories: CategoryAdmin[];
  canWrite: boolean;
  onClose: () => void;
  onSaved: (s: ServiceAdmin) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<ServiceWriteInput>(() => toInput(service, categories));
  const [tab, setTab] = useState<Tab>("basics");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toInput(service, categories));
      setTab("basics");
      setError(null);
    }
  }, [open, service, categories]);

  const set = (patch: Partial<ServiceWriteInput>) => setForm((f) => ({ ...f, ...patch }));
  const dirty = JSON.stringify(form) !== JSON.stringify(toInput(service, categories));
  const problem =
    form.name.trim().length < 2
      ? "Name needs at least 2 characters."
      : !form.category_id
        ? "Pick a category."
        : Number.isNaN(form.duration_minutes) || form.duration_minutes < 15 || form.duration_minutes > 1440
          ? "Duration must be 15–1440 minutes."
          : Number.isNaN(form.base_price) || form.base_price < 0
            ? "Price can't be negative."
            : form.faqs.some((f) => !f.q.trim() || !f.a.trim())
              ? "Every FAQ needs a question and an answer."
              : null;

  async function save() {
    if (problem) return;
    setSaving(true);
    setError(null);
    try {
      const body: ServiceWriteInput = {
        ...form,
        name: form.name.trim(),
        includes: form.includes.map((x) => x.trim()).filter(Boolean),
        excludes: form.excludes.map((x) => x.trim()).filter(Boolean),
      };
      const saved = service ? await adminApi.updateService(service.id, body) : await adminApi.createService(body);
      toast.success(service ? `${saved.name} saved` : `${saved.name} created`);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the service."));
    } finally {
      setSaving(false);
    }
  }

  const ro = !canWrite || saving;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="xl"
      title={service ? service.name : "New service"}
      subtitle={
        service ? (
          <span className="flex flex-wrap items-center gap-2">
            <code className="text-xs">{service.slug}</code>
            {service.is_active ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>}
            {service.rating_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Icon name="star" size={12} className="fill-warning text-warning" />
                {service.rating_avg?.toFixed(1)} ({service.rating_count}) · {service.bookings_count} bookings
              </span>
            )}
          </span>
        ) : (
          "Patients can book it as soon as it's active."
        )
      }
      footer={
        canWrite ? (
          <>
            {problem && dirty && <p className="mr-auto text-sm text-danger-700">{problem}</p>}
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" icon="check" loading={saving} disabled={!!problem || (!dirty && !!service)} onClick={save}>
              {service ? "Save service" : "Create service"}
            </Button>
          </>
        ) : (
          <p className="mr-auto text-xs text-slate-500">Only admins can edit the catalogue.</p>
        )
      }
    >
      <Tabs<Tab>
        ariaLabel="Service sections"
        value={tab}
        onChange={setTab}
        className="mb-4"
        items={[
          { value: "basics", label: "Basics" },
          { value: "content", label: "Content", count: form.includes.length + form.excludes.length || null },
          { value: "faqs", label: "FAQs", count: form.faqs.length || null },
        ]}
      />
      {error && <ErrorState message={error} className="mb-4" />}

      {tab === "basics" && (
        <div className="space-y-4">
          <EditorSection title="Service">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField label="Name" required value={form.name} maxLength={200} onChange={(v) => set({ name: v ?? "" })} disabled={ro} />
              </div>
              <Field label="Category">
                {(id) => (
                  <Select id={id} value={form.category_id} disabled={ro} onChange={(e) => set({ category_id: e.target.value })} options={categories.map((c) => ({ value: c.id, label: c.is_active ? c.name : `${c.name} (hidden)` }))} />
                )}
              </Field>
              <Field label="Profession required">
                {(id) => (
                  <Select
                    id={id}
                    value={form.required_professional_type}
                    disabled={ro}
                    onChange={(e) => set({ required_professional_type: e.target.value as ServiceWriteInput["required_professional_type"] })}
                    options={Object.entries(PROFESSION_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                )}
              </Field>
              <NumberField label="Price" unit="₹" min={0} step={10} value={form.base_price} onChange={(v) => set({ base_price: v })} hint={`Before GST · ${formatINR(form.base_price)}`} disabled={ro} />
              <NumberField label="Duration" unit="min" min={15} max={1440} step={15} value={form.duration_minutes} onChange={(v) => set({ duration_minutes: v })} disabled={ro} />
              <div className="sm:col-span-2">
                <Field label="Description" aside={`${(form.description ?? "").length}/4000`}>
                  {(id) => <Textarea id={id} rows={4} maxLength={4000} value={form.description ?? ""} disabled={ro} onChange={(e) => set({ description: e.target.value || null })} />}
                </Field>
              </div>
            </div>
          </EditorSection>
          <EditorSection title="Visibility & flags">
            <div className="space-y-4">
              <Switch label="Active" description="Hidden services can't be booked and don't appear in the apps." checked={form.is_active} disabled={ro} onChange={(v) => set({ is_active: v })} />
              <Switch label="Requires a prescription" description="Patients are asked for one when booking." checked={form.requires_prescription} disabled={ro} onChange={(v) => set({ requires_prescription: v })} />
              <Switch label="Recurring eligible" description="Can be booked as part of a multi-day care plan." checked={form.is_recurring_eligible} disabled={ro} onChange={(v) => set({ is_recurring_eligible: v })} />
              <div className="max-w-[200px]">
                <NumberField label="Display order" min={0} max={1000} value={form.display_order} onChange={(v) => set({ display_order: v })} hint="Lower shows first." disabled={ro} />
              </div>
            </div>
          </EditorSection>
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-4">
          <EditorSection title="Presentation" description="What patients see on the service card and detail page.">
            <div className="space-y-4">
              <ImageUrlField value={form.image_url} onChange={(v) => set({ image_url: v })} hint="Square or 4:3, at least 600 px wide." disabled={ro} />
              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <TextField label="Tagline" value={form.tagline} maxLength={120} onChange={(v) => set({ tagline: v })} placeholder="Trained nurse at your door in 60 minutes" disabled={ro} />
                <TextField label="Badge" value={form.badge} maxLength={24} onChange={(v) => set({ badge: v })} placeholder="Bestseller" disabled={ro} />
              </div>
            </div>
          </EditorSection>
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorSection title="What's included">
              <StringListEditor values={form.includes} onChange={(includes) => set({ includes })} itemLabel="Included item" placeholder="e.g. BP & sugar check" disabled={ro} />
            </EditorSection>
            <EditorSection title="Not included">
              <StringListEditor values={form.excludes} onChange={(excludes) => set({ excludes })} itemLabel="Excluded item" placeholder="e.g. Medicines and consumables" disabled={ro} />
            </EditorSection>
          </div>
          <ServiceCardPreview form={form} />
        </div>
      )}

      {tab === "faqs" && (
        <EditorSection title="FAQs" description="Shown on the service detail page.">
          <FaqListEditor faqs={form.faqs} onChange={(faqs) => set({ faqs })} disabled={ro} />
        </EditorSection>
      )}
    </Drawer>
  );
}

function ServiceCardPreview({ form }: { form: ServiceWriteInput }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Card preview</p>
      <div className="flex max-w-md gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50">
          {form.image_url ? <img src={form.image_url} alt="" className="h-full w-full object-cover" /> : <Icon name="heart" size={28} className="text-brand-300" />}
          {form.badge && <span className="absolute left-1 top-1 rounded-md bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-white">{form.badge}</span>}
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-slate-900">{form.name || "Service name"}</p>
          {form.tagline && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{form.tagline}</p>}
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatINR(form.base_price)} <span className="text-xs font-normal text-slate-400">· {form.duration_minutes} min</span>
          </p>
          {form.includes[0] && (
            <p className="mt-1 flex items-center gap-1 text-xs text-success-700">
              <Icon name="check" size={12} />
              {form.includes[0]}
              {form.includes.length > 1 && ` +${form.includes.length - 1} more`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
