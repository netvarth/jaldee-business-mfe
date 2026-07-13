import { useMemo, useState } from 'react';
import { Button, DataTable, EmptyState, Input, PageHeader, type ColumnDef } from '@jaldee/design-system';
import { Employee } from './mockData';
import { useStaff } from '../../services/useStaff';

interface EmployeeMasterProps {
  onEmployeeClick: (employee: Employee) => void;
}

export default function EmployeeMaster({ onEmployeeClick }: EmployeeMasterProps) {
  const [searchVal, setSearchVal] = useState('');
  const { staff, loading, error } = useStaff();

  const filtered = staff.filter(emp => {
    if (!searchVal) return true;
    const lowerSearch = searchVal.toLowerCase();
    return (emp.name && emp.name.toLowerCase().includes(lowerSearch)) ||
           (emp.employeeId && emp.employeeId.toLowerCase().includes(lowerSearch)) ||
           (emp.email && emp.email.toLowerCase().includes(lowerSearch));
  });

  const totalCount = staff.length;
  const activeCount = staff.filter((e) => e.status?.toUpperCase() === 'ACTIVE').length;

  const columns = useMemo<ColumnDef<Employee>[]>(() => [
    {
      key: 'name',
      header: 'Name and role',
      sortable: true,
      width: '28%',
      render: (employee) => {
        const initials = employee.name
          ? employee.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
          : 'E';
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{employee.name || '-'}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {employee.department || 'Employee'}
              </p>
            </div>
          </div>
        );
      },
    },
    { key: 'employeeId', header: 'ID', sortable: true, render: (employee) => employee.employeeId || '-' },
    {
      key: 'department',
      header: 'Department and title',
      sortable: true,
      render: (employee) => `${employee.department || '-'} · ${employee.designation || '-'}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (employee) => {
        const active = employee.status?.toUpperCase() === 'ACTIVE';
        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {employee.status || 'INACTIVE'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sticky: 'right',
      width: 110,
      render: (employee) => (
        <Button
          variant="outline"
          size="sm"
          id={`bookings-employee-more-${employee.uid}`}
          data-testid={`bookings-employee-more-${employee.uid}`}
          type="button"
          onClick={(event) => event.stopPropagation()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          More
        </Button>
      ),
    },
  ], []);

  return (
    <div className="space-y-6 md:space-y-10 pb-10 w-full px-6 lg:px-10 py-8">
      {/* Header */}
      <PageHeader
        title="Staff"
        subtitle="Manage employee access, roles, and booking availability."
        actions={
          <Button className="h-10 shrink-0 rounded-xl">
            <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            <span>Add Employee</span>
          </Button>
        }
      />
      <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full md:w-64">
            <Input
              type="text" 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search ID, Name..." 
              icon={<svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>}
            />
          </div>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex flex-col min-w-[170px] p-4 rounded-2xl border transition-all cursor-pointer bg-slate-950 border-slate-950 shadow-md text-white">
          <span className="text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">TOTAL</span>
          <span className="text-[13px] font-black tracking-tight mb-2 uppercase text-slate-400">EMPLOYEES</span>
          <div className="text-xl font-black tracking-tighter mb-2">{totalCount}</div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg w-fit transition-colors bg-white/10">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
            <span className="text-[9px] font-black tracking-widest uppercase text-white">ALL SYSTEM USERS</span>
          </div>
        </div>

        <div className="flex flex-col min-w-[170px] p-4 rounded-2xl border transition-all cursor-pointer bg-white border-slate-200 hover:border-slate-300 text-slate-900">
          <span className="text-[9px] font-black tracking-widest mb-1 uppercase text-slate-400">ACTIVE</span>
          <span className="text-[13px] font-black tracking-tight mb-2 uppercase">ACCOUNTS</span>
          <div className="text-xl font-black tracking-tighter mb-2">{activeCount}</div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg w-fit transition-colors bg-emerald-50">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-[9px] font-black tracking-widest uppercase text-emerald-700">CURRENTLY ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(employee) => employee.uid}
        onRowClick={onEmployeeClick}
        emptyState={
          <EmptyState
            title={loading ? 'Loading staff…' : error ? 'Could not load staff' : 'No employees found'}
            description={loading ? 'Fetching your team from the directory.' : error ? error : 'Try changing the search.'}
          />
        }
        data-testid="bookings-employees"
      />
    </div>
  );
}
