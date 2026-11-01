import type { ComponentType } from "react";

import type { IconName } from "@/components/ui/Icon";

import { BannersEditor, CopyEditor, OnboardingEditor, SupportEditor, validateBanners } from "./content";
import { FeaturesEditor, HomeEditor, ThemeEditor, validateTheme } from "./experience";
import {
  BookingRulesEditor,
  CancelReasonsEditor,
  CatalogContentNotice,
  MaintenanceEditor,
  PollingEditor,
  PricingEditor,
  PrivacyEditor,
  ProSettingsEditor,
  VerificationEditor,
  VersionEditor,
  validateRules,
  validateVersion,
} from "./platform";
import type { EditorProps } from "./types";

export interface EditorSpec {
  // Values arrive as `unknown` from the registry; each editor knows its own shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<EditorProps<any>>;
  icon: IconName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate?: (v: any) => string | null;
  /** Read-only here — edited elsewhere. */
  readOnly?: boolean;
}

function noNaN(v: unknown): string | null {
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (typeof x === "number" && Number.isNaN(x)) return `${k.replace(/_/g, " ")} is empty.`;
    }
  }
  return null;
}

export const EDITORS: Record<string, EditorSpec> = {
  "app.features": { component: FeaturesEditor, icon: "toggle" },
  "app.theme": { component: ThemeEditor, icon: "palette", validate: validateTheme },
  "app.home": { component: HomeEditor, icon: "layout" },
  "app.banners": { component: BannersEditor, icon: "megaphone", validate: validateBanners },
  "app.onboarding": { component: OnboardingEditor, icon: "smartphone" },
  "app.copy": { component: CopyEditor, icon: "text" },
  "app.support": { component: SupportEditor, icon: "lifebuoy" },
  "app.version": { component: VersionEditor, icon: "refresh", validate: validateVersion },
  "app.maintenance": { component: MaintenanceEditor, icon: "wrench" },
  "app.polling": { component: PollingEditor, icon: "timer", validate: noNaN },
  "booking.rules": { component: BookingRulesEditor, icon: "calendar", validate: validateRules },
  "booking.cancel_reasons": { component: CancelReasonsEditor, icon: "x-circle" },
  "pro.settings": { component: ProSettingsEditor, icon: "briefcase", validate: noNaN },
  pricing: { component: PricingEditor, icon: "rupee", validate: noNaN },
  verification: { component: VerificationEditor, icon: "shield" },
  privacy: { component: PrivacyEditor, icon: "lock", validate: noNaN },
  "catalog.content": { component: CatalogContentNotice, icon: "package", readOnly: true },
};

export const GROUP_LABELS: Record<string, { label: string; icon: IconName }> = {
  experience: { label: "Experience", icon: "palette" },
  content: { label: "Content", icon: "megaphone" },
  booking: { label: "Booking", icon: "calendar" },
  operations: { label: "Operations", icon: "briefcase" },
  platform: { label: "Platform", icon: "smartphone" },
};

export const GROUP_ORDER = ["experience", "content", "booking", "operations", "platform"];
