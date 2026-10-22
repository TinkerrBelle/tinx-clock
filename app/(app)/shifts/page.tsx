"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { gbp, hoursBetween, fmtDur } from "@/lib/util";

type Shift = { id: string; rate_name: string; hourly_rate: number; start_time: string; end_time: string; jobs: { name: string } | null };
type Mode = "week" | "lastweek" | "month" | "custom" | "all";

const mondayOf = (d: Date) => {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

function getRange(mode: Mode, from: string, to: string): [Date | null, Date | null] {
  const now = new Date();
  if (mode === "week") { const s = mondayOf(now); const e = new Date(s); e.setDate(e.getDate() + 7); return [s, e]; }
  if (mode === "lastweek") { const e = mondayOf(now); const s = new Date(e); s.setDate(s.getDate() - 7); return [s, e]; }
  if (mode === "month") return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)];
  if (mode === "custom") {
    const s = from ? new Date(from + "T00:00:00") : null;
    const e = to ? new Date(to + "T00:00:00") : null;
    if (e) e.setDate(e.getDate() + 1);
    return [s, e];
  }
  return [null, null];
}

const modes: [Mode, string][] = [["week", "This week"], ["lastweek", "Last week"], ["month", "This month"], ["custom", "Custom"], ["all", "All"]];

export default function Shifts() {
  const [mode, setMode] = useState<Mode>("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [rate, setRate] = useState("");

  const load = useCallback(async () => {
    const [a, b] = getRange(mode, from, to);
    let q = supabase.from("shifts").select("*, jobs(name)").not("end_time", "is", null).order("start_time", { ascending: false });
    if (a) q = q.gte("start_time", a.toISOString());
    if (b) q = q.lt("start_time", b.toISOString());
    const { data } = await q;
    setShifts((data as any) ?? []);
  }, [mode, from, to]);
  useEffect(() => { load(); }, [load]);

  const hours = shifts.reduce((t, s) => t + hoursBetween(s.start_time, s.end_time), 0);
  const total = shifts.reduce((t, s) => t + hoursBetween(s.start_time, s.end_time) * Number(s.hourly_rate), 0);

  async function saveRate(id: string) {
    const n = Number(rate);
    if (!isNaN(n) && rate !== "") await supabase.from("shifts").update({ hourly_rate: n }).eq("id", id);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this shift?")) return;
    await supabase.from("shifts").delete().eq("id", id);
    load();
  }

  const day = (s: string) => new Date(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = (s: string) => new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="stack">
      <h1>Shifts</h1>
      <div className="chips">
        {modes.map(([m, label]) => (
          <button key={m} className={mode === m ? "chip on" : "chip"} onClick={() => setMode(m)}>{label}</button>
        ))}
      </div>
      {mode === "custom" && (
        <div className="row">
          <label className="field grow">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field grow">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      )}

      <div className="totals">
        <div><span className="muted small">Hours worked</span><strong>{fmtDur(hours)}</strong></div>
        <div><span className="muted small">Total earned</span><strong>{gbp(total)}</strong></div>
      </div>

      {!shifts.length && <p className="empty">No finished shifts in this period.</p>}
      {shifts.map((s) => {
        const h = hoursBetween(s.start_time, s.end_time);
        return (
          <div className="card" key={s.id}>
            <div className="row between">
              <strong>{s.jobs?.name}</strong>
              <strong>{gbp(h * Number(s.hourly_rate))}</strong>
            </div>
            <p className="muted small">{day(s.start_time)} · {time(s.start_time)} to {time(s.end_time)} · {fmtDur(h)}</p>
            {editing === s.id ? (
              <div className="row">
                <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} autoFocus />
                <button className="btn small" onClick={() => saveRate(s.id)}>Save</button>
                <button className="link" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            ) : (
              <div className="row between">
                <span className="small">{s.rate_name}: {gbp(s.hourly_rate)}/hr</span>
                <span className="row">
                  <button className="link" onClick={() => { setEditing(s.id); setRate(String(s.hourly_rate)); }}>Edit wage</button>
                  <button className="link danger" onClick={() => remove(s.id)}>Delete</button>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
