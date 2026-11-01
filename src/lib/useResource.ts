"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "./api";

export interface Resource<T> {
  data: T | null;
  error: string | null;
  /** True while a request is in flight — the previous data stays visible meanwhile. */
  loading: boolean;
  reload: () => Promise<void>;
  setData: (updater: T | null | ((prev: T | null) => T | null)) => void;
}

/** Load data for a screen and keep showing the last result while refreshing (no blanking
 * on filter changes). Responses that arrive out of order are ignored. */
export function useResource<T>(loader: () => Promise<T>, deps: unknown[], enabled = true): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (id === seq.current) setData(result);
    } catch (err) {
      if (id === seq.current) setError(errorMessage(err, "Couldn't load this data."));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void run();
  }, [enabled, run, ...deps]);

  return { data, error, loading, reload: run, setData };
}

/** Debounce a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}
