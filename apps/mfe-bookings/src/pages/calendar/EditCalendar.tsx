import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EditCalendar() {
  const navigate = useNavigate();

  return (
    <section id="page-edit-calendar" className="page-section active h-full flex flex-col relative overflow-hidden bg-white" style={{ display: 'flex' }}>
      {/* Back header */}
      <div className="details-header-nav">
        <button 
          className="back-nav-btn" 
          id="btn-edit-calendar-back"
          onClick={() => navigate(-1)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>Calendar Details</span>
        </button>
      </div>

      <div className="wizard-content-container">
        <div className="wizard-step-panel active">
          <h2 className="section-title">Edit Calendar</h2>
          
          <form id="form-edit-calendar" className="wizard-form" onSubmit={(e) => { e.preventDefault(); navigate(-1); }}>
            <input type="hidden" id="edit-calendar-id" />
            
            <div className="form-group">
              <label htmlFor="edit-calendar-name">Calendar Name <span className="required">*</span></label>
              <input type="text" id="edit-calendar-name" required placeholder="e.g. Morning Shift" defaultValue="Morning Shift" />
            </div>
            
            <div className="form-group">
              <label htmlFor="edit-calendar-desc">Calendar Description</label>
              <textarea id="edit-calendar-desc" rows={4} placeholder="Brief description of this calendar" defaultValue="Description here"></textarea>
            </div>

            <div className="wizard-footer-actions">
              <button type="button" className="btn btn-secondary btn-wizard-discard" id="btn-edit-calendar-discard" onClick={() => navigate(-1)}>Discard</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
