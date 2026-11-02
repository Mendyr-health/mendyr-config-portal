/** Formatting helpers — India-first: en-IN grouping for money, IST for dates and times. */

const IST = "Asia/Kolkata";

const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inr2 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("en-IN");

/** ₹1,18,000 — no decimals unless the amount has paise. */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return Number.isInteger(Math.round(amount * 100) / 100) ? inr0.format(amount) : inr2.format(amount);
}

/** Compact rupees for KPI tiles: ₹4.2L, ₹1.3Cr. */
export function formatINRCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  return formatINR(amount);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return num.format(n);
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits).replace(/\.0+$/, "")}%`;
}

function istDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "Today" / "Tomorrow" / "Yesterday" / "Tue, 4 Nov" in IST. */
export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = toDate(value);
  const key = istDayKey(d);
  const now = new Date();
  const today = istDayKey(now);
  const tomorrow = istDayKey(new Date(now.getTime() + 86400000));
  const yesterday = istDayKey(new Date(now.getTime() - 86400000));
  if (key === today) return "Today";
  if (key === tomorrow) return "Tomorrow";
  if (key === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return toDate(value)
    .toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase();
}

/** "Tue, 4 Nov · 10:30 AM" (IST). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return `${formatDay(value)} · ${formatTime(value)}`;
}

/** Short date for chart axes: "4 Nov". Accepts a plain YYYY-MM-DD (treated as a calendar day). */
export function formatShortDate(value: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "3 min ago", "5 h ago", "2 d ago"; falls back to a date after a week. */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = toDate(value);
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const wrap = (s: string) => (future ? `in ${s}` : `${s} ago`);
  if (abs < 60_000) return future ? "in a moment" : "just now";
  if (abs < 3_600_000) return wrap(`${Math.round(abs / 60_000)} min`);
  if (abs < 86_400_000) return wrap(`${Math.round(abs / 3_600_000)} h`);
  if (abs < 7 * 86_400_000) return wrap(`${Math.round(abs / 86_400_000)} d`);
  return formatDay(d);
}

/** Waiting time as "3 d 4 h" / "5 h" / "12 min". */
export function formatDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return h ? `${d} d ${h} h` : `${d} d`;
}

export function hoursSince(value: string | null | undefined): number | null {
  if (!value) return null;
  return (Date.now() - new Date(value).getTime()) / 3_600_000;
}

/** "nursing_council_certificate" → "Nursing council certificate". */
/** 1536 → "1.5 KB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const s = value.replace(/[._]/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "+91 98765 43210" for a 10-digit Indian mobile; anything else unchanged. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (local.length === 10) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  return phone;
}

/** 7 → "7:00 AM", 21 → "9:00 PM", 24 → "12:00 AM (midnight)". */
export function formatHour(hour: number): string {
  if (hour === 24 || hour === 0) return hour === 24 ? "Midnight" : "12:00 AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${hour < 12 ? "AM" : "PM"}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** YYYY-MM-DD of a date in IST — for date inputs. */
export function toDateInput(d: Date): string {
  return istDayKey(d);
}
