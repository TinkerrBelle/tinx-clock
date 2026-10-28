"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/Shell";
import Empty from "@/components/Empty";
import JobForm, { JobValues } from "@/components/JobForm";
import { gbp } from "@/lib/util";

type Job = {
  id: string; name: string; address: string | null; is_active: boolean; break_enabled: boolean; break_minutes: number;
  pay_rates: { id: string; name: string; hourly_rate: number; is_default: boolean }[];
};

export default function Jobs() {
  const user = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mode, setMode] = useState<null | "new" | string>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select("id,name,address,is_active,break_enabled,break_minutes,pay_rates(id,name,hourly_rate,is_default)")
      .order("created_at", { ascending: false });
    setJobs((data as any) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(v: JobValues) {
    const { data: job, error } = await supabase.from("jobs").insert({
      user_id: user.id, name: v.name, address: v.address, break_enabled: v.break_enabled, break_minutes: v.break_minutes,
    }).select().single();
    if (error) return error.message;
    const { error: e2 } = await supabase.from("pay_rates").insert(
      v.rates.map((r) => ({ user_id: user.id, job_id: job.id, name: r.name, hourly_rate: r.hourly_rate, is_default: r.is_default }))
    );
    if (e2) return e2.message;
    setMode(null);
    load();
  }

  async function update(id: string, v: JobValues) {
    const old = jobs.find((j) => j.id === id)!;
    const { error } = await supabase.from("jobs").update({
      name: v.name, address: v.address, break_enabled: v.break_enabled, break_minutes: v.break_minutes,
    }).eq("id", id);
    if (error) return error.message;
    const keep = v.rates.filter((r) => r.id).map((r) => r.id!);
    const gone = old.pay_rates.filter((r) => !keep.includes(r.id)).map((r) => r.id);
    if (gone.length) await supabase.from("pay_rates").delete().in("id", gone);
    for (const r of v.rates.filter((r) => r.id)) {
      await supabase.from("pay_rates").update({ name: r.name, hourly_rate: r.hourly_rate, is_default: r.is_default }).eq("id", r.id!);
    }
    const fresh = v.rates.filter((r) => !r.id);
    if (fresh.length) {
      await supabase.from("pay_rates").insert(fresh.map((r) => ({ user_id: user.id, job_id: id, name: r.name, hourly_rate: r.hourly_rate, is_default: r.is_default })));
    }
    setMode(null);
    load();
  }

  async function toggleActive(j: Job) {
    await supabase.from("jobs").update({ is_active: !j.is_active }).eq("id", j.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this job and all its shifts? To keep your history, deactivate it instead.")) return;
    await supabase.from("jobs").delete().eq("id", id);
    load();
  }

  const card = (j: Job) =>
    mode === j.id ? (
      <JobForm key={j.id} initial={j} onSave={(v) => update(j.id, v)} onCancel={() => setMode(null)} />
    ) : (
      <div className={j.is_active ? "card" : "card dim"} key={j.id}>
        <div className="row between">
          <strong>{j.name}</strong>
          {!j.is_active && <span className="pill">Inactive</span>}
        </div>
        {j.address && <p className="muted small">{j.address}</p>}
        <ul className="plain">
          {j.pay_rates.map((r) => (
            <li key={r.id}>{r.name}: {gbp(r.hourly_rate)}/hr{r.is_default ? " (default)" : ""}</li>
          ))}
          {j.break_enabled && j.break_minutes > 0 && <li>Unpaid break: {j.break_minutes} min per day</li>}
        </ul>
        <div className="row">
          <button className="link" onClick={() => setMode(j.id)}>Edit</button>
          <button className="link" onClick={() => toggleActive(j)}>{j.is_active ? "Deactivate" : "Reactivate"}</button>
          <button className="link danger" onClick={() => remove(j.id)}>Delete</button>
        </div>
      </div>
    );

  const active = jobs.filter((j) => j.is_active);
  const inactive = jobs.filter((j) => !j.is_active);

  return (
    <section className="stack">
      <div className="row between">
        <h1>Jobs</h1>
        {mode === null && <button className="btn small" onClick={() => setMode("new")}>Add job</button>}
      </div>

      {mode === "new" && <JobForm onSave={create} onCancel={() => setMode(null)} />}

      {!jobs.length && mode !== "new" && (
        <Empty icon="briefcase" title="No jobs yet" text="Add your first job with its pay rates to start tracking shifts." />
      )}
      {active.map(card)}
      {inactive.length > 0 && (
        <>
          <h2 className="sub">Inactive jobs</h2>
          <p className="muted small">Hidden when you start a shift. Their shifts stay in your history.</p>
          {inactive.map(card)}
        </>
      )}
    </section>
  );
}
