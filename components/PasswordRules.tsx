import Icon from "./Icon";

export const passwordRules = (p: string) => [
  { text: "at least 6 characters", ok: p.length >= 6 },
  { text: "Include number and special character", ok: /\d/.test(p) && /[^A-Za-z0-9\s]/.test(p) },
  { text: "Include uppercase", ok: /[A-Z]/.test(p) },
];

export default function PasswordRules({ password }: { password: string }) {
  return (
    <div className="rules">
      <p className="small">Password must be</p>
      <ul>
        {passwordRules(password).map((r) => (
          <li key={r.text} className={r.ok ? "ok" : ""}>
            <span className="tick"><Icon name="check" size={14} /></span>
            {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
