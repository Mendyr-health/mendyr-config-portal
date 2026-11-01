"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ColorInput, Field, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { cx, humanize } from "@/lib/format";

import { EditorSection, PhoneMockup, RowControls, move, useDragReorder } from "../kit";
import type { EditorProps, FeatureFlags, HomeConfig, HomeSection, HomeSectionType, ThemeConfig } from "./types";

// ── app.features ────────────────────────────────────────────────────────

const KNOWN_FLAGS: Record<string, { label: string; description: string }> = {
  reviews: { label: "Ratings & reviews", description: "Patients rate a visit after it's completed; ratings show on professional profiles." },
  visit_otp: {
    label: "Visit PIN",
    description:
      "Patient reads a 4-digit PIN to the professional to start the visit. Older app builds can't send the PIN — only turn on once most users have updated.",
  },
  sos: { label: "SOS button", description: "Emergency button during an active visit that dials the SOS number." },
  live_status: { label: "Live visit status", description: "Assigned → on the way → arrived updates on the booking screen." },
  gender_preference: { label: "Caregiver gender preference", description: "Patients can ask for a female or male professional when booking." },
  coupons: { label: "Coupons", description: "Coupon code field at checkout." },
  prescription_upload: { label: "Prescription upload", description: "Attach a prescription to services that need one." },
  chat: { label: "In-app chat", description: "Messaging between patient and professional." },
  wallet: { label: "Wallet", description: "Mendyr wallet balance, refunds and credits." },
  referrals: { label: "Referrals", description: "Invite-a-friend codes and rewards." },
  hindi: { label: "Hindi language", description: "Show the language switch and Hindi strings." },
};

export function FeaturesEditor({ value, onChange, disabled }: EditorProps<FeatureFlags>) {
  const [newFlag, setNewFlag] = useState("");
  const known = Object.keys(KNOWN_FLAGS);
  const custom = Object.keys(value).filter((k) => !known.includes(k));
  const flagKey = newFlag.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const exists = flagKey in value;

  return (
    <div className="space-y-4">
      <EditorSection title="Features" description="Changes reach the apps on their next refresh — usually within a minute.">
        <ul className="divide-y divide-slate-100">
          {known.map((k) => (
            <li key={k} className="py-3 first:pt-0 last:pb-0">
              <Switch
                label={
                  <span className="flex items-center gap-2">
                    {KNOWN_FLAGS[k]!.label}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">{k}</code>
                  </span>
                }
                description={KNOWN_FLAGS[k]!.description}
                checked={Boolean(value[k])}
                disabled={disabled}
                onChange={(v) => onChange({ ...value, [k]: v })}
              />
            </li>
          ))}
        </ul>
      </EditorSection>
      <EditorSection
        title="Custom flags"
        description="Roll out a new flag before the backend knows about it. Apps that don't check it simply ignore it."
      >
        {custom.length > 0 && (
          <ul className="mb-4 divide-y divide-slate-100">
            {custom.map((k) => (
              <li key={k} className="flex items-center gap-3 py-2.5">
                <code className="min-w-0 flex-1 truncate text-sm text-slate-700">{k}</code>
                <Switch ariaLabel={k} checked={Boolean(value[k])} disabled={disabled} onChange={(v) => onChange({ ...value, [k]: v })} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${k}`}
                  disabled={disabled}
                  onClick={() => {
                    const next = { ...value };
                    delete next[k];
                    onChange(next);
                  }}
                >
                  <Icon name="trash" size={16} />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!flagKey || exists) return;
            onChange({ ...value, [flagKey]: false });
            setNewFlag("");
          }}
        >
          <Input
            value={newFlag}
            onChange={(e) => setNewFlag(e.target.value)}
            placeholder="new_flag_name"
            aria-label="New flag name"
            className="flex-1 font-mono"
            disabled={disabled}
          />
          <Button type="submit" icon="plus" disabled={disabled || !flagKey || exists}>
            Add flag
          </Button>
        </form>
        {exists && flagKey && <p className="mt-1.5 text-xs text-danger-600">“{flagKey}” already exists.</p>}
      </EditorSection>
    </div>
  );
}

// ── app.theme ───────────────────────────────────────────────────────────

const THEME_FIELDS: Array<{ key: keyof ThemeConfig; label: string; hint: string }> = [
  { key: "primary", label: "Primary", hint: "Buttons, links, selected states" },
  { key: "primary_dark", label: "Primary dark", hint: "Pressed buttons, headers" },
  { key: "accent", label: "Accent", hint: "Live status, highlights" },
  { key: "success", label: "Success", hint: "Completed, verified" },
  { key: "warning", label: "Warning", hint: "Searching, pending" },
  { key: "danger", label: "Danger", hint: "Errors, SOS, cancel" },
];

export const HEX = /^#[0-9A-Fa-f]{6}$/;

export function validateTheme(v: ThemeConfig): string | null {
  for (const f of THEME_FIELDS) if (!HEX.test(String(v[f.key]))) return `${f.label} must be a hex colour like #1262E2.`;
  return null;
}

export function ThemeEditor({ value, onChange, disabled }: EditorProps<ThemeConfig>) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
      <EditorSection title="Brand colours" description="Used by both apps. Keep text contrast in mind — white text sits on Primary and Danger.">
        <div className="grid gap-4 sm:grid-cols-2">
          {THEME_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {(id) => (
                <ColorInput id={id} value={String(value[f.key])} onChange={(c) => onChange({ ...value, [f.key]: c })} />
              )}
            </Field>
          ))}
        </div>
        <div className="mt-6">
          <Field label="Corner radius" aside={`${value.radius}px`} hint="Cards and sheets. Inputs use a smaller radius automatically.">
            {(id, d) => (
              <input
                id={id}
                aria-describedby={d}
                type="range"
                min={0}
                max={32}
                value={value.radius}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, radius: Number(e.target.value) })}
                className="w-full accent-brand-600"
              />
            )}
          </Field>
        </div>
      </EditorSection>
      <ThemePreview theme={value} />
    </div>
  );
}

