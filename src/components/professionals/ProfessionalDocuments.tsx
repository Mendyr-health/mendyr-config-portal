"use client";

import { useState, type ReactNode } from "react";

import { DocumentViewer, type ExpiringLinks } from "@/components/documents/DocumentViewer";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Callout, ErrorState } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { adminApi, errorMessage, registryApi } from "@/lib/api";
import { cx, formatDateTime, formatRelative } from "@/lib/format";
import { documentLabel, previewKind } from "@/lib/labels";
import { useResource } from "@/lib/useResource";
import type { AdminDocument, AdminProfessionalDetail } from "@/lib/types";

type Pending = { kind: "reject" | "delete"; doc: AdminDocument } | null;

/** KYC documents for one professional: a required-documents summary, a card per file with an
 * inline preview, and (admins only) approve / reject / delete per document. */
export function ProfessionalDocuments({
  p,
  canWrite,
  links,
  onUpdated,
}: {
  p: AdminProfessionalDetail;
  canWrite: boolean;
  links: ExpiringLinks<AdminProfessionalDetail>;
  onUpdated: (next: AdminProfessionalDetail) => void;
}) {
  const toast = useToast();
  // Required types live in the public `pro.settings` config; fall back to what's uploaded.
  const bundle = useResource(() => registryApi.appBundle("professional"), []);
  const required = bundle.data?.configs["pro.settings"]?.required_documents ?? null;

  const [viewing, setViewing] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const docs = p.documents;
  const viewed = viewing ? docs.find((d) => d.id === viewing) ?? null : null;
  const freshUrl = (id: string) => (fresh: AdminProfessionalDetail) => fresh.documents.find((d) => d.id === id)?.view_url;

  async function approve(doc: AdminDocument) {
    setApproving(doc.id);
    try {
      const next = await adminApi.reviewDocument(p.id, doc.id, { decision: "approved" });
      onUpdated(next);
      toast.success(`${documentLabel(doc.document_type)} approved`);
    } catch (err) {
      toast.error("Couldn't approve the document", errorMessage(err));
    } finally {
      setApproving(null);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    setActionError(null);
    const { kind, doc } = pending;
    try {
      const next =
        kind === "reject"
          ? await adminApi.reviewDocument(p.id, doc.id, { decision: "rejected", rejection_reason: reason.trim() })
          : await adminApi.deleteDocument(p.id, doc.id);
      onUpdated(next);
      if (viewing === doc.id && kind === "delete") setViewing(null);
      toast.success(
        kind === "reject" ? `${documentLabel(doc.document_type)} rejected` : `${documentLabel(doc.document_type)} deleted`,
        kind === "reject" ? `${p.full_name} has been asked to upload it again.` : undefined
      );
      closePending();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function closePending() {
    setPending(null);
    setReason("");
    setActionError(null);
  }

  return (
    <section className="rounded-card border border-slate-200/80 bg-white p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
        <span className="text-xs text-slate-400">
          {docs.length} uploaded{!canWrite && " · view only"}
        </span>
      </div>

      <RequiredSummary docs={docs} required={required} />

      {docs.length === 0 ? (
        <Callout tone="warning" icon="file" className="mt-3">
          No documents uploaded yet.
        </Callout>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              links={links}
              pick={freshUrl(doc.id)}
              onView={() => setViewing(doc.id)}
              actions={
                canWrite ? (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      icon="check"
                      loading={approving === doc.id}
                      disabled={doc.verification_status === "approved" || approving !== null}
                      onClick={() => void approve(doc)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="x-circle"
                      className="text-danger-700 hover:border-danger-100 hover:bg-danger-50"
                      disabled={doc.verification_status === "rejected"}
                      onClick={() => setPending({ kind: "reject", doc })}
                    >
                      Reject
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-8 w-8 text-slate-400 hover:text-danger-600"
                      aria-label={`Delete ${documentLabel(doc.document_type)}`}
                      title="Delete"
                      onClick={() => setPending({ kind: "delete", doc })}
                    >
                      <Icon name="trash" size={16} />
                    </Button>
                  </>
                ) : null
              }
            />
          ))}
        </ul>
      )}

      {viewed && (
        <DocumentViewer
          open
          onClose={() => setViewing(null)}
          title={documentLabel(viewed.document_type)}
          subtitle={`Uploaded ${formatDateTime(viewed.created_at)}`}
          url={viewed.view_url}
          contentType={viewed.content_type}
          links={{
            onPreviewError: links.onPreviewError,
            isBroken: links.isBroken,
            openFresh: (e) => links.openFresh(e, freshUrl(viewed.id)),
          }}
        />
      )}

      <ConfirmModal
        open={pending?.kind === "reject"}
        onClose={closePending}
        onConfirm={confirmPending}
        busy={busy}
        tone="danger"
        title={`Reject ${pending ? documentLabel(pending.doc.document_type).toLowerCase() : "document"}?`}
        description={`${p.full_name} is notified with your reason and asked to upload it again.`}
        confirmLabel="Reject document"
        confirmDisabled={reason.trim().length < 5}
      >
        <Field
          label="Reason (the professional will see this)"
          aside={`${reason.length}/500`}
          hint="Be specific — e.g. “The photo is blurry and the ID number can't be read.”"
        >
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              data-autofocus
              value={reason}
              maxLength={500}
              rows={3}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
        {actionError && <ErrorState message={actionError} className="mt-3" />}
      </ConfirmModal>

      <ConfirmModal
        open={pending?.kind === "delete"}
        onClose={closePending}
        onConfirm={confirmPending}
        busy={busy}
        tone="danger"
        title={`Delete ${pending ? documentLabel(pending.doc.document_type).toLowerCase() : "document"}?`}
        description={
          pending?.doc.verification_status === "approved"
            ? `This document is approved. Deleting it removes the file for good and ${p.full_name} will need to upload a new one.`
            : `The file is removed for good. ${p.full_name} can upload a new one from the app.`
        }
        confirmLabel="Delete"
      >
        {actionError && <ErrorState message={actionError} />}
      </ConfirmModal>
    </section>
  );
}

function RequiredSummary({ docs, required }: { docs: AdminDocument[]; required: string[] | null }) {
  const uploadedTypes = Array.from(new Set(docs.map((d) => d.document_type)));
  const types = required ?? uploadedTypes;
  if (types.length === 0) return null;
  const approved = new Set(docs.filter((d) => d.verification_status === "approved").map((d) => d.document_type));
  const approvedCount = types.filter((t) => approved.has(t)).length;
  const missing = required ? required.filter((t) => !uploadedTypes.includes(t)) : [];
  const done = approvedCount === types.length;
  return (
    <div
      className={cx(
        "rounded-xl px-3 py-2.5 text-sm",
        done ? "bg-success-50 text-success-700" : "bg-slate-50 text-slate-700"
      )}
    >
      <p className="flex items-center gap-2 font-medium">
        <Icon name={done ? "check-circle" : "shield"} size={16} className={done ? "text-success-600" : "text-slate-400"} />
        {approvedCount} of {types.length} {required ? "required" : "uploaded"} document{types.length === 1 ? "" : "s"} approved
      </p>
      {missing.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          Not uploaded:
          {missing.map((t) => (
            <Badge key={t} tone="warning">
              {documentLabel(t)}
            </Badge>
          ))}
        </p>
      )}
    </div>
  );
}

