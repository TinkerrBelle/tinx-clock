"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/Shell";
import { gbp } from "@/lib/util";

type Job = { id: string; name: string; address: string | null; pay_rates: { id: string; name: string; hourly_rate: number; is_default: boolean }[] };
type RateRow = { name: string; amount: string };

export default function Jobs() {
  const user = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [rates, setRates] = useState<RateRow[]>([{ name: "Weekday", amount: "" }, { name: "Weekend", amount: "" }]);
  const [def, setDef] = useState(0);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("jobs").select("id,name,address,pay_rates(id,name,hourly_rate,is_default)").order("created_at", { ascending: false });
    setJobs((data as any) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setRate = (i: number, patch: Partial<RateRow>) =>
    setRates(rates.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const valid = rates.map((r, i) => ({ ...r, i })).filter((r) => r.name.trim() && r.amount !== "");
    if (!valid.length) return setErr("Add at least one pay rate with an amount.");
    const { data: job, error } = await supabase.from("jobs").insert({ user_id: user.id, name: name.trim(), address: address.trim() || null }).select().single();
    if (error) return setErr(error.message);
    const defIdx = valid.some((r) => r.i === def) ? def : valid[0].i;
    const { error: e2 } = await supabase.from("pay_rates").insert(
      valid.map((r) => ({ user_id: user.id, job_id: job.id, name: r.name.trim(), hourly_rate: Number(r.amount), is_default: r.i === defIdx }))
    );
    if (e2) return setErr(e2.message);
    setName(""); setAddress(""); setRates([{ name: "Weekday", amount: "" }, { name: "Weekend", amount: "" }]); setDef(0);
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this job and all its shifts?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    load();
  }

  return (
    <section className="stack">
      <div className="row between">
        <h1>Jobs</h1>
        {!adding && <button className="btn small" onClick={() => setAdding(true)}>Add job</button>}
      </div>

      {adding && (
        <form onSubmit={save} className="card stack">
          <label className="field">Job name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className="field">Address (optional)<input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
          <p className="muted small">Pay rates (per hour). The selected one is the default when you start a shift.</p>
          {rates.map((r, i) => (
            <div className="rate-row" key={i}>
              <input type="radio" name="def" checked={def === i} onChange={() => setDef(i)} aria-label="Default rate" />
              <input placeholder="Name e.g. Weekday" value={r.name} onChange={(e) => setRate(i, { name: e.target.value })} />
              <input type="number" step="0.01" min="0" placeholder="£/hr" value={r.amount} onChange={(e) => setRate(i, { amount: e.target.value })} />
              {rates.length > 1 && <button type="button" className="link" onClick={() => { setRates(rates.filter((_, k) => k !== i)); setDef(0); }}>Remove</button>}
            </div>
          ))}
          <button type="button" className="link" onClick={() => setRates([...rates, { name: "", amount: "" }])}>Add another rate</button>
          {err && <p className="note">{err}</p>}
          <div className="row">
            <button className="btn">Save job</button>
            <button type="button" className="link" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      {!jobs.length && !adding && <p className="empty">No jobs yet. Add one to start tracking shifts.</p>}
      {jobs.map((j) => (
        <div className="card" key={j.id}>
          <div className="row between">
            <strong>{j.name}</strong>
            <button className="link danger" onClick={() => remove(j.id)}>Delete</button>
          </div>
          {j.address && <p className="muted small">{j.address}</p>}
          <ul className="plain">
            {j.pay_rates.map((r) => (
              <li key={r.id}>{r.name}: {gbp(r.hourly_rate)}/hr{r.is_default ? " (default)" : ""}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
