import './ListView.css';

export default function ListView({ groups }) {
  return (
    <div className="list-view">
      <div className="list-header">
        <span>Date &amp; Time</span>
        <span>Patient</span>
        <span>Service</span>
        <span>User</span>
        <span>Status</span>
      </div>
      {groups.map((group) => (
        <div key={group.date} className="list-group">
          <header>
            <div>
              <strong>{group.date}</strong>
              <span>({group.items.length})</span>
            </div>
          </header>
          {group.items.map((item) => (
            <div key={`${group.date}-${item.patient}`} className="list-row">
              <div>
                <p>{item.time}</p>
                <small>{item.slot}</small>
              </div>
              <div>{item.patient}</div>
              <div>
                <span className="pill">{item.service}</span>
              </div>
              <div>
                <span className="avatar-pill">{item.userInitials}</span>
                <span>{item.user}</span>
              </div>
              <div>
                <span className={`status-pill ${item.statusColor}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
