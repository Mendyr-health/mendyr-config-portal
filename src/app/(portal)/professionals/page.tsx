"use client";

import Link from "next/link";

import { ProfessionalsBrowser } from "@/components/professionals/ProfessionalsBrowser";
import { buttonClass } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { adminApi } from "@/lib/api";
import { useResource } from "@/lib/useResource";

export default function ProfessionalsPage() {
  const stats = useResource(() => adminApi.professionalStats(), []);
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Professionals"
        description="Every nurse, physiotherapist, caretaker and doctor on Mendyr. Open a row for their profile, documents, availability and history."
        actions={
          <Link href="/verification" className={buttonClass("secondary")}>
            <Icon name="shield" size={17} />
            Verification queue
          </Link>
        }
      />
      <ProfessionalsBrowser defaultTab="all" counts={stats.data?.by_status} onChanged={() => void stats.reload()} />
    </>
  );
}
