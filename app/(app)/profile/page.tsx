"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/Shell";
import Avatar, { AVATARS } from "@/components/Avatar";

export default function Profile() {
  const user = useUser();
  const [f, setF] = useState({ full_name: "", gender: "", date_of_birth: "", phone: "", avatar: AVATARS[0].id });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").maybeSingle().then(({ data }) => {
      if (data) setF({ full_name: data.full_name ?? "", gender: data.gender ?? "", date_of_birth: data.date_of_birth ?? "", phone: data.phone ?? "", avatar: data.avatar ?? AVATARS[0].id });
    });
  }, []);

  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, full_name: f.full_name.trim() || null, gender: f.gender || null,
      date_of_birth: f.date_of_birth || null, phone: f.phone.trim() || null,
      avatar: f.avatar, updated_at: new Date().toISOString(),
    });
    setBusy(false);
    setMsg(error ? error.message : "Profile saved.");
    if (!error) window.dispatchEvent(new Event("profile-updated"));
  }

  return (
    <section className="stack">
      <div className="profile-head">
        <Avatar id={f.avatar} size={84} />
        <div>
          <h1>{f.full_name || "Your profile"}</h1>
          <p className="muted small">{user.email}</p>
        </div>
      </div>

      <form onSubmit={save} className="stack">
        <div className="field">Choose an avatar
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button type="button" key={a.id} className={f.avatar === a.id ? "pick on" : "pick"} onClick={() => set("avatar", a.id)} aria-label={`Avatar ${a.id}`}>
                <Avatar id={a.id} size={52} />
              </button>
            ))}
          </div>
        </div>
        <label className="field">Name<input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" /></label>
        <label className="field">Gender
          <select value={f.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
          </select>
        </label>
        <label className="field">Date of birth<input type="date" value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></label>
        <label className="field">Phone number<input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></label>
        {msg && <p className="note">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </form>
      <button className="btn out" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </section>
  );
}
