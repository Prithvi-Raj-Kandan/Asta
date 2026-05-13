import { Link } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { label: 'Workspace', icon: '📊' },
    { label: 'Documents', icon: '📄' },
    { label: 'Deadlines', icon: '📅' },
    { label: 'Clients', icon: '👥' },
    { label: 'Products', icon: '📦' },
    { label: 'Profile', icon: '👤' },
    { label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark-small">A</div>
        <h3>Asta</h3>
      </div>

      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        {navItems.map((item) => (
          <a key={item.label} href={`#${item.label.toLowerCase()}`} className="sidebar-link">
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="button button-secondary" style={{ width: '100%' }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
