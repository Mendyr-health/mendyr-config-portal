import { useId, type ReactNode } from "react";

import { cx } from "@/lib/format";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md";
  className?: string;
  /** Used when there is no visible label. */
  ariaLabel?: string;
  tone?: "brand" | "danger";
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
  size = "md",
  className,
  ariaLabel,
  tone = "brand",
}: SwitchProps) {
  const id = useId();
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";
  const button = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-describedby={description ? `${id}-d` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        track,
        checked ? (tone === "danger" ? "bg-danger-600" : "bg-brand-600") : "bg-slate-300"
      )}
    >
      <span
        className={cx(
          "inline-block rounded-full bg-white shadow transition-transform duration-200 ease-out",
          knob,
          checked ? shift : "translate-x-0"
        )}
      />
    </button>
  );
  if (!label) return <span className={className}>{button}</span>;
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-800">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {button}
    </div>
  );
}
