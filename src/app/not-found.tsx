import Link from "next/link";

import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <EmptyState
        icon="search"
        title="Page not found"
        description="That page doesn't exist in the admin console."
        action={
          <Link href="/dashboard" className={buttonClass("primary")}>
            Back to overview
          </Link>
        }
      />
    </div>
  );
}
