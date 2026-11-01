import { Suspense, type ReactNode } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { PortalShell } from "@/components/shell/PortalShell";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <PortalShell>
        {/* Pages read ?q= etc. with useSearchParams, which needs a Suspense boundary. */}
        <Suspense fallback={null}>{children}</Suspense>
      </PortalShell>
    </AuthGuard>
  );
}
