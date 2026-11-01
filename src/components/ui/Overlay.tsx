"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { cx } from "@/lib/format";

import { Button } from "./Button";
import { Icon } from "./Icon";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Esc to close, Tab cycles inside the panel, focus returns to the opener on close, and the
 * page behind doesn't scroll. Shared by Modal and Drawer. */
function useDialogBehaviour(open: boolean, panel: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    function onKey(e: KeyboardEvent) {
      if (!node) return;
      // Only the top-most dialog reacts.
      const dialogs = document.querySelectorAll("[data-dialog-panel]");
      if (dialogs[dialogs.length - 1] !== node) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === firstEl || !node.contains(document.activeElement))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, panel]);
}

function usePortalTarget(): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.body), []);
  return el;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "danger";
}

export function Modal({ open, onClose, title, description, children, footer, size = "md", tone = "default" }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const target = usePortalTarget();
  useDialogBehaviour(open, panel, onClose);
  if (!open || !target) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        data-dialog-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          "relative flex max-h-[92vh] w-full animate-pop-in flex-col rounded-t-card bg-white shadow-lift outline-none sm:rounded-card",
          widths[size]
        )}
      >
        <div className="flex items-start gap-3 px-6 pb-2 pt-5">
          {tone === "danger" && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-600">
              <Icon name="alert" size={18} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={18} />
          </Button>
        </div>
        {children && <div className="scrollbar-thin overflow-y-auto px-6 py-3">{children}</div>}
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    target
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  children?: ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  busy,
  children,
  confirmDisabled,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      size="sm"
      tone={tone === "danger" ? "danger" : "default"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => void onConfirm()}
            loading={busy}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
}

/** Right-hand side panel for record details and editors. Full-screen on phones. */
export function Drawer({ open, onClose, title, subtitle, headerExtra, children, footer, width = "lg" }: DrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const target = usePortalTarget();
  useDialogBehaviour(open, panel, onClose);
  if (!open || !target) return null;
  const widths = { md: "sm:max-w-md", lg: "sm:max-w-xl", xl: "sm:max-w-3xl" };
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/30" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        data-dialog-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "relative flex h-full w-full animate-slide-in-right flex-col bg-page shadow-lift outline-none",
          widths[width]
        )}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
          </div>
          {headerExtra}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
            <Icon name="x" size={18} />
          </Button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    target
  );
}
