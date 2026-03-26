const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
  '10:00 PM',
  '11:00 PM',
];

const DOCTORS = [
  { id: 'doc-1', label: 'Dr. Sarah Johnson' },
  { id: 'doc-2', label: 'Dr. Michael Chen' },
  { id: 'doc-3', label: 'Dr. Emily Williams' },
  { id: 'doc-4', label: 'Dr. James Smith' },
  { id: 'doc-5', label: 'Nurse Mary Brown' },
];

const CALENDARS = [
  { id: 'cal-1', label: 'Calendar 1' },
  { id: 'cal-2', label: 'Calendar 2' },
  { id: 'cal-3', label: 'Calendar 3' },
  { id: 'cal-4', label: 'Calendar 4' },
  { id: 'cal-5', label: 'Calendar 5' },
];

const DEPARTMENTS = [
  { id: 'dep-1', label: 'General' },
  { id: 'dep-2', label: 'Cardio' },
  { id: 'dep-3', label: 'Wellness' },
  { id: 'dep-4', label: 'Diagnostics' },
  { id: 'dep-5', label: 'Procedures' },
];

const SERVICES = [
  'Quick Consultation',
  'Standard Consultation',
  'Follow-Up',
  'General Check Up',
  'Procedure',
  'Therapy Session',
  'Emergency',
];

const STATUSES = [
  { label: 'Confirmed' },
  { label: 'Waiting' },
  { label: 'In Progress' },
  { label: 'Checked In' },
];

const PATIENTS = [
  'Aisha Patel',
  'Marco Diaz',
  'Priya Gupta',
  'Imran Khan',
  'Samira Thomas',
  'Leena Joseph',
  'David Brown',
  'Carol White',
  'Ravi Bose',
  'Jiya Bose',
  'Nimisha R',
  'Rahul Varma',
  'Arjun Menon',
  'Maya Sebastian',
  'Vikram Singh',
  'Sara N',
  'Nadia Kumar',
  'Thomas Lee',
  'Ananya K',
  'Zara Nair',
  'Mateo Diaz',
  'Priya J',
  'Josephine Chacko',
  'Farah Naqvi',
  'Rafael Dos Santos',
];

const formatDateKey = (date) => date.toISOString().split('T')[0];

const buildBookingRecords = () => {
  const records = [];
  const startDate = new Date('2025-11-01');
  const totalDays = 120;
  let counter = 1;
  const specialDate = new Date('2025-12-19');
  const specialDateKey = formatDateKey(specialDate);

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayIndex);
    const dateKey = formatDateKey(currentDate);
    const slotsForDay = 8 + ((dayIndex + 1) % 5);

    for (let slotIndex = 0; slotIndex < slotsForDay; slotIndex += 1) {
      const doctor = DOCTORS[(dayIndex + slotIndex) % DOCTORS.length];
      const calendar = CALENDARS[(dayIndex + slotIndex) % CALENDARS.length];
      const department = DEPARTMENTS[(dayIndex + slotIndex) % DEPARTMENTS.length];
      const timeIndex = slotIndex % TIME_SLOTS.length;
      const bookingsPerSlot = 1 + ((dayIndex + slotIndex) % 3);

      for (let slotBooking = 0; slotBooking < bookingsPerSlot; slotBooking += 1) {
        if (dateKey === specialDateKey && doctor.label === 'Dr. James Smith' && timeIndex === 0) {
          continue;
        }
        const patient = PATIENTS[counter % PATIENTS.length];
        const service = SERVICES[(dayIndex + slotIndex + counter + slotBooking) % SERVICES.length];
        const status = STATUSES[(dayIndex + slotIndex + counter + slotBooking) % STATUSES.length];

        records.push({
          id: `bk-${String(counter).padStart(5, '0')}`,
          date: dateKey,
          timeIndex,
          patient,
          service,
          doctor: doctor.label,
          calendar: calendar.label,
          department: department.label,
          status: status.label,
        });

        counter += 1;
      }
      if (slotIndex % 3 === 0) {
        if (dateKey === specialDateKey && doctor.label === 'Dr. James Smith' && slotIndex % 3 === 0 && timeIndex === 0) {
          // skip extra calendar entries for the highlighted slot
        } else {
        const altCalendar = CALENDARS[(dayIndex + slotIndex + 1) % CALENDARS.length];
        const patient = PATIENTS[counter % PATIENTS.length];
        const service = SERVICES[(dayIndex + slotIndex + counter) % SERVICES.length];
        const status = STATUSES[(dayIndex + slotIndex + counter) % STATUSES.length];
        records.push({
          id: `bk-${String(counter).padStart(5, '0')}`,
          date: dateKey,
          timeIndex,
          patient,
          service,
          doctor: doctor.label,
          calendar: altCalendar.label,
          department: department.label,
          status: status.label,
        });
        counter += 1;
        }
      }
    }
  }

  const extraDate = new Date('2025-12-19');
  const extraDateKey = formatDateKey(extraDate);
  const sameDoctor = DOCTORS.find((doc) => doc.label === 'Dr. James Smith');
  if (sameDoctor) {
    CALENDARS.slice(0, 5).forEach((calendar, index) => {
      const patient = PATIENTS[(counter + index) % PATIENTS.length];
      const department = DEPARTMENTS[(counter + index) % DEPARTMENTS.length];
      const service = SERVICES[(counter + index) % SERVICES.length];
      const status = STATUSES[(counter + index) % STATUSES.length];
      records.push({
        id: `bk-${String(counter).padStart(5, '0')}`,
        date: extraDateKey,
        timeIndex: 0,
        patient,
        service,
        doctor: sameDoctor.label,
        calendar: calendar.label,
        department: department.label,
        status: status.label,
      });
      counter += 1;
    });
  }

  const singleBookingDate = new Date('2026-03-01');
  const singleBookingKey = formatDateKey(singleBookingDate);
  const singleDoctor = DOCTORS[0];
  const singleCalendar = CALENDARS[0];
  const singleDepartment = DEPARTMENTS[0];
  const singleService = SERVICES[0];
  const singleStatus = STATUSES[0];
  const singlePatient = PATIENTS[(counter + 5) % PATIENTS.length];
  records.push({
    id: `bk-${String(counter).padStart(5, '0')}`,
    date: singleBookingKey,
    timeIndex: 3,
    patient: singlePatient,
    service: singleService,
    doctor: singleDoctor.label,
    calendar: singleCalendar.label,
    department: singleDepartment.label,
    status: singleStatus.label,
  });
  counter += 1;

  const today = new Date();
  const todayKey = formatDateKey(today);
  const extraDoctor = DOCTORS[1];
  const extraCalendar = CALENDARS[0];
  const extraDepartment = DEPARTMENTS[1];
  const extraService = SERVICES[1];
  const extraStatus = STATUSES[1];
  const extraPatient = PATIENTS[(counter + 3) % PATIENTS.length];
  records.push({
    id: `bk-${String(counter).padStart(5, '0')}`,
    date: todayKey,
    timeIndex: 4,
    patient: extraPatient,
    service: extraService,
    doctor: extraDoctor.label,
    calendar: extraCalendar.label,
    department: extraDepartment.label,
    status: extraStatus.label,
  });
  counter += 1;

  return records;
};

const bookingRecords = buildBookingRecords();

export function getMockBookingRecords() {
  return bookingRecords;
}

export function fetchMockBookingRecords() {
  return Promise.resolve(bookingRecords.slice());
}
