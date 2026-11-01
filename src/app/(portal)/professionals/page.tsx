"use client";

import { EmptyState, PageHeader } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="Professionals" description="Every nurse, physio and caregiver on Mendyr." />
      <EmptyState icon="stethoscope" title="Coming up next" description="This screen is being built." />
    </>
  );
}
