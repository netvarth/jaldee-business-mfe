import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EditSchedule() {
  const navigate = useNavigate();

  return (
    <section id="page-edit-schedule" className="page-section active h-full flex flex-col relative overflow-hidden bg-white" style={{ display: 'flex' }}>
      {/* Back header */}
      <div className="details-header-nav">
        <button 
          type="button" 
          className="back-nav-btn" 
          id="btn-edit-schedule-back"
          onClick={() => navigate(-1)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>Back</span>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-active">Edit Schedule</span>
        </div>
      </div>

      <div className="wizard-content-container">
        <form id="form-edit-schedule" className="wizard-step-panel active" onSubmit={(e) => { e.preventDefault(); navigate(-1); }}>
          <input type="hidden" id="edit-schedule-id" />
          <input type="hidden" id="edit-schedule-calendar-id" />
          <input type="hidden" id="edit-schedule-timewindow-id" />
          
          <div>
            <h2 className="section-title" style={{ marginBottom: '8px' }}>Edit Schedule Details</h2>
            <p style={{ fontSize: '13px', color: 'var(--light-text)', margin: '0' }}>Update schedule name, dates, capacity, channels, and assigned doctors.</p>
          </div>

          {/* Basic details */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
                <label htmlFor="edit-schedule-name">Schedule Name *</label>
                <input type="text" id="edit-schedule-name" className="custom-input" required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="edit-schedule-desc">Description</label>
              <textarea id="edit-schedule-desc" className="custom-input" rows={2}></textarea>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label htmlFor="edit-schedule-start">Start Date *</label>
                <input type="date" id="edit-schedule-start" className="custom-input" required />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label htmlFor="edit-schedule-end">End Date</label>
                <input type="date" id="edit-schedule-end" className="custom-input" />
              </div>
            </div>

            <label className="custom-checkbox-container" style={{ width: 'max-content', marginTop: '16px' }}>
              <input type="checkbox" id="edit-schedule-qr" />
              <span className="checkmark"></span>
              <span className="chk-label" style={{ fontWeight: 600 }}>Require QR Code check-in</span>
            </label>
          </div>

          {/* Slot Config */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <h3 className="subsection-title" style={{ marginBottom: '12px' }}>Slot Configuration</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label htmlFor="edit-schedule-duration">Slot Duration (mins) *</label>
                <input type="number" id="edit-schedule-duration" className="custom-input" min="5" defaultValue="30" required />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label htmlFor="edit-schedule-capacity">Default Capacity *</label>
                <input type="number" id="edit-schedule-capacity" className="custom-input" min="1" defaultValue="5" required />
              </div>
            </div>
          </div>

          {/* Channels */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <h3 className="subsection-title" style={{ marginBottom: '12px' }}>Booking Channels</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="checkbox-channel-card" style={{ flex: 1, minWidth: '150px' }}>
                <label className="custom-checkbox-container">
                  <input type="checkbox" id="edit-schedule-channel-online" defaultChecked />
                  <span className="checkmark"></span>
                  <div className="checkbox-desc">
                    <span className="chk-label">🖥️ Online</span>
                  </div>
                </label>
              </div>
              <div className="checkbox-channel-card" style={{ flex: 1, minWidth: '150px' }}>
                <label className="custom-checkbox-container">
                  <input type="checkbox" id="edit-schedule-channel-walkin" />
                  <span className="checkmark"></span>
                  <div className="checkbox-desc">
                    <span className="chk-label">📍 Walk-in</span>
                  </div>
                </label>
              </div>
              <div className="checkbox-channel-card" style={{ flex: 1, minWidth: '150px' }}>
                <label className="custom-checkbox-container">
                  <input type="checkbox" id="edit-schedule-channel-phonein" />
                  <span className="checkmark"></span>
                  <div className="checkbox-desc">
                    <span className="chk-label">📞 Phone-in</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Services & Doctors */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="subsection-title" style={{ margin: '0' }}>Assigned Services & Doctors</h3>
              <button type="button" className="btn btn-secondary btn-sm" id="btn-edit-schedule-add-services">Assign Services</button>
            </div>
            <div id="edit-schedule-services-list" style={{ background: 'var(--app-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ textAlign: 'center', color: 'var(--light-text)', margin: 0 }}>No services assigned yet.</p>
            </div>
          </div>

          {/* Labels */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <h3 className="subsection-title" style={{ marginBottom: '12px' }}>Tags / Labels</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div id="edit-schedule-labels-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" id="btn-edit-schedule-add-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Add Label
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="wizard-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary btn-wizard-discard" id="btn-edit-schedule-discard" onClick={() => navigate(-1)}>Discard Changes</button>
            <button type="submit" className="btn btn-primary" id="btn-edit-schedule-save">Save Schedule</button>
          </div>
        </form>
      </div>
    </section>
  );
}
