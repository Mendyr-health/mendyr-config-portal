"use client";

import { useSearchParams } from "next/navigation";

/** Read a query-string value (e.g. `?q=` from the global search). Pages render inside the
 * portal layout's Suspense boundary, which useSearchParams requires. */
export function useUrlParam(name: string): string {
  const params = useSearchParams();
  return params.get(name) ?? "";
}
