import './TopBar.css';

export default function TopBar({ location }) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="top-info">
          <strong>Staff Dashboard</strong>
          <span>Manage appointments, patients, and user availability</span>
        </div>
      </div>
      <div className="top-bar-right">
        <button className="location-button">
          {location}
          <span className="chevron">v</span>
        </button>
        <button className="icon-button" title="Notifications">
          N
        </button>
        <button className="icon-button" title="Settings">
          S
        </button>
        <button className="icon-button" title="Messages">
          M
        </button>
        <button className="icon-button" title="Apps">
          A
        </button>
        <div className="avatar">KP</div>
      </div>
    </header>
  );
}