function ThemePreview({ theme }: { theme: ThemeConfig }) {
  const safe = (c: string, fb: string) => (HEX.test(c) ? c : fb);
  const primary = safe(theme.primary, "#1262E2");
  const r = theme.radius;
  return (
    <PhoneMockup label="Live preview — patient home">
      <div className="px-4 pb-6">
        <p className="text-[11px] text-slate-500">Good morning</p>
        <p className="font-display text-lg font-semibold text-slate-900">Care at home</p>
        <div className="mt-3 p-4 text-white" style={{ background: primary, borderRadius: r }}>
          <p className="text-sm font-semibold">Trusted care, at home</p>
          <p className="mt-0.5 text-[11px] opacity-85">Verified nurses & caregivers</p>
          <span className="mt-3 inline-block bg-white px-3 py-1.5 text-[11px] font-semibold" style={{ color: primary, borderRadius: Math.max(6, r - 6) }}>
            Book a visit
          </span>
        </div>
        <div className="mt-3 border border-slate-200 bg-white p-3" style={{ borderRadius: r }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-800">Nursing visit</p>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: safe(theme.accent, "#0EA5A4") }}>
              On the way
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full" style={{ background: safe(theme.accent, "#0EA5A4") }} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Done", theme.success],
            ["Pending", theme.warning],
            ["SOS", theme.danger],
          ].map(([l, c]) => (
            <span key={l} className="py-2 text-center text-[10px] font-semibold text-white" style={{ background: safe(c!, "#94A3B8"), borderRadius: Math.max(6, r - 4) }}>
              {l}
            </span>
          ))}
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="mt-4 w-full py-2.5 text-xs font-semibold text-white"
          style={{ background: safe(theme.primary_dark, "#0F4ABF"), borderRadius: Math.max(8, r - 4) }}
        >
          Pressed button
        </button>
      </div>
    </PhoneMockup>
  );
}

// ── app.home ────────────────────────────────────────────────────────────

const SECTION_META: Record<HomeSectionType, { label: string; hint: string; defaultTitle: string | null }> = {
  banners: { label: "Banners", hint: "Carousel from Banners config", defaultTitle: null },
  categories: { label: "Categories", hint: "Service categories grid", defaultTitle: "What do you need today?" },
  book_again: { label: "Book again", hint: "Recent services for returning patients", defaultTitle: "Book again" },
  trust: { label: "Trust strip", hint: "Verified · Pay after visit · Ratings", defaultTitle: null },
  how_it_works: { label: "How it works", hint: "Three-step explainer", defaultTitle: "How Mendyr works" },
  offers: { label: "Offers", hint: "Coupons and promotions", defaultTitle: "Offers for you" },
  support: { label: "Support", hint: "Helpline and WhatsApp", defaultTitle: null },
};

