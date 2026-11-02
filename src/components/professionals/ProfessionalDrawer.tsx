"use client";

import { useState, type ReactNode } from "react";

import { useExpiringLinks } from "@/components/documents/DocumentViewer";
import { ProfessionalDocuments } from "@/components/professionals/ProfessionalDocuments";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout, DetailRow, ErrorState, Skeleton } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { adminApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import {
  cx,
  formatDateTime,
  formatPhone,
  humanize,
  initials,
} from "@/lib/format";
import {
  BOOKING_STATUS_LABELS,
  DAY_NAMES,
  describeActivity,
  formatClock,
  professionLabel,
} from "@/lib/labels";
import { useResource } from "@/lib/useResource";
import type { AdminProfessionalDetail, ReviewDecisionInput } from "@/lib/types";

type Decision = ReviewDecisionInput["decision"];

export function ProfessionalDrawer({
  professionalId,
  onClose,
  onChanged,
}: {
  professionalId: string | null;
  onClose: () => void;
  onChanged?: (p: AdminProfessionalDetail) => void;
}) {
  const { canWrite } = useAuth();
  const toast = useToast();
  const res = useResource(
    () => adminApi.professional(professionalId!),
    [professionalId],
    Boolean(professionalId)
  );
  const [decision, setDecision] = useState<Decision | null>(null);
  const p = res.data && res.data.id === professionalId ? res.data : null;
  const links = useExpiringLinks({
    data: p,
    active: Boolean(p?.documents.length),
    refetch: () => adminApi.professional(professionalId!),
    apply: (fresh) => {
      if (fresh.id === professionalId) res.setData(fresh);
    },
  });

  function applyUpdate(updated: AdminProfessionalDetail) {
    res.setData(updated);
    onChanged?.(updated);
  }

  async function submit(input: ReviewDecisionInput) {
    if (!p) return;
    const updated = await adminApi.review(p.id, input);
    applyUpdate(updated);
    const verb = input.decision === "approved" ? "approved" : input.decision === "rejected" ? "rejected" : "moved to review";
    toast.success(`${updated.full_name} ${verb}`, input.decision === "approved" ? "They can now receive visit requests." : undefined);
    setDecision(null);
  }

  return (
    <Drawer
      open={Boolean(professionalId)}
      onClose={onClose}
      width="xl"
      title={p ? p.full_name : "Professional"}
      subtitle={
        p ? (
          <span className="flex flex-wrap items-center gap-2">
            {professionLabel(p.professional_type)} · {p.years_of_experience} yrs experience
            <StatusBadge status={p.verification_status} />
          </span>
        ) : undefined
      }
      footer={
        p && canWrite ? (
          <>
            <Button
              variant="secondary"
              icon="clock"
              disabled={p.verification_status === "in_review"}
              onClick={() => setDecision("in_review")}
            >
              Mark in review
            </Button>
            <Button
              variant="secondary"
              icon="x-circle"
              className="text-danger-700 hover:border-danger-100 hover:bg-danger-50"
              disabled={p.verification_status === "rejected"}
              onClick={() => setDecision("rejected")}
            >
              Reject
            </Button>
            <Button
              variant="success"
              icon="check"
              disabled={p.verification_status === "approved"}
              onClick={() => setDecision("approved")}
            >
              Approve
            </Button>
          </>
        ) : p ? (
          <p className="mr-auto text-xs text-slate-500">Only admins can approve or reject professionals.</p>
        ) : undefined
      }
    >
      {res.error && <ErrorState message={res.error} onRetry={res.reload} />}
      {!p && !res.error && <DrawerSkeleton />}
      {p && (
        <ProfessionalDetail
          p={p}
          documents={<ProfessionalDocuments p={p} canWrite={canWrite} links={links} onUpdated={applyUpdate} />}
        />
      )}
      {p && decision && (
        <ReviewModal name={p.full_name} decision={decision} onClose={() => setDecision(null)} onSubmit={submit} />
      )}
    </Drawer>
  );
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-card border border-slate-200/80 bg-white p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ProfessionalDetail({ p, documents }: { p: AdminProfessionalDetail; documents: ReactNode }) {
  const byDay = DAY_NAMES.map((_, d) => p.availability.filter((s) => s.day_of_week === d));
  const totalBookings = Object.values(p.bookings_by_status).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 font-display text-xl font-semibold text-brand-700">
            {initials(p.full_name)}
          </span>
        )}
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-2 text-slate-700">
            <Icon name="phone" size={14} className="text-slate-400" />
            <a href={`tel:${p.phone_number}`} className="hover:text-brand-700">
              {formatPhone(p.phone_number)}
            </a>
          </p>
          {p.email && (
            <p className="mt-1 flex items-center gap-2 truncate text-slate-700">
              <Icon name="mail" size={14} className="text-slate-400" />
              <a href={`mailto:${p.email}`} className="truncate hover:text-brand-700">
                {p.email}
              </a>
            </p>
          )}
          <p className="mt-1 flex items-center gap-2 text-slate-500">
            <Icon name="map" size={14} className="text-slate-400" />
            {p.city ?? "City not set"} · {p.service_radius_km} km radius
          </p>
        </div>
      </div>

      {p.verification_status === "rejected" && p.rejection_reason && (
        <Callout tone="danger" icon="x-circle" title="Rejection reason (shown to the professional)">
          {p.rejection_reason}
        </Callout>
      )}
      {p.user_status !== "active" && (
        <Callout tone="warning" icon="user-x" title={`Account ${p.user_status}`}>
          This account can&apos;t sign in until it&apos;s reactivated from Users.
        </Callout>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Registration">
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Licence no.">{p.license_number ?? <Missing />}</DetailRow>
            <DetailRow label="Council reg. no.">{p.council_registration_number ?? <Missing />}</DetailRow>
            <DetailRow label="Experience">{p.years_of_experience} years</DetailRow>
            <DetailRow label="Gender">{humanize(p.gender)}</DetailRow>
            <DetailRow label="Signed up">{formatDateTime(p.created_at)}</DetailRow>
            <DetailRow label="Verified">{p.verified_at ? formatDateTime(p.verified_at) : "—"}</DetailRow>
          </dl>
        </Section>
        <Section title="Performance">
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Rating">
              {p.total_ratings ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="star" size={14} className="fill-warning text-warning" />
                  {p.average_rating.toFixed(1)} <span className="font-normal text-slate-400">({p.total_ratings})</span>
                </span>
              ) : (
                "No ratings yet"
              )}
            </DetailRow>
            <DetailRow label="Visits completed">{p.total_visits_completed}</DetailRow>
            <DetailRow label="Accepting bookings">
              {p.is_accepting_bookings ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>}
            </DetailRow>
            <DetailRow label="Bookings (all)">{totalBookings}</DetailRow>
          </dl>
          {totalBookings > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(p.bookings_by_status)
                .filter(([, n]) => n > 0)
                .map(([s, n]) => (
                  <Badge key={s}>
                    {BOOKING_STATUS_LABELS[s] ?? humanize(s)} · {n}
                  </Badge>
                ))}
            </div>
          )}
        </Section>
      </div>

      {p.bio && (
        <Section title="About">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{p.bio}</p>
        </Section>
      )}

      <Section title="Languages & services">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Languages</p>
        <div className="flex flex-wrap gap-1.5">
          {p.languages_spoken?.length ? p.languages_spoken.map((l) => <Badge key={l}>{l}</Badge>) : <Missing />}
        </div>
        <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Services offered</p>
        <div className="flex flex-wrap gap-1.5">
          {p.services.length ? p.services.map((s) => <Badge key={s} tone="brand">{s}</Badge>) : <Missing />}
        </div>
      </Section>

      <Section title="Weekly availability">
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {byDay.map((slots, d) => (
            <li key={d} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="w-9 shrink-0 font-semibold text-slate-700">{DAY_NAMES[d]}</span>
              <span className={cx("min-w-0", slots.length ? "text-slate-700" : "text-slate-400")}>
                {slots.length
                  ? slots.map((s) => `${formatClock(s.start_time)} – ${formatClock(s.end_time)}`).join(", ")
                  : "Off"}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {documents}

      <Section title="Decision history">
        {p.history.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">No decisions yet.</p>
        ) : (
          <ol className="relative ml-2 space-y-4 border-l border-slate-200 pl-5">
            {p.history.map((h) => {
              const meta = h.metadata ?? {};
              const reason = typeof meta.reason === "string" ? meta.reason : null;
              const note = typeof meta.note === "string" ? meta.note : null;
              const tone = h.action.endsWith("approved")
                ? "bg-success-600"
                : h.action.endsWith("rejected")
                  ? "bg-danger-600"
                  : h.action.endsWith("delete")
                    ? "bg-slate-400"
                    : "bg-brand-600";
              return (
                <li key={h.id} className="relative">
                  <span className={cx("absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white", tone)} />
                  <p className="text-sm font-medium text-slate-800">{describeActivity(h, p.full_name)}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(h.created_at)}</p>
                  {reason && <p className="mt-1 text-sm text-slate-600">Reason: {reason}</p>}
                  {note && <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">Internal note: {note}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Missing() {
  return <span className="font-normal text-warning-700">Not provided</span>;
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-card" />
      ))}
    </div>
  );
}

const COPY: Record<Decision, { title: string; confirm: string; desc: string }> = {
  approved: {
    title: "Approve",
    confirm: "Approve",
    desc: "They'll be notified and start receiving visit requests that match their services and radius.",
  },
  rejected: {
    title: "Reject",
    confirm: "Reject",
    desc: "They'll see the reason below in their app and can re-submit their details.",
  },
  in_review: {
    title: "Mark in review",
    confirm: "Mark in review",
    desc: "Lets them know we're checking their details. They still won't receive requests.",
  },
};

function ReviewModal({
  name,
  decision,
  onClose,
  onSubmit,
}: {
  name: string;
  decision: Decision;
  onClose: () => void;
  onSubmit: (input: ReviewDecisionInput) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[decision];
  const reasonOk = decision !== "rejected" || reason.trim().length >= 5;

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        decision,
        rejection_reason: decision === "rejected" ? reason.trim() : null,
        note: note.trim() || null,
      });
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
      title={`${copy.title} ${name}?`}
      description={copy.desc}
      tone={decision === "rejected" ? "danger" : "default"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={decision === "rejected" ? "danger" : decision === "approved" ? "success" : "primary"}
            onClick={go}
            loading={busy}
            disabled={!reasonOk}
          >
            {copy.confirm}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {decision === "rejected" && (
          <Field
            label="Reason (the professional will see this)"
            aside={`${reason.length}/500`}
            hint="Be specific and kind — e.g. “Your nursing council certificate is blurry. Please upload a clear photo.”"
          >
            {(id, d) => (
              <Textarea
                id={id}
                aria-describedby={d}
                data-autofocus
                value={reason}
                maxLength={500}
                rows={4}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
        )}
        <Field label="Internal note" aside="optional · staff only" hint="Kept in the decision history; not shown to the professional.">
          {(id, d) => (
            <Textarea id={id} aria-describedby={d} value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
