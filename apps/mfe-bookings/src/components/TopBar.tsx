import './TopBar.css';

export default function TopBar() {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="top-info">
          <strong>Staff Dashboard</strong>
          <span>Manage appointments, patients, and user availability</span>
        </div>
      </div>
    </header>
  );
}