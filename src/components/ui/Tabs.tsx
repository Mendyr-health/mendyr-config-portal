"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cx, formatNumber } from "@/lib/format";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number | null;
}

/** Underlined tabs with arrow-key navigation (WAI-ARIA tabs pattern). */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  variant = "underline",
  ariaLabel,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  variant?: "underline" | "pill";
  ariaLabel?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKey(e: KeyboardEvent, index: number) {
    let nextIndex = -1;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    if (e.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = items.length - 1;
    if (nextIndex < 0) return;
    e.preventDefault();
    refs.current[nextIndex]?.focus();
    onChange(items[nextIndex]!.value);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        "scrollbar-thin flex max-w-full overflow-x-auto",
        variant === "underline" ? "gap-1 border-b border-slate-200" : "gap-1 rounded-input bg-slate-100 p-1",
        className
      )}
    >
      {items.map((item, i) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors",
              variant === "underline"
                ? cx(
                    "-mb-px border-b-2 px-3 py-2.5",
                    active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
                  )
                : cx(
                    "rounded-lg px-3 py-1.5",
                    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )
            )}
          >
            {item.label}
            {item.count !== undefined && item.count !== null && (
              <span
                className={cx(
                  "rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums",
                  active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                )}
              >
                {formatNumber(item.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
