"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { cx, formatHour, formatINR, formatNumber } from "@/lib/format";
import { BOOKING_STATUS_LABELS, DOCUMENT_LABELS } from "@/lib/labels";

import { EditorSection, NumberField, PhoneMockup, StringListEditor, TextField } from "../kit";
import { CheckGroup } from "./content";
import type {
  BookingRules,
  CancelReasons,
  CatalogContent,
  EditorProps,
  MaintenanceConfig,
  PlatformVersion,
  PollingConfig,
  PricingConfig,
  PrivacyConfig,
  ProSettings,
  VerificationConfig,
  VersionConfig,
} from "./types";

const SEMVER = /^\d+\.\d+\.\d+$/;

function cmpSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

// ── app.version ─────────────────────────────────────────────────────────

export function validateVersion(v: VersionConfig): string | null {
  for (const p of ["android", "ios"] as const) {
    const pv = v[p];
    if (!SEMVER.test(pv.min_supported) || !SEMVER.test(pv.latest)) return `${p === "ios" ? "iOS" : "Android"} versions must look like 1.4.0.`;
    if (cmpSemver(pv.min_supported, pv.latest) > 0) return `${p === "ios" ? "iOS" : "Android"}: minimum supported is newer than latest.`;
  }
  return null;
}

export function VersionEditor({ value, onChange, disabled }: EditorProps<VersionConfig>) {
  const setP = (p: "android" | "ios", patch: Partial<PlatformVersion>) => onChange({ ...value, [p]: { ...value[p], ...patch } });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {(["android", "ios"] as const).map((p) => {
          const pv = value[p];
          return (
            <EditorSection key={p} title={p === "ios" ? "iOS" : "Android"} aside={<Icon name="smartphone" size={18} className="text-slate-400" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Minimum supported"
                  mono
                  value={pv.min_supported}
                  onChange={(v) => setP(p, { min_supported: v ?? "" })}
                  hint={SEMVER.test(pv.min_supported) ? "Older builds must update." : "Use x.y.z"}
                  disabled={disabled}
                />
                <TextField label="Latest" mono value={pv.latest} onChange={(v) => setP(p, { latest: v ?? "" })} hint="Older builds see an optional update." disabled={disabled} />
                <div className="sm:col-span-2">
                  <TextField label="Store URL" value={pv.store_url} maxLength={300} onChange={(v) => setP(p, { store_url: v })} type="url" placeholder={p === "ios" ? "https://apps.apple.com/…" : "https://play.google.com/store/apps/…"} disabled={disabled} />
                </div>
              </div>
            </EditorSection>
          );
        })}
      </div>
      <EditorSection title="Update message" description="Shown on the optional-update prompt.">
        <Field label="Message" aside={`${value.message.length}/200`}>
          {(id) => <Textarea id={id} value={value.message} maxLength={200} rows={2} disabled={disabled} onChange={(e) => onChange({ ...value, message: e.target.value })} />}
        </Field>
      </EditorSection>
    </div>
  );
}

// ── app.maintenance ─────────────────────────────────────────────────────

export function MaintenanceEditor({ value, onChange, disabled }: EditorProps<MaintenanceConfig>) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <section
          className={cx(
            "rounded-card border-2 p-5 shadow-soft",
            value.enabled ? "border-danger-600 bg-danger-50" : "border-warning-100 bg-warning-50/60"
          )}
        >
          <div className="flex items-start gap-4">
            <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", value.enabled ? "bg-danger-600 text-white" : "bg-warning text-white")}>
              <Icon name="alert" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cx("font-display text-lg font-semibold", value.enabled ? "text-danger-700" : "text-warning-700")}>
                {value.enabled ? "Maintenance mode will block both apps" : "Maintenance mode is off"}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                When on, every patient and professional sees the screen on the right instead of the app — no bookings, no visit
                updates. Use only during planned downtime, and turn it off as soon as you&apos;re done.
              </p>
            </div>
            <Switch ariaLabel="Maintenance mode" checked={value.enabled} tone="danger" disabled={disabled} onChange={(v) => onChange({ ...value, enabled: v })} />
          </div>
        </section>
        <EditorSection title="Screen text">
          <div className="space-y-4">
            <TextField label="Title" required value={value.title} maxLength={80} onChange={(v) => onChange({ ...value, title: v ?? "" })} disabled={disabled} />
            <Field label="Message" aside={`${value.message.length}/300`}>
              {(id) => <Textarea id={id} value={value.message} maxLength={300} rows={3} disabled={disabled} onChange={(e) => onChange({ ...value, message: e.target.value })} />}
            </Field>
          </div>
        </EditorSection>
      </div>
      <PhoneMockup label="What users will see">
        <div className="flex h-[460px] flex-col items-center justify-center px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-50 text-warning-600">
            <Icon name="wrench" size={30} />
          </span>
          <p className="mt-5 font-display text-lg font-semibold text-slate-900">{value.title || "Title"}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{value.message}</p>
        </div>
      </PhoneMockup>
    </div>
  );
}

