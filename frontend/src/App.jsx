const workflowSteps = [
  {
    title: 'Capture every document',
    description: 'Upload invoices, credit notes, bank statements, and export documents from one place.',
  },
  {
    title: 'Normalize the data',
    description: 'Asta extracts, classifies, and structures fields into a finance dashboard you can trust.',
  },
  {
    title: 'Track every deadline',
    description: 'Stay ahead of GSTR1, GSTR3B, and related filings with proactive reminders and status views.',
  },
  {
    title: 'Generate compliance output',
    description: 'Use AI to prepare filing-ready documents and supporting packs for your team or CA.',
  },
];

const highlightStats = [
  { value: '1', label: 'workspace for finance, compliance, and operations' },
  { value: '24/7', label: 'AI assistant coverage for workflow and compliance help' },
  { value: '100%', label: 'tenant-isolated company data model by design' },
];

const featureCards = [
  {
    title: 'ERP-style financial dashboard',
    description: 'Bring purchase bills, sales bills, credit notes, and invoices into a single operational view.',
  },
  {
    title: 'AI-assisted document generation',
    description: 'Turn structured data into filing packs and supporting documents ready for submission.',
  },
  {
    title: 'Compliance deadline intelligence',
    description: 'Monitor recurring obligations, overdue actions, and document status with a clean timeline.',
  },
  {
    title: 'Embedded assistant for SMEs and CAs',
    description: 'Ask questions, summarize a filing, or trigger a workflow without leaving the dashboard.',
  },
];

function App() {
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
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
          <a href="#why-asta">Why Asta</a>
          <a href="#contact" className="nav-cta">Request demo</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow hero-kicker">Built for SMEs and CAs</p>
            <h2>
              One platform for documents, deadlines, and AI-assisted compliance operations.
            </h2>
            <p className="hero-text">
              Asta helps SME teams capture financial documents, turn them into structured data,
              track recurring compliance work, and prepare filing-ready output from a single
              dashboard.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="button button-primary">
                Book a demo
              </a>
              <a href="#workflow" className="button button-secondary">
                See the workflow
              </a>
            </div>

            <div className="stat-row" aria-label="Product highlights">
              {highlightStats.map((stat) => (
                <article className="stat-card" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
          </div>

          <aside className="dashboard-preview" id="platform" aria-label="Asta dashboard preview">
            <div className="preview-header">
              <div>
                <p className="eyebrow">Live command center</p>
                <h3>Financial operations at a glance</h3>
              </div>
              <span className="status-pill">Pilot ready</span>
            </div>

            <div className="preview-grid">
              <div className="preview-panel panel-focus">
                <span>Uploaded documents</span>
                <strong>128</strong>
                <small>Invoice, note, and bank feeds unified</small>
              </div>
              <div className="preview-panel">
                <span>Pending filings</span>
                <strong>03</strong>
                <small>Tracked with reminder automation</small>
              </div>
              <div className="preview-panel">
                <span>AI extraction accuracy</span>
                <strong>92%</strong>
                <small>Improves with ground-truth feedback</small>
              </div>
              <div className="preview-panel">
                <span>CA shared tasks</span>
                <strong>17</strong>
                <small>Review, correction, and submission workflows</small>
              </div>
            </div>

            <div className="preview-timeline">
              <div>
                <span>Today</span>
                <strong>Invoice ingestion</strong>
              </div>
              <div>
                <span>Tomorrow</span>
                <strong>GSTR3B prep</strong>
              </div>
              <div>
                <span>Next week</span>
                <strong>Compliance summary review</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="section" id="workflow">
          <div className="section-heading">
            <p className="eyebrow">How Asta works</p>
            <h3>Stage 2 first: a visual system that demonstrates the product to real users.</h3>
          </div>

          <div className="workflow-grid">
            {workflowSteps.map((step, index) => (
              <article className="workflow-card" key={step.title}>
                <span className="step-index">0{index + 1}</span>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="why-asta">
          <div className="section-heading narrow">
            <p className="eyebrow">Why Asta</p>
            <h3>Designed to win trust with SMEs, founders, and chartered accountants.</h3>
          </div>

          <div className="feature-grid">
            {featureCards.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section contact-panel" id="contact">
          <div>
            <p className="eyebrow">Pilot the product</p>
            <h3>Show Asta to SMEs and CAs with a clear, credible product experience.</h3>
            <p>
              The landing page is intentionally positioned as the first sales and validation surface
              for Stage 2, before data collection and ground-truth labeling scale up.
            </p>
          </div>

          <a href="mailto:hello@asta.ai" className="button button-primary">
            Contact the team
          </a>
        </section>
      </main>
    </div>
  );
}

export default App;