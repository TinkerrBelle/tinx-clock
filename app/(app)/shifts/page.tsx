"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/Shell";
import ShiftForm, { Job, Values } from "@/components/ShiftForm";
import Empty from "@/components/Empty";
import Icon from "@/components/Icon";
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
  const user = useUser();
  const [mode, setMode] = useState<Mode>("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

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

  async function openAdd() {
    const { data } = await supabase.from("jobs").select("id,name,pay_rates(id,name,hourly_rate,is_default)").order("name");
    setJobs((data as any) ?? []);
    setEditing(null);
    setAdding(true);
  }

  async function addShift(v: Values) {
    const { error } = await supabase.from("shifts").insert({
      user_id: user.id, job_id: v.job_id, rate_name: v.rate_name ?? "Custom",
      hourly_rate: v.hourly_rate, start_time: v.start_time, end_time: v.end_time,
    });
    if (error) return error.message;
    setAdding(false);
    load();
  }

  async function saveEdit(id: string, v: Values) {
    const { error } = await supabase.from("shifts").update({ start_time: v.start_time, end_time: v.end_time, hourly_rate: v.hourly_rate }).eq("id", id);
    if (error) return error.message;
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
      <div className="row between">
        <h1>Shifts</h1>
        {!adding && <button className="btn small" onClick={openAdd}><Icon name="plus" size={18} /> Add shift</button>}
      </div>

      {adding && (
        <div className="card">
          <strong>Add a missed shift</strong>
          {jobs.length ? (
            <ShiftForm jobs={jobs} onSave={addShift} onCancel={() => setAdding(false)} />
          ) : (
            <Empty icon="briefcase" title="Add a job first" text="You need at least one job before you can add a shift." />
          )}
        </div>
      )}

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

      {!shifts.length && (
        <Empty icon="calendar" title="No shifts in this period" text="Finished shifts show up here. Forgot to clock in? Use Add shift." />
      )}
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
              <ShiftForm initial={s} onSave={(v) => saveEdit(s.id, v)} onCancel={() => setEditing(null)} />
            ) : (
              <div className="row between">
                <span className="small">{s.rate_name}: {gbp(s.hourly_rate)}/hr</span>
                <span className="row">
                  <button className="link" onClick={() => { setAdding(false); setEditing(s.id); }}>Edit</button>
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
