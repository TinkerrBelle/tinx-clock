"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Empty from "@/components/Empty";
import Icon from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/Shell";
import { gbp, hoursBetween, fmtClock, fmtDur, getPosition, mondayOf, netHours } from "@/lib/util";

type Rate = { id: string; name: string; hourly_rate: number; is_default: boolean };
type Job = { id: string; name: string; break_enabled: boolean; break_minutes: number; pay_rates: Rate[] };
type Week = { id: string; job_id: string; start_time: string; end_time: string; break_minutes: number };
type Shift = { id: string; hourly_rate: number; rate_name: string; start_time: string; jobs: { name: string } | null };

export default function Clock() {
  const user = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [active, setActive] = useState<Shift | null>(null);
  const [jobId, setJobId] = useState("");
  const [rateId, setRateId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [week, setWeek] = useState<Week[]>([]);

  const load = useCallback(async () => {
    const [j, s, w] = await Promise.all([
      supabase.from("jobs").select("id,name,break_enabled,break_minutes,pay_rates(id,name,hourly_rate,is_default)").eq("is_active", true).order("name"),
      supabase.from("shifts").select("*, jobs(name)").is("end_time", null).maybeSingle(),
      supabase.from("shifts").select("id,job_id,start_time,end_time,break_minutes").not("end_time", "is", null).gte("start_time", mondayOf(new Date()).toISOString()),
    ]);
    setWeek((w.data as any) ?? []);
    setJobs((j.data as any) ?? []);
    setActive((s.data as any) ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  function pickJob(id: string) {
    setJobId(id);
    const rates = jobs.find((j) => j.id === id)?.pay_rates ?? [];
    setRateId((rates.find((r) => r.is_default) ?? rates[0])?.id ?? "");
  }

  async function start() {
    const job = jobs.find((j) => j.id === jobId);
    const rate = job?.pay_rates.find((r) => r.id === rateId);
    if (!job || !rate) return;
    setBusy(true);
    const pos = await getPosition();
    const { error } = await supabase.from("shifts").insert({
      user_id: user.id, job_id: jobId, rate_name: rate.name, hourly_rate: rate.hourly_rate,
      break_minutes: job.break_enabled ? job.break_minutes : 0,
      start_time: new Date().toISOString(),
      start_lat: pos?.coords.latitude ?? null, start_lng: pos?.coords.longitude ?? null,
    });
    setBusy(false);
    if (error) alert(error.message); else { setOpen(false); load(); }
  }

  async function stop() {
    if (!active) return;
    setBusy(true);
    const pos = await getPosition();
    const { error } = await supabase.from("shifts").update({
      end_time: new Date().toISOString(),
      end_lat: pos?.coords.latitude ?? null, end_lng: pos?.coords.longitude ?? null,
    }).eq("id", active.id);
    setBusy(false);
    if (error) alert(error.message); else { setActive(null); load(); }
  }

  async function changeRate(v: string) {
    const n = Number(v);
    if (!active || isNaN(n) || n === Number(active.hourly_rate)) return;
    await supabase.from("shifts").update({ hourly_rate: n }).eq("id", active.id);
    setActive({ ...active, hourly_rate: n });
  }

  if (!loaded) return <p className="empty">Loading…</p>;

  if (active) {
    const hrs = hoursBetween(active.start_time);
    return (
      <section className="stack">
        <p className="muted">{active.jobs?.name} · {active.rate_name}</p>
        <div className="timer">{fmtClock(now - new Date(active.start_time).getTime())}</div>
        <p className="earned">{gbp(hrs * Number(active.hourly_rate))} so far</p>
        <label className="field">Hourly rate for this shift (£)
          <input type="number" step="0.01" min="0" defaultValue={active.hourly_rate} onBlur={(e) => changeRate(e.target.value)} />
        </label>
        <button className="btn stop" onClick={stop} disabled={busy}>{busy ? "Stopping…" : "Stop shift"}</button>
      </section>
    );
  }

  if (!jobs.length)
    return (
      <Empty icon="briefcase" title="No jobs yet" text="Add a job and its pay rates, then you can start tracking shifts.">
        <Link href="/jobs" className="btn small">Add your first job</Link>
      </Empty>
    );

  const selected = jobs.find((j) => j.id === jobId);
  const rates = selected?.pay_rates ?? [];
  const calc = netHours(week);
  const sum = (filter: (s: Week) => boolean) => week.filter(filter).reduce((t, s) => t + (calc.get(s.id)?.net ?? 0), 0);
  return (
    <section className="power-wrap">
      <button className={open ? "power small" : "power"} onClick={() => setOpen(!open)} aria-label={open ? "Close" : "Start a shift"} aria-expanded={open}>
        <Icon name="power" size={open ? 40 : 68} />
      </button>
      {!open && (
        <>
          <h1>Ready to clock in?</h1>
          <p className="muted">Tap the button to start a shift</p>
        </>
      )}
      {open && (
        <div className="card stack form-in">
          <strong>Start a shift</strong>
          <label className="field">Job
            <select value={jobId} onChange={(e) => pickJob(e.target.value)}>
              <option value="">Choose a job</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </label>
          {selected && (
            <div className="week">
              <span className="muted small">This week at {selected.name}</span>
              <strong>{fmtDur(sum((s) => s.job_id === selected.id))}</strong>
              {jobs.length > 1 && <span className="muted small">All jobs: {fmtDur(sum(() => true))}</span>}
            </div>
          )}
          {jobId && (
            <label className="field">Pay rate
              <select value={rateId} onChange={(e) => setRateId(e.target.value)}>
                {rates.map((r) => <option key={r.id} value={r.id}>{r.name} · {gbp(r.hourly_rate)}/hr</option>)}
              </select>
            </label>
          )}
          <button className="btn go" onClick={start} disabled={busy || !rateId}>{busy ? "Starting…" : "Start shift"}</button>
          <p className="muted small">Your location is saved when you start and stop, if you allow it.</p>
        </div>
      )}
    </section>
  );
}
