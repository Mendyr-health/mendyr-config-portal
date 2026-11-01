"use client";

import { EmptyState, PageHeader } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="App Config" description="What the patient and professional apps show." />
      <EmptyState icon="sliders" title="Coming up next" description="This screen is being built." />
    </>
  );
}
