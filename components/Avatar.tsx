import Icon from "./Icon";

export const AVATARS = [
  { id: "fairy1", emoji: "🧚‍♀️", bg: "#f6d9c4" },
  { id: "fairy2", emoji: "🧚", bg: "#e9d5f2" },
  { id: "fairy3", emoji: "🧚‍♂️", bg: "#d3e8d6" },
  { id: "butterfly", emoji: "🦋", bg: "#cfe3f5" },
  { id: "blossom", emoji: "🌸", bg: "#f8d3de" },
  { id: "moon", emoji: "🌙", bg: "#e4dcc3" },
  { id: "sparkle", emoji: "✨", bg: "#fbe8b5" },
  { id: "mushroom", emoji: "🍄", bg: "#f2cfc4" },
];

export default function Avatar({ id, size = 36 }: { id?: string | null; size?: number }) {
  const a = AVATARS.find((x) => x.id === id);
  return (
    <span className="avatar" style={{ width: size, height: size, background: a?.bg ?? "var(--card)", fontSize: size * 0.55 }}>
      {a ? a.emoji : <Icon name="user" size={size * 0.55} />}
    </span>
  );
}
