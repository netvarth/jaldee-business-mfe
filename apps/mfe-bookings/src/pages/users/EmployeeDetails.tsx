import React, { useState } from 'react';
import { Button, PageHeader, Tabs } from '@jaldee/design-system';
import { Employee } from './mockData';

interface EmployeeDetailsProps {
  employee: Employee;
  onBack: () => void;
}

export default function EmployeeDetails({ employee, onBack }: EmployeeDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const badgeClass = employee.status && employee.status.toUpperCase() === "ACTIVE" 
    ? "bg-emerald-500 text-white" 
    : "bg-slate-300 text-slate-700";

  const colors = ['bg-[#E2E8F0]', 'bg-[#D1FAE5]', 'bg-[#E0E7FF]', 'bg-[#FCE7F3]'];
  const textColors = ['text-slate-600', 'text-[#047857]', 'text-[#4338CA]', 'text-[#BE185D]'];
  const colorIdx = employee.employeeId ? parseInt(employee.employeeId.replace(/[^0-9]/g, '') || '0') % 4 : 0;
  const initials = employee.name ? employee.name.split(' ').map(n=>n[0]).join('').substring(0,1).toUpperCase() : 'E';

  const avatarContent = <div className={`w-full h-full ${colors[colorIdx]} flex items-center justify-center text-3xl font-black ${textColors[colorIdx]}`}>{initials}</div>;
  const dash = (v?: string) => (v && v.trim() ? v : '—');

  return (
    <div className="space-y-6 md:space-y-10 pb-10 w-full px-6 lg:px-10 py-8 overflow-y-auto flex-1">
      {/* Header */}
      <PageHeader
        title="Employee Profile"
        subtitle={`Detailed view of ${employee.name}'s information.`}
        back={{ label: "Back to staff", href: "/staff" }}
        onNavigate={onBack}
      />

      <div className="grid gap-6 md:gap-8 md:grid-cols-[300px_1fr]">
        {/* Left Sidebar Profile Card */}
        <div className="space-y-6">
          <div className="border border-slate-100 shadow-sm bg-white rounded-[2rem] overflow-hidden p-8 flex flex-col items-center text-center">
            <div className="relative group mb-4">
                <div className="h-28 w-28 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-slate-50 shadow-sm">
                    {avatarContent}
                </div>
            </div>
            <div className="space-y-2 mb-6">
                <h2 className="text-xl font-black tracking-tighter text-slate-900 leading-tight">{employee.name}</h2>
                <p className="text-xs font-bold text-slate-500">{dash(employee.department)}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`inline-block rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest ${badgeClass}`}>
                        {employee.status}
                    </span>
                </div>
                <div className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-slate-300 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M9 9a3 3 0 0 0 4 4M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/></svg>
                    NO FACE ID
                </div>
            </div>
            
            <div className="w-full space-y-3">
                <Button variant="outline" fullWidth className="h-10 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 5h14v14H5z"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
                    Enroll Face ID
                </Button>
                <Button variant="outline" fullWidth className="h-10 rounded-xl">
                    <svg className="w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Edit Profile
                </Button>
            </div>
          </div>

          <div className="border border-slate-100 shadow-sm bg-white rounded-[2rem] p-6 space-y-5">
              <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">ID</p>
                      <p className="font-black text-emerald-600 text-[11px] truncate">{dash(employee.employeeId)}</p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">EMAIL</p>
                      <p className="font-black text-slate-700 text-[11px] truncate">{dash(employee.email)}</p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">PHONE</p>
                      <p className="font-black text-slate-700 text-[11px]">{dash(employee.phone)}</p>
                  </div>
              </div>
          </div>
        </div>

        {/* Right Side Content */}
        <div className="space-y-6 md:space-y-8 min-w-0">
          {/* Tabs */}
          <Tabs
            items={['overview', 'attendance', 'leaves', 'payroll', 'documents', 'lifecycle'].map((tab) => ({
              value: tab,
              label: tab.charAt(0).toUpperCase() + tab.slice(1),
            }))}
            value={activeTab}
            onValueChange={setActiveTab}
          />

          {/* Content Areas */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                  <svg className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  <p className="text-[11px] font-bold leading-snug">Tenure, attendance, leave and payroll are managed in the HR module and aren’t available here.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                  <div className="border border-slate-100 shadow-sm bg-white rounded-[2rem] p-6">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#0f172a] shrink-0">
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          </div>
                          <div>
                              <h3 className="text-base font-black tracking-tighter text-slate-900">Personal Information</h3>
                              <p className="text-[11px] font-bold text-slate-500">Identity details and date of birth</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Gender</p>
                              <p className="text-xs font-black text-slate-900">{dash(employee.gender)}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date of Birth</p>
                              <p className="text-xs font-black text-slate-900">{dash(employee.dob)}</p>
                          </div>
                      </div>
                  </div>

                  <div className="border border-slate-100 shadow-sm bg-white rounded-[2rem] p-6">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#0f172a] shrink-0">
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                          </div>
                          <div>
                              <h3 className="text-base font-black tracking-tighter text-slate-900">Employment Details</h3>
                              <p className="text-[11px] font-bold text-slate-500">Role level and system configuration</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Joining Date</p>
                              <p className="text-xs font-black text-slate-900">{dash(employee.doj)}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">System Role</p>
                              <p className="text-xs font-black text-slate-900">{dash(employee.role)}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Employment Type</p>
                              <p className="text-xs font-black text-slate-900">{dash(employee.type)}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Account Status</p>
                              <p className="text-xs font-black text-slate-900">{employee.status?.toUpperCase() === 'ACTIVE' ? 'Active — logins enabled' : 'Inactive'}</p>
                          </div>
                          <div className="space-y-0.5 col-span-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Department</p>
                              <p className="text-xs font-black text-slate-900">{dash(employee.department)}</p>
                          </div>
                      </div>
                  </div>
              </div>

            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
              <svg className="w-12 h-12 text-slate-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Content Available Soon</h3>
              <p className="text-xs font-bold text-slate-500 max-w-[250px] leading-relaxed">The {activeTab} information module is currently being connected to the new HR data pipeline.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
