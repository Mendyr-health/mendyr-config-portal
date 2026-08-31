"use client";

import { useEffect, useState } from "react";

import { ApiError, configsApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { ConfigFormDialog } from "@/components/ConfigFormDialog";
import type { ConfigCreateInput, ConfigEntry, ConfigUpdateInput } from "@/lib/types";

function ConfigsPageInner() {
  const { logout } = useAuth();
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConfigEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await configsApi.list();
      setConfigs(data.sort((a, b) => a.key.localeCompare(b.key)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load configs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(input: ConfigCreateInput | ConfigUpdateInput) {
    await configsApi.create(input as ConfigCreateInput);
    setCreating(false);
    await refresh();
  }

  async function handleUpdate(input: ConfigCreateInput | ConfigUpdateInput) {
    if (!editing) return;
    await configsApi.update(editing.id, input as ConfigUpdateInput);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(config: ConfigEntry) {
    if (!window.confirm(`Delete config "${config.key}"? This can't be undone.`)) return;
    setDeletingId(config.id);
    try {
      await configsApi.remove(config.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete config.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Configs</h1>
          <p className="text-sm text-slate-500">
            Key/value entries that drive UI and backend behavior.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreating(true)}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New config
          </button>
          <button
            onClick={logout}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Description</th>
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
            {!loading && configs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No configs yet — create the first one.
                </td>
              </tr>
            )}
            {configs.map((config) => (
              <tr key={config.id}>
                <td className="px-4 py-3 font-mono text-xs text-slate-800">{config.key}</td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-600">
                  {JSON.stringify(config.value)}
                </td>
                <td className="px-4 py-3 text-slate-600">{config.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (config.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500")
                    }
                  >
                    {config.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing(config)}
                    className="mr-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config)}
                    disabled={deletingId === config.id}
                    className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === config.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <ConfigFormDialog onCancel={() => setCreating(false)} onSubmit={handleCreate} />
      )}
      {editing && (
        <ConfigFormDialog
          config={editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}

export default function ConfigsPage() {
  return (
    <AuthGuard>
      <ConfigsPageInner />
    </AuthGuard>
  );
}
