import type { IpAdmissionRow, IpBedRow, IpBillingRow, IpDataset, IpDetail, IpPatientRow, IpPatientStatus, IpUserLite } from "../types";

type RequestApi = {
  get<T>(path: string, config?: unknown): Promise<{ data: T }>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function safeNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeText(...values: unknown[]): string {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function extractList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map((entry) => toRecord(entry));
  }

  const record = toRecord(payload);
  const candidates = [record.items, record.content, record.list, record.data, record.response, record.result];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map((entry) => toRecord(entry));
    }
  }

  return [];
}

function formatDate(value: unknown): string {
  const raw = safeText(value);
  if (!raw) {
    return "-";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function calculateStayDays(admittedOn: unknown): number {
  const date = new Date(String(admittedOn ?? ""));
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = today.getTime() - date.getTime();
  return diff >= 0 ? Math.floor(diff / 86_400_000) + 1 : 0;
}

function composePersonName(record: Record<string, unknown>, ...prefixes: string[]): string {
  for (const prefix of prefixes) {
    const direct = safeText(record[`${prefix}Name`], record[`${prefix}_name`]);
    if (direct) {
      return direct;
    }

    const nested = toRecord(record[prefix]);
    const fullName = safeText(
      nested.name,
      nested.fullName,
      [nested.firstName, nested.lastName].filter(Boolean).join(" ").trim()
    );
    if (fullName) {
      return fullName;
    }
  }

  return safeText(
    record.patientName,
    record.consumerName,
    record.providerConsumerName,
    record.patient,
    record.name,
    [record.firstName, record.lastName].filter(Boolean).join(" ").trim()
  );
}

function mapPatientStatus(rawStatus: unknown, stayDays: number): IpPatientStatus {
  const status = safeText(rawStatus).toLowerCase();

  if (status.includes("discharge")) return "Ready for Discharge";
  if (status.includes("observation")) return "Under Observation";
  if (status.includes("admitted") || status.includes("active")) return "Admitted";

  if (stayDays >= 5) return "Ready for Discharge";
  if (stayDays >= 3) return "Under Observation";
  return "Admitted";
}

function mapBedOccupancy(rawStatus: unknown): IpBedRow["occupancy"] {
  const status = safeText(rawStatus).toLowerCase();

  if (status.includes("clean")) return "Cleaning";
  if (status.includes("available") || status.includes("vacant") || status.includes("free")) return "Available";
  return "Occupied";
}

function mapBillingStatus(rawStatus: unknown, amount: number): IpBillingRow["status"] {
  const status = safeText(rawStatus).toLowerCase();

  if (status.includes("paid") || status.includes("settled")) return "Paid";
  if (status.includes("partial")) return "Partial";
  if (amount <= 0) return "Paid";
  if (amount < 10_000) return "Partial";
  return "Pending";
}

function normalizePatients(payload: unknown): IpPatientRow[] {
  return extractList(payload).map((entry, index) => {
    const admittedOnRaw = entry.admittedOn ?? entry.admittedDate ?? entry.admissionDate ?? entry.createdDate;
    const stayDays = safeNumber(entry.stayDays) || calculateStayDays(admittedOnRaw);
    const attendingDoctor = safeText(
      entry.attendingDoctorName,
      entry.doctorName,
      entry.providerName,
      composePersonName(toRecord(entry.primaryProvider), "provider")
    ) || "-";
    const ward = safeText(
      entry.wardName,
      entry.departmentName,
      entry.roomTypeName,
      entry.roomName,
      entry.roomNumber,
      entry.bedName,
      entry.ward
    ) || "-";

    return {
      id: safeText(entry.uid, entry.id, entry.inPatientNumber, `ip-patient-${index + 1}`),
      patient: composePersonName(entry, "providerConsumer", "patient", "consumer") || `Patient ${index + 1}`,
      ward,
      attendingDoctor,
      status: mapPatientStatus(entry.status ?? entry.inPatientStatus ?? entry.admissionStatus, stayDays),
      admittedOn: formatDate(admittedOnRaw),
      admittedOnRaw: safeText(admittedOnRaw),
      stayDays,
    };
  });
}

function normalizeAdmissions(payload: unknown): IpAdmissionRow[] {
  return extractList(payload).map((entry, index) => ({
    id: safeText(entry.uid, entry.id, entry.inPatientNumber, `ip-admission-${index + 1}`),
    patient: composePersonName(entry, "providerConsumer", "patient", "consumer") || `Patient ${index + 1}`,
    reason: safeText(
      entry.reasonForAdmission,
      entry.reason,
      entry.chiefComplaint,
      entry.notes,
      entry.medicalCondition,
      entry.serviceName
    ) || "-",
    room: safeText(entry.roomName, entry.roomNumber, entry.room, entry.bedName, entry.bedNumber) || "-",
    admittedOn: formatDate(entry.admittedOn ?? entry.admittedDate ?? entry.admissionDate ?? entry.createdDate),
    expectedDischarge: formatDate(entry.expectedDischargeDate ?? entry.dischargeDate ?? entry.expectedDischarge),
  }));
}

function normalizeBeds(payload: unknown): IpBedRow[] {
  return extractList(payload).map((entry, index) => {
    const patient = composePersonName(entry, "providerConsumer", "patient", "consumer");
    return {
      id: safeText(entry.uid, entry.id, entry.bedId, `ip-bed-${index + 1}`),
      ward: safeText(entry.wardName, entry.roomName, entry.floorName, entry.buildingName, entry.ward) || "-",
      bed: safeText(entry.bedName, entry.name, entry.bedNumber, entry.roomNumber, entry.roomNo) || `Bed ${index + 1}`,
      occupancy: mapBedOccupancy(entry.status ?? entry.occupancy ?? entry.bedStatus),
      patient: patient || undefined,
      building: safeText(entry.buildingName, entry.building, entry.branchName) || undefined,
      floor: safeText(entry.floorName, entry.floor, entry.levelName) || undefined,
      room: safeText(entry.roomName, entry.roomNumber, entry.roomNo, entry.room) || undefined,
    };
  });
}

function normalizeBilling(payload: unknown): IpBillingRow[] {
  return extractList(payload).map((entry, index) => {
    const amount = safeNumber(
      entry.balanceAmount ?? entry.amountDue ?? entry.outstandingAmount ?? entry.dueAmount ?? entry.amount ?? entry.netTotal
    );

    return {
      id: safeText(entry.uid, entry.id, entry.invoiceUid, `ip-billing-${index + 1}`),
      patient: composePersonName(entry, "providerConsumer", "patient", "consumer") || `Patient ${index + 1}`,
      invoice: safeText(entry.invoiceId, entry.invoiceNumber, entry.invoiceNo, entry.billNumber, entry.uid, `INV-${index + 1}`),
      status: mapBillingStatus(entry.status ?? entry.paymentStatus ?? entry.billStatus, amount),
      amount,
      dueOn: formatDate(entry.dueDate ?? entry.invoiceDate ?? entry.createdDate),
    };
  });
}

function buildLocationFilter(locationId?: string | null): Record<string, unknown> {
  const normalized = safeText(locationId);
  if (!normalized || normalized === "loc-default") {
    return {};
  }

  return { "locationId-eq": normalized };
}

function countActivePatients(patients: IpPatientRow[]) {
  return patients.filter((patient) => patient.status === "Admitted" || patient.status === "Under Observation").length;
}

function countExpectedDischarges(admissions: IpAdmissionRow[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return admissions.filter((entry) => {
    const date = new Date(entry.expectedDischarge);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    date.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
    return diffDays >= 0 && diffDays <= 3;
  }).length;
}

function getLast7DayLabels() {
  const labels: Array<{ key: string; label: string }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    labels.push({
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
    });
  }

  return labels;
}

function buildAdmissionsLast7Days(patients: IpPatientRow[]) {
  const labels = getLast7DayLabels();
  const counts = new Map(labels.map((entry) => [entry.key, 0]));

  for (const patient of patients) {
    const raw = safeText(patient.admittedOnRaw);
    if (!raw) continue;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return labels.map((entry) => ({
    label: entry.label,
    value: counts.get(entry.key) ?? 0,
  }));
}

function countUnique(values: Array<string | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value && value !== "-"))).size;
}

