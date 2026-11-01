"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState, EmptyState } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal, Drawer, Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { adminApi, errorMessage, registryApi } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { describeActivity } from "@/lib/labels";
import { useResource } from "@/lib/useResource";
import type { RegistryEntry } from "@/lib/types";

import { DiffView, diffValues } from "./Diff";
import { EDITORS } from "./editors";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function ConfigKeyEditor({
  entry,
  onSaved,
  onReset,
  onDirtyChange,
}: {
  entry: RegistryEntry;
  onSaved: (next: RegistryEntry) => void;
  onReset: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const spec = EDITORS[entry.key];
  const [draft, setDraft] = useState<unknown>(() => clone(entry.value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // A new entry (other key, or the saved value came back normalised) resets the draft.
  useEffect(() => {
    setDraft(clone(entry.value));
    setError(null);
  }, [entry.key, entry.value]);

  const dirty = !same(draft, entry.value);
  const changes = useMemo(() => (dirty ? diffValues(entry.value, draft).length : 0), [dirty, entry.value, draft]);
  const localError = spec?.validate ? spec.validate(draft) : null;
  const isDefault = same(entry.value, entry.default);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  async function save() {
    if (localError) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await registryApi.save(entry.key, draft);
      onSaved({ ...entry, value: saved.value, id: saved.id, is_overridden: true, updated_at: saved.updated_at });
      toast.success(`${entry.label} saved`, entry.public ? "Apps pick this up on their next refresh." : undefined);
    } catch (err) {
      // The backend's 422 names the field: "Invalid value for 'app.theme' at primary: …"
      setError(errorMessage(err, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setResetting(true);
    try {
      await onReset();
      setConfirmReset(false);
      toast.success(`${entry.label} reset to default`);
    } catch (err) {
      toast.error("Couldn't reset", errorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  if (!spec) {
    return <EmptyState icon="code" title="No editor for this key" description="Edit it from Custom keys." />;
  }
  const Editor = spec.component;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">{entry.label}</h2>
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{entry.key}</code>
            {entry.public ? <Badge tone="accent">Sent to apps</Badge> : <Badge>Backend only</Badge>}
            {entry.is_overridden && !isDefault ? <Badge tone="brand">Customised</Badge> : <Badge>Default</Badge>}
            {dirty && (
              <Badge tone="warning" dot>
                Unsaved · {changes} {changes === 1 ? "change" : "changes"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {entry.description}
            {entry.updated_at && (
              <span title={formatDateTime(entry.updated_at)}> · Last updated {formatRelative(entry.updated_at)}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" icon="history" onClick={() => setShowHistory(true)}>
            History
          </Button>
          {entry.is_overridden && entry.id && !spec.readOnly && (
            <Button variant="ghost" size="sm" icon="undo" onClick={() => setConfirmReset(true)}>
              Reset to default
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState message={error} className="mb-4" />}

      <Editor value={draft} onChange={setDraft} entry={entry} disabled={saving || spec.readOnly} />

      {!spec.readOnly && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-slate-200 bg-page/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mr-auto flex items-center gap-2 text-sm">
              {localError ? (
                <span className="flex items-center gap-1.5 text-danger-700">
                  <Icon name="alert" size={16} />
                  {localError}
                </span>
              ) : dirty ? (
                <span className="flex items-center gap-1.5 text-warning-700">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  You have unsaved changes
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Icon name="check" size={16} className="text-success-600" />
                  All changes saved
                </span>
              )}
            </p>
            <Button variant="ghost" icon="diff" disabled={!dirty} onClick={() => setShowDiff(true)}>
              View changes
            </Button>
            <Button variant="secondary" disabled={!dirty || saving} onClick={() => setDraft(clone(entry.value))}>
              Discard
            </Button>
            <Button variant="primary" icon="check" disabled={!dirty || !!localError} loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={showDiff}
        onClose={() => setShowDiff(false)}
        title="Changes to save"
        description={`${entry.label} — saved value vs your edits.`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDiff(false)}>
              Keep editing
            </Button>
            <Button
              variant="primary"
              icon="check"
              disabled={!!localError}
              loading={saving}
              onClick={async () => {
                await save();
                setShowDiff(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <DiffView before={entry.value} after={draft} />
      </Modal>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
        busy={resetting}
        tone="danger"
        title={`Reset ${entry.label} to default?`}
        description="The saved value is removed and the built-in default applies everywhere straight away."
        confirmLabel="Reset to default"
      >
        <DiffView before={entry.value} after={entry.default} emptyText="The saved value already matches the default." />
      </ConfirmModal>

      <HistoryDrawer open={showHistory} onClose={() => setShowHistory(false)} entry={entry} />
    </div>
  );
}

function HistoryDrawer({ open, onClose, entry }: { open: boolean; onClose: () => void; entry: RegistryEntry }) {
  const res = useResource(
    () => adminApi.activity({ entity_type: "config", entity_id: entry.key, limit: 50 }),
    [entry.key, entry.updated_at, open],
    open
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Drawer open={open} onClose={onClose} title={`${entry.label} history`} subtitle="Newest first" width="lg">
      {res.error && <ErrorState message={res.error} onRetry={res.reload} />}
      {res.loading && !res.data && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 w-full rounded-card" />
          ))}
        </div>
      )}
      {res.data && res.data.length === 0 && <EmptyState icon="history" title="No changes yet" description="This key has always used its default." />}
      {res.data && res.data.length > 0 && (
        <ol className="space-y-3">
          {res.data.map((a) => {
            const meta = a.metadata ?? {};
            const before = "before" in meta ? meta.before : "value" in meta && a.action === "config.delete" ? meta.value : undefined;
            const after = "after" in meta ? meta.after : a.action === "config.delete" ? entry.default : "value" in meta ? meta.value : undefined;
            const open = expanded === a.id;
            return (
              <li key={a.id} className="rounded-card border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{describeActivity(a, entry.label)}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
                  </div>
                  {(before !== undefined || after !== undefined) && (
                    <Button size="sm" variant="ghost" iconRight={open ? "chevron-up" : "chevron-down"} onClick={() => setExpanded(open ? null : a.id)} aria-expanded={open}>
                      Diff
                    </Button>
                  )}
                </div>
                {open && (
                  <div className="mt-3">
                    <DiffView before={before ?? entry.default} after={after} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Drawer>
  );
}
