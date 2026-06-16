import React, { useState } from 'react';
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

  const avatarContent = employee.name === 'Dr. Admin User' 
      ? <img src={`https://i.pravatar.cc/150?u=${employee.uid}`} className="w-full h-full object-cover" alt={employee.name} />
      : <div className={`w-full h-full ${colors[colorIdx]} flex items-center justify-center text-3xl font-black ${textColors[colorIdx]}`}>{initials}</div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-10 w-full px-6 lg:px-10 py-8 overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-2">
          <button onClick={onBack} className="h-8 w-8 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center shrink-0 text-slate-500">
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#1e293b] leading-tight">Employee Profile</h1>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Detailed view of <span className="text-slate-900">{employee.name.split(' ')[0]}</span>'s information</p>
          </div>
      </div>

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
                <p className="text-xs font-bold text-slate-500">{employee.designation}</p>
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
                <button className="w-full h-10 rounded-xl border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-[11px] flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 5h14v14H5z"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
                    Enroll Face ID
                </button>
                <button className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-[11px] flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Edit Profile
                </button>
            </div>
          </div>

          <div className="border border-slate-100 shadow-sm bg-white rounded-[2rem] p-6 space-y-5">
              <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">ID</p>
                      <p className="font-black text-emerald-600 text-[11px] truncate">{employee.employeeId}</p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">EMAIL</p>
                      <p className="font-black text-slate-700 text-[11px] truncate">{employee.email}</p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">PHONE</p>
                      <p className="font-black text-slate-700 text-[11px]">{employee.phone}</p>
                  </div>
              </div>
          </div>
        </div>

        {/* Right Side Content */}
        <div className="space-y-6 md:space-y-8 min-w-0">
          {/* Tabs */}
          <div className="flex h-14 w-full items-center justify-start gap-8 px-4 overflow-x-auto scrollbar-hide border-b border-transparent">
            {['overview', 'attendance', 'leaves', 'payroll', 'documents', 'lifecycle'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center justify-center font-black text-[10px] uppercase tracking-[0.15em] transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? 'text-[#0f172a] before:content-["["] before:mr-3 before:opacity-80 before:font-light before:text-base after:content-["]"] after:ml-3 after:opacity-80 after:font-light after:text-base' 
                    : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Areas */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                  <div className="flex flex-col min-w-[140px] md:min-w-[170px] p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer bg-slate-950 border-slate-950 shadow-md text-white">
                      <span className="text-[8px] md:text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">WORKFORCE</span>
                      <span className="text-[10px] md:text-xs font-black tracking-tight mb-2 uppercase text-slate-400">TENURE</span>
                      <div className="text-base md:text-xl font-black tracking-tighter mb-2">2.4 Yrs</div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md w-fit text-[8px] font-black tracking-widest uppercase bg-white/10 text-white">
                          <div className="h-1 w-1 rounded-full bg-blue-500"></div><span>SINCE JOINING</span>
                      </div>
                  </div>
                  
                  <div className="flex flex-col min-w-[140px] md:min-w-[170px] p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer bg-white border-slate-200 text-slate-950">
                      <span className="text-[8px] md:text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">ATTENDANCE</span>
                      <span className="text-[10px] md:text-xs font-black tracking-tight mb-2 uppercase text-slate-400">ON-TIME</span>
                      <div className="text-base md:text-xl font-black tracking-tighter mb-2">98%</div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md w-fit text-[8px] font-black tracking-widest uppercase bg-[#00605C]/5 text-[#00605C]/70">
                          <div className="h-1 w-1 rounded-full bg-emerald-500"></div><span>THIS MONTH</span>
                      </div>
                  </div>

                  <div className="flex flex-col min-w-[140px] md:min-w-[170px] p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer bg-white border-slate-200 text-slate-950">
                      <span className="text-[8px] md:text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">LEAVES</span>
                      <span className="text-[10px] md:text-xs font-black tracking-tight mb-2 uppercase text-slate-400">AVAILABLE</span>
                      <div className="text-base md:text-xl font-black tracking-tighter mb-2">13 Days</div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md w-fit text-[8px] font-black tracking-widest uppercase bg-[#00605C]/5 text-[#00605C]/70">
                          <div className="h-1 w-1 rounded-full bg-emerald-500"></div><span>CASUAL/SICK</span>
                      </div>
                  </div>

                  <div className="flex flex-col min-w-[140px] md:min-w-[170px] p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer bg-white border-slate-200 text-slate-950">
                      <span className="text-[8px] md:text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">PAYROLL</span>
                      <span className="text-[10px] md:text-xs font-black tracking-tight mb-2 uppercase text-slate-400">NET SALARY</span>
                      <div className="text-base md:text-xl font-black tracking-tighter mb-2">₹60,800</div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md w-fit text-[8px] font-black tracking-widest uppercase bg-[#00605C]/5 text-[#00605C]/70">
                          <div className="h-1 w-1 rounded-full bg-blue-500"></div><span>CURRENT</span>
                      </div>
                  </div>
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
                              <p className="text-xs font-black text-slate-900">{employee.gender}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date of Birth</p>
                              <p className="text-xs font-black text-slate-900">{employee.dob}</p>
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
                              <p className="text-xs font-black text-slate-900">{employee.doj}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">System Role</p>
                              <p className="text-xs font-black text-slate-900">{employee.role}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Employment Type</p>
                              <p className="text-xs font-black text-slate-900">{employee.type}</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Is Active User</p>
                              <p className="text-xs font-black text-slate-900">Yes, Logins Enabled</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reporting Manager</p>
                              <p className="text-xs font-black text-slate-900">No Manager Assigned</p>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Hierarchy Level</p>
                              <p className="text-xs font-black text-slate-900">Level 1</p>
                          </div>
                          <div className="space-y-0.5 col-span-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Work Site / Branch</p>
                              <p className="text-xs font-black text-slate-900">Remote / Not Assigned</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Bank Details */}
              <div className="border border-slate-100 shadow-sm bg-white rounded-[2rem] p-6">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#0f172a] shrink-0">
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                      </div>
                      <div>
                          <h3 className="text-base font-black tracking-tighter text-slate-900">Bank Details (Active Account)</h3>
                          <p className="text-[11px] font-bold text-slate-500">Registered information for monthly pay disbursements</p>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-0.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Bank Name</p>
                          <p className="text-xs font-black text-slate-900">HDFC Bank</p>
                      </div>
                      <div className="space-y-0.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Account Number</p>
                          <p className="text-xs font-black text-slate-900">XXXX-XXXX-1234</p>
                      </div>
                      <div className="space-y-0.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">IFSC Code</p>
                          <p className="text-xs font-black text-slate-900">HDFC0001234</p>
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
