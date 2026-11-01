"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { Switch } from "@/components/ui/Switch";
import { errorMessage } from "@/lib/api";
import type { ConfigCreateInput, ConfigEntry, ConfigUpdateInput } from "@/lib/types";

interface Props {
  /** Present when editing an existing entry; absent when creating a new one. */
  config?: ConfigEntry;
  /** Keys owned by the typed registry — can't be created here. */
  reservedKeys: string[];
  onCancel: () => void;
  onSubmit: (input: ConfigCreateInput | ConfigUpdateInput) => Promise<void>;
}

/** Generic JSON editor for custom (unregistered) keys, with live JSON validation. */
export function ConfigFormDialog({ config, reservedKeys, onCancel, onSubmit }: Props) {
  const isEditing = Boolean(config);
  const [key, setKey] = useState(config?.key ?? "");
  const [valueText, setValueText] = useState(config ? JSON.stringify(config.value, null, 2) : "{\n  \n}");
  const [description, setDescription] = useState(config?.description ?? "");
  const [isActive, setIsActive] = useState(config?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(valueText) as unknown };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Invalid JSON" };
    }
  }, [valueText]);

  const keyTrim = key.trim();
  const keyError = !isEditing && keyTrim && reservedKeys.includes(keyTrim) ? "This key has a typed editor in App Config." : null;

  async function handleSubmit() {
    if (!parsed.ok || keyError || (!isEditing && !keyTrim)) return;
    setError(null);
    setSubmitting(true);
    try {
      if (isEditing) {
        await onSubmit({ value: parsed.value, description: description || null, is_active: isActive } satisfies ConfigUpdateInput);
      } else {
        await onSubmit({ key: keyTrim, value: parsed.value, description: description || null, is_active: isActive } satisfies ConfigCreateInput);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onCancel}
      title={isEditing ? `Edit ${config?.key}` : "New custom key"}
      description="Free-form JSON stored as-is. Prefer a typed key in App Config where one exists."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!parsed.ok || !!keyError || (!isEditing && !keyTrim)}
          >
            {isEditing ? "Save changes" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Key" error={keyError} hint={isEditing ? "Keys can't be renamed." : "e.g. MAX_BOOKING_RADIUS_KM or promo.diwali"}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} value={key} onChange={(e) => setKey(e.target.value)} disabled={isEditing} className="font-mono" invalid={!!keyError} data-autofocus />
          )}
        </Field>
        <Field
          label="Value (JSON)"
          error={!parsed.ok ? parsed.message : undefined}
          hint={parsed.ok ? "Valid JSON" : undefined}
          aside={
            parsed.ok ? (
              <button type="button" className="text-brand-700 hover:underline" onClick={() => setValueText(JSON.stringify(parsed.value, null, 2))}>
                Format
              </button>
            ) : undefined
          }
        >
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              rows={10}
              spellCheck={false}
              invalid={!parsed.ok}
              className="font-mono text-[13px]"
            />
          )}
        </Field>
        <Field label="Description" aside="optional">
          {(id) => <Input id={id} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        <Switch label="Active" description="Inactive keys are kept but ignored." checked={isActive} onChange={setIsActive} />
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
