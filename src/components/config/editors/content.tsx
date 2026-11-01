"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ColorInput, Field, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { cx, formatDateTime } from "@/lib/format";

import { EditorSection, ImageUrlField, ObjectListEditor, PhoneMockup, RowControls, TextField, move } from "../kit";
import { HEX } from "./experience";
import type {
  Banner,
  BannersConfig,
  CopyConfig,
  EditorProps,
  Faq,
  OnboardingConfig,
  OnboardingSlide,
  SupportConfig,
} from "./types";

// ── app.banners ─────────────────────────────────────────────────────────

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function bannerState(b: Banner): { label: string; tone: "success" | "neutral" | "warning" } {
  const now = Date.now();
  if (!b.enabled) return { label: "Off", tone: "neutral" };
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return { label: "Scheduled", tone: "warning" };
  if (b.ends_at && new Date(b.ends_at).getTime() < now) return { label: "Ended", tone: "neutral" };
  return { label: "Live", tone: "success" };
}

export function validateBanners(v: BannersConfig): string | null {
  const ids = new Set<string>();
  for (const [i, b] of v.items.entries()) {
    if (!b.id.trim()) return `Banner ${i + 1} needs an ID.`;
    if (ids.has(b.id)) return `Two banners share the ID “${b.id}”.`;
    ids.add(b.id);
    if (!b.title.trim()) return `Banner “${b.id}” needs a title.`;
    if (!HEX.test(b.bg_color) || !HEX.test(b.text_color)) return `Banner “${b.id}” has an invalid colour.`;
    if (b.starts_at && b.ends_at && new Date(b.ends_at) <= new Date(b.starts_at)) return `Banner “${b.id}” ends before it starts.`;
    if (b.deeplink && !b.deeplink.startsWith("/") && !b.deeplink.startsWith("https://"))
      return `Banner “${b.id}”: the link must be an in-app route (/book) or an https:// URL.`;
  }
  return null;
}

