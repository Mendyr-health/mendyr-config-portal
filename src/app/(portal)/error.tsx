"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";

// Next 16 passes `retry` (not `reset`) to error boundaries.
export default function PortalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      icon="alert"
      title="This screen hit a problem"
      description="Something unexpected went wrong while showing this page. Your data is safe — try again, or reload the page."
      action={
        <Button variant="primary" icon="refresh" onClick={() => retry()}>
          Try again
        </Button>
      }
      className="py-24"
    />
  );
}
