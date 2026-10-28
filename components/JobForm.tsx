"use client";
import { useState } from "react";

type RateRow = { id?: string; name: string; amount: string };
export type JobValues = {
  name: string; address: string | null; break_enabled: boolean; break_minutes: number;
  rates: { id?: string; name: string; hourly_rate: number; is_default: boolean }[];
};
export type JobInit = {
  name: string; address: string | null; break_enabled: boolean; break_minutes: number;
  pay_rates: { id: string; name: string; hourly_rate: number; is_default: boolean }[];
};

const PRESETS = [15, 30, 45, 60, 120];
const label = (m: number) => (m % 60 === 0 ? `${m / 60}h` : `${m}m`);

export default function JobForm({ initial, onSave, onCancel }: {
  initial?: JobInit; onSave: (v: JobValues) => Promise<string | void>; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [rates, setRates] = useState<RateRow[]>(
    initial ? initial.pay_rates.map((r) => ({ id: r.id, name: r.name, amount: String(r.hourly_rate) })) : [{ name: "Regular", amount: "" }, { name: "Extra", amount: "" }]
  );
  const [def, setDef] = useState(initial ? Math.max(0, initial.pay_rates.findIndex((r) => r.is_default)) : 0);
  const [breakOn, setBreakOn] = useState(initial?.break_enabled ?? false);
  const [breakMin, setBreakMin] = useState(String(initial?.break_minutes || 30));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const setRate = (i: number, patch: Partial<RateRow>) => setRates(rates.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const removeRate = (i: number) => {
    setRates(rates.filter((_, k) => k !== i));
    setDef(def === i ? 0 : def > i ? def - 1 : def);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const valid = rates.map((r, i) => ({ ...r, i })).filter((r) => r.name.trim() && r.amount !== "");
    if (!valid.length) return setErr("Add at least one pay rate with an amount.");
    const mins = Math.round(Number(breakMin));
    if (breakOn && !(mins > 0)) return setErr("Enter a break length in minutes.");
    const defIdx = valid.some((r) => r.i === def) ? def : valid[0].i;
    setBusy(true);
    const msg = await onSave({
      name: name.trim(), address: address.trim() || null, break_enabled: breakOn, break_minutes: mins > 0 ? mins : 0,
      rates: valid.map((r) => ({ id: r.id, name: r.name.trim(), hourly_rate: Number(r.amount), is_default: r.i === defIdx })),
    });
    setBusy(false);
    if (msg) setErr(msg);
  }

  return (
    <form onSubmit={submit} className="card stack form-in">
      <label className="field">Job name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <label className="field">Address (optional)<input value={address} onChange={(e) => setAddress(e.target.value)} /></label>

      <p className="muted small">Pay rates (per hour). The selected one is the default when you start a shift.</p>
      {rates.map((r, i) => (
        <div className="rate-row" key={i}>
          <input type="radio" name="def" checked={def === i} onChange={() => setDef(i)} aria-label="Default rate" />
          <input placeholder="Name e.g. Regular" value={r.name} onChange={(e) => setRate(i, { name: e.target.value })} />
          <input type="number" step="0.01" min="0" placeholder="£/hr" value={r.amount} onChange={(e) => setRate(i, { amount: e.target.value })} />
          {rates.length > 1 && <button type="button" className="link" onClick={() => removeRate(i)}>Remove</button>}
        </div>
      ))}
      <button type="button" className="link" onClick={() => setRates([...rates, { name: "", amount: "" }])}>Add another rate</button>
      {initial && <p className="muted small">Rate and break changes apply to new shifts only. Past shifts keep what they had.</p>}

      <div className="inset stack">
        <label className="switch">
          <span>Unpaid break<br /><span className="muted small">Taken off once per day for this job</span></span>
          <input type="checkbox" checked={breakOn} onChange={(e) => setBreakOn(e.target.checked)} />
        </label>
        {breakOn && (
          <>
            <div className="chips">
              {PRESETS.map((m) => (
                <button type="button" key={m} className={Number(breakMin) === m ? "chip on" : "chip"} onClick={() => setBreakMin(String(m))}>{label(m)}</button>
              ))}
            </div>
            <label className="field">Break length (minutes)
              <input type="number" min="1" step="1" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} />
            </label>
          </>
        )}
      </div>

      {err && <p className="note">{err}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Save job"}</button>
        <button type="button" className="link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
