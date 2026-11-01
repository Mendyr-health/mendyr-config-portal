import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** The backend only lets admin / super_admin call these endpoints at all. */
  adminOnly?: boolean;
  /** Other paths that should highlight this item. */
  also?: string[];
}

export const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: "Monitor",
    items: [{ href: "/dashboard", label: "Overview", icon: "overview" }],
  },
  {
    section: "Operations",
    items: [
      { href: "/verification", label: "Verification", icon: "shield" },
      { href: "/professionals", label: "Professionals", icon: "stethoscope" },
      { href: "/bookings", label: "Bookings", icon: "calendar" },
      { href: "/users", label: "Users", icon: "users" },
    ],
  },
  {
    section: "Product",
    items: [
      { href: "/catalogue", label: "Catalogue", icon: "grid" },
      { href: "/app-config", label: "App Config", icon: "sliders", adminOnly: true, also: ["/configs"] },
    ],
  },
  {
    section: "Audit",
    items: [
      { href: "/activity", label: "Activity", icon: "activity" },
      { href: "/query-info", label: "Queries", icon: "database", adminOnly: true },
    ],
  },
];
