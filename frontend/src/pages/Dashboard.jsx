import Sidebar from '../components/Sidebar';

const metrics = [
  { label: 'Documents captured', value: '128', delta: '+18 this week' },
  { label: 'Open filings', value: '03', delta: '2 due this week' },
  { label: 'Extraction accuracy', value: '92%', delta: '+4% vs last run' },
  { label: 'Tasks assigned to CA', value: '17', delta: '6 awaiting review' },
];

const documentRows = [
  { name: 'Purchase Invoice - Sunrise Traders', type: 'Invoice', status: 'Extracted', amount: '₹84,220', date: '12 May' },
  { name: 'Sales Bill - Aster Tech Pvt Ltd', type: 'Sales', status: 'Needs review', amount: '₹1,24,580', date: '12 May' },
  { name: 'Credit Note - Metro Logistics', type: 'Credit note', status: 'Queued', amount: '₹18,400', date: '11 May' },
  { name: 'Bank Statement - HDFC', type: 'Bank', status: 'Uploaded', amount: '₹0', date: '11 May' },
];

const deadlines = [
  { name: 'GSTR1', date: '15 May', status: 'Due soon' },
  { name: 'GSTR3B', date: '20 May', status: 'Pending prep' },
  { name: 'TDS return', date: '27 May', status: 'Scheduled' },
];

const insights = [
  'GST summary matches 94% of extracted line items',
  'Bank feed shows 3 unmatched entries',
  '1 invoice needs CA verification before filing',
];

export default function Dashboard() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Workspace overview</h2>
          </div>
          <span className="status-pill">Pilot ready</span>
        </header>

        <div className="dashboard-content">
          <section className="quick-section">
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
          </section>

          <section className="metrics-section">
            <div className="section-label">
              <p className="eyebrow">Key metrics</p>
              <h3>Financial & compliance overview</h3>
            </div>
            <div className="metric-grid">
              {metrics.map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.delta}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="workspace-grid">
            <section className="panel panel--wide" id="documents">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Document intake</p>
                  <h3>Uploaded documents</h3>
                </div>
                <span className="panel-subtle">Auto-extract + manual review</span>
              </div>

              <div className="upload-strip">
                <div>
                  <strong>Drop invoices, bills, notes, or bank statements</strong>
                  <p>PDF, JPG, PNG, and spreadsheet imports are accepted.</p>
                </div>
                <button className="button button-primary button-small">Choose file</button>
              </div>

              <div className="document-table" role="table" aria-label="Recent documents">
                <div className="document-table__row document-table__row--head" role="row">
                  <span role="columnheader">Document</span>
                  <span role="columnheader">Type</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Amount</span>
                  <span role="columnheader">Date</span>
                </div>
                {documentRows.map((row) => (
                  <div className="document-table__row" role="row" key={row.name}>
                    <span role="cell" className="document-name">{row.name}</span>
                    <span role="cell">{row.type}</span>
                    <span role="cell"><em>{row.status}</em></span>
                    <span role="cell">{row.amount}</span>
                    <span role="cell">{row.date}</span>
                  </div>
                ))}
              </div>
            </section>

            <aside className="panel panel--side" id="deadlines">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Deadline tracker</p>
                  <h3>Upcoming filings</h3>
                </div>
              </div>

              <div className="deadline-list">
                {deadlines.map((deadline) => (
                  <article className="deadline-card" key={deadline.name}>
                    <div>
                      <strong>{deadline.name}</strong>
                      <span>{deadline.date}</span>
                    </div>
                    <em>{deadline.status}</em>
                  </article>
                ))}
              </div>

              <div className="insight-box">
                <p className="eyebrow">Compliance insight</p>
                <ul>
                  {insights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </section>

          <section className="workspace-grid workspace-grid--lower">
            <section className="panel panel--wide panel--glass" id="assistant">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">AI assistant</p>
                  <h3>Ask Asta</h3>
                </div>
                <span className="panel-subtle">Grounded in company data + RAG</span>
              </div>

              <div className="chat-thread">
                <div className="chat-bubble chat-bubble--user">
                  Show me what needs action before GSTR1.
                </div>
                <div className="chat-bubble chat-bubble--assistant">
                  1 invoice needs CA review, 3 documents are ready, and GSTR1 is due on 15 May.
                  I can also draft the filing summary.
                </div>
              </div>

              <div className="chat-composer">
                <input type="text" placeholder="Ask about filings, documents, or deadlines..." />
                <button className="button button-primary button-small">Send</button>
              </div>
            </section>

            <section className="panel panel--side">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Analytics</p>
                  <h3>Health score</h3>
                </div>
              </div>

              <div className="score-ring" aria-label="Compliance health">
                <strong>86</strong>
                <span>Compliance health score</span>
              </div>

              <div className="mini-bars" aria-hidden="true">
                <div><span style={{ width: '78%' }} /></div>
                <div><span style={{ width: '62%' }} /></div>
                <div><span style={{ width: '91%' }} /></div>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
