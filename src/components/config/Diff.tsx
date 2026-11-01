import { cx } from "@/lib/format";

export interface DiffRow {
  path: string;
  before: unknown;
  after: unknown;
  kind: "added" | "removed" | "changed";
}

function flatten(value: unknown, prefix: string, out: Map<string, unknown>) {
  if (Array.isArray(value)) {
    if (value.length === 0) out.set(prefix || "(root)", []);
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) out.set(prefix || "(root)", {});
    for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix || "(root)", value);
  }
}

/** Leaf-level differences between two JSON values, as dotted paths. */
export function diffValues(before: unknown, after: unknown): DiffRow[] {
  const a = new Map<string, unknown>();
  const b = new Map<string, unknown>();
  flatten(before, "", a);
  flatten(after, "", b);
  const rows: DiffRow[] = [];
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    const hasA = a.has(k);
    const hasB = b.has(k);
    const va = a.get(k);
    const vb = b.get(k);
    if (hasA && hasB) {
      if (JSON.stringify(va) !== JSON.stringify(vb)) rows.push({ path: k, before: va, after: vb, kind: "changed" });
    } else if (hasB) rows.push({ path: k, before: undefined, after: vb, kind: "added" });
    else rows.push({ path: k, before: va, after: undefined, kind: "removed" });
  }
  return rows;
}

function show(v: unknown): string {
  if (v === undefined) return "";
  if (v === null) return "null";
  if (typeof v === "string") return `“${v}”`;
  return JSON.stringify(v);
}

export function DiffView({ before, after, emptyText = "No changes." }: { before: unknown; after: unknown; emptyText?: string }) {
  const rows = diffValues(before, after);
  if (!rows.length) return <p className="py-3 text-sm text-slate-500">{emptyText}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Field</th>
            <th scope="col" className="px-3 py-2 font-semibold">Before</th>
            <th scope="col" className="px-3 py-2 font-semibold">After</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t border-slate-100 align-top">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">{r.path}</td>
              <td className={cx("break-all px-3 py-2 font-mono text-xs", r.kind !== "added" && "bg-danger-50/60 text-danger-700 line-through decoration-danger-600/40")}>
                {show(r.before)}
              </td>
              <td className={cx("break-all px-3 py-2 font-mono text-xs", r.kind !== "removed" && "bg-success-50/70 text-success-700")}>
                {show(r.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