export function BannersEditor({ value, onChange, disabled }: EditorProps<BannersConfig>) {
  const items = value.items;
  const [sel, setSel] = useState(0);
  const set = (next: Banner[]) => onChange({ ...value, items: next });
  const current = items[Math.min(sel, items.length - 1)];
  const idx = Math.min(sel, items.length - 1);
  const update = (patch: Partial<Banner>) => set(items.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  function addBanner() {
    const n = items.length + 1;
    set([
      ...items,
      {
        id: `banner-${n}-${Date.now().toString(36).slice(-4)}`,
        title: "New banner",
        subtitle: null,
        image_url: null,
        cta_label: "Book now",
        deeplink: "/book",
        bg_color: "#1262E2",
        text_color: "#FFFFFF",
        starts_at: null,
        ends_at: null,
        roles: ["patient"],
        platforms: ["android", "ios", "web"],
        enabled: false,
      },
    ]);
    setSel(items.length);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      <EditorSection title="Banners" description={`${items.length} total`} className="self-start">
        <ul className="space-y-1.5">
          {items.map((b, i) => {
            const st = bannerState(b);
            return (
              <li key={i} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  aria-current={i === idx ? "true" : undefined}
                  className={cx(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-left",
                    i === idx ? "border-brand-300 bg-brand-50/60" : "border-transparent hover:bg-slate-50"
                  )}
                >
                  <span className="h-6 w-6 shrink-0 rounded-md ring-1 ring-black/5" style={{ background: HEX.test(b.bg_color) ? b.bg_color : "#ccc" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{b.title || "Untitled"}</span>
                    <span className="block truncate font-mono text-[11px] text-slate-400">{b.id}</span>
                  </span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
        {!disabled && (
          <Button icon="plus" variant="subtle" className="mt-3 w-full" onClick={addBanner}>
            New banner
          </Button>
        )}
      </EditorSection>

      {current ? (
        <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
          <EditorSection
            title={current.title || "Untitled banner"}
            aside={
              <div className="flex items-center gap-2">
                <Switch label="Enabled" checked={current.enabled} disabled={disabled} onChange={(v) => update({ enabled: v })} size="sm" />
                <RowControls
                  index={idx}
                  count={items.length}
                  label="banner"
                  disabled={disabled}
                  onMove={(to) => {
                    set(move(items, idx, to));
                    setSel(to);
                  }}
                  onRemove={() => {
                    set(items.filter((_, i) => i !== idx));
                    setSel(Math.max(0, idx - 1));
                  }}
                />
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ID" mono required value={current.id} maxLength={40} onChange={(v) => update({ id: v ?? "" })} hint="Unique; used in analytics." disabled={disabled} />
              <TextField label="Title" required value={current.title} maxLength={80} onChange={(v) => update({ title: v ?? "" })} disabled={disabled} />
              <div className="sm:col-span-2">
                <TextField label="Subtitle" value={current.subtitle} maxLength={160} onChange={(v) => update({ subtitle: v })} disabled={disabled} />
              </div>
              <div className="sm:col-span-2">
                <ImageUrlField value={current.image_url} onChange={(v) => update({ image_url: v })} hint="Optional. Shown on the right of the banner." disabled={disabled} />
              </div>
              <TextField label="Button label" value={current.cta_label} maxLength={30} onChange={(v) => update({ cta_label: v })} disabled={disabled} />
              <TextField
                label="Link"
                mono
                value={current.deeplink}
                maxLength={300}
                onChange={(v) => update({ deeplink: v })}
                placeholder="/book?service=<id>"
                hint="In-app: /book, /book?service=<id>, /service/<id>, /support, /bookings — or an https:// URL."
                disabled={disabled}
              />
              <Field label="Background">{(id) => <ColorInput id={id} value={current.bg_color} onChange={(c) => update({ bg_color: c })} />}</Field>
              <Field label="Text colour">{(id) => <ColorInput id={id} value={current.text_color} onChange={(c) => update({ text_color: c })} />}</Field>
              <Field label="Starts" hint="Your local time. Empty = immediately.">
                {(id, d) => (
                  <Input id={id} aria-describedby={d} type="datetime-local" value={toLocalInput(current.starts_at)} disabled={disabled} onChange={(e) => update({ starts_at: fromLocalInput(e.target.value) })} />
                )}
              </Field>
              <Field label="Ends" hint="Empty = no end date.">
                {(id, d) => (
                  <Input id={id} aria-describedby={d} type="datetime-local" value={toLocalInput(current.ends_at)} disabled={disabled} onChange={(e) => update({ ends_at: fromLocalInput(e.target.value) })} />
                )}
              </Field>
              <CheckGroup
                legend="Show to"
                options={[
                  { value: "patient", label: "Patients" },
                  { value: "professional", label: "Professionals" },
                ]}
                values={current.roles}
                disabled={disabled}
                onChange={(v) => update({ roles: v as Banner["roles"] })}
              />
              <CheckGroup
                legend="Platforms"
                options={[
                  { value: "android", label: "Android" },
                  { value: "ios", label: "iOS" },
                  { value: "web", label: "Web" },
                ]}
                values={current.platforms}
                disabled={disabled}
                onChange={(v) => update({ platforms: v as Banner["platforms"] })}
              />
            </div>
          </EditorSection>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
            <BannerPreview banner={current} />
            <p className="text-xs text-slate-500">
              {current.starts_at || current.ends_at
                ? `${current.starts_at ? `From ${formatDateTime(current.starts_at)}` : "From now"} ${current.ends_at ? `until ${formatDateTime(current.ends_at)}` : "with no end"} (IST).`
                : "Always on while enabled."}
            </p>
          </div>
        </div>
      ) : (
        <EditorSection title="No banners">
          <p className="text-sm text-slate-500">The banners section on home stays hidden while there are none.</p>
        </EditorSection>
      )}
    </div>
  );
}

export function BannerPreview({ banner }: { banner: Banner }) {
  const bg = HEX.test(banner.bg_color) ? banner.bg_color : "#1262E2";
  const fg = HEX.test(banner.text_color) ? banner.text_color : "#FFFFFF";
  return (
    <div className="relative flex min-h-[132px] overflow-hidden rounded-2xl p-4 shadow-soft" style={{ background: bg, color: fg }}>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <p className="font-display text-[17px] font-semibold leading-snug">{banner.title || "Title"}</p>
        {banner.subtitle && <p className="mt-1 text-[12px] leading-snug opacity-85">{banner.subtitle}</p>}
        {banner.cta_label && (
          <span className="mt-auto inline-flex w-max items-center gap-1 rounded-full px-3 py-1.5 pt-1.5 text-[12px] font-semibold" style={{ background: fg, color: bg }}>
            {banner.cta_label}
            <Icon name="arrow-right" size={12} />
          </span>
        )}
      </div>
      {banner.image_url && <img src={banner.image_url} alt="" className="ml-3 h-24 w-24 shrink-0 self-center rounded-xl object-cover" />}
    </div>
  );
}

function CheckGroup({
  legend,
  options,
  values,
  onChange,
  disabled,
}: {
  legend: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <label
              key={o.value}
              className={cx(
                "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                on ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="checkbox"
                className="accent-brand-600"
                checked={on}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked ? [...values, o.value] : values.filter((v) => v !== o.value))}
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {values.length === 0 && <p className="mt-1 text-xs text-warning-700">Nobody will see this.</p>}
    </fieldset>
  );
}

export { CheckGroup };

// ── app.onboarding ──────────────────────────────────────────────────────

export function OnboardingEditor({ value, onChange, disabled }: EditorProps<OnboardingConfig>) {
  const [preview, setPreview] = useState(0);
  const slides = value.slides;
  const shown = slides[Math.min(preview, slides.length - 1)];
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
      <EditorSection title="Slides" description="Shown once on first launch, before sign-in.">
        <ObjectListEditor<OnboardingSlide>
          items={slides}
          onChange={(next) => onChange({ ...value, slides: next })}
          itemLabel="Slide"
          addLabel="Add slide"
          disabled={disabled}
          title={(s, i) => `${i + 1}. ${s.title || "Untitled"}`}
          create={() => ({ title: "", body: "", image_url: null, icon: null })}
          render={(s, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Title" required value={s.title} maxLength={80} onChange={(v) => update({ title: v ?? "" })} disabled={disabled} />
              <TextField label="Icon name" mono value={s.icon} maxLength={40} onChange={(v) => update({ icon: v })} placeholder="shield-check" disabled={disabled} />
              <div className="sm:col-span-2">
                <Field label="Body" aside={`${s.body.length}/240`}>
                  {(id) => <Textarea id={id} value={s.body} maxLength={240} rows={2} disabled={disabled} onChange={(e) => update({ body: e.target.value })} />}
                </Field>
              </div>
              <div className="sm:col-span-2">
                <ImageUrlField value={s.image_url} onChange={(v) => update({ image_url: v })} disabled={disabled} />
              </div>
            </div>
          )}
        />
      </EditorSection>
      <div>
        <PhoneMockup label="Preview">
          {shown ? (
            <div className="flex h-[460px] flex-col px-5 pb-6">
              <div className="mt-6 flex h-48 items-center justify-center overflow-hidden rounded-3xl bg-brand-50">
                {shown.image_url ? <img src={shown.image_url} alt="" className="h-full w-full object-cover" /> : <Icon name="heart" size={48} className="text-brand-400" />}
              </div>
              <p className="mt-6 font-display text-xl font-semibold leading-tight text-slate-900">{shown.title || "Title"}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{shown.body || "Body text"}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex gap-1">
                  {slides.map((_, i) => (
                    <span key={i} className={cx("h-1.5 rounded-full", i === Math.min(preview, slides.length - 1) ? "w-5 bg-brand-600" : "w-1.5 bg-slate-300")} />
                  ))}
                </div>
                <span className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white">Next</span>
              </div>
            </div>
          ) : (
            <p className="p-6 text-sm text-slate-400">No slides — the apps skip onboarding.</p>
          )}
        </PhoneMockup>
        {slides.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" icon="chevron-left" onClick={() => setPreview((p) => Math.max(0, p - 1))} aria-label="Previous slide" />
            <span className="self-center text-xs text-slate-500">
              {Math.min(preview, slides.length - 1) + 1} / {slides.length}
            </span>
            <Button size="sm" icon="chevron-right" onClick={() => setPreview((p) => Math.min(slides.length - 1, p + 1))} aria-label="Next slide" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── app.support ─────────────────────────────────────────────────────────

const PHONE_HINT = "+91 and 10 digits, e.g. +919876543210";

export function FaqListEditor({ faqs, onChange, disabled }: { faqs: Faq[]; onChange: (f: Faq[]) => void; disabled?: boolean }) {
  return (
    <ObjectListEditor<Faq>
      items={faqs}
      onChange={onChange}
      itemLabel="FAQ"
      addLabel="Add question"
      disabled={disabled}
      emptyText="No FAQs yet."
      title={(f, i) => f.q || `Question ${i + 1}`}
      create={() => ({ q: "", a: "" })}
      render={(f, update) => (
        <div className="space-y-3">
          <TextField label="Question" required value={f.q} maxLength={200} onChange={(v) => update({ q: v ?? "" })} disabled={disabled} />
          <Field label="Answer" aside={`${f.a.length}/1000`}>
            {(id) => <Textarea id={id} value={f.a} maxLength={1000} rows={3} disabled={disabled} onChange={(e) => update({ a: e.target.value })} />}
          </Field>
        </div>
      )}
    />
  );
}

export function SupportEditor({ value, onChange, disabled }: EditorProps<SupportConfig>) {
  const set = (patch: Partial<SupportConfig>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <EditorSection title="Contact" description="Shown on the Help screen and in booking details.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Helpline phone" value={value.phone} maxLength={20} onChange={(v) => set({ phone: v })} hint={PHONE_HINT} type="tel" disabled={disabled} />
          <TextField
            label="WhatsApp number"
            value={value.whatsapp}
            maxLength={20}
            onChange={(v) => set({ whatsapp: v })}
            hint={value.whatsapp ? `Opens https://wa.me/${value.whatsapp.replace(/\D/g, "")}` : PHONE_HINT}
            type="tel"
            disabled={disabled}
          />
          <TextField label="Support email" value={value.email} maxLength={120} onChange={(v) => set({ email: v })} type="email" disabled={disabled} />
          <TextField label="Hours" required value={value.hours} maxLength={60} onChange={(v) => set({ hours: v ?? "" })} disabled={disabled} />
        </div>
      </EditorSection>
      <EditorSection title="Emergency" description="The SOS button dials these. 112 is India's national emergency number; 108 is the ambulance in most states.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="SOS number" required value={value.sos_number} maxLength={20} onChange={(v) => set({ sos_number: v ?? "" })} type="tel" disabled={disabled} />
          <TextField label="Ambulance number" required value={value.ambulance_number} maxLength={20} onChange={(v) => set({ ambulance_number: v ?? "" })} type="tel" disabled={disabled} />
        </div>
      </EditorSection>
      <EditorSection title="FAQs" description="Shown on the Help screen in this order.">
        <FaqListEditor faqs={value.faqs} onChange={(faqs) => set({ faqs })} disabled={disabled} />
      </EditorSection>
    </div>
  );
}

// ── app.copy ────────────────────────────────────────────────────────────

const LOCALE_NAMES: Record<string, string> = { en: "English", hi: "हिन्दी (Hindi)" };

export function CopyEditor({ value, onChange, disabled }: EditorProps<CopyConfig>) {
  const locales = Array.from(new Set(["en", "hi", ...Object.keys(value.locales)]));
  const [locale, setLocale] = useState("en");
  const [newKey, setNewKey] = useState("");
  const strings = value.locales[locale] ?? {};
  const rows = Object.entries(strings);

  function setStrings(next: Record<string, string>) {
    const all = { ...value.locales, [locale]: next };
    if (Object.keys(next).length === 0) delete all[locale];
    onChange({ ...value, locales: all });
  }

  function rename(oldKey: string, nextKey: string) {
    const entries = Object.entries(strings).map(([k, v]) => (k === oldKey ? [nextKey, v] : [k, v]));
    setStrings(Object.fromEntries(entries));
  }

  const keyNorm = newKey.trim();

  return (
    <EditorSection
      title="String overrides"
      description="The apps ship their own text. Anything here wins over the built-in string for that key — e.g. home.hero.title."
    >
      <Tabs
        ariaLabel="Language"
        value={locale}
        onChange={setLocale}
        items={locales.map((l) => ({ value: l, label: LOCALE_NAMES[l] ?? l, count: Object.keys(value.locales[l] ?? {}).length }))}
        className="mb-4"
      />
      {rows.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
          No overrides for {LOCALE_NAMES[locale] ?? locale}. The app&apos;s built-in text is used.
        </p>
      ) : (
        <div className="mb-4 space-y-2">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
            <span>Key</span>
            <span>Text</span>
            <span className="w-9" />
          </div>
          {rows.map(([k, v], i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
              <Input value={k} aria-label="String key" className="font-mono text-xs" disabled={disabled} onChange={(e) => rename(k, e.target.value)} />
              <Input
                value={v}
                aria-label={`Text for ${k}`}
                lang={locale}
                disabled={disabled}
                onChange={(e) => setStrings({ ...strings, [k]: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${k}`}
                disabled={disabled}
                onClick={() => {
                  const next = { ...strings };
                  delete next[k];
                  setStrings(next);
                }}
              >
                <Icon name="trash" size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
      {!disabled && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!keyNorm || keyNorm in strings) return;
            setStrings({ ...strings, [keyNorm]: "" });
            setNewKey("");
          }}
        >
          <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="screen.element.key" aria-label="New string key" className="flex-1 font-mono" />
          <Button type="submit" icon="plus" disabled={!keyNorm || keyNorm in strings}>
            Add string
          </Button>
        </form>
      )}
    </EditorSection>
  );
}
