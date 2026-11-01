"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/AuthProvider";

const HOME_ROUTE = "/dashboard";

export default function HomePage() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role === undefined) return;
    router.replace(role ? HOME_ROUTE : "/login");
  }, [role, router]);

  return null;
}