function DocumentCard({
  doc,
  links,
  pick,
  onView,
  actions,
}: {
  doc: AdminDocument;
  links: ExpiringLinks<AdminProfessionalDetail>;
  pick: (fresh: AdminProfessionalDetail) => string | undefined;
  onView: () => void;
  actions: ReactNode;
}) {
  const label = documentLabel(doc.document_type);
  const kind = previewKind(doc.content_type, doc.view_url);
  const broken = links.isBroken(doc.view_url);
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-slate-200">
      {kind === "image" && !broken ? (
        <button type="button" onClick={onView} className="group relative block" aria-label={`View ${label} full size`}>
          <img
            key={doc.view_url}
            src={doc.view_url}
            alt={label}
            className="h-36 w-full bg-slate-100 object-cover transition-opacity group-hover:opacity-90"
            loading="lazy"
            onError={() => links.onPreviewError(doc.view_url)}
          />
          <span className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 text-slate-600 opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
            <Icon name="eye" size={15} />
          </span>
        </button>
      ) : (
        <span className="flex h-36 w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
          <Icon name={broken ? "alert" : "file"} size={28} />
          <span className="text-xs">
            {broken ? "Preview unavailable" : kind === "pdf" ? "PDF document" : "No inline preview"}
          </span>
          <span className="flex gap-1.5">
            {kind === "pdf" && !broken && (
              <Button size="sm" variant="ghost" icon="eye" onClick={onView}>
                Preview
              </Button>
            )}
            <a
              href={doc.view_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => links.openFresh(e, pick)}
              className={buttonClass("secondary", "sm")}
            >
              <Icon name="external" size={15} />
              Open
            </a>
          </span>
        </span>
      )}
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-slate-800">{label}</span>
          <StatusBadge status={doc.verification_status} />
        </div>
        <p className="text-xs text-slate-400">
          <span title={formatDateTime(doc.created_at)}>Uploaded {formatRelative(doc.created_at)}</span>
          {doc.reviewed_at && (
            <span title={formatDateTime(doc.reviewed_at)}> · reviewed {formatRelative(doc.reviewed_at)}</span>
          )}
        </p>
        {doc.verification_status === "rejected" && doc.rejection_reason && (
          <p className="rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs text-danger-700">
            <span className="font-semibold">Rejected:</span> {doc.rejection_reason}
          </p>
        )}
        {actions && <div className="mt-auto flex items-center gap-1.5 pt-1.5">{actions}</div>}
      </div>
    </li>
  );
}