// ── app.polling ─────────────────────────────────────────────────────────

export function PollingEditor({ value, onChange, disabled }: EditorProps<PollingConfig>) {
  return (
    <EditorSection title="Refresh intervals" description="How often the apps re-fetch while there's no push channel. Lower is fresher but costs battery and server load.">
      <div className="grid gap-4 md:grid-cols-3">
        <NumberField label="Active booking" unit="sec" min={3} max={300} value={value.active_booking} onChange={(v) => onChange({ ...value, active_booking: v })} hint="Live status of an ongoing visit." disabled={disabled} />
        <NumberField label="Lists" unit="sec" min={5} max={600} value={value.lists} onChange={(v) => onChange({ ...value, lists: v })} hint="Bookings and history lists." disabled={disabled} />
        <NumberField label="Visit requests" unit="sec" min={3} max={300} value={value.requests} onChange={(v) => onChange({ ...value, requests: v })} hint="New requests on the professional app." disabled={disabled} />
      </div>
    </EditorSection>
  );
}

// ── booking.rules ───────────────────────────────────────────────────────

export function validateRules(v: BookingRules): string | null {
  if (v.slot_end_hour <= v.slot_start_hour) return "The last slot must end after the first one starts.";
  for (const [k, n] of Object.entries(v)) if (Number.isNaN(n)) return `${k.replace(/_/g, " ")} is empty.`;
  return null;
}

function minutesLabel(m: number): string {
  if (Number.isNaN(m)) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function BookingRulesEditor({ value, onChange, disabled }: EditorProps<BookingRules>) {
  const set = (patch: Partial<BookingRules>) => onChange({ ...value, ...patch });
  const slots =
    value.slot_end_hour > value.slot_start_hour && value.slot_step_minutes > 0
      ? Math.floor(((value.slot_end_hour - value.slot_start_hour) * 60) / value.slot_step_minutes) + 1
      : 0;
  return (
    <div className="space-y-4">
      <Callout tone="brand" icon="calendar" title={`Slots ${formatHour(value.slot_start_hour)} – ${formatHour(value.slot_end_hour)} every ${value.slot_step_minutes} min`}>
        {slots} start times a day · bookable from {minutesLabel(value.min_lead_minutes)} ahead up to {value.horizon_days} days out · free
        cancellation until {minutesLabel(value.free_cancel_window_minutes)} before the visit, then a {value.cancellation_fee_pct}% fee.
      </Callout>
      <EditorSection title="Slot picker" description="Both the apps and the server use these — a booking outside them is rejected.">
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField label="First slot" unit="h" min={0} max={23} value={value.slot_start_hour} onChange={(v) => set({ slot_start_hour: v })} hint={`${formatHour(value.slot_start_hour)} (24-hour clock)`} disabled={disabled} />
          <NumberField label="Last slot" unit="h" min={1} max={24} value={value.slot_end_hour} onChange={(v) => set({ slot_end_hour: v })} hint={formatHour(value.slot_end_hour)} disabled={disabled} />
          <NumberField label="Slot step" unit="min" min={15} max={120} step={15} value={value.slot_step_minutes} onChange={(v) => set({ slot_step_minutes: v })} hint="Gap between start times." disabled={disabled} />
          <NumberField label="Minimum lead time" unit="min" min={0} max={1440} value={value.min_lead_minutes} onChange={(v) => set({ min_lead_minutes: v })} hint={`Earliest slot is ${minutesLabel(value.min_lead_minutes)} from now.`} disabled={disabled} />
          <NumberField label="Booking horizon" unit="days" min={1} max={90} value={value.horizon_days} onChange={(v) => set({ horizon_days: v })} hint="How far ahead patients can book." disabled={disabled} />
        </div>
      </EditorSection>
      <EditorSection title="Cancellation">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField label="Free cancellation window" unit="min" min={0} value={value.free_cancel_window_minutes} onChange={(v) => set({ free_cancel_window_minutes: v })} hint="Cancelling more than this long before the visit is free." disabled={disabled} />
          <NumberField
            label="Late cancellation fee"
            unit="%"
            min={0}
            max={100}
            step={0.5}
            value={value.cancellation_fee_pct}
            onChange={(v) => set({ cancellation_fee_pct: v })}
            hint={`On a ₹1,000 visit: ${formatINR((1000 * (value.cancellation_fee_pct || 0)) / 100)}`}
            disabled={disabled}
          />
        </div>
      </EditorSection>
      <EditorSection title="Professional scheduling">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            label="Travel buffer"
            unit="min"
            min={0}
            max={180}
            value={value.travel_buffer_minutes}
            onChange={(v) => set({ travel_buffer_minutes: v })}
            hint={`A pro with a 10:00–11:00 visit won't see requests from ${clockMinus(10 * 60, value.travel_buffer_minutes)} to ${clockMinus(11 * 60, -value.travel_buffer_minutes)}.`}
            disabled={disabled}
          />
          <NumberField label="Early start allowed" unit="min" min={0} max={1440} value={value.early_start_minutes} onChange={(v) => set({ early_start_minutes: v })} hint="How early a professional may check in before the slot." disabled={disabled} />
        </div>
      </EditorSection>
    </div>
  );
}

function clockMinus(mins: number, minus: number): string {
  const t = mins - (Number.isNaN(minus) ? 0 : minus);
  const h = Math.floor((((t % 1440) + 1440) % 1440) / 60);
  const m = ((t % 60) + 60) % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// ── booking.cancel_reasons ──────────────────────────────────────────────

export function CancelReasonsEditor({ value, onChange, disabled }: EditorProps<CancelReasons>) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EditorSection title="Patient reasons" description="Shown when a patient cancels. Keep “Other” last.">
        <StringListEditor values={value.patient} onChange={(patient) => onChange({ ...value, patient })} itemLabel="Reason" placeholder="Add a reason" disabled={disabled} />
      </EditorSection>
      <EditorSection title="Professional reasons" description="Shown when a professional cancels an accepted visit.">
        <StringListEditor values={value.professional} onChange={(professional) => onChange({ ...value, professional })} itemLabel="Reason" placeholder="Add a reason" disabled={disabled} />
      </EditorSection>
    </div>
  );
}

