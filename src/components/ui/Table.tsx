"use client";

import { useMemo, useState, type ReactNode } from "react";

import { cx, formatNumber } from "@/lib/format";

import { Button } from "./Button";
import { EmptyState } from "./Card";
import { Icon, type IconName } from "./Icon";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Makes the header sortable (sorts the rows currently loaded). */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hide below a breakpoint to keep the table usable on small screens. */
  hideBelow?: "sm" | "md" | "lg";
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  empty?: { icon?: IconName; title: string; description?: ReactNode; action?: ReactNode };
  caption?: string;
  className?: string;
  dense?: boolean;
}

const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading,
  skeletonRows = 6,
  onRowClick,
  selectedKey,
  empty,
  caption,
  className,
  dense,
}: TableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  }

  const pad = dense ? "px-4 py-2.5" : "px-4 py-3";
  const showEmpty = !loading && rows.length === 0;

  return (
    <div className={cx("scrollbar-thin overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cx(
                    "whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500",
                    align,
                    col.hideBelow && HIDE[col.hideBelow],
                    col.className
                  )}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cx(
                        "inline-flex items-center gap-1 rounded uppercase hover:text-slate-800",
                        active && "text-slate-800"
                      )}
                    >
                      {col.header}
                      <Icon
                        name={active ? (sort!.dir === "asc" ? "arrow-up" : "arrow-down") : "sort"}
                        size={12}
                        className={active ? "text-brand-600" : "text-slate-300"}
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-slate-100 last:border-0">
                  {columns.map((col, j) => (
                    <td key={col.key} className={cx(pad, col.hideBelow && HIDE[col.hideBelow])}>
                      <span
                        className="skeleton block h-4"
                        style={{ width: `${j === 0 ? 70 : 40 + ((i * 7 + j * 13) % 45)}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : sorted.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-selected={selectedKey ? selectedKey === key : undefined}
                    className={cx(
                      "border-b border-slate-100 transition-colors last:border-0",
                      onRowClick && "cursor-pointer hover:bg-brand-50/40 focus-visible:bg-brand-50/60",
                      selectedKey === key && "bg-brand-50/60",
                      loading && "opacity-60"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cx(
                          pad,
                          "align-middle text-slate-700",
                          col.align === "right" && "text-right tabular-nums",
                          col.align === "center" && "text-center",
                          col.hideBelow && HIDE[col.hideBelow],
                          col.className
                        )}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
      {showEmpty && (
        <EmptyState
          icon={empty?.icon ?? "inbox"}
          title={empty?.title ?? "Nothing here yet"}
          description={empty?.description}
          action={empty?.action}
        />
      )}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  hasNext,
}: {
  page: number;
  pageSize: number;
  /** Omit when the API only says whether there's a next page. */
  total?: number;
  hasNext?: boolean;
  onPage: (p: number) => void;
}) {
  const pages = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : undefined;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total !== undefined ? Math.min(total, page * pageSize) : page * pageSize;
  const canNext = pages !== undefined ? page < pages : Boolean(hasNext);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
      <span>
        {total !== undefined ? (
          <>
            Showing <span className="font-medium text-slate-700">{formatNumber(from)}</span>–
            <span className="font-medium text-slate-700">{formatNumber(to)}</span> of{" "}
            <span className="font-medium text-slate-700">{formatNumber(total)}</span>
          </>
        ) : (
          <>Page {page}</>
        )}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" icon="chevron-left" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        {pages !== undefined && (
          <span className="px-2 tabular-nums">
            {page} / {pages}
          </span>
        )}
        <Button size="sm" variant="secondary" iconRight="chevron-right" disabled={!canNext} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
