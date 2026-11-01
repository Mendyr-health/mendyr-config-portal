"use client";

import { EmptyState, PageHeader } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="Catalogue" description="Categories and services patients can book." />
      <EmptyState icon="grid" title="Coming up next" description="This screen is being built." />
    </>
  );
}
