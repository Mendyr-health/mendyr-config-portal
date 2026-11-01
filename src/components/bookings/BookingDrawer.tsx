"use client";

import { useState, type ReactNode } from "react";

import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout, DetailRow, ErrorState, Skeleton } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal, Drawer } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { adminApi, errorMessage } from "@/lib/api";
import { cx, formatDateTime, formatINR, formatPhone, humanize } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/labels";
import { useResource } from "@/lib/useResource";
import type { AdminBookingDetail } from "@/lib/types";

const CANCELLABLE = ["created", "searching", "assigned", "confirmed", "en_route"];
const REOPENABLE = ["assigned", "confirmed"];

const DOT: Record<string, string> = {
  searching: "bg-warning",
  assigned: "bg-brand-600",
  confirmed: "bg-brand-600",
  en_route: "bg-accent-500",
  in_progress: "bg-accent-600",
  completed: "bg-success-600",
  cancelled: "bg-slate-400",
  failed: "bg-danger-600",
  no_show: "bg-danger-600",
};

export function BookingDrawer({
  bookingId,
  onClose,
  onChanged,
}: {
  bookingId: string | null;
  onClose: () => void;
  onChanged?: (b: AdminBookingDetail) => void;
}) {
  const toast = useToast();
  const res = useResource(() => adminApi.booking(bookingId!), [bookingId], Boolean(bookingId));
  const b = res.data && res.data.id === bookingId ? res.data : null;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(kind: "cancel" | "reopen") {
    if (!b) return;
    setBusy(true);
    setActionError(null);
    try {
      const next = kind === "cancel" ? await adminApi.cancelBooking(b.id, reason.trim()) : await adminApi.reopenBooking(b.id);
      res.setData(next);
      onChanged?.(next);
      toast.success(
        kind === "cancel" ? `${b.booking_code} cancelled` : `${b.booking_code} is back on the board`,
        kind === "cancel" ? "The patient and professional have been notified." : "Nearby professionals will see the request again."
      );
      setCancelOpen(false);
      setReopenOpen(false);
      setReason("");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={Boolean(bookingId)}
      onClose={onClose}
      width="lg"
      title={b ? <span className="font-mono">{b.booking_code}</span> : "Booking"}
      subtitle={
        b ? (
          <span className="flex flex-wrap items-center gap-2">
            {b.service_name} · {formatDateTime(b.scheduled_start_at)}
            <StatusBadge status={b.status} />
          </span>
        ) : undefined
      }
      footer={
        b && (CANCELLABLE.includes(b.status) || REOPENABLE.includes(b.status)) ? (
          <>
            {REOPENABLE.includes(b.status) && (
              <Button variant="secondary" icon="refresh" onClick={() => setReopenOpen(true)}>
                Reopen for reassignment
              </Button>
            )}
            {CANCELLABLE.includes(b.status) && (
              <Button variant="danger" icon="x-circle" onClick={() => setCancelOpen(true)}>
                Cancel booking
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {res.error && <ErrorState message={res.error} onRetry={res.reload} />}
      {!b && !res.error && (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-card" />
          ))}
        </div>
      )}
      {b && <BookingDetail b={b} />}

      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => act("cancel")}
        busy={busy}
        tone="danger"
        title={`Cancel ${b?.booking_code ?? "booking"}?`}
        description="Cancelled on the patient's behalf with no fee. Both sides are notified."
        confirmLabel="Cancel booking"
        confirmDisabled={reason.trim().length < 3}
      >
        <Field label="Reason" hint="Shown to the patient and professional." aside={`${reason.length}/500`}>
          {(id, d) => <Textarea id={id} aria-describedby={d} data-autofocus value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {actionError && <ErrorState message={actionError} className="mt-3" />}
      </ConfirmModal>

      <ConfirmModal
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={() => act("reopen")}
        busy={busy}
        title={`Reopen ${b?.booking_code ?? "booking"}?`}
        description={`${b?.professional_name ?? "The professional"} is unassigned and the request goes back to nearby professionals.`}
        confirmLabel="Reopen"
      >
        {actionError && <ErrorState message={actionError} />}
      </ConfirmModal>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-slate-200/80 bg-white p-4 shadow-soft">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function BookingDetail({ b }: { b: AdminBookingDetail }) {
  return (
    <div className="space-y-4">
      {b.status === "failed" && <Callout tone="danger" icon="alert" title="No professional was available">Nobody accepted before the visit time. The patient was notified.</Callout>}
      {b.cancellation_reason && (
        <Callout tone="neutral" icon="x-circle" title="Cancellation reason">
          {b.cancellation_reason}
          {b.cancellation_fee_amount > 0 && <span className="mt-1 block">Cancellation fee: {formatINR(b.cancellation_fee_amount)}</span>}
        </Callout>
      )}

      <Section title="People">
        <div className="grid gap-3 sm:grid-cols-2">
          <Person role="Patient" name={b.patient_name} phone={b.patient_phone} />
          <Person role="Professional" name={b.professional_name} phone={b.professional_phone} empty="Not assigned yet" />
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
          <Icon name="map" size={16} className="mt-0.5 text-slate-400" />
          {b.address}
        </p>
        {b.preferred_gender && (
          <p className="mt-2 text-sm text-slate-600">
            Preferred caregiver: <Badge tone="accent">{humanize(b.preferred_gender)}</Badge>
          </p>
        )}
      </Section>

      <Section title="Timeline">
        {b.timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No status changes yet.</p>
        ) : (
          <ol className="relative ml-2 space-y-4 border-l border-slate-200 py-1 pl-5">
            {b.timeline.map((e, i) => (
              <li key={i} className="relative">
                <span className={cx("absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white", DOT[e.status] ?? "bg-slate-400")} />
                <p className="text-sm font-medium text-slate-800">{BOOKING_STATUS_LABELS[e.status] ?? humanize(e.status)}</p>
                <p className="text-xs text-slate-400">{formatDateTime(e.at)}</p>
                {e.note && <p className="mt-0.5 text-sm text-slate-600">{e.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Price">
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Service price">{formatINR(b.base_price)}</DetailRow>
          {b.discount_amount > 0 && <DetailRow label="Discount">− {formatINR(b.discount_amount)}</DetailRow>}
          <DetailRow label="GST">{formatINR(b.tax_amount)}</DetailRow>
          <DetailRow label={<span className="font-semibold text-slate-800">Patient pays</span>}>
            <span className="text-base font-semibold">{formatINR(b.total_amount)}</span>
          </DetailRow>
        </dl>
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-1">
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Internal — not shown to patients</p>
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Mendyr commission">{formatINR(b.platform_fee)}</DetailRow>
            <DetailRow label="Professional payout">{formatINR(b.professional_payout_amount)}</DetailRow>
          </dl>
        </div>
      </Section>

      <Section title="Visit notes">
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Patient notes">{b.patient_notes ?? <span className="font-normal text-slate-400">None</span>}</DetailRow>
          <DetailRow label="Visit summary">{b.visit_summary_notes ?? <span className="font-normal text-slate-400">None</span>}</DetailRow>
          <DetailRow label="Vitals">{b.vitals_recorded ?? <span className="font-normal text-slate-400">Not recorded</span>}</DetailRow>
          <DetailRow label="Rating">
            {b.review_rating ? (
              <span className="inline-flex items-center gap-0.5" aria-label={`${b.review_rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" size={15} className={i < b.review_rating! ? "fill-warning text-warning" : "text-slate-300"} />
                ))}
              </span>
            ) : (
              <span className="font-normal text-slate-400">Not rated</span>
            )}
          </DetailRow>
          <DetailRow label="Created">{formatDateTime(b.created_at)}</DetailRow>
        </dl>
      </Section>
    </div>
  );
}

function Person({ role, name, phone, empty }: { role: string; name: string | null; phone: string | null; empty?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{role}</p>
      {name ? (
        <>
          <p className="mt-1 font-medium text-slate-900">{name}</p>
          {phone ? (
            <a href={`tel:${phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
              <Icon name="phone" size={13} />
              {formatPhone(phone)}
            </a>
          ) : (
            <p className="mt-0.5 text-sm text-slate-400">Phone hidden</p>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-400">{empty ?? "—"}</p>
      )}
    </div>
  );
}
