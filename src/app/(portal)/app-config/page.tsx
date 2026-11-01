"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminOnly } from "@/components/AuthGuard";
import { ConfigKeyEditor } from "@/components/config/ConfigKeyEditor";
import { EDITORS, GROUP_LABELS, GROUP_ORDER } from "@/components/config/editors";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/Overlay";
import { registryApi } from "@/lib/api";
import { cx } from "@/lib/format";
import { useResource } from "@/lib/useResource";
import { useUrlParam } from "@/lib/useUrlParam";
import type { RegistryEntry } from "@/lib/types";

export default function AppConfigPage() {
  return (
    <AdminOnly what="App Config">
      <ConfigStudio />
    </AdminOnly>
  );
}

function ConfigStudio() {
  const router = useRouter();
  const keyParam = useUrlParam("key");
  const registry = useResource(() => registryApi.list(), []);
  const [selected, setSelected] = useState<string>(keyParam);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const entries = registry.data ?? [];
  const current = entries.find((e) => e.key === selected) ?? entries[0];

  useEffect(() => {
    if (keyParam) setSelected(keyParam);
  }, [keyParam]);

  function choose(key: string) {
    if (key === current?.key) return;
    if (dirty) {
      setPending(key);
      return;
    }
    go(key);
  }

  function go(key: string) {
    setSelected(key);
    setDirty(false);
    router.replace(`/app-config?key=${encodeURIComponent(key)}`, { scroll: false });
  }

  const setRegistry = registry.setData;
  const onSaved = useCallback(
    (next: RegistryEntry) => setRegistry((all) => (all ? all.map((e) => (e.key === next.key ? next : e)) : all)),
    [setRegistry]
  );
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  const grouped = GROUP_ORDER.map((g) => ({ group: g, items: entries.filter((e) => e.group === g) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader
        eyebrow="Product"
        title="App Config"
        description="Control what the patient and professional apps show — no release needed. Every key is validated by the server before it goes live."
        actions={
          <Link href="/configs" className={buttonClass("secondary")}>
            <Icon name="code" size={17} />
            Custom keys
          </Link>
        }
      />

      {registry.error && <ErrorState message={registry.error} onRetry={registry.reload} className="mb-4" />}

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav aria-label="Config keys" className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
          {/* Phones/tablets: a compact select instead of the long list. */}
          <div className="lg:hidden">
            <Select
              aria-label="Config key"
              value={current?.key ?? ""}
              onChange={(e) => choose(e.target.value)}
              options={entries.map((e) => ({ value: e.key, label: `${GROUP_LABELS[e.group]?.label ?? e.group} · ${e.label}` }))}
            />
          </div>
          <div className="hidden space-y-5 lg:block">
            {registry.loading && !registry.data &&
              Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)}
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {GROUP_LABELS[group]?.label ?? group}
                </p>
                <ul className="space-y-0.5">
                  {items.map((e) => {
                    const active = e.key === current?.key;
                    const spec = EDITORS[e.key];
                    const custom = e.is_overridden && JSON.stringify(e.value) !== JSON.stringify(e.default);
                    return (
                      <li key={e.key}>
                        <button
                          type="button"
                          onClick={() => choose(e.key)}
                          aria-current={active ? "page" : undefined}
                          className={cx(
                            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                            active ? "bg-white font-medium text-brand-700 shadow-soft ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                          )}
                        >
                          <Icon name={spec?.icon ?? "code"} size={16} className={active ? "text-brand-600" : "text-slate-400"} />
                          <span className="min-w-0 flex-1 truncate">{e.label}</span>
                          {e.key === "app.maintenance" && (e.value as { enabled?: boolean })?.enabled && <Badge tone="danger">On</Badge>}
                          {active && dirty ? (
                            <span className="h-2 w-2 rounded-full bg-warning" aria-label="Unsaved changes" />
                          ) : custom ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" title="Customised" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          {current ? (
            <ConfigKeyEditor
              key={current.key}
              entry={current}
              onSaved={onSaved}
              onReset={async () => {
                if (current.id) await registryApi.reset(current.id);
                await registry.reload();
              }}
              onDirtyChange={onDirtyChange}
            />
          ) : registry.loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-64 w-full rounded-card" />
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          const k = pending!;
          setPending(null);
          go(k);
        }}
        tone="danger"
        title="Discard unsaved changes?"
        description={`Your edits to ${current?.label ?? "this key"} haven't been saved.`}
        confirmLabel="Discard changes"
      />
    </>
  );
}
