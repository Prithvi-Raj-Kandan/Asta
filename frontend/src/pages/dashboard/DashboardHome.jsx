const monthlyData = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 28 },
  { month: 'Mar', value: 55 },
  { month: 'Apr', value: -12 },
  { month: 'May', value: 64 },
  { month: 'Jun', value: 38 },
  { month: 'Jul', value: 18 },
  { month: 'Aug', value: 71 },
  { month: 'Sep', value: 49 },
  { month: 'Oct', value: -8 },
  { month: 'Nov', value: 53 },
  { month: 'Dec', value: 67 },
];

const announcements = [
  { title: 'GST portal: return filing reminder window updated', source: 'GST Portal', href: 'https://www.gst.gov.in/' },
  { title: 'MCA circular: compliance clarification for SME filings', source: 'MCA Portal', href: 'https://www.mca.gov.in/' },
  { title: 'DGFT notice: import/export documentation update', source: 'DGFT Portal', href: 'https://dgft.gov.in/' },
];

const healthLegend = [
  { label: 'Below 30%', className: 'health-legend--red' },
  { label: '30 to 70%', className: 'health-legend--yellow' },
  { label: '70 and above', className: 'health-legend--green' },
];

const complianceScore = 68;

export default function DashboardHome() {
  const bandClass = complianceScore < 30 ? 'score-card--red' : complianceScore < 70 ? 'score-card--yellow' : 'score-card--green';

  return (
    <section className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <p className="dashboard-page__eyebrow">Home</p>
          <h2>Dashboard</h2>
        </div>
      </header>

      <div className="panel-grid panel-grid--single">
        <article className="panel-card home-identity-card">
          <p className="home-identity-card__label">User</p>
          <strong className="home-identity-card__name">Prithvi Raj</strong>
          <span className="home-identity-card__org">Asta Compliance Pvt Ltd</span>
        </article>

        <article className="panel-card">
          <div className="panel-card__head">
            <h3>Net profit and loss by month</h3>
            <span>Financial year overview</span>
          </div>

          <div className="profit-chart" aria-label="Net profit and loss by month">
            <div className="profit-chart__axis">
              <span>Profit</span>
              <span>0</span>
              <span>Loss</span>
            </div>
            <div className="profit-chart__plot">
              {monthlyData.map((item) => {
                const magnitude = `${Math.min(Math.abs(item.value) * 1.2, 100)}%`;
                const positive = item.value >= 0;
                return (
                  <div className="profit-chart__bar-group" key={item.month}>
                    <div className="profit-chart__bar-track">
                      <div
                        className={`profit-chart__bar ${positive ? 'profit-chart__bar--positive' : 'profit-chart__bar--negative'}`}
                        style={{ height: magnitude, [positive ? 'bottom' : 'top']: positive ? '50%' : '50%' }}
                      />
                    </div>
                    <span className="profit-chart__label">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <section className="home-split">
          <article className={`panel-card home-health-card ${bandClass}`}>
            <div className="panel-card__head">
              <h3>Compliance health score</h3>
              <span>{complianceScore}%</span>
            </div>

            <div className="score-card__value">{complianceScore}%</div>
            <div className="health-legend">
              {healthLegend.map((legend) => (
                <span key={legend.label} className={`health-legend__item ${legend.className}`}>
                  {legend.label}
                </span>
              ))}
            </div>
          </article>

          <article className="panel-card home-announcements-card">
            <div className="panel-card__head">
              <h3>Announcements</h3>
              <span>Government portal updates</span>
            </div>

            <div className="announcement-list">
              {announcements.map((announcement) => (
                <article className="announcement-item" key={announcement.title}>
                  <div>
                    <strong>{announcement.title}</strong>
                    <span>{announcement.source}</span>
                  </div>
                  <a href={announcement.href} target="_blank" rel="noreferrer">
                    Open update
                  </a>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}