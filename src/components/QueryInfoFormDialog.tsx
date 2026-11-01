"use client";

import { useState } from "react";

import { NumberField } from "@/components/config/kit";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { Switch } from "@/components/ui/Switch";
import { errorMessage } from "@/lib/api";
import type { QueryInfoCreateInput, QueryInfoEntry, QueryInfoUpdateInput } from "@/lib/types";

interface Props {
  /** Present when editing an existing entry; absent when creating a new one. */
  queryInfo?: QueryInfoEntry;
  onCancel: () => void;
  onSubmit: (input: QueryInfoCreateInput | QueryInfoUpdateInput) => Promise<void>;
}

export function QueryInfoFormDialog({ queryInfo, onCancel, onSubmit }: Props) {
  const isEditing = Boolean(queryInfo);
  const [name, setName] = useState(queryInfo?.name ?? "");
  const [query, setQuery] = useState(queryInfo?.query ?? "");
  const [batchSize, setBatchSize] = useState(queryInfo?.batch_size ?? 50);
  const [isActive, setIsActive] = useState(queryInfo?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const invalid = !query.trim() || (!isEditing && !name.trim()) || Number.isNaN(batchSize) || batchSize < 1 || batchSize > 500;

  async function handleSubmit() {
    if (invalid) return;
    setError(null);
    setSubmitting(true);
    try {
      if (isEditing) {
        await onSubmit({ query: query.trim(), batch_size: batchSize, is_active: isActive } satisfies QueryInfoUpdateInput);
      } else {
        await onSubmit({ name: name.trim(), query: query.trim(), batch_size: batchSize, is_active: isActive } satisfies QueryInfoCreateInput);
      }
    } catch (err) {
      // The backend rejects anything that isn't a single standalone SELECT — its message is
      // already written for a person reading the form.
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onCancel}
      title={isEditing ? `Edit ${queryInfo?.name}` : "New query"}
      description="A single read-only SELECT. Results are paged by the batch size."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={invalid}>
            {isEditing ? "Save changes" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" hint={isEditing ? "Names can't be changed — they're the URL." : "Used in the URL: /analytics/<name>/data"}>
          {(id, d) => <Input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} disabled={isEditing} className="font-mono" data-autofocus placeholder="weekly_completed_visits" />}
        </Field>
        <Field label="SQL">
          {(id) => (
            <Textarea
              id={id}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={10}
              spellCheck={false}
              className="font-mono text-[13px]"
              placeholder="SELECT city, count(*) FROM addresses GROUP BY city"
            />
          )}
        </Field>
        <div className="grid grid-cols-2 items-end gap-4">
          <NumberField label="Batch size" min={1} max={500} value={batchSize} onChange={setBatchSize} unit="rows" />
          <Switch label="Active" checked={isActive} onChange={setIsActive} className="pb-2" />
        </div>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
