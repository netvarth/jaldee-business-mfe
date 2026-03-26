import { NavLink } from 'react-router-dom';
import './GlobalNav.css';

const navItems = [
  { id: 'dashboard', label: 'Home', icon: '🏠', path: '/' },
  { id: 'calendar', label: 'Calendar', icon: '📅', path: '/calendar' },
  { id: 'patients', label: 'Patients', icon: '👥', path: '/patients' },
  { id: 'notes', label: 'Notes', icon: '📝', path: '/notes' },
  { id: 'insights', label: 'Insights', icon: '📊', path: '/insights' },
];

export default function GlobalNav({ collapsed, onToggle }) {
  return (
    <nav className={`global-nav ${collapsed ? 'collapsed' : ''}`}>
      <button className="nav-toggle" onClick={onToggle} aria-label="Toggle navigation">
        <span />
        <span />
        <span />
      </button>
      <div className="nav-items">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
