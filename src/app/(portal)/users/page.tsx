"use client";

import { EmptyState, PageHeader } from "@/components/ui/Card";

export default function Page() {
  return (
    <>
      <PageHeader title="Users" description="Patients, professionals and staff accounts." />
      <EmptyState icon="users" title="Coming up next" description="This screen is being built." />
    </>
  );
}
