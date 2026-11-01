import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cx } from "@/lib/format";

import { Icon, type IconName } from "./Icon";

const CONTROL =
  "w-full rounded-input border border-slate-200 bg-white text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const INVALID = "border-danger-600 focus:border-danger-600 focus:ring-danger-600/10";

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Shown after the label, e.g. "optional" or a unit. */
  aside?: ReactNode;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label + control + hint/error with the aria wiring done once. */
export function Field({ label, hint, error, aside, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
            {label}
          </label>
          {aside && <span className="text-xs text-slate-400">{aside}</span>}
        </div>
      )}
      {children(id, hintId)}
      {error ? (
        <p id={hintId} className="mt-1.5 text-xs text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  icon?: IconName;
  /** Text shown inside the right edge — a unit like "min" or "%". */
  suffix?: ReactNode;
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, icon, suffix, leading, className, ...rest },
  ref
) {
  if (!icon && !suffix && !leading) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, "h-10 px-3", invalid && INVALID, className)}
        {...rest}
      />
    );
  }
  return (
    <div className={cx("relative", className)}>
      {icon && (
        <Icon name={icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      )}
      {leading && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{leading}</span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, "h-10", icon || leading ? "pl-9" : "pl-3", suffix ? "pr-12" : "pr-3", invalid && INVALID)}
        {...rest}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ invalid, className, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "px-3 py-2.5 leading-relaxed", invalid && INVALID, className)}
      {...rest}
    />
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[]; invalid?: boolean; placeholder?: string }
>(function Select({ options, invalid, placeholder, className, ...rest }, ref) {
  return (
    <div className={cx("relative", className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, "h-10 appearance-none pl-3 pr-9", invalid && INVALID)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
});

/** Search box with a clear button. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cx(CONTROL, "h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Clear search"
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

/** Colour swatch + hex text input, kept in sync. */
export function ColorInput({
  value,
  onChange,
  id,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  invalid?: boolean;
}) {
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-input border border-slate-200 shadow-sm"
        style={{ background: valid ? value : "#fff" }}
      >
        <span className="sr-only">Pick colour</span>
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <Input
        id={id}
        value={value}
        invalid={invalid || !valid}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        className="font-mono uppercase"
        spellCheck={false}
      />
    </div>
  );
}
