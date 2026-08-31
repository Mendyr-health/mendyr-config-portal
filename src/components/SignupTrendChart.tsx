import type { DailySignups } from "@/lib/types";

/** Hand-rolled SVG line chart — no charting library, matching this app's "kept dependency-
 * light on purpose" philosophy (see README). A viewBox-scaled SVG scales via CSS without any
 * resize-observer JS, which is all two trend lines over a couple of weeks need. */
export function SignupTrendChart({ data }: { data: DailySignups[] }) {
  const width = 600;
  const height = 200;
  const padding = 24;

  const max = Math.max(1, ...data.flatMap((d) => [d.patients, d.professionals]));
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  function pointsFor(key: "patients" | "professionals"): string {
    return data
      .map((d, i) => {
        const x = padding + i * stepX;
        const y = height - padding - (d[key] / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full" role="img">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#E2E8F0"
          strokeWidth={1}
        />
        <polyline points={pointsFor("patients")} fill="none" stroke="#1262E2" strokeWidth={2} />
        <polyline
          points={pointsFor("professionals")}
          fill="none"
          stroke="#16A34A"
          strokeWidth={2}
        />
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text
              key={d.signup_date}
              x={padding + i * stepX}
              y={height + 14}
              fontSize={10}
              fill="#64748B"
              textAnchor="middle"
            >
              {new Date(d.signup_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </text>
          ) : null
        )}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-600" /> Patients
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-success" /> Professionals
        </span>
      </div>
    </div>
  );
}
