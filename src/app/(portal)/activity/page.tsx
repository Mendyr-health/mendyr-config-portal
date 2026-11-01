"use client";

import { EmptyState, PageHeader } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="Activity" description="Who changed what, and when." />
      <EmptyState icon="activity" title="Coming up next" description="This screen is being built." />
    </>
  );
}
