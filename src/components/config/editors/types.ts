import type { RegistryEntry } from "@/lib/types";

export interface EditorProps<T> {
  value: T;
  onChange: (next: T) => void;
  entry: RegistryEntry;
  disabled?: boolean;
}

// Shapes mirror Mendyr-Backend/app/core/config_registry.py.

export type FeatureFlags = Record<string, boolean>;

export interface ThemeConfig {
  primary: string;
  primary_dark: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  radius: number;
}

export type HomeSectionType = "banners" | "categories" | "book_again" | "trust" | "how_it_works" | "offers" | "support";

export interface HomeSection {
  type: HomeSectionType;
  enabled: boolean;
  title: string | null;
}

export interface HomeConfig {
  sections: HomeSection[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  deeplink: string | null;
  bg_color: string;
  text_color: string;
  starts_at: string | null;
  ends_at: string | null;
  roles: Array<"patient" | "professional">;
  platforms: Array<"android" | "ios" | "web">;
  enabled: boolean;
}

export interface BannersConfig {
  items: Banner[];
}

export interface OnboardingSlide {
  title: string;
  body: string;
  image_url: string | null;
  icon: string | null;
}

export interface OnboardingConfig {
  slides: OnboardingSlide[];
}

export interface CopyConfig {
  locales: Record<string, Record<string, string>>;
}

export interface Faq {
  q: string;
  a: string;
}

export interface SupportConfig {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  hours: string;
  sos_number: string;
  ambulance_number: string;
  faqs: Faq[];
}

export interface PlatformVersion {
  min_supported: string;
  latest: string;
  store_url: string | null;
}

export interface VersionConfig {
  android: PlatformVersion;
  ios: PlatformVersion;
  message: string;
}

export interface MaintenanceConfig {
  enabled: boolean;
  title: string;
  message: string;
}

export interface PollingConfig {
  active_booking: number;
  lists: number;
  requests: number;
}

export interface BookingRules {
  slot_start_hour: number;
  slot_end_hour: number;
  slot_step_minutes: number;
  min_lead_minutes: number;
  horizon_days: number;
  free_cancel_window_minutes: number;
  cancellation_fee_pct: number;
  travel_buffer_minutes: number;
  early_start_minutes: number;
}

export interface CancelReasons {
  patient: string[];
  professional: string[];
}

export interface ProSettings {
  radius_options_km: number[];
  default_radius_km: number;
  languages: string[];
  required_documents: string[];
}

export interface PricingConfig {
  commission_pct: number;
  gst_pct: number;
}

export interface VerificationConfig {
  auto_approve: boolean;
}

export interface PrivacyConfig {
  hide_contact_on_statuses: string[];
  hide_contact_hours_after_completion: number;
}

export interface CatalogContent {
  services: Record<string, unknown>;
}
