export default function PageHeader({ eyebrow, title, actions }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}
