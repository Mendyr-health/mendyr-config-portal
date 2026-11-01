import { humanize } from "./format";
import type { AdminActivity } from "./types";

export const PROFESSION_LABELS: Record<string, string> = {
  nurse: "Nurse",
  physiotherapist: "Physiotherapist",
  caretaker: "Caretaker",
  lab_technician: "Lab technician",
  doctor: "Doctor",
  baby_care_specialist: "Baby care specialist",
};

export function professionLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return PROFESSION_LABELS[type] ?? humanize(type);
}

export const DOCUMENT_LABELS: Record<string, string> = {
  government_id: "Government ID",
  nursing_council_certificate: "Nursing council certificate",
  degree_certificate: "Degree certificate",
  police_verification: "Police verification",
  profile_photo: "Profile photo",
  address_proof: "Address proof",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_LABELS);

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: "Pending",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  created: "Created",
  searching: "Searching",
  assigned: "Assigned",
  confirmed: "Confirmed",
  en_route: "On the way",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed visit",
  failed: "No pro available",
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  created: "#94A3B8",
  searching: "#F59E0B",
  assigned: "#1262E2",
  confirmed: "#3A82E8",
  en_route: "#0EA5A4",
  in_progress: "#0D9488",
  completed: "#16A34A",
  cancelled: "#CBD5E1",
  no_show: "#F87171",
  failed: "#EF4444",
};

export const VERIFICATION_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  in_review: "#1262E2",
  approved: "#16A34A",
  rejected: "#EF4444",
};

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "09:00:00" → "9:00 AM". */
export function formatClock(t: string): string {
  const [hh, mm] = t.split(":");
  const h = Number(hh);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm ?? "00"} ${suffix}`;
}

export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?.*)?$/i.test(url) || url.startsWith("data:image/");
}

/** One readable sentence per audit entry: "Kartik approved a nurse" etc. The activity API
 * carries the actor's name but not the subject's, so the subject is described generically
 * unless the caller knows it. */
export function describeActivity(a: AdminActivity, subjectName?: string): string {
  const who = a.actor_name ?? "System";
  const meta = a.metadata ?? {};
  const subject = subjectName ?? null;
  switch (a.action) {
    case "professional.approved":
      return `${who} approved ${subject ?? "a professional"}`;
    case "professional.rejected":
      return `${who} rejected ${subject ?? "a professional"}`;
    case "professional.in_review":
      return `${who} marked ${subject ?? "a professional"} as in review`;
    case "user.suspended":
      return `${who} suspended ${subject ?? "a user"}`;
    case "user.active":
      return `${who} reactivated ${subject ?? "a user"}`;
    case "booking.cancel":
      return `${who} cancelled ${subject ?? "a booking"}`;
    case "booking.reopen":
      return `${who} reopened ${subject ?? "a booking"} for reassignment`;
    case "config.update":
      return `${who} updated ${subject ?? `the ${a.entity_id} config`}`;
    case "config.delete":
      return `${who} reset ${subject ?? `the ${a.entity_id} config`} to default`;
    case "config.create":
      return `${who} created ${subject ?? `the ${a.entity_id} config`}`;
    case "config.toggle":
      return `${who} toggled ${subject ?? `the ${a.entity_id} config`}`;
    case "catalog.category.save":
      return `${who} saved the ${typeof meta.name === "string" ? `“${meta.name}”` : ""} category`.replace("  ", " ");
    case "catalog.service.save":
      return `${who} saved the ${typeof meta.name === "string" ? `“${meta.name}”` : ""} service`.replace("  ", " ");
    default:
      return `${who} · ${humanize(a.action)}`;
  }
}
