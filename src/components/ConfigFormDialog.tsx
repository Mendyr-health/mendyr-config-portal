"use client";

import { useState } from "react";

import type { ConfigCreateInput, ConfigEntry, ConfigUpdateInput } from "@/lib/types";

interface Props {
  /** Present when editing an existing entry; absent when creating a new one. */
  config?: ConfigEntry;
  onCancel: () => void;
  onSubmit: (input: ConfigCreateInput | ConfigUpdateInput) => Promise<void>;
}

export function ConfigFormDialog({ config, onCancel, onSubmit }: Props) {
  const isEditing = Boolean(config);
  const [key, setKey] = useState(config?.key ?? "");
  const [valueText, setValueText] = useState(
    config ? JSON.stringify(config.value, null, 2) : '""'
  );
  const [description, setDescription] = useState(config?.description ?? "");
  const [isActive, setIsActive] = useState(config?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(valueText);
    } catch {
      setError('Value must be valid JSON — e.g. "some string", 42, true, or {"a": 1}.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await onSubmit({
          value: parsedValue,
          description: description || null,
          is_active: isActive,
        } satisfies ConfigUpdateInput);
      } else {
        if (!key.trim()) {
          setError("Key is required.");
          setSubmitting(false);
          return;
        }
        await onSubmit({
          key: key.trim(),
          value: parsedValue,
          description: description || null,
          is_active: isActive,
        } satisfies ConfigCreateInput);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {isEditing ? `Edit ${config?.key}` : "New config"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Key</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isEditing}
              placeholder="MAX_BOOKING_RADIUS_KM"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Value (JSON)</label>
            <textarea
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Active
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? "Saving…" : isEditing ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
