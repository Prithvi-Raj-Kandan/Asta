export default function DashboardSectionPage({ title, subtitle, children }) {
  return (
    <section className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <p className="dashboard-page__eyebrow">Home</p>
          <h2>{title}</h2>
          <p className="dashboard-page__subtitle">{subtitle}</p>
        </div>
      </header>

      {children}
    </section>
  );
}