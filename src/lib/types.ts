export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ConfigEntry {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigCreateInput {
  key: string;
  value: unknown;
  description?: string | null;
  is_active?: boolean;
}

export interface ConfigUpdateInput {
  value?: unknown;
  description?: string | null;
  is_active?: boolean;
}

export interface QueryInfoEntry {
  id: string;
  name: string;
  query: string;
  batch_size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueryInfoCreateInput {
  name: string;
  query: string;
  batch_size?: number;
  is_active?: boolean;
}

export interface QueryInfoUpdateInput {
  query?: string;
  batch_size?: number;
  is_active?: boolean;
}

export interface AccessTokenClaims {
  sub: string;
  role: string;
  type: string;
  exp: number;
}

export interface DailySignups {
  signup_date: string;
  patients: number;
  professionals: number;
}

export interface LocationBreakdown {
  city: string;
  state: string;
  patient_count: number;
}

export interface DashboardOverview {
  total_patients: number;
  total_professionals: number;
  professionals_by_verification_status: Record<string, number>;
  total_bookings: number;
  bookings_by_status: Record<string, number>;
  daily_signups: DailySignups[];
  top_locations: LocationBreakdown[];
  kpis?: BusinessKpis | null;
}

export interface DashboardFilters {
  city?: string;
  state?: string;
  date_from?: string;
  date_to?: string;
}

// ── Session ─────────────────────────────────────────────────────────────

export type PortalRole = "admin" | "super_admin" | "ops";

export interface Me {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  role: string;
  avatar_url: string | null;
}

// ── Admin: pagination ───────────────────────────────────────────────────

export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ── Professionals / verification ────────────────────────────────────────

export type VerificationStatus = "pending" | "in_review" | "approved" | "rejected";
export type ProfessionalType =
  | "nurse"
  | "physiotherapist"
  | "caretaker"
  | "lab_technician"
  | "doctor"
  | "baby_care_specialist";

export const PROFESSIONAL_TYPES: ProfessionalType[] = [
  "nurse",
  "physiotherapist",
  "caretaker",
  "lab_technician",
  "doctor",
  "baby_care_specialist",
];

export interface AdminProfessionalListItem {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  gender: string;
  avatar_url: string | null;
  professional_type: ProfessionalType;
  years_of_experience: number;
  license_number: string | null;
  council_registration_number: string | null;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  verified_at: string | null;
  is_accepting_bookings: boolean;
  user_status: string;
  city: string | null;
  average_rating: number;
  total_ratings: number;
  total_visits_completed: number;
  documents_count: number;
  created_at: string;
}

export interface AdminDocument {
  id: string;
  document_type: string;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  content_type: string | null;
  /** Presigned link, valid ~5 minutes. Refetch the professional for a fresh one; never store it. */
  view_url: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface DocumentReviewInput {
  decision: "approved" | "rejected";
  rejection_reason?: string | null;
}

/** A patient's medical document (prescription, lab report…) attached to a booking. */
export interface MedicalDocument {
  id: string;
  document_type: "prescription" | "lab_report" | "referral" | "other" | string;
  title: string | null;
  booking_id: string | null;
  content_type: string;
  size_bytes: number;
  /** Presigned link, valid ~5 minutes. */
  view_url: string;
  created_at: string;
}

export interface AdminSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface AdminActivity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminProfessionalDetail extends AdminProfessionalListItem {
  bio: string | null;
  languages_spoken: string[] | null;
  service_radius_km: number;
  latitude: number | null;
  longitude: number | null;
  documents: AdminDocument[];
  services: string[];
  availability: AdminSlot[];
  bookings_by_status: Record<string, number>;
  history: AdminActivity[];
}

export interface VerificationStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, Record<string, number>>;
  onboarded_today: number;
  onboarded_7d: number;
  onboarded_30d: number;
  approved_7d: number;
  rejected_7d: number;
  median_hours_to_approve: number | null;
  oldest_pending_at: string | null;
  auto_approve: boolean;
  daily: Array<{ date: string; onboarded: number }>;
}

export interface ReviewDecisionInput {
  decision: "approved" | "rejected" | "in_review";
  rejection_reason?: string | null;
  note?: string | null;
}

// ── Users ───────────────────────────────────────────────────────────────

export interface AdminUserListItem {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  role: string;
  status: "active" | "suspended" | "deleted";
  gender: string;
  created_at: string;
  last_login_at: string | null;
  bookings_count: number;
}

// ── Bookings ────────────────────────────────────────────────────────────

export type BookingStatus =
  | "created"
  | "searching"
  | "assigned"
  | "confirmed"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "failed";

export interface AdminBookingListItem {
  id: string;
  booking_code: string;
  status: BookingStatus;
  service_name: string;
  scheduled_start_at: string;
  total_amount: number;
  patient_name: string;
  patient_phone: string;
  professional_name: string | null;
  city: string | null;
  created_at: string;
}

export interface StatusEvent {
  status: BookingStatus;
  at: string;
  note: string | null;
}

export interface AdminBookingDetail extends AdminBookingListItem {
  address: string;
  patient_id: string;
  professional_id: string | null;
  professional_phone: string | null;
  base_price: number;
  discount_amount: number;
  platform_fee: number;
  tax_amount: number;
  professional_payout_amount: number;
  patient_notes: string | null;
  cancellation_reason: string | null;
  cancellation_fee_amount: number;
  preferred_gender: string | null;
  visit_summary_notes: string | null;
  vitals_recorded: string | null;
  review_rating: number | null;
  timeline: StatusEvent[];
  documents?: MedicalDocument[];
}

// ── Catalogue ───────────────────────────────────────────────────────────

export interface Faq {
  q: string;
  a: string;
}

export interface CategoryAdmin {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface CategoryWriteInput {
  name: string;
  description: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ServiceAdmin {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  required_professional_type: ProfessionalType;
  duration_minutes: number;
  base_price: number;
  is_recurring_eligible: boolean;
  requires_prescription: boolean;
  image_url: string | null;
  tagline: string | null;
  badge: string | null;
  includes: string[];
  excludes: string[];
  faqs: Faq[];
  rating_avg: number | null;
  rating_count: number;
  bookings_count: number;
  display_order: number;
  is_active: boolean;
}

export interface ServiceWriteInput {
  category_id: string;
  name: string;
  description: string | null;
  required_professional_type: ProfessionalType;
  duration_minutes: number;
  base_price: number;
  is_recurring_eligible: boolean;
  requires_prescription: boolean;
  display_order: number;
  is_active: boolean;
  image_url: string | null;
  tagline: string | null;
  badge: string | null;
  includes: string[];
  excludes: string[];
  faqs: Faq[];
}

// ── Config registry ─────────────────────────────────────────────────────

export type ConfigGroup = "experience" | "booking" | "content" | "operations" | "platform";

export interface RegistryEntry {
  key: string;
  label: string;
  group: ConfigGroup;
  description: string;
  public: boolean;
  schema: Record<string, unknown>;
  default: unknown;
  value: unknown;
  is_overridden: boolean;
  updated_at: string | null;
  id: string | null;
}

/** The public app bundle (`GET /configs/app`). Only the keys the portal reads are typed. */
export interface AppBundle {
  version: string;
  configs: {
    "pro.settings"?: { required_documents?: string[] } & Record<string, unknown>;
  } & Record<string, unknown>;
}

// ── Dashboard KPIs ──────────────────────────────────────────────────────

export interface DailyBookings {
  day: string;
  created: number;
  completed: number;
  cancelled: number;
}

export interface BusinessKpis {
  gmv_completed: number;
  platform_revenue: number;
  bookings_today: number;
  active_visits: number;
  fill_rate_pct: number | null;
  cancellation_rate_pct: number | null;
  avg_minutes_to_assign: number | null;
  pending_verifications: number;
  average_rating: number | null;
  daily_bookings: DailyBookings[];
}

// ── Queries ─────────────────────────────────────────────────────────────

export interface QueryResultPage {
  items: Array<Record<string, unknown>>;
  page: number;
  page_size: number;
  has_next: boolean;
}
