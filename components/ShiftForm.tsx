"use client";
import { useState } from "react";

export type Rate = { id: string; name: string; hourly_rate: number; is_default: boolean };
export type Job = { id: string; name: string; pay_rates: Rate[] };
export type Values = { job_id?: string; rate_name?: string; hourly_rate: number; start_time: string; end_time: string };

const toLocal = (d: Date) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

export default function ShiftForm({ jobs, initial, onSave, onCancel }: {
  jobs?: Job[];
  initial?: { start_time: string; end_time: string; hourly_rate: number };
  onSave: (v: Values) => Promise<string | void>;
  onCancel: () => void;
}) {
  const adding = !initial;
  const [jobId, setJobId] = useState("");
  const [rateId, setRateId] = useState("");
  const [rate, setRate] = useState(initial ? String(initial.hourly_rate) : "");
  const [start, setStart] = useState(toLocal(initial ? new Date(initial.start_time) : new Date()));
  const [end, setEnd] = useState(toLocal(initial ? new Date(initial.end_time) : new Date()));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const rates = jobs?.find((j) => j.id === jobId)?.pay_rates ?? [];

  function pickJob(id: string) {
    setJobId(id);
    const r = jobs?.find((j) => j.id === id)?.pay_rates ?? [];
    const d = r.find((x) => x.is_default) ?? r[0];
    setRateId(d?.id ?? "");
    setRate(d ? String(d.hourly_rate) : "");
  }
  function pickRate(id: string) {
    setRateId(id);
    const r = rates.find((x) => x.id === id);
    if (r) setRate(String(r.hourly_rate));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const s = new Date(start), f = new Date(end);
    if (isNaN(+s) || isNaN(+f)) return setErr("Enter a start and end time.");
    if (f <= s) return setErr("End time must be after the start time.");
    if (rate === "" || Number(rate) < 0) return setErr("Enter an hourly rate.");
    if (adding && !jobId) return setErr("Choose a job.");
    setBusy(true);
    const msg = await onSave({
      job_id: jobId || undefined,
      rate_name: rates.find((x) => x.id === rateId)?.name,
      hourly_rate: Number(rate),
      start_time: s.toISOString(),
      end_time: f.toISOString(),
    });
    setBusy(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="stack form-in">
      {adding && (
        <>
          <label className="field">Job
            <select value={jobId} onChange={(e) => pickJob(e.target.value)}>
              <option value="">Choose a job</option>
              {jobs?.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </label>
          {jobId && (
            <label className="field">Pay rate
              <select value={rateId} onChange={(e) => pickRate(e.target.value)}>
                {rates.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          )}
        </>
      )}
      <label className="field">Start<input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
      <label className="field">End<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required /></label>
      <label className="field">Hourly rate (£)<input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required /></label>
      {err && <p className="note">{err}</p>}
      <div className="row">
        <button className="btn small" disabled={busy}>{busy ? "Saving…" : adding ? "Add shift" : "Save changes"}</button>
        <button type="button" className="link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
