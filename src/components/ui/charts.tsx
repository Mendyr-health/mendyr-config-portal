"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { cx, formatNumber } from "@/lib/format";

/** Hand-rolled SVG charts — no chart library (the portal is dependency-light on purpose).
 * Everything is drawn in a fixed viewBox and scaled with CSS; tooltips are HTML overlays
 * positioned in percentages so they stay crisp at any size. */

export interface Series {
  key: string;
  label: string;
  color: string;
}

export type Datum = { label: string } & Record<string, number | string>;

function niceMax(max: number): number {
  if (max <= 0) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const out = nice * exp;
  return out < 4 && Number.isInteger(max) ? 4 : out;
}

const W = 640;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

interface ChartShellProps {
  data: Datum[];
  series: Series[];
  height?: number;
  formatValue?: (v: number) => string;
  ariaLabel: string;
  stacked?: boolean;
  children: (ctx: {
    x: (i: number) => number;
    y: (v: number) => number;
    band: number;
    innerH: number;
    max: number;
  }) => ReactNode;
}

function ChartShell({ data, series, height = 220, formatValue = formatNumber, ariaLabel, stacked, children }: ChartShellProps) {
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const rawMax = Math.max(
    0,
    ...data.map((d) =>
      stacked
        ? series.reduce((s, se) => s + (Number(d[se.key]) || 0), 0)
        : Math.max(...series.map((se) => Number(d[se.key]) || 0))
    )
  );
  const max = niceMax(rawMax);
  const band = data.length ? innerW / data.length : innerW;
  const x = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  function onKey(e: KeyboardEvent) {
    if (!data.length) return;
    if (e.key === "ArrowRight") setHover((h) => Math.min(data.length - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? data.length) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  }

  const hovered = hover !== null ? data[hover] : null;
  const leftPct = hover !== null ? (x(hover) / W) * 100 : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10.5} fill="#94A3B8">
              {formatValue(Math.round(t * 100) / 100)}
            </text>
          </g>
        ))}
        {hover !== null && (
          <rect x={PAD.left + band * hover} y={PAD.top} width={band} height={innerH} fill="#1262E2" opacity={0.05} />
        )}
        {children({ x, y, band, innerH, max })}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10.5} fill="#64748B">
              {d.label}
            </text>
          ) : null
        )}
        {data.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={PAD.left + band * i}
            y={PAD.top}
            width={band}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-[140px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lift backdrop-blur"
          style={{ left: `${Math.min(88, Math.max(12, leftPct))}%` }}
          role="status"
        >
          <p className="mb-1 font-semibold text-slate-800">{hovered.label}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{formatValue(Number(hovered[s.key]) || 0)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500", className)}>
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function LineChart({
  data,
  series,
  height,
  formatValue,
  ariaLabel,
  area = true,
}: {
  data: Datum[];
  series: Series[];
  height?: number;
  formatValue?: (v: number) => string;
  ariaLabel: string;
  area?: boolean;
}) {
  const gid = useId().replace(/:/g, "");
  return (
    <ChartShell data={data} series={series} height={height} formatValue={formatValue} ariaLabel={ariaLabel}>
      {({ x, y }) => (
        <>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {series.map((s) => {
            const pts = data.map((d, i) => [x(i), y(Number(d[s.key]) || 0)] as const);
            if (!pts.length) return null;
            const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
            const base = y(0);
            return (
              <g key={s.key}>
                {area && (
                  <path
                    d={`${line} L${pts[pts.length - 1]![0]},${base} L${pts[0]![0]},${base} Z`}
                    fill={`url(#${gid}-${s.key})`}
                  />
                )}
                <path d={line} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
                {pts.length <= 31 &&
                  pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={2.5} fill="#fff" stroke={s.color} strokeWidth={1.5} />)}
              </g>
            );
          })}
        </>
      )}
    </ChartShell>
  );
}

export function BarChart({
  data,
  series,
  height,
  formatValue,
  ariaLabel,
  stacked = false,
}: {
  data: Datum[];
  series: Series[];
  height?: number;
  formatValue?: (v: number) => string;
  ariaLabel: string;
  stacked?: boolean;
}) {
  return (
    <ChartShell data={data} series={series} height={height} formatValue={formatValue} ariaLabel={ariaLabel} stacked={stacked}>
      {({ x, y, band }) => {
        const groupW = Math.min(band * 0.7, stacked ? 22 : 12 * series.length + 6);
        return data.map((d, i) => {
          if (stacked) {
            let acc = 0;
            return (
              <g key={i}>
                {series.map((s, si) => {
                  const v = Number(d[s.key]) || 0;
                  const top = y(acc + v);
                  const h = y(acc) - top;
                  acc += v;
                  return v > 0 ? (
                    <rect
                      key={s.key}
                      x={x(i) - groupW / 2}
                      y={top}
                      width={groupW}
                      height={Math.max(0, h)}
                      rx={si === series.length - 1 ? 3 : 0}
                      fill={s.color}
                    />
                  ) : null;
                })}
              </g>
            );
          }
          const barW = groupW / series.length;
          return (
            <g key={i}>
              {series.map((s, si) => {
                const v = Number(d[s.key]) || 0;
                return (
                  <rect
                    key={s.key}
                    x={x(i) - groupW / 2 + barW * si + 1}
                    y={y(v)}
                    width={Math.max(1, barW - 2)}
                    height={Math.max(0, y(0) - y(v))}
                    rx={2.5}
                    fill={s.color}
                  />
                );
              })}
            </g>
          );
        });
      }}
    </ChartShell>
  );
}

/** Tiny inline trend line for stat cards. */
export function Sparkline({
  values,
  color = "#1262E2",
  width = 120,
  height = 32,
  ariaLabel,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  ariaLabel?: string;
}) {
  const gid = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)] as const);
  const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="block overflow-visible"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r={2.5} fill={color} />
    </svg>
  );
}

/** Horizontal bars for category breakdowns (status, location, profession). */
export function BreakdownBars({
  rows,
  formatValue = formatNumber,
  empty = "No data yet.",
}: {
  rows: Array<{ key: string; label: ReactNode; value: number; color?: string }>;
  formatValue?: (v: number) => string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!rows.length || total === 0) return <p className="py-4 text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-slate-600">{r.label}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              <span className="font-semibold text-slate-900">{formatValue(r.value)}</span>
              <span className="ml-1.5 text-xs">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "#1262E2" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Small ring for a single percentage (fill rate etc.). */
export function Donut({ pct, color = "#1262E2", size = 44 }: { pct: number | null; color?: string; size?: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#E2E8F0" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(v / 100) * c} ${c}`}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

export const CHART_COLORS = {
  primary: "#1262E2",
  accent: "#0EA5A4",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
  slate: "#94A3B8",
  violet: "#7C3AED",
  sky: "#63B0F2",
};