function normalizeIpUsers(payload: unknown): IpUserLite[] {
  return extractList(payload).map((entry, index) => ({
    id: safeText(entry.id, entry.uid, entry.userId, `ip-user-${index + 1}`),
    fullName:
      safeText(entry.fullName, entry.name, [entry.firstName, entry.lastName].filter(Boolean).join(" ").trim()) ||
      `User ${index + 1}`,
    userType: safeText(entry.userType, entry.roleName, "USER"),
  }));
}

function normalizeIpDetail(payload: unknown): IpDetail {
  const entry = toRecord(payload);
  const caseRecord = toRecord(entry.case ?? entry.mrCase ?? entry.caseDetails);
  const consumerRecord = toRecord(entry.consumer ?? entry.providerConsumer ?? entry.customer);
  const doctorRecord = toRecord(entry.attendingDoctor ?? entry.doctor ?? entry.primaryProvider);
  const admittedOnRaw = entry.admittedOn ?? entry.admittedDate ?? entry.admissionDate ?? entry.createdDate;

  return {
    id: safeText(entry.uid, entry.id, entry.inPatientNumber),
    patient: composePersonName(entry, "providerConsumer", "patient", "consumer") || "-",
    status: safeText(entry.status, entry.inPatientStatus, entry.admissionStatus, "Unknown"),
    admittedOn: formatDate(admittedOnRaw),
    expectedDischarge: formatDate(entry.expectedDischargeDate ?? entry.dischargeDate ?? entry.expectedDischarge),
    ward: safeText(entry.wardName, entry.departmentName, entry.roomName, entry.roomNumber, entry.ward) || "-",
    bed: safeText(entry.bedName, entry.bedNumber, entry.roomNumber, entry.roomName) || "-",
    attendingDoctor:
      safeText(
        entry.attendingDoctorName,
        entry.doctorName,
        doctorRecord.fullName,
        [doctorRecord.firstName, doctorRecord.lastName].filter(Boolean).join(" ").trim()
      ) || "-",
    reason: safeText(entry.reasonForAdmission, entry.reason, entry.chiefComplaint, entry.notes, entry.medicalCondition) || "-",
    caseId: safeText(caseRecord.uid, entry.caseUid, entry.mrCaseUid),
    customerId: safeText(consumerRecord.id, consumerRecord.uid, entry.consumerId, entry.providerConsumerId),
    customerName:
      safeText(
        consumerRecord.name,
        consumerRecord.fullName,
        [consumerRecord.firstName, consumerRecord.lastName].filter(Boolean).join(" ").trim()
      ) || composePersonName(entry, "providerConsumer", "patient", "consumer") || "-",
    customerPhone: safeText(consumerRecord.primaryMobileNo, consumerRecord.mobileNo, consumerRecord.phoneNumber, consumerRecord.phone),
    customerEmail: safeText(consumerRecord.email, consumerRecord.primaryEmail),
    notes: safeText(entry.notes, entry.description, caseRecord.description),
    users: [],
    doctors: [],
  };
}

