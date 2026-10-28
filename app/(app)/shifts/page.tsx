"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/Shell";
import ShiftForm, { Job, Values } from "@/components/ShiftForm";
import Empty from "@/components/Empty";
import Icon from "@/components/Icon";
import { gbp, fmtDur, mondayOf, netHours } from "@/lib/util";

type Shift = { id: string; job_id: string; rate_name: string; hourly_rate: number; break_minutes: number; start_time: string; end_time: string; jobs: { name: string } | null };
type Mode = "week" | "lastweek" | "month" | "custom" | "all";

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
  const [jobFilter, setJobFilter] = useState("");
  const [allJobs, setAllJobs] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    supabase.from("jobs").select("id,name,is_active").order("name").then(({ data }) => setAllJobs((data as any) ?? []));
  }, []);

  const load = useCallback(async () => {
    const [a, b] = getRange(mode, from, to);
    let q = supabase.from("shifts").select("*, jobs(name)").not("end_time", "is", null).order("start_time", { ascending: false });
    if (a) q = q.gte("start_time", a.toISOString());
    if (b) q = q.lt("start_time", b.toISOString());
    if (jobFilter) q = q.eq("job_id", jobFilter);
    const { data } = await q;
    setShifts((data as any) ?? []);
  }, [mode, from, to, jobFilter]);
  useEffect(() => { load(); }, [load]);

  const calc = netHours(shifts);
  const hours = shifts.reduce((t, s) => t + (calc.get(s.id)?.net ?? 0), 0);
  const total = shifts.reduce((t, s) => t + (calc.get(s.id)?.net ?? 0) * Number(s.hourly_rate), 0);

  async function openAdd() {
    const { data } = await supabase.from("jobs").select("id,name,break_enabled,break_minutes,pay_rates(id,name,hourly_rate,is_default)").eq("is_active", true).order("name");
    setJobs((data as any) ?? []);
    setEditing(null);
    setAdding(true);
  }

  async function addShift(v: Values) {
    const { error } = await supabase.from("shifts").insert({
      user_id: user.id, job_id: v.job_id, rate_name: v.rate_name ?? "Custom",
      hourly_rate: v.hourly_rate, break_minutes: v.break_minutes, start_time: v.start_time, end_time: v.end_time,
    });
    if (error) return error.message;
    setAdding(false);
    load();
  }

  async function saveEdit(id: string, v: Values) {
    const { error } = await supabase.from("shifts").update({
      start_time: v.start_time, end_time: v.end_time, hourly_rate: v.hourly_rate, break_minutes: v.break_minutes,
    }).eq("id", id);
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
            <Empty icon="briefcase" title="No active jobs" text="Add or reactivate a job before adding a shift." />
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
      {allJobs.length > 1 && (
        <label className="field">Job
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
            <option value="">All jobs</option>
            {allJobs.map((j) => <option key={j.id} value={j.id}>{j.name}{j.is_active ? "" : " (inactive)"}</option>)}
          </select>
        </label>
      )}

      <div className="totals">
        <div><span className="muted small">Hours worked</span><strong>{fmtDur(hours)}</strong></div>
        <div><span className="muted small">Total earned</span><strong>{gbp(total)}</strong></div>
      </div>

      {!shifts.length && (
        <Empty icon="calendar" title="No shifts found" text="Finished shifts show up here. Forgot to clock in? Use Add shift." />
      )}
      {shifts.map((s) => {
        const c = calc.get(s.id) ?? { gross: 0, ded: 0, net: 0 };
        return (
          <div className="card" key={s.id}>
            <div className="row between">
              <strong>{s.jobs?.name}</strong>
              <strong >{gbp(c.net * Number(s.hourly_rate))}</strong>
            </div>
            <div className="meta">
              <span className="date">{day(s.start_time)}</span>
              <span className="times">{time(s.start_time)} – {time(s.end_time)}</span>
              <span className="pill">{fmtDur(c.net)}</span>
              {c.ded > 0 && <span className="brk">−{Math.round(c.ded * 60)}m break</span>}
            </div>
            {editing === s.id ? (
              <ShiftForm initial={s} onSave={(v) => saveEdit(s.id, v)} onCancel={() => setEditing(null)} />
            ) : (
              <div className="row between">
                <span className="small muted">{s.rate_name}: {gbp(s.hourly_rate)}/hr</span>
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
