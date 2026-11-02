"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

import { buttonClass } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Overlay";
import { previewKind } from "@/lib/labels";

/** `view_url`s from the API are presigned and live ~5 minutes. Treat them as stale a little
 * early so a link we hand out still works by the time the browser requests it. */
export const LINK_TTL_MS = 4.5 * 60_000;
/** After a refetch, a preview that still fails is shown as unavailable instead of looping. */
const RETRY_WINDOW_MS = 15_000;

export interface ExpiringLinks<T> {
  /** True while the current links are still inside their lifetime. */
  isFresh: () => boolean;
  /** Refetch the record (deduplicated) to get new links. */
  refresh: () => Promise<T | null>;
  /** Call from an <img>/<iframe> onError. Refetches once; after that marks the URL broken. */
  onPreviewError: (url: string) => void;
  isBroken: (url: string) => boolean;
  /** Anchor onClick: when the links have lapsed, open a tab now (so popup blockers allow it)
   * and point it at a fresh link once the refetch lands. */
  openFresh: (e: MouseEvent<HTMLAnchorElement>, pick: (fresh: T) => string | null | undefined) => void;
}

/** Keeps short-lived file links usable for a record shown on screen: refetches the record
 * when the links lapse (or when the tab becomes visible again after they did) and when a
 * preview fails to load, so we never leave a broken image on screen. */
export function useExpiringLinks<T>({
  data,
  active,
  refetch,
  apply,
}: {
  data: T | null;
  /** Only keep links alive when the record actually has files. */
  active: boolean;
  refetch: () => Promise<T>;
  apply: (fresh: T) => void;
}): ExpiringLinks<T> {
  const issuedAt = useRef(0);
  const lastRefresh = useRef(0);
  const inflight = useRef<Promise<T | null> | null>(null);
  const refetchRef = useRef(refetch);
  const applyRef = useRef(apply);
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    refetchRef.current = refetch;
    applyRef.current = apply;
  });

  const refresh = useCallback((): Promise<T | null> => {
    if (inflight.current) return inflight.current;
    lastRefresh.current = Date.now();
    const p = refetchRef
      .current()
      .then((fresh) => {
        applyRef.current(fresh);
        return fresh;
      })
      .catch(() => null)
      .finally(() => {
        inflight.current = null;
      });
    inflight.current = p;
    return p;
  }, []);

  // A new record means a new set of links: restart the clock and refetch when it runs out.
  useEffect(() => {
    if (!data) return;
    issuedAt.current = Date.now();
    if (!active) return;
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVisible);
      void refresh();
    }
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") void refresh();
      else document.addEventListener("visibilitychange", onVisible);
    }, LINK_TTL_MS);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [data, active, refresh]);

  const isFresh = useCallback(() => Date.now() - issuedAt.current < LINK_TTL_MS, []);

  const onPreviewError = useCallback(
    (url: string) => {
      if (Date.now() - lastRefresh.current > RETRY_WINDOW_MS) {
        void refresh();
        return;
      }
      setBroken((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
    },
    [refresh]
  );

  const isBroken = useCallback((url: string) => broken.has(url), [broken]);

  const openFresh = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, pick: (fresh: T) => string | null | undefined) => {
      if (isFresh()) return; // the anchor's own href is still valid
      e.preventDefault();
      const tab = window.open("", "_blank");
      if (tab) tab.opener = null;
      void refresh().then((fresh) => {
        const url = fresh ? pick(fresh) : null;
        if (tab && url) tab.location.href = url;
        else tab?.close();
      });
    },
    [isFresh, refresh]
  );

  return { isFresh, refresh, onPreviewError, isBroken, openFresh };
}

/** Full-size viewer: images at natural size (scaled to fit), PDFs in an embedded frame, with
 * an "Open in new tab" escape hatch either way. */
export function DocumentViewer({
  open,
  onClose,
  title,
  subtitle,
  url,
  contentType,
  links,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string | null;
  contentType: string | null;
  /** The record's link helpers, with `openFresh` already bound to this file. */
  links: {
    onPreviewError: (url: string) => void;
    isBroken: (url: string) => boolean;
    openFresh: (e: MouseEvent<HTMLAnchorElement>) => void;
  };
}) {
  if (!url) return null;
  const kind = previewKind(contentType, url);
  const broken = links.isBroken(url);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={title}
      description={subtitle}
      footer={
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={links.openFresh}
          className={buttonClass("secondary")}
        >
          <Icon name="external" size={17} />
          Open in new tab
        </a>
      }
    >
      {broken ? (
        <Callout tone="warning" icon="alert" title="Preview unavailable">
          The file couldn&apos;t be loaded here. Try opening it in a new tab.
        </Callout>
      ) : kind === "image" ? (
        <div className="flex justify-center rounded-xl bg-slate-100 p-2">
          <img
            key={url}
            src={url}
            alt={title}
            className="max-h-[70vh] w-auto max-w-full object-contain"
            onError={() => links.onPreviewError(url)}
          />
        </div>
      ) : kind === "pdf" ? (
        <iframe key={url} src={url} title={title} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50" />
      ) : (
        <Callout tone="neutral" icon="file" title="No in-browser preview">
          This file type can&apos;t be shown here. Open it in a new tab to view or download it.
        </Callout>
      )}
    </Modal>
  );
}
