"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BookingDrawer } from "@/components/bookings/BookingDrawer";
import { ProfessionalDrawer } from "@/components/professionals/ProfessionalDrawer";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { adminApi, errorMessage } from "@/lib/api";
import { cx, formatDay, formatTime, humanize } from "@/lib/format";
import { describeActivity } from "@/lib/labels";
import type { AdminActivity } from "@/lib/types";

const LIMIT = 50;

const FILTERS = [
  { value: "", label: "Everything" },
  { value: "professional", label: "Verification" },
  { value: "booking", label: "Bookings" },
  { value: "user", label: "Users" },
  { value: "config", label: "Config" },
  { value: "service", label: "Services" },
  { value: "category", label: "Categories" },
];

const ICONS: Record<string, { icon: IconName; tone: string }> = {
  professional: { icon: "shield", tone: "bg-brand-50 text-brand-700" },
  booking: { icon: "calendar", tone: "bg-accent-50 text-accent-700" },
  user: { icon: "users", tone: "bg-warning-50 text-warning-700" },
  config: { icon: "sliders", tone: "bg-slate-100 text-slate-600" },
  service: { icon: "package", tone: "bg-success-50 text-success-700" },
  category: { icon: "grid", tone: "bg-success-50 text-success-700" },
};

export default function ActivityPage() {
  const [type, setType] = useState("");
  const [items, setItems] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [proId, setProId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  async function load(offset: number, entityType: string) {
    setLoading(true);
    setError(null);
    try {
      const page = await adminApi.activity({ entity_type: entityType || undefined, limit: LIMIT, offset });
      setItems((prev) => (offset === 0 ? page : [...prev, ...page]));
      setHasMore(page.length === LIMIT);
    } catch (err) {
      setError(errorMessage(err, "Couldn't load activity."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setItems([]);
    void load(0, type);
  }, [type]);

  // Group by IST day.
  const groups: Array<{ day: string; items: AdminActivity[] }> = [];
  for (const a of items) {
    const day = formatDay(a.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(a);
    else groups.push({ day, items: [a] });
  }

  function subjectAction(a: AdminActivity) {
    if (a.entity_type === "professional") return <Button size="sm" variant="ghost" onClick={() => setProId(a.entity_id)}>View</Button>;
    if (a.entity_type === "booking") return <Button size="sm" variant="ghost" onClick={() => setBookingId(a.entity_id)}>View</Button>;
    if (a.entity_type === "config")
      return (
        <Link href={`/app-config?key=${encodeURIComponent(a.entity_id)}`} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100">
          Open
        </Link>
      );
    return null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Audit"
        title="Activity"
        description="Who did what, newest first — approvals, suspensions, cancellations, config and catalogue changes."
        actions={
          <Button variant="secondary" icon="refresh" onClick={() => void load(0, type)} loading={loading && items.length > 0}>
            Refresh
          </Button>
        }
      />
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs ariaLabel="Activity type" value={type} onChange={setType} items={FILTERS} />
        </div>
        {error && <ErrorState message={error} onRetry={() => void load(0, type)} className="m-4" />}
        {loading && items.length === 0 ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 && !error ? (
          <EmptyState icon="activity" title="No activity yet" description="Actions taken in this console show up here." />
        ) : (
          <div className="p-2 sm:p-4">
            {groups.map((g) => (
              <section key={g.day} className="mb-4 last:mb-0">
                <h2 className="sticky top-16 z-[1] bg-white/90 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 backdrop-blur">{g.day}</h2>
                <ul>
                  {g.items.map((a) => {
                    const meta = a.metadata ?? {};
                    const reason = typeof meta.reason === "string" && meta.reason ? meta.reason : null;
                    const look = ICONS[a.entity_type] ?? { icon: "activity" as IconName, tone: "bg-slate-100 text-slate-600" };
                    return (
                      <li key={a.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                        <span className={cx("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", look.tone)}>
                          <Icon name={look.icon} size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-800">
                            <span className="font-medium">{describeActivity(a)}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatTime(a.created_at)} · {humanize(a.entity_type)}
                            {a.entity_type === "config" && <> · <code>{a.entity_id}</code></>}
                          </p>
                          {reason && <p className="mt-1 text-[13px] text-slate-600">“{reason}”</p>}
                        </div>
                        {subjectAction(a)}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {hasMore && (
              <div className="flex justify-center p-3">
                <Button variant="secondary" loading={loading} onClick={() => void load(items.length, type)}>
                  Load older activity
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
      <ProfessionalDrawer professionalId={proId} onClose={() => setProId(null)} />
      <BookingDrawer bookingId={bookingId} onClose={() => setBookingId(null)} />
    </>
  );
}
