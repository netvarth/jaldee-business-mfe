import { useQuery } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';

export interface DrugRegisterEntryDto {
  uid: string;
  tenantUid?: string;
  orderUid?: string;
  orderNo?: string;
  orderItemUid?: string;
  itemUid: string;
  itemName: string;
  drugSchedule: 'H' | 'H1' | 'H2' | 'X' | 'NARCOTIC' | 'SCHEDULE_H' | 'SCHEDULE_H1' | 'SCHEDULE_X' | 'SCHEDULE_NARCOTIC' | 'SCHEDULE_AYUSH_E1';
  registerType?: string;
  runningBalance?: number;
  batchNo?: string;
  batchNumber?: string;
  expiryDate?: string;
  qty: number;
  quantityDispensed?: number;
  unitName?: string;
  prescriberName?: string;
  prescribingDoctor?: string;
  prescriberRegNo?: string;
  doctorRegNo?: string;
  hospitalClinic?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientAddress?: string;
  patientPhone?: string;
  prescriptionRef?: string;
  dispensedAt?: string;
  dispenseDate?: string;
  dispensedBy?: string;
  dispensedByName?: string;
  pharmacistRegNo?: string;
  composition?: string;
  remarks?: string;
}

export interface DrugRegisterQueryParams {
  storeUid?: string;
  schedule?: string;
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
  page?: number;
  size?: number;
}

export interface DrugRegisterSummaryDto {
  totalRecords: number;
  scheduleH1Count: number;
  narcoticCount: number;
  scheduleXCount: number;
  ayushE1Count: number;
  uniquePrescribersCount: number;
  uniquePatientsCount: number;
}

export function useDrugRegister(params: DrugRegisterQueryParams = {}) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['drug-register', params],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.schedule && params.schedule !== 'ALL') {
        const sch = params.schedule.replace('SCHEDULE_', '');
        q.set('schedule', sch);
      }
      if (params.fromDate) q.set('from', params.fromDate);
      if (params.toDate) q.set('to', params.toDate);
      if (params.page !== undefined) q.set('page', String(params.page));
      if (params.size !== undefined) q.set('size', String(params.size || 50));

      const qs = q.toString();
      const url = `/v1/api/tenant/pharma/drug-register${qs ? `?${qs}` : ''}`;
      try {
        const raw = await api.get<any>(url);
        if (Array.isArray(raw)) return raw;
        if (raw?.content && Array.isArray(raw.content)) return raw.content;
        if (raw?.data && Array.isArray(raw.data)) return raw.data;
        if (raw?.items && Array.isArray(raw.items)) return raw.items;
        return [];
      } catch (err) {
        console.warn('Failed to load drug register:', err);
        return [];
      }
    },
    staleTime: 30_000,
  });
}

export function useDrugRegisterSummary(storeUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['drug-register-summary', storeUid],
    queryFn: async () => {
      const url = storeUid
        ? `/v1/api/tenant/pharma/drug-register/summary?storeUid=${storeUid}`
        : '/v1/api/tenant/pharma/drug-register/summary';
      try {
        const data = await api.get<DrugRegisterSummaryDto>(url);
        return data || {
          totalRecords: 0,
          scheduleH1Count: 0,
          narcoticCount: 0,
          scheduleXCount: 0,
          ayushE1Count: 0,
          uniquePrescribersCount: 0,
          uniquePatientsCount: 0,
        };
      } catch {
        return {
          totalRecords: 0,
          scheduleH1Count: 0,
          narcoticCount: 0,
          scheduleXCount: 0,
          ayushE1Count: 0,
          uniquePrescribersCount: 0,
          uniquePatientsCount: 0,
        };
      }
    },
    staleTime: 60_000,
  });
}

export function exportDrugRegisterCsv(entries: DrugRegisterEntryDto[], filename = 'Statutory_Drug_Register.csv') {
  const list = Array.isArray(entries) ? entries : [];
  const headers = [
    'Sl No', 'Date', 'Patient Name', 'Patient Address', 'Doctor Name',
    'Doctor Reg No', 'Drug Name', 'Composition', 'Batch No', 'Expiry Date',
    'Qty Dispensed', 'Schedule', 'Prescription Ref', 'Dispensed By'
  ];

  const rows = list.map((e, idx) => {
    const dt = e.dispensedAt || e.dispenseDate;
    const doc = e.prescriberName || e.prescribingDoctor || '';
    const reg = e.prescriberRegNo || e.doctorRegNo || '';
    const qtyVal = e.qty || e.quantityDispensed || 0;
    const batch = e.batchNo || e.batchNumber || '';
    const disp = e.dispensedByName || e.dispensedBy || '';

    return [
      idx + 1,
      dt ? new Date(dt).toLocaleDateString('en-IN') : '',
      `"${(e.patientName || '').replace(/"/g, '""')}"`,
      `"${(e.patientAddress || '').replace(/"/g, '""')}"`,
      `"${doc.replace(/"/g, '""')}"`,
      reg,
      `"${(e.itemName || '').replace(/"/g, '""')}"`,
      `"${(e.composition || '').replace(/"/g, '""')}"`,
      batch,
      e.expiryDate || '',
      qtyVal,
      e.drugSchedule || '',
      e.prescriptionRef || '',
      `"${disp.replace(/"/g, '""')}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