export function HomeEditor({ value, onChange, disabled }: EditorProps<HomeConfig>) {
  const sections = value.sections;
  const set = (next: HomeSection[]) => onChange({ ...value, sections: next });
  const drag = useDragReorder(sections, set);
  const missing = (Object.keys(SECTION_META) as HomeSectionType[]).filter((t) => !sections.some((s) => s.type === t));
  const [adding, setAdding] = useState<string>("");

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
      <EditorSection title="Sections" description="Drag or use the arrows to reorder. Each section can appear once.">
        <ol className="space-y-2">
          {sections.map((s, i) => (
            <li
              key={s.type}
              {...(disabled ? {} : drag.itemProps(i))}
              className={cx(
                "flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center",
                drag.overIndex === i && drag.dragIndex !== i ? "border-brand-400" : "border-slate-200",
                !s.enabled && "bg-slate-50",
                drag.dragIndex === i && "opacity-50"
              )}
            >
              <div className="flex min-w-0 items-center gap-3 sm:w-48">
                <Icon name="grip" size={16} className="cursor-grab text-slate-300" />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className={cx("truncate text-sm font-semibold", s.enabled ? "text-slate-800" : "text-slate-400")}>
                    {SECTION_META[s.type]?.label ?? humanize(s.type)}
                  </p>
                  <p className="truncate text-xs text-slate-400">{SECTION_META[s.type]?.hint}</p>
                </div>
              </div>
              <Input
                value={s.title ?? ""}
                maxLength={80}
                placeholder="No title"
                aria-label={`${SECTION_META[s.type]?.label} title`}
                disabled={disabled}
                onChange={(e) => set(sections.map((x, j) => (j === i ? { ...x, title: e.target.value || null } : x)))}
                className="min-w-0 flex-1"
              />
              <div className="flex items-center justify-between gap-2">
                <Switch
                  ariaLabel={`Show ${SECTION_META[s.type]?.label}`}
                  checked={s.enabled}
                  disabled={disabled}
                  size="sm"
                  onChange={(v) => set(sections.map((x, j) => (j === i ? { ...x, enabled: v } : x)))}
                />
                <RowControls
                  index={i}
                  count={sections.length}
                  label={SECTION_META[s.type]?.label ?? s.type}
                  disabled={disabled}
                  onMove={(to) => set(move(sections, i, to))}
                  onRemove={() => set(sections.filter((_, j) => j !== i))}
                />
              </div>
            </li>
          ))}
        </ol>
        {missing.length > 0 && !disabled && (
          <div className="mt-4 flex gap-2">
            <Select
              aria-label="Section to add"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              options={missing.map((t) => ({ value: t, label: SECTION_META[t].label }))}
              placeholder="Add a section…"
              className="w-56"
            />
            <Button
              icon="plus"
              disabled={!adding}
              onClick={() => {
                const t = adding as HomeSectionType;
                set([...sections, { type: t, enabled: true, title: SECTION_META[t].defaultTitle }]);
                setAdding("");
              }}
            >
              Add
            </Button>
          </div>
        )}
      </EditorSection>
      <PhoneMockup label="Preview — patient home">
        <div className="space-y-3 px-4 pb-6">
          <p className="font-display text-lg font-semibold text-slate-900">Hi Asha</p>
          {sections.filter((s) => s.enabled).length === 0 && <p className="text-xs text-slate-400">Home is empty.</p>}
          {sections
            .filter((s) => s.enabled)
            .map((s) => (
              <div key={s.type}>
                {s.title && <p className="mb-1.5 text-xs font-semibold text-slate-800">{s.title}</p>}
                <HomeBlock type={s.type} />
              </div>
            ))}
        </div>
      </PhoneMockup>
    </div>
  );
}

function HomeBlock({ type }: { type: HomeSectionType }) {
  switch (type) {
    case "banners":
      return <div className="h-20 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-400" />;
    case "categories":
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      );
    case "book_again":
      return <div className="h-12 rounded-xl bg-white ring-1 ring-slate-200" />;
    case "trust":
      return (
        <div className="flex gap-1.5">
          {["Verified", "Pay later", "4.8★"].map((t) => (
            <Badge key={t} tone="success">{t}</Badge>
          ))}
        </div>
      );
    case "how_it_works":
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-accent-50 ring-1 ring-accent-100" />
          ))}
        </div>
      );
    case "offers":
      return <div className="h-12 rounded-xl border border-dashed border-warning bg-warning-50" />;
    case "support":
      return <div className="h-10 rounded-xl bg-slate-900/90" />;
  }
}
