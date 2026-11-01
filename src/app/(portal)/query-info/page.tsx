"use client";

import { useState } from "react";

import { AdminOnly } from "@/components/AuthGuard";
import { QueryInfoFormDialog } from "@/components/QueryInfoFormDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/Overlay";
import { Pagination } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, queryInfoApi } from "@/lib/api";
import { cx, formatRelative } from "@/lib/format";
import { useResource } from "@/lib/useResource";
import type { QueryInfoCreateInput, QueryInfoEntry, QueryInfoUpdateInput, QueryResultPage } from "@/lib/types";

export default function QueryInfoPage() {
  return (
    <AdminOnly what="Saved queries">
      <Queries />
    </AdminOnly>
  );
}

function Queries() {
  const toast = useToast();
  const list = useResource(async () => (await queryInfoApi.list()).sort((a, b) => a.name.localeCompare(b.name)), []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<QueryInfoEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<QueryInfoEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const queries = (list.data ?? []).filter((x) => !q || x.name.toLowerCase().includes(q.toLowerCase()));
  const current = list.data?.find((x) => x.id === selected) ?? queries[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Audit"
        title="Queries"
        description="Saved read-only SQL, runnable by name. Results can include any table, so only admins can see or run them."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            New query
          </Button>
        }
      />
      {list.error && <ErrorState message={list.error} onRetry={list.reload} className="mb-4" />}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card padded={false} className="self-start">
          <div className="border-b border-slate-100 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Find a query" />
          </div>
          {list.loading && !list.data ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : queries.length === 0 ? (
            <EmptyState icon="database" title={q ? "No matches" : "No saved queries"} />
          ) : (
            <ul className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
              {queries.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(x.id)}
                    aria-current={current?.id === x.id ? "true" : undefined}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                      current?.id === x.id ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50"
                    )}
                  >
                    <Icon name="database" size={16} className="text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[13px] font-medium">{x.name}</span>
                      <span className="text-xs text-slate-400">Updated {formatRelative(x.updated_at)}</span>
                    </span>
                    {!x.is_active && <Badge>Off</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {current ? (
          <QueryPanel key={current.id} entry={current} onEdit={() => setEditing(current)} onDelete={() => setDeleting(current)} />
        ) : (
          !list.loading && <EmptyState icon="code" title="Create your first query" description="Save a SELECT once, then run it any time from here." />
        )}
      </div>

      {(creating || editing) && (
        <QueryInfoFormDialog
          queryInfo={editing ?? undefined}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (input) => {
            if (editing) await queryInfoApi.update(editing.id, input as QueryInfoUpdateInput);
            else {
              const created = await queryInfoApi.create(input as QueryInfoCreateInput);
              setSelected(created.id);
            }
            toast.success(editing ? "Query saved" : "Query created");
            setCreating(false);
            setEditing(null);
            await list.reload();
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        busy={busy}
        tone="danger"
        title={`Delete ${deleting?.name}?`}
        description="Anything that calls this query by name will stop working. This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await queryInfoApi.remove(deleting.id);
            toast.success(`${deleting.name} deleted`);
            setDeleting(null);
            setSelected(null);
            await list.reload();
          } catch (err) {
            toast.error("Couldn't delete", errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

function QueryPanel({ entry, onEdit, onDelete }: { entry: QueryInfoEntry; onEdit: () => void; onDelete: () => void }) {
  const [result, setResult] = useState<QueryResultPage | null>(null);
  const [page, setPage] = useState(1);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(p: number) {
    setRunning(true);
    setError(null);
    try {
      setResult(await queryInfoApi.run(entry.name, p));
      setPage(p);
    } catch (err) {
      setError(errorMessage(err, "The query failed."));
    } finally {
      setRunning(false);
    }
  }

  const columns = result ? Array.from(new Set(result.items.flatMap((r) => Object.keys(r)))) : [];

  return (
    <div className="min-w-0 space-y-6">
      <Card>
        <CardHeader
          title={<span className="font-mono">{entry.name}</span>}
          description={`Batch size ${entry.batch_size} · ${entry.is_active ? "active" : "inactive"}`}
          actions={
            <>
              <Button variant="ghost" size="sm" icon="edit" onClick={onEdit}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" icon="trash" className="hover:bg-danger-50 hover:text-danger-600" onClick={onDelete}>
                Delete
              </Button>
              <Button variant="primary" size="sm" icon="play" loading={running} onClick={() => void run(1)} disabled={!entry.is_active}>
                Run
              </Button>
            </>
          }
        />
        <pre className="scrollbar-thin max-h-64 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-[13px] leading-relaxed text-slate-100">{entry.query}</pre>
        {!entry.is_active && <p className="mt-2 text-xs text-warning-700">Inactive queries can&apos;t be run. Edit it to turn it back on.</p>}
      </Card>

      {error && <ErrorState message={error} onRetry={() => void run(page)} />}

      {result && (
        <Card padded={false}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Results</p>
            <Badge>
              {result.items.length} {result.items.length === 1 ? "row" : "rows"} on this page
            </Badge>
          </div>
          {result.items.length === 0 ? (
            <EmptyState icon="inbox" title="No rows" />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className={cx("w-full text-left text-[13px]", running && "opacity-60")}>
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((c) => (
                      <th key={c} scope="col" className="whitespace-nowrap px-4 py-2 font-mono text-xs font-semibold text-slate-500">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {columns.map((c) => (
                        <td key={c} className="max-w-xs truncate whitespace-nowrap px-4 py-2 font-mono text-slate-700" title={cell(row[c])}>
                          {row[c] === null || row[c] === undefined ? <span className="text-slate-300">null</span> : cell(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={result.page_size} hasNext={result.has_next} onPage={(p) => void run(p)} />
        </Card>
      )}
    </div>
  );
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
