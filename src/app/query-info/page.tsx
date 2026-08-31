"use client";

import { useEffect, useState } from "react";

import { ApiError, queryInfoApi } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { QueryInfoFormDialog } from "@/components/QueryInfoFormDialog";
import type { QueryInfoCreateInput, QueryInfoEntry, QueryInfoUpdateInput } from "@/lib/types";

function QueryInfoPageInner() {
  const [queries, setQueries] = useState<QueryInfoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QueryInfoEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await queryInfoApi.list();
      setQueries(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load queries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(input: QueryInfoCreateInput | QueryInfoUpdateInput) {
    await queryInfoApi.create(input as QueryInfoCreateInput);
    setCreating(false);
    await refresh();
  }

  async function handleUpdate(input: QueryInfoCreateInput | QueryInfoUpdateInput) {
    if (!editing) return;
    await queryInfoApi.update(editing.id, input as QueryInfoUpdateInput);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(queryInfo: QueryInfoEntry) {
    if (!window.confirm(`Delete query "${queryInfo.name}"? This can't be undone.`)) return;
    setDeletingId(queryInfo.id);
    try {
      await queryInfoApi.remove(queryInfo.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete query.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Queries</h1>
            <p className="text-sm text-slate-500">
              Admin-curated read-only SQL, runnable by name via <code>GET /analytics/&#123;name&#125;/data</code>.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New query
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Query</th>
                <th className="px-4 py-3">Batch size</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && queries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No queries yet — create the first one.
                  </td>
                </tr>
              )}
              {queries.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{q.name}</td>
                  <td className="max-w-sm truncate px-4 py-3 font-mono text-xs text-slate-600">
                    {q.query}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{q.batch_size}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (q.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      {q.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(q)}
                      className="mr-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q)}
                      disabled={deletingId === q.id}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === q.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {creating && (
          <QueryInfoFormDialog onCancel={() => setCreating(false)} onSubmit={handleCreate} />
        )}
        {editing && (
          <QueryInfoFormDialog
            queryInfo={editing}
            onCancel={() => setEditing(null)}
            onSubmit={handleUpdate}
          />
        )}
      </div>
    </>
  );
}

export default function QueryInfoPage() {
  return (
    <AuthGuard>
      <QueryInfoPageInner />
    </AuthGuard>
  );
}
