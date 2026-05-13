import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Documents', path: '/dashboard/documents' },
    { label: 'Deadlines', path: '/dashboard/deadlines' },
    { label: 'Analytics', path: '/dashboard/analytics' },
    { label: 'Chat', path: '/dashboard/chat' },
    { label: 'Profile', path: '/dashboard/profile' },
    { label: 'Clients', path: '/dashboard/clients' },
    { label: 'Products', path: '/dashboard/products' },
    { label: 'Settings', path: '/dashboard/settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark-small">A</div>
        <h3>Asta</h3>
      </div>

      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
          >
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
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
