import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import DashboardSectionPage from './pages/dashboard/DashboardSectionPage';

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

const clients = [
  { name: 'Aster Tech Pvt Ltd', industry: 'Manufacturing', status: 'Active' },
  { name: 'Sunrise Traders', industry: 'Retail', status: 'Active' },
  { name: 'Metro Logistics', industry: 'Logistics', status: 'Pending review' },
];

const products = [
  { name: 'Compliance Retainer', category: 'Service', price: '₹25,000' },
  { name: 'GST Filing Support', category: 'Service', price: '₹12,500' },
  { name: 'Document Review Pack', category: 'Service', price: '₹8,000' },
];

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route
            path="documents"
            element={
              <DashboardSectionPage
                title="Documents"
                subtitle="Upload and manage compliance files in one place"
              >
                <section className="panel-grid panel-grid--single">
                  <article className="panel-card">
                    <h3>Document intake</h3>
                    <div className="upload-strip upload-strip--sharp">
                      <div>
                        <strong>Drop invoices, bills, notes, or bank statements</strong>
                        <p>PDF, JPG, PNG, and spreadsheet imports are accepted.</p>
                      </div>
                      <button className="button button-primary button-small">Choose file</button>
                    </div>
                  </article>

                  <article className="panel-card">
                    <h3>Recent documents</h3>
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
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route
            path="deadlines"
            element={
              <DashboardSectionPage
                title="Deadlines"
                subtitle="Track upcoming filings and recurring compliance cycles"
              >
                <section className="panel-grid panel-grid--single">
                  <article className="panel-card">
                    <h3>Upcoming filings</h3>
                    <div className="deadline-list deadline-list--wide">
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
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route
            path="analytics"
            element={
              <DashboardSectionPage
                title="Analytics"
                subtitle="Review financial and compliance trends for the business"
              >
                <section className="panel-grid panel-grid--two">
                  <article className="panel-card">
                    <h3>Monthly operating summary</h3>
                    <div className="metric-grid metric-grid--compact">
                      {[
                        { label: 'Revenue', value: '₹18.2L', delta: '+8.4%' },
                        { label: 'Net profit', value: '₹4.6L', delta: '+5.1%' },
                        { label: 'Open tasks', value: '06', delta: '-2' },
                        { label: 'Pending filings', value: '03', delta: 'Stable' },
                      ].map((metric) => (
                        <article className="metric-card" key={metric.label}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                          <small>{metric.delta}</small>
                        </article>
                      ))}
                    </div>
                  </article>

                  <article className="panel-card">
                    <h3>Compliance risk</h3>
                    <div className="score-card score-card--green">
                      <strong>82%</strong>
                      <span>Healthy compliance posture</span>
                    </div>
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route
            path="chat"
            element={
              <DashboardSectionPage
                title="Chat"
                subtitle="Ask compliance questions and draft actions from the dashboard"
              >
                <section className="panel-grid panel-grid--single">
                  <article className="panel-card panel-card--chat">
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
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route
            path="profile"
            element={
              <DashboardSectionPage title="Profile" subtitle="Manage your personal and company details">
                <section className="panel-grid panel-grid--single">
                  <article className="panel-card">
                    <h3>Account details</h3>
                    <div className="info-grid">
                      <div><span>User name</span><strong>Prithvi Raj</strong></div>
                      <div><span>Organization</span><strong>Asta Compliance Pvt Ltd</strong></div>
                      <div><span>Role</span><strong>Admin</strong></div>
                    </div>
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route
            path="clients"
            element={
              <DashboardSectionPage title="Clients" subtitle="Review client records and business activity">
                <section className="panel-grid panel-grid--single">
                  <article className="panel-card">
                    <h3>Client list</h3>
                    <div className="simple-list">
                      {clients.map((client) => (
                        <div className="simple-list__row" key={client.name}>
                          <div>
                            <strong>{client.name}</strong>
                            <span>{client.industry}</span>
                          </div>
                          <em>{client.status}</em>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route
            path="products"
            element={
              <DashboardSectionPage title="Products" subtitle="Manage services and offerings">
                <section className="panel-grid panel-grid--single">
                  <article className="panel-card">
                    <h3>Service catalog</h3>
                    <div className="simple-list">
                      {products.map((product) => (
                        <div className="simple-list__row" key={product.name}>
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.category}</span>
                          </div>
                          <em>{product.price}</em>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route
            path="settings"
            element={
              <DashboardSectionPage title="Settings" subtitle="Control application preferences and access">
                <section className="panel-grid panel-grid--single">
                  <article className="panel-card">
                    <h3>Preferences</h3>
                    <div className="settings-grid">
                      <label>
                        <span>Notification email</span>
                        <input type="text" value="accounts@asta.com" readOnly />
                      </label>
                      <label>
                        <span>Default fiscal year</span>
                        <input type="text" value="2026 - 2027" readOnly />
                      </label>
                    </div>
                  </article>
                </section>
              </DashboardSectionPage>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
