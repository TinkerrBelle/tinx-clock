import Icon, { IconName } from "./Icon";

export default function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ico"><Icon name={icon} size={30} /></span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
