"use client";

import { useState } from "react";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!query.trim()) {
      setError("Query is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await onSubmit({
          query: query.trim(),
          batch_size: batchSize,
          is_active: isActive,
        } satisfies QueryInfoUpdateInput);
      } else {
        if (!name.trim()) {
          setError("Name is required.");
          setSubmitting(false);
          return;
        }
        await onSubmit({
          name: name.trim(),
          query: query.trim(),
          batch_size: batchSize,
          is_active: isActive,
        } satisfies QueryInfoCreateInput);
      }
    } catch (err) {
      // The backend rejects anything that isn't a single standalone SELECT — surface that
      // message as-is, it's already written for a human reading the form.
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {isEditing ? `Edit ${queryInfo?.name}` : "New query"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Must be a single, standalone <code>SELECT</code> statement — the backend rejects
          anything else.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEditing}
              placeholder="top_rated_professionals"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">SQL query</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={8}
              placeholder="SELECT id, full_name, average_rating FROM professional_profiles ORDER BY average_rating DESC"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Batch size</label>
            <input
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              Max rows returned per page when this query is run.
            </p>
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