// ── pro.settings ────────────────────────────────────────────────────────

export function ProSettingsEditor({ value, onChange, disabled }: EditorProps<ProSettings>) {
  const set = (patch: Partial<ProSettings>) => onChange({ ...value, ...patch });
  const radii = [...value.radius_options_km].sort((a, b) => a - b);
  return (
    <div className="space-y-4">
      <EditorSection title="Service radius" description="Choices offered to professionals for how far they'll travel.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-slate-700">Options (km)</p>
            <NumberChips values={radii} onChange={(radius_options_km) => set({ radius_options_km })} unit="km" disabled={disabled} />
          </div>
          <div>
            <NumberField label="Default radius" unit="km" min={1} max={50} value={value.default_radius_km} onChange={(v) => set({ default_radius_km: v })} hint="Pre-selected for new professionals." disabled={disabled} />
            {!radii.includes(value.default_radius_km) && (
              <p className="mt-2 text-xs text-warning-700">The default isn&apos;t one of the options.</p>
            )}
          </div>
        </div>
      </EditorSection>
      <EditorSection title="Languages" description="Professionals pick the languages they speak from this list.">
        <StringListEditor values={value.languages} onChange={(languages) => set({ languages })} itemLabel="Language" placeholder="Add a language" disabled={disabled} />
      </EditorSection>
      <EditorSection title="Required documents" description="What a professional must upload before review.">
        <CheckGroup
          legend="Documents"
          options={Object.entries(DOCUMENT_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          values={value.required_documents}
          onChange={(required_documents) => set({ required_documents })}
          disabled={disabled}
        />
      </EditorSection>
    </div>
  );
}

function NumberChips({ values, onChange, unit, disabled }: { values: number[]; onChange: (v: number[]) => void; unit: string; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const n = parseInt(draft, 10);
  const ok = Number.isFinite(n) && n > 0 && n <= 500 && !values.includes(n);
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-2">
        {values.map((v) => (
          <li key={v} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-sm text-slate-700">
            {v} {unit}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v} ${unit}`}
                className="rounded-full p-1 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!disabled && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ok) return;
            onChange([...values, n].sort((a, b) => a - b));
            setDraft("");
          }}
        >
          <Input type="number" min={1} value={draft} onChange={(e) => setDraft(e.target.value)} suffix={unit} aria-label={`Add option in ${unit}`} className="w-32" />
          <Button type="submit" icon="plus" disabled={!ok}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
}

// ── pricing ─────────────────────────────────────────────────────────────

export function PricingEditor({ value, onChange, disabled }: EditorProps<PricingConfig>) {
  const base = 1000;
  const c = Number.isNaN(value.commission_pct) ? 0 : value.commission_pct;
  const g = Number.isNaN(value.gst_pct) ? 0 : value.gst_pct;
  const fee = (base * c) / 100;
  const gst = (base * g) / 100;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EditorSection title="Rates" description="Private — used by the backend only. Applies to new bookings; existing bookings keep their price.">
        <div className="space-y-4">
          <NumberField label="Platform commission" unit="%" min={0} max={100} step={0.5} value={value.commission_pct} onChange={(v) => onChange({ ...value, commission_pct: v })} hint="Taken from the professional's payout. Never shown to patients." disabled={disabled} />
          <NumberField label="GST" unit="%" min={0} max={50} step={0.5} value={value.gst_pct} onChange={(v) => onChange({ ...value, gst_pct: v })} hint="Charged to the patient on the service value." disabled={disabled} />
        </div>
      </EditorSection>
      <EditorSection title="Example: a ₹1,000 visit">
        <dl className="space-y-2.5 text-sm">
          <Row label="Service price" value={formatINR(base)} />
          <Row label={`GST (${formatNumber(g)}%)`} value={`+ ${formatINR(gst)}`} />
          <Row label="Patient pays" value={formatINR(base + gst)} strong />
          <div className="my-3 border-t border-dashed border-slate-200" />
          <Row label={`Mendyr commission (${formatNumber(c)}%)`} value={`− ${formatINR(fee)}`} />
          <Row label="Professional earns" value={formatINR(base - fee)} strong tone="success" />
          <Row label="Mendyr keeps" value={formatINR(fee)} />
        </dl>
      </EditorSection>
    </div>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={strong ? "font-medium text-slate-800" : "text-slate-500"}>{label}</dt>
      <dd className={cx("tabular-nums", strong ? "text-base font-semibold" : "text-slate-700", tone === "success" ? "text-success-700" : strong && "text-slate-900")}>
        {value}
      </dd>
    </div>
  );
}

// ── verification ────────────────────────────────────────────────────────

export function VerificationEditor({ value, onChange, disabled }: EditorProps<VerificationConfig>) {
  return (
    <div className="space-y-4">
      <EditorSection title="New professionals">
        <Switch
          label="Auto-approve new professionals"
          description="Off (recommended): new professionals start as Pending and get no visit requests until a super admin approves them in Verification. On: they're approved at signup and can take visits straight away, with no check of their registration or documents."
          checked={value.auto_approve}
          disabled={disabled}
          onChange={(v) => onChange({ ...value, auto_approve: v })}
        />
      </EditorSection>
      {value.auto_approve ? (
        <Callout tone="warning" icon="alert" title="Patients may be visited by unverified professionals">
          Only use auto-approve for internal testing or a controlled pilot. Professionals already in the queue are not approved retroactively.
        </Callout>
      ) : (
        <Callout tone="success" icon="shield" title="Every professional is checked by a person before their first visit." />
      )}
      <Link href="/verification" className={buttonClass("secondary")}>
        <Icon name="shield" size={17} />
        Open the verification queue
      </Link>
    </div>
  );
}

// ── privacy ─────────────────────────────────────────────────────────────

export function PrivacyEditor({ value, onChange, disabled }: EditorProps<PrivacyConfig>) {
  return (
    <div className="space-y-4">
      <EditorSection
        title="Hide contact details"
        description="Once a booking ends this way, neither side sees the other's phone number or exact address — only the booking code and a user reference like MU-1A2B3C."
      >
        <CheckGroup
          legend="When a booking is"
          options={["cancelled", "no_show", "failed", "completed"].map((s) => ({ value: s, label: BOOKING_STATUS_LABELS[s] ?? s }))}
          values={value.hide_contact_on_statuses}
          onChange={(hide_contact_on_statuses) => onChange({ ...value, hide_contact_on_statuses })}
          disabled={disabled}
        />
      </EditorSection>
      <EditorSection title="After a completed visit">
        <NumberField
          label="Hide contact details after"
          unit="hours"
          min={0}
          max={720}
          value={value.hide_contact_hours_after_completion}
          onChange={(v) => onChange({ ...value, hide_contact_hours_after_completion: v })}
          hint={value.hide_contact_hours_after_completion === 0 ? "0 keeps them visible after completion." : "Gives both sides time to sort out anything left over."}
          disabled={disabled}
        />
      </EditorSection>
    </div>
  );
}

// ── catalog.content ─────────────────────────────────────────────────────

export function CatalogContentNotice({ value }: EditorProps<CatalogContent>) {
  const n = Object.keys(value.services ?? {}).length;
  return (
    <EditorSection title="Edited from the Catalogue" description="Images, taglines, highlights and FAQs live with each service.">
      <p className="mb-4 text-sm text-slate-600">
        Content is set for <Badge tone="brand">{n} services</Badge>. Edit it alongside the service&apos;s name and price so they never drift apart.
      </p>
      <Link href="/catalogue" className={buttonClass("primary")}>
        <Icon name="grid" size={17} />
        Open Catalogue
      </Link>
    </EditorSection>
  );
}
