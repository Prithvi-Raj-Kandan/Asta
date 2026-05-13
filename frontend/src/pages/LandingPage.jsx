export default function LandingPage() {
  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">A</div>
          <div>
            <p className="eyebrow">Compliance co-pilot</p>
            <h1>Asta</h1>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="/login" className="button button-primary button-small">Get started</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow hero-kicker">Compliance management for SMEs</p>
            <h2>
              One workspace for documents, deadlines, analytics, and AI-assisted compliance.
            </h2>
            <p className="hero-text">
              Asta gives SMEs and CAs a visual operating system for compliance. Upload financial
              documents, review extracted data, track filing work, and keep every task in one
              tenant-isolated dashboard.
            </p>

            <div className="hero-actions">
              <a href="/login" className="button button-primary">Start free trial</a>
              <a href="#features" className="button button-secondary">Learn more</a>
            </div>

            <div className="stat-row" aria-label="Product highlights">
              {[
                { value: '1', label: 'command center for the whole compliance cycle' },
                { value: '24/7', label: 'assistant access for questions and actions' },
                { value: '100%', label: 'company-scoped data isolation' },
              ].map((stat) => (
                <article className="stat-card" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
          </div>

          <aside className="hero-dashboard" aria-label="Product preview">
            <div className="hero-dashboard__head">
              <div>
                <p className="eyebrow">Workspace overview</p>
                <h3>Today at a glance</h3>
              </div>
              <span className="status-pill">Pilot ready</span>
            </div>

            <div className="quick-actions" aria-label="Quick actions">
              {[
                { label: 'Upload invoice', tone: 'accent' },
                { label: 'Review GSTR3B', tone: 'muted' },
                { label: 'Ask assistant', tone: 'muted' },
              ].map((action) => (
                <button key={action.label} className={`action-chip action-chip--${action.tone}`}>
                  {action.label}
                </button>
              ))}
            </div>

            <div className="metric-grid">
              {[
                { label: 'Documents captured', value: '128', delta: '+18 this week' },
                { label: 'Open filings', value: '03', delta: '2 due this week' },
                { label: 'Extraction accuracy', value: '92%', delta: '+4% vs last run' },
                { label: 'Tasks assigned to CA', value: '17', delta: '6 awaiting review' },
              ].map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.delta}</small>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="section section--compact" id="features">
          <div className="section-heading narrow">
            <p className="eyebrow">Why Asta</p>
            <h3>Everything you need to manage compliance, in one dashboard.</h3>
          </div>

          <div className="feature-grid">
            {[
              'ERP-style dashboard for financial operations',
              'Document intake and AI extraction workflows',
              'Deadline tracking for recurring compliance',
              'Embedded chat for guided actions and support',
            ].map((feature) => (
              <article className="feature-card" key={feature}>
                <h4>{feature}</h4>
                <p>
                  Asta brings together all the pieces of compliance into one visual interface,
                  making it easy to track documents, deadlines, and tasks in real-time.
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
