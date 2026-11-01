"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/format";

/** Building blocks shared by the typed config editors and the catalogue editor. */

export function EditorSection({
  title,
  description,
  children,
  aside,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-card border border-slate-200/80 bg-white p-5 shadow-soft", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Up/down/remove controls for a list row. */
export function RowControls({
  index,
  count,
  onMove,
  onRemove,
  label,
  disabled,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove?: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button variant="ghost" size="icon" disabled={disabled || index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${label} up`}>
        <Icon name="chevron-up" size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index + 1)}
        aria-label={`Move ${label} down`}
      >
        <Icon name="chevron-down" size={16} />
      </Button>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="hover:bg-danger-50 hover:text-danger-600"
        >
          <Icon name="trash" size={16} />
        </Button>
      )}
    </div>
  );
}

/** HTML5 drag-and-drop for reordering, layered on top of the up/down buttons (which stay the
 * keyboard-accessible path). */
export function useDragReorder<T>(list: T[], onChange: (next: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  return {
    dragIndex,
    overIndex,
    itemProps: (index: number) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setOverIndex(index);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null) onChange(move(list, dragIndex, index));
        setDragIndex(null);
        setOverIndex(null);
      },
      onDragEnd: () => {
        setDragIndex(null);
        setOverIndex(null);
      },
    }),
  };
}

/** Editable list of strings: rows with reorder/remove, plus an "add" input. */
export function StringListEditor({
  values,
  onChange,
  placeholder = "Add an item",
  itemLabel = "item",
  maxLength,
  disabled,
  emptyText = "Nothing added yet.",
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  itemLabel?: string;
  maxLength?: number;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [draft, setDraft] = useState("");
  const drag = useDragReorder(values, onChange);
  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft("");
  }
  return (
    <div>
      {values.length === 0 ? (
        <p className="mb-3 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {values.map((v, i) => (
            <li
              key={i}
              {...(disabled ? {} : drag.itemProps(i))}
              className={cx(
                "flex items-center gap-2 rounded-xl border bg-white py-1 pl-2 pr-1",
                drag.overIndex === i && drag.dragIndex !== i ? "border-brand-400" : "border-slate-200",
                drag.dragIndex === i && "opacity-50"
              )}
            >
              <Icon name="grip" size={16} className="cursor-grab text-slate-300" />
              <input
                value={v}
                disabled={disabled}
                maxLength={maxLength}
                aria-label={`${itemLabel} ${i + 1}`}
                onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
                className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1.5 text-sm text-slate-800 focus:bg-slate-50 focus:outline-none"
              />
              <RowControls
                index={i}
                count={values.length}
                label={`${itemLabel} ${i + 1}`}
                disabled={disabled}
                onMove={(to) => onChange(move(values, i, to))}
                onRemove={() => onChange(values.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1"
          />
          <Button icon="plus" onClick={add} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

/** Generic list of objects with a card per item. */
export function ObjectListEditor<T>({
  items,
  onChange,
  render,
  create,
  itemLabel,
  addLabel,
  title,
  emptyText = "Nothing added yet.",
  disabled,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  create: () => T;
  itemLabel: string;
  addLabel: string;
  title?: (item: T, index: number) => ReactNode;
  emptyText?: string;
  disabled?: boolean;
}) {
  const drag = useDragReorder(items, onChange);
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">{emptyText}</p>
      )}
      {items.map((item, i) => (
        <div
          key={i}
          onDragOver={disabled ? undefined : drag.itemProps(i).onDragOver}
          onDrop={disabled ? undefined : drag.itemProps(i).onDrop}
          className={cx(
            "rounded-xl border bg-slate-50/50 p-3",
            drag.overIndex === i && drag.dragIndex !== i ? "border-brand-400" : "border-slate-200",
            drag.dragIndex === i && "opacity-50"
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              draggable={!disabled}
              onDragStart={disabled ? undefined : drag.itemProps(i).onDragStart}
              onDragEnd={disabled ? undefined : drag.itemProps(i).onDragEnd}
              className="cursor-grab text-slate-300"
              aria-hidden
            >
              <Icon name="grip" size={16} />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
              {title ? title(item, i) : `${itemLabel} ${i + 1}`}
            </p>
            <RowControls
              index={i}
              count={items.length}
              label={`${itemLabel} ${i + 1}`}
              disabled={disabled}
              onMove={(to) => onChange(move(items, i, to))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          </div>
          {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
        </div>
      ))}
      {!disabled && (
        <Button icon="plus" variant="subtle" onClick={() => onChange([...items, create()])}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}

/** Number input bound to a numeric value; empty → null-ish handled by caller via `fallback`. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  disabled,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  const out = (min !== undefined && value < min) || (max !== undefined && value > max) || Number.isNaN(value);
  const range = min !== undefined && max !== undefined ? `${min}–${max}` : min !== undefined ? `≥ ${min}` : undefined;
  return (
    <Field
      label={label}
      aside={range}
      hint={hint}
      error={out ? `Must be ${range ?? "a number"}${unit ? ` ${unit}` : ""}.` : undefined}
    >
      {(id, d) => (
        <Input
          id={id}
          aria-describedby={d}
          type="number"
          inputMode="decimal"
          value={Number.isNaN(value) ? "" : value}
          min={min}
          max={max}
          step={step}
          suffix={unit}
          invalid={out}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
        />
      )}
    </Field>
  );
}

/** Text field bound to a nullable string ("" → null). */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  hint,
  required,
  disabled,
  type = "text",
  mono,
}: {
  label: ReactNode;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  placeholder?: string;
  maxLength?: number;
  hint?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  mono?: boolean;
}) {
  const v = value ?? "";
  const missing = required && !v.trim();
  return (
    <Field
      label={label}
      hint={hint}
      aside={maxLength ? `${v.length}/${maxLength}` : undefined}
      error={missing ? "Required." : undefined}
    >
      {(id, d) => (
        <Input
          id={id}
          aria-describedby={d}
          type={type}
          value={v}
          placeholder={placeholder}
          maxLength={maxLength}
          invalid={missing}
          disabled={disabled}
          className={mono ? "font-mono" : undefined}
          onChange={(e) => onChange(e.target.value === "" && !required ? null : e.target.value)}
        />
      )}
    </Field>
  );
}

/** A simple phone frame for live previews. */
export function PhoneMockup({ children, className, label = "Preview" }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <figure className={cx("mx-auto w-[260px]", className)} aria-label={label}>
      <div className="rounded-[36px] border-[6px] border-slate-900 bg-slate-900 shadow-lift">
        <div className="relative h-[520px] overflow-hidden rounded-[30px] bg-page">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
          <div className="scrollbar-thin h-full overflow-y-auto pt-9">{children}</div>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-slate-400">{label}</figcaption>
    </figure>
  );
}

/** Image URL with a thumbnail preview (or a broken-image hint). */
export function ImageUrlField({
  label = "Image URL",
  value,
  onChange,
  hint,
  disabled,
}: {
  label?: ReactNode;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const v = value ?? "";
  const isBroken = broken === v;
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <TextField label={label} value={value} onChange={onChange} maxLength={500} placeholder="https://…" hint={hint} disabled={disabled} type="url" />
      </div>
      <div className="mt-6 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
        {v && !isBroken ? (
          // Plain <img>: admin-supplied URLs on arbitrary hosts, so next/image's allow-list doesn't fit.
          <img src={v} alt="" className="h-full w-full object-cover" onError={() => setBroken(v)} />
        ) : (
          <Icon name="image" size={22} label={isBroken ? "Image failed to load" : undefined} className={isBroken ? "text-danger-600" : undefined} />
        )}
      </div>
    </div>
  );
}
