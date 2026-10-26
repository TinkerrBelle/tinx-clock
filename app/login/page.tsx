"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/PasswordInput";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import PasswordRules, { passwordRules } from "@/components/PasswordRules";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (mode === "up" && !passwordRules(password).every((r) => r.ok)) return setMsg("Your password doesn't meet all the requirements yet.");
    if (mode === "up" && password !== confirm) return setMsg("Passwords don't match.");
    setBusy(true);
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (data.session) router.replace("/");
    else setSent(true);
  }

  if (sent)
    return (
      <div className="auth success">
        <span className="success-ico"><Icon name="check" size={44} /></span>
        <h1>Account created</h1>
        <p>We've sent a confirmation link to</p>
        <strong className="mail"><Icon name="mail" size={18} /> {email}</strong>
        <p className="muted">Open the email and tap the link to activate your account. If you can't see it, check your spam folder.</p>
        <button className="btn" onClick={() => { setSent(false); setMode("in"); setPassword(""); setConfirm(""); }}>Back to sign in</button>
      </div>
    );

  return (
    <div className="auth">
      <Logo size={72} />
      <h1>Tinx</h1>
      <p className="muted">Start a shift. Stop it. See what you earned.</p>
      <form onSubmit={submit} className="stack">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordInput placeholder="Password (6+ characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {mode === "up" && (
          <PasswordInput placeholder="Confirm password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        )}
        {mode === "up" && <PasswordRules password={password} />}
        <button className="btn" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
      </form>
      {msg && <p className="note">{msg}</p>}
      <button className="link" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