export async function loadIpDataset(api: RequestApi, locationId?: string | null): Promise<IpDataset> {
  const locationFilter = buildLocationFilter(locationId);
  const inpatientParams = { params: { ...locationFilter, from: 0, count: 25 } };
  const bedsParams = { params: { ...locationFilter, from: 0, count: 30 } };
  const invoiceParams = { params: { ...locationFilter, from: 0, count: 25 } };
  const countParams = Object.keys(locationFilter).length ? { params: locationFilter } : undefined;

  const [patientsResult, patientCountResult, bedsResult, invoicesResult] = await Promise.allSettled([
    api.get<unknown>("provider/inpatient", inpatientParams),
    api.get<number>("provider/inpatient/count", countParams),
    api.get<unknown>("provider/bed", bedsParams),
    api.get<unknown>("provider/ip/invoice", invoiceParams),
  ]);

  const patientPayload = patientsResult.status === "fulfilled" ? patientsResult.value.data : [];
  const bedPayload = bedsResult.status === "fulfilled" ? bedsResult.value.data : [];
  const invoicePayload = invoicesResult.status === "fulfilled" ? invoicesResult.value.data : [];

  const patients = normalizePatients(patientPayload);
  const admissions = normalizeAdmissions(patientPayload);
  const beds = normalizeBeds(bedPayload);
  const billing = normalizeBilling(invoicePayload);
  const patientCount = patientCountResult.status === "fulfilled" ? safeNumber(patientCountResult.value.data) : patients.length;
  const occupiedBeds = beds.filter((bed) => bed.occupancy === "Occupied").length;
  const availableBeds = beds.filter((bed) => bed.occupancy === "Available").length;
  const cleaningBeds = beds.filter((bed) => bed.occupancy === "Cleaning").length;
  const outstandingBilling = billing.reduce((total, row) => total + row.amount, 0);
  const patientStatusCounts = {
    Admitted: patients.filter((patient) => patient.status === "Admitted").length,
    "Under Observation": patients.filter((patient) => patient.status === "Under Observation").length,
    "Ready for Discharge": patients.filter((patient) => patient.status === "Ready for Discharge").length,
  } as const;
  const totalBeds = beds.length;
  const occupancyRate = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const buildingsCount = countUnique(beds.map((bed) => bed.building));
  const floorsCount = countUnique(beds.map((bed) => bed.floor));
  const roomsCount = countUnique(beds.map((bed) => bed.room));

  return {
    title: "Inpatient Dashboard",
    subtitle: "Admissions, bed occupancy, and billing are now loaded from the live IP service.",
    summaries: [
      { label: "Active Patients", value: String(patientCount || countActivePatients(patients)), accent: "teal" },
      { label: "Occupied Beds", value: String(occupiedBeds), accent: "sky" },
      { label: "Expected Discharges", value: String(countExpectedDischarges(admissions)), accent: "amber" },
      { label: "Outstanding Billing", value: formatCurrency(outstandingBilling), accent: "rose" },
    ],
    patients,
    admissions,
    beds,
    billing,
    dashboard: {
      bedStatusCounts: {
        Occupied: occupiedBeds,
        Available: availableBeds,
        Cleaning: cleaningBeds,
      },
      patientStatusCounts,
      occupancyRate,
      buildingsCount,
      floorsCount,
      roomsCount,
      admissionsLast7Days: buildAdmissionsLast7Days(patients),
    },
  };
}

