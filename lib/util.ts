export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);

export const hoursBetween = (start: string, end?: string | null) =>
  ((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 3600000;

export const fmtDur = (h: number) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

export const getPosition = () =>
  new Promise<GeolocationPosition | null>((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 8000 });
  });

export const mondayOf = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

export type ShiftLike = { id: string; job_id: string; start_time: string; end_time: string; break_minutes?: number | null };

/** Break is taken off once per job per day (by start date), spread across that day's shifts in time order. */
export function netHours(shifts: ShiftLike[]) {
  const groups = new Map<string, ShiftLike[]>();
  for (const s of shifts) {
    const k = s.job_id + "|" + new Date(s.start_time).toDateString();
    const list = groups.get(k) ?? [];
    list.push(s);
    groups.set(k, list);
  }
  const out = new Map<string, { gross: number; ded: number; net: number }>();
  groups.forEach((list) => {
    list.sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
    let left = Math.max(0, ...list.map((s) => s.break_minutes || 0)) / 60;
    for (const s of list) {
      const gross = hoursBetween(s.start_time, s.end_time);
      const ded = Math.min(left, gross);
      left -= ded;
      out.set(s.id, { gross, ded, net: gross - ded });
    }
  });
  return out;
}
