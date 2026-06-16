import React, { useState } from 'react';
import EmployeeMaster from './EmployeeMaster';
import EmployeeDetails from './EmployeeDetails';
import { Employee } from './mockData';

export default function StaffPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  if (selectedEmployee) {
    return <EmployeeDetails employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />;
  }

  return <EmployeeMaster onEmployeeClick={setSelectedEmployee} />;
}
