import React, { useState } from 'react';
import { Employee, MOCK_EMPLOYEES } from './mockData';

interface EmployeeMasterProps {
  onEmployeeClick: (employee: Employee) => void;
}

export default function EmployeeMaster({ onEmployeeClick }: EmployeeMasterProps) {
  const [searchVal, setSearchVal] = useState('');

  const filtered = MOCK_EMPLOYEES.filter(emp => {
    if (!searchVal) return true;
    const lowerSearch = searchVal.toLowerCase();
    return (emp.name && emp.name.toLowerCase().includes(lowerSearch)) ||
           (emp.employeeId && emp.employeeId.toLowerCase().includes(lowerSearch)) ||
           (emp.email && emp.email.toLowerCase().includes(lowerSearch));
  });

  return (
    <div className="space-y-6 md:space-y-10 pb-10 w-full px-6 lg:px-10 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">Employee Master</h1>
          <p className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest tracking-tight">System Access & Role Management</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search ID, Name..." 
              className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00605C]/20 focus:border-[#00605C] transition-all placeholder:font-bold placeholder:text-slate-400 placeholder:uppercase placeholder:tracking-widest"
            />
            <svg className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <button className="h-10 px-4 bg-[#00605C] hover:bg-[#004b48] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm shadow-[#00605C]/20 flex items-center gap-2 shrink-0">
            <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            <span className="hidden md:inline">Add Employee</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex flex-col min-w-[170px] p-4 rounded-2xl border transition-all cursor-pointer bg-slate-950 border-slate-950 shadow-md text-white">
          <span className="text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">TOTAL</span>
          <span className="text-[13px] font-black tracking-tight mb-2 uppercase text-slate-400">EMPLOYEES</span>
          <div className="text-xl font-black tracking-tighter mb-2">{MOCK_EMPLOYEES.length}</div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg w-fit transition-colors bg-white/10">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
            <span className="text-[9px] font-black tracking-widest uppercase text-white">ALL SYSTEM USERS</span>
          </div>
        </div>

        <div className="flex flex-col min-w-[170px] p-4 rounded-2xl border transition-all cursor-pointer bg-white border-slate-200 hover:border-slate-300 text-slate-900">
          <span className="text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">ACTIVE</span>
          <span className="text-[13px] font-black tracking-tight mb-2 uppercase">ACCOUNTS</span>
          <div className="text-xl font-black tracking-tighter mb-2">{MOCK_EMPLOYEES.filter(e => e.status === 'ACTIVE').length}</div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg w-fit transition-colors bg-emerald-50">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-[9px] font-black tracking-widest uppercase text-emerald-700">CURRENTLY ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="border border-slate-100 shadow-sm bg-white rounded-[2rem] overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC]/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-100">
              <tr>
                <th className="h-12 px-6 text-[9px] font-black uppercase tracking-widest text-slate-500 w-[60px]">USER</th>
                <th className="h-12 py-3 pr-6 text-[9px] font-black uppercase tracking-widest text-slate-500">NAME & ROLE</th>
                <th className="h-12 py-3 pr-6 text-[9px] font-black uppercase tracking-widest text-slate-500">ID</th>
                <th className="h-12 py-3 pr-6 text-[9px] font-black uppercase tracking-widest text-slate-500">DEPT & TITLE</th>
                <th className="h-12 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">STATUS</th>
                <th className="h-12 px-6 text-right text-[9px] font-black uppercase tracking-widest text-slate-500">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 font-black uppercase tracking-widest text-[9.5px]">No records found</td></tr>
              ) : (
                filtered.map(emp => {
                  const badgeClass = emp.status && emp.status.toUpperCase() === "ACTIVE" 
                      ? "bg-[#ECFDF5] text-[#059669] border-transparent" 
                      : "bg-slate-50 text-slate-500 border-slate-200";
                  const statusLabel = emp.status ? emp.status : "INACTIVE";
                  
                  const colors = ['bg-[#E2E8F0]', 'bg-[#D1FAE5]', 'bg-[#E0E7FF]', 'bg-[#FCE7F3]'];
                  const textColors = ['text-slate-600', 'text-[#047857]', 'text-[#4338CA]', 'text-[#BE185D]'];
                  const colorIdx = emp.employeeId ? parseInt(emp.employeeId.replace(/[^0-9]/g, '') || '0') % 4 : 0;
                  const initials = emp.name ? emp.name.split(' ').map(n=>n[0]).join('').substring(0,1).toUpperCase() : 'E';

                  const avatarHtml = emp.name === 'Dr. Admin User' 
                      ? <img src={`https://i.pravatar.cc/150?u=${emp.uid}`} className="w-8 h-8 rounded-full object-cover" alt={emp.name} />
                      : <div className={`h-8 w-8 rounded-full ${colors[colorIdx]} flex items-center justify-center font-black text-xs ${textColors[colorIdx]} shadow-sm`}>{initials}</div>;

                  const subtitle = emp.department ? emp.department.toUpperCase() : 'EMPLOYEE';

                  return (
                    <tr 
                      key={emp.uid} 
                      onClick={() => onEmployeeClick(emp)}
                      className="hover:bg-slate-50 border-b border-slate-100 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        {avatarHtml}
                      </td>
                      <td className="py-4 pr-6">
                        <div className="space-y-0.5">
                            <p className="text-[13px] font-black leading-tight text-slate-900">{emp.name || '-'}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{subtitle}</p>
                        </div>
                      </td>
                      <td className="py-4 pr-6">
                          <p className="text-[11px] font-black text-slate-500">{emp.employeeId || '-'}</p>
                      </td>
                      <td className="py-4 pr-6">
                          <p className="text-[11px] font-bold text-slate-600">{emp.department || '-'} &bull; {emp.designation || '-'}</p>
                      </td>
                      <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${badgeClass}`}>{statusLabel}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="text-slate-400 hover:text-slate-700 transition-colors" title="Email Employee" onClick={(e) => e.stopPropagation()}>
                                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                              </button>
                              <button className="text-slate-400 hover:text-slate-700 transition-colors" title="More Options" onClick={(e) => e.stopPropagation()}>
                                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                              </button>
                          </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
