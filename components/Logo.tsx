export default function Logo({ size = 36, bg = true }: { size?: number; bg?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      {bg && <rect width="512" height="512" rx="116" fill="#5a2f17" />}
      <circle cx="256" cy="256" r="150" fill="none" stroke="#e0661f" strokeWidth="38" strokeLinecap="round" strokeDasharray="800 142.5" transform="rotate(-62.8 256 256)" />
      <rect x="190" y="206" width="132" height="38" rx="19" fill="#fbf1e8" />
      <rect x="237" y="206" width="38" height="130" rx="19" fill="#fbf1e8" />
    </svg>
  );
}