export async function loadIpDetail(api: RequestApi, ipUid: string): Promise<IpDetail> {
  const detailResponse = await api.get<unknown>(`provider/inpatient/${ipUid}`);
  const detail = normalizeIpDetail(detailResponse.data);

  const [customerResult, caseResult, usersResult, doctorsResult] = await Promise.allSettled([
    detail.customerId ? api.get<unknown>(`provider/customers/${detail.customerId}`) : Promise.resolve({ data: null }),
    detail.caseId ? api.get<unknown>(`provider/medicalrecord/case/${detail.caseId}`) : Promise.resolve({ data: null }),
    api.get<unknown>("provider/user", { params: { "status-eq": "ACTIVE" } }),
    api.get<unknown>("provider/user", { params: { "status-eq": "ACTIVE", "userType-eq": "PROVIDER" } }),
  ]);

  const customerData = customerResult.status === "fulfilled" ? toRecord(customerResult.value.data) : {};
  const caseData = caseResult.status === "fulfilled" ? toRecord(caseResult.value.data) : {};
  const users = usersResult.status === "fulfilled" ? normalizeIpUsers(usersResult.value.data) : [];
  const doctors = doctorsResult.status === "fulfilled" ? normalizeIpUsers(doctorsResult.value.data) : [];

  return {
    ...detail,
    customerName:
      safeText(
        customerData.name,
        customerData.fullName,
        [customerData.firstName, customerData.lastName].filter(Boolean).join(" ").trim()
      ) || detail.customerName,
    customerPhone: safeText(customerData.primaryMobileNo, customerData.mobileNo, customerData.phoneNumber) || detail.customerPhone,
    customerEmail: safeText(customerData.email, customerData.primaryEmail) || detail.customerEmail,
    notes: safeText(caseData.description, caseData.notes, detail.notes) || detail.notes,
    users,
    doctors,
  };
}

