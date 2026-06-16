import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomizeCalendar() {
  const navigate = useNavigate();

  return (
    <section id="page-customize-calendar" className="page-section active h-full flex flex-col relative overflow-hidden bg-white" style={{ display: 'flex' }}>
      {/* Back header */}
      <div className="details-header-nav">
        <button 
          className="back-nav-btn" 
          id="btn-customize-back"
          onClick={() => navigate(-1)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>Calendar Details</span>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-active" id="cust-header-cal-badge">Calendar</span>
        </div>
      </div>

      <div className="wizard-content-container">
        <div className="wizard-step-panel active">
          <div>
            <h2 className="section-title" id="cust-page-title" style={{ marginBottom: '8px' }}>Customize Calendar</h2>
            <p style={{ fontSize: '13px', color: 'var(--light-text)', margin: '0' }}>
              Configure booking channels, services, user assignments, and overrides for <strong id="cust-page-schedule-badge">Calendar</strong>
            </p>
          </div>

          {/* 1. BOOKING CHANNELS SECTION */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <h3 className="subsection-title" style={{ marginBottom: '4px' }}>Booking Channels</h3>
            <p className="subsection-help">Set up which channels are enabled for this schedule</p>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
              <div className="checkbox-channel-card" style={{ flex: 1, minWidth: '200px' }}>
                <label className="custom-checkbox-container">
                  <input type="checkbox" id="cust-page-channel-online" defaultChecked />
                  <span className="checkmark"></span>
                  <div className="checkbox-desc">
                    <span className="chk-label">🖥️ Online</span>
                  </div>
                </label>
              </div>
              <div className="checkbox-channel-card" style={{ flex: 1, minWidth: '200px' }}>
                <label className="custom-checkbox-container">
                  <input type="checkbox" id="cust-page-channel-walkin" />
                  <span className="checkmark"></span>
                  <div className="checkbox-desc">
                    <span className="chk-label">📍 Walk-in</span>
                  </div>
                </label>
              </div>
              <div className="checkbox-channel-card" style={{ flex: 1, minWidth: '200px' }}>
                <label className="custom-checkbox-container">
                  <input type="checkbox" id="cust-page-channel-phonein" />
                  <span className="checkmark"></span>
                  <div className="checkbox-desc">
                    <span className="chk-label">📞 Phone-in</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 2. OVERRIDE SLOT CAPACITY (TIME WINDOW MODE ONLY) */}
          <div id="cust-page-timewindow-wrapper" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px', display: 'block' }}>
            <h3 className="subsection-title" style={{ marginBottom: '4px' }}>Time Window Capacity Override</h3>
            <p className="subsection-help">Override default slot capacity specifically for this time window</p>
            <div className="form-group" style={{ maxWidth: '300px', marginTop: '12px' }}>
              <label htmlFor="cust-page-tw-capacity">Slot Capacity Override</label>
              <input type="number" id="cust-page-tw-capacity" min="1" placeholder="e.g. 5" />
            </div>
          </div>

          {/* 3. SERVICES & USER ASSIGNMENT */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 className="subsection-title" style={{ marginBottom: '4px' }}>Assigned Services & Doctors</h3>
                <p className="subsection-help" style={{ marginBottom: '0' }}>Configure services and doctor-level pricing/capacity overrides</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" id="btn-cust-page-add-services">Assign Services</button>
                <button type="button" id="btn-cust-page-add-services-tw" style={{ display: 'none' }}></button>
              </div>
            </div>

            <div id="cust-tw-services-list" style={{ background: 'var(--app-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ textAlign: 'center', color: 'var(--light-text)', margin: 0 }}>No services assigned yet.</p>
            </div>
          </div>

          {/* 4. LABELS SECTION */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <h3 className="subsection-title" style={{ marginBottom: '4px' }}>Tags / Labels</h3>
            <p className="subsection-help">Tag this calendar for segmentation (e.g. VIP, Priority, General)</p>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
              <div id="cust-page-labels-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" id="btn-cust-page-add-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Add Label
              </button>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="wizard-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary btn-wizard-discard" id="btn-cust-page-cancel" onClick={() => navigate(-1)}>Cancel</button>
            <button type="button" className="btn btn-primary" id="btn-cust-page-update" onClick={() => navigate(-1)}>Update Settings</button>
          </div>
        </div>
      </div>
    </section>
  );
}
