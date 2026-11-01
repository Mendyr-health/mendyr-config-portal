"use client";

import { EmptyState, PageHeader } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="Verification" description="Review and approve professionals before they can take visits." />
      <EmptyState icon="shield" title="Coming up next" description="This screen is being built." />
    </>
  );
}
