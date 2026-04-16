interface Props {
  title: string;
  badge: string;
}

export function Placeholder({ title, badge }: Props) {
  return (
    <div className="placeholder">
      <div className="placeholder-inner">
        <span className="placeholder-badge">{badge}</span>
        <h2 className="placeholder-title">{title}</h2>
        <p className="placeholder-sub">Coming soon</p>
      </div>
    </div>
  );
}
