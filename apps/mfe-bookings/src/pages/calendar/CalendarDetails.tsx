import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CalendarDetails() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Back header */}
      <div className="flex items-center p-4 border-b border-slate-200 bg-white">
        <button 
          onClick={() => navigate('/calendars')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" x2="5" y1="12" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Calendars</span>
        </button>
      </div>

      <div className="flex h-full overflow-hidden">
        {/* Main details content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-start gap-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500 shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">Calendar 1</h2>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Active</span>
              </div>
              <p className="text-sm text-slate-500 mt-1.5">Main cardiology consultation calendar for all heart-related appointments</p>
              <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-3 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Thrissur</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => navigate('/calendars/edit')} className="h-10 px-4 rounded-xl font-bold bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-50 transition-colors shadow-sm">Edit Calendar</button>
              <button onClick={() => navigate('/calendars/customize')} className="h-10 px-4 rounded-xl font-bold bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-50 transition-colors shadow-sm">Customize</button>
              <button onClick={() => navigate('/calendars/customize')} className="h-10 px-4 rounded-xl font-bold bg-[#0f172a] text-white text-sm hover:bg-slate-800 transition-colors shadow-sm">Calendar Settings</button>
            </div>
          </div>

          {/* Schedules List */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Schedules</h3>
              <button onClick={() => navigate('/calendars/edit-schedule')} className="h-9 px-3 rounded-lg font-bold bg-white border border-slate-200 text-slate-700 text-xs hover:bg-slate-50 transition-colors shadow-sm">+ Add Schedule</button>
            </div>

            <div className="grid gap-4">
              {/* Dummy Schedule Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">Morning Shift</h4>
                    <p className="text-sm text-slate-500 mt-1">Mon, Tue, Wed • 09:00 AM - 01:00 PM</p>
                  </div>
                  <button onClick={() => navigate('/calendars/edit-schedule')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Edit</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar details content */}
        <aside className="w-72 bg-white border-l border-slate-200 p-6 overflow-y-auto flex flex-col gap-8 shrink-0">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Services</h4>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">Consultation</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Users</h4>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">Dr. Smith</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Channels</h4>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">Online</span>
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">Walk-in</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Labels</h4>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">VIP</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
