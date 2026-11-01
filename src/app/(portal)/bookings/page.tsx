"use client";

import { EmptyState, PageHeader } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="Bookings" description="Every visit, live and past." />
      <EmptyState icon="calendar" title="Coming up next" description="This screen is being built." />
    </>
  );
}
