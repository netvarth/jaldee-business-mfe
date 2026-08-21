import React, { useState } from 'react';
import {
  ArrowLeft, Search, Plus, ChevronDown, Pencil,
  MoreHorizontal, ChevronLeft, ChevronRight, Check, Trash2,
  Mail, Phone, Copy, Archive, Eye, CreditCard, Landmark, CheckCircle2, X,
  Filter, FileText, Calendar, PlusCircle, Activity, ShieldAlert, Heart, User, Sparkles,
  Users, FolderHeart, Camera, Info, MapPin, Tag, AlertTriangle, Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useCustomerLabels } from '../../../services/useCustomerLabels';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useCustomerOrders } from '../../../services/useCustomers';
import { useCustomerGroups } from '../../../services/useCustomerGroups';

export interface GroupItem {
  id: string;
  name: string;
  description: string;
  category: string;
  createdDate: string;
  memberIds: string[]; // references CustomerItem.id for group members
}

export interface CustomerItem {
  id: string;
  name: string;
  code: string; // Patient UHID format like #P-00492
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  bloodGroup: string;
  lastVisit: string;
  totalVisits: number;
  totalBilled: number;
  outstanding: number;
  allergies?: string;
  insuranceNo?: string;
  insuranceProvider?: string;
  address?: string;

  // Custom added fields for exact compliance
  salutation?: string;
  firstName?: string;
  lastName?: string;
  secondaryPhone?: string;
  whatsapp?: string;
  telegram?: string;
  dob?: string;
  ageY?: number;
  ageM?: number;
  ageD?: number;
}

interface VisitRecord {
  id: string;
  date: string;
  department: string;
  doctorName: string;
  diagnoses: string;
  status: 'Completed' | 'Pending' | 'Follow-up';
}

interface BillingInvoices {
  id: string;
  date: string;
  category: string;
  amount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
}

interface CountryPhoneInputProps {
  countryValue: string;
  onCountryChange: (val: string) => void;
  phoneValue: string;
  onPhoneChange: (val: string) => void;
  placeholder: string;
}

const CountryPhoneInput = ({
  countryValue,
  onCountryChange,
  phoneValue,
  onPhoneChange,
  placeholder
}: CountryPhoneInputProps) => {
  return (
    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#55349A] focus-within:ring-1 focus-within:ring-[#55349A] transition-all shadow-3xs h-10 w-full">
      <div className="relative flex items-center bg-slate-50 border-r border-slate-150 px-3 shrink-0">
        <select
          value={countryValue}
          onChange={(e) => onCountryChange(e.target.value)}
          className="appearance-none bg-transparent pr-5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer h-full border-none"
        >
          <option value="+91">🇮🇳 +91</option>
          <option value="+1">🇺🇸 +1</option>
          <option value="+44">🇬🇧 +44</option>
          <option value="+971">🇦🇪 +971</option>
          <option value="+65">🇸🇬 +65</option>
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
      </div>
      <input
        type="tel"
        value={phoneValue}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 w-full border-none outline-none px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent h-full"
      />
    </div>
  );
};

// Age-DOB helper functions
const calculateAgeFromDob = (dobStr: string) => {
  if (!dobStr) return { years: 0, months: 0, days: 0 };
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return { years: 0, months: 0, days: 0 };
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days)
  };
};

const calculateDobFromAge = (years: number, months: number, days: number) => {
  const today = new Date();
  const dob = new Date(
    today.getFullYear() - (years || 0),
    today.getMonth() - (months || 0),
    today.getDate() - (days || 0)
  );
  return dob.toISOString().split('T')[0];
};

interface CustomersTableProps {
  onBack?: () => void;
}

export const CustomersTable = ({ onBack }: CustomersTableProps) => {
  // `searchQuery` must be declared before `useCustomers` reads it. It used to be
  // declared ~45 lines below this call, which put it in the temporal dead zone
  // and threw "Cannot access 'searchQuery' before initialization" on every render.
  const [searchQuery, setSearchQuery] = useState('');
  const { data: backendCustomers } = useCustomers(searchQuery);

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const [selectedDetails, setSelectedDetails] = useState<CustomerItem | null>(null);
  const { data: customerOrdersData, isLoading: isOrdersLoading } = useCustomerOrders(selectedDetails?.id || null);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);

  // Booking-style: drive the list from live commerce data (no mock fallback) so a
  // backend gap shows as an empty state rather than fake rows.
  React.useEffect(() => {
    if (!backendCustomers) return;
    const toAge = (dob?: string) => {
      if (!dob) return 0;
      const d = new Date(dob);
      if (isNaN(d.getTime())) return 0;
      return Math.max(0, Math.floor((Date.now() - d.getTime()) / 3.15576e10));
    };
    setCustomers(
      backendCustomers.map((c: any): CustomerItem => ({
        id: c.uid,
        name: c.displayName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Unknown',
        code: c.consumerNo || (c.uid ? `#${String(c.uid).slice(0, 6).toUpperCase()}` : '—'),
        gender: c.gender === 'MALE' ? 'Male' : c.gender === 'FEMALE' ? 'Female' : 'Other',
        age: toAge(c.dob),
        phone: c.phoneE164 || '—',
        email: c.email || '—',
        status: c.status === 'ACTIVE' ? 'Active' : 'Inactive',
        bloodGroup: '—',
        lastVisit: '—',
        totalVisits: 0,
        totalBilled: 0,
        outstanding: 0,
        address: c.address || '',
        firstName: c.firstName,
        lastName: c.lastName,
        dob: c.dob,
      }))
    );
  }, [backendCustomers]);
  const [visits, setVisits] = useState<Record<string, VisitRecord[]>>({});
  const [invoices, setInvoices] = useState<Record<string, BillingInvoices[]>>({});

  // Search & Filter state (`searchQuery` is declared at the top of the component,
  // above the useCustomers call that consumes it)
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  // Tabs for view switcher
  const [activeTab, setActiveTab] = useState<'customers' | 'groups'>('customers');
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<GroupItem | null>(null);

  // Groups and group modal form states
  const { data: customerGroupsData } = useCustomerGroups();
  const [groups, setGroups] = useState<GroupItem[]>([]);

  React.useEffect(() => {
    if (customerGroupsData && customerGroupsData.length > 0) {
      setGroups(customerGroupsData.map((g: any) => ({
        id: g.uid,
        name: g.name,
        description: g.description || '',
        category: 'Customer',
        createdDate: new Date().toLocaleDateString(),
        memberIds: []
      })));
    }
  }, [customerGroupsData]);

  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [groupFormMode, setGroupFormMode] = useState<'create' | 'edit'>('create');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    category: 'Wellness',
    memberIds: [] as string[],
    generateMemberId: false
  });
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupMemberSearchQuery, setGroupMemberSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Selected row tracking
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);

  // Page drill down/detail state
  // moved selectedDetails to top
  const [activeDetailTab, setActiveDetailTab] = useState<'Check-ups' | 'Invoices' | 'Notes'>('Check-ups');
  const [visitNotes, setVisitNotes] = useState<Record<string, string>>({
    '1': 'Emily Watson updates: Heart symptoms controlled with Atenolol. Instructed to reduce sodium intake strictly. Reminded for cardiac treadmill test next month.',
    '2': 'Marcus Aurelius has chronic osteoarthritis. Lower back symptoms respond well to lumbar orthosis belt and scheduled physiotherapy. Advised low impact elliptical workouts.',
    '3': 'Sarah Jenkins: Dermatitis outbreak appears completely resolved. Advised avoiding sulfur soaps and strong chemical detergents.',
    '4': 'Robert Downey Jr.: Heart health is stable. Routine cardiovascular evaluations completed. Follow-up diagnostic scan on physical load in 3 months.',
    '5': 'Diana Prince: Outstanding flexibility and motor strength. No muscular signs of stress. Recommend simple wellness reviews.',
    '6': 'Bruce Wayne: Multiple musculoskeletal fractures and deep tissue trauma in various healing stages. Advised absolute rest for next 14 days.',
    '7': 'Clarissa Harlowe: Gastric symptoms under control. Follow gluten-free dietary regimen strictly. Reminded for probiotics replenishment.'
  });
  const [rawNote, setRawNote] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerItem | null>(null);

  // Form fields
  const [formSalutation, setFormSalutation] = useState<'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Mx'>('Mr');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  const [formPhoneCountry, setFormPhoneCountry] = useState('+91');
  const [formPhoneVal, setFormPhoneVal] = useState('');

  const [formSecPhoneCountry, setFormSecPhoneCountry] = useState('+91');
  const [formSecPhoneVal, setFormSecPhoneVal] = useState('');

  const [formWhatsappCountry, setFormWhatsappCountry] = useState('+91');
  const [formWhatsappVal, setFormWhatsappVal] = useState('');

  const [formTelegramCountry, setFormTelegramCountry] = useState('+91');
  const [formTelegramVal, setFormTelegramVal] = useState('');

  const [formEmail, setFormEmail] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formAgeY, setFormAgeY] = useState<number | ''>('');
  const [formAgeM, setFormAgeM] = useState<number | ''>('');
  const [formAgeD, setFormAgeD] = useState<number | ''>('');
  const [formAddress, setFormAddress] = useState('');

  // Extra fields for medical records consistency
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formAllergies, setFormAllergies] = useState('');
  const [formInsuranceProvider, setFormInsuranceProvider] = useState('');
  const [formInsuranceNo, setFormInsuranceNo] = useState('');

  // --- Create/Edit profile UI state (new full-page layout) ---
  const [formWhatsappSame, setFormWhatsappSame] = useState(true);
  const [formShowSecondary, setFormShowSecondary] = useState(false);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [formPhotoDragOver, setFormPhotoDragOver] = useState(false);
  const [formSelectedLabels, setFormSelectedLabels] = useState<string[]>([]);

  // Relationship labels come from the real CRM label catalogue.
  const { data: crmLabels } = useCustomerLabels();

  const readPhotoFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setFormPhotoPreview(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleFormLabel = (label: string) => {
    setFormSelectedLabels(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  // Helper calculation functions
  const handleDobChange = (dobVal: string) => {
    setFormDob(dobVal);
    if (!dobVal) return;
    const { years, months, days } = calculateAgeFromDob(dobVal);
    setFormAgeY(years);
    setFormAgeM(months);
    setFormAgeD(days);
  };

  const handleAgeChange = (y: number | '', m: number | '', d: number | '') => {
    setFormAgeY(y);
    setFormAgeM(m);
    setFormAgeD(d);

    // Suggest DOB based on Age Y M D
    const dobVal = calculateDobFromAge(Number(y) || 0, Number(m) || 0, Number(d) || 0);
    setFormDob(dobVal);
  };

  // Navigation handlers
  const handleCreateInit = () => {
    setEditTarget(null);
    setFormSalutation('Mr');
    setFormFirstName('');
    setFormLastName('');
    // UHID Suggestion: starts at 856 (since last used is 855)
    setFormCode('856');
    setFormGender('Male');
    setFormPhoneCountry('+91');
    setFormPhoneVal('');
    setFormSecPhoneCountry('+91');
    setFormSecPhoneVal('');
    setFormWhatsappCountry('+91');
    setFormWhatsappVal('');
    setFormTelegramCountry('+91');
    setFormTelegramVal('');
    setFormEmail('');
    setFormDob('');
    setFormAgeY('');
    setFormAgeM('');
    setFormAgeD('');
    setFormAddress('');
    setFormStatus('Active');
    setFormBloodGroup('O+');
    setFormAllergies('');
    setFormInsuranceProvider('');
    setFormInsuranceNo('');
    setFormWhatsappSame(true);
    setFormShowSecondary(false);
    setFormPhotoPreview(null);
    setFormSelectedLabels([]);
    setShowForm(true);
  };

  const handleEditInit = (customer: CustomerItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(customer);

    // Dynamic parsing of name
    let sal: any = 'Mr';
    let first = '';
    let last = '';
    const parts = customer.name.split(' ');
    if (parts.length > 0) {
      // Strip any training dots or parse directly
      const firstPart = parts[0].replace('.', '');
      if (['Mr', 'Mrs', 'Ms', 'Dr', 'Mx'].includes(firstPart)) {
        sal = firstPart;
        first = parts[1] || '';
        last = parts.slice(2).join(' ') || '';
      } else {
        first = parts[0];
        last = parts.slice(1).join(' ') || '';
      }
    }

    setFormSalutation(sal);
    setFormFirstName(first);
    setFormLastName(last);

    // Customer Patient ID format (#P-00856 or similar) to simple editable or suggetion
    setFormCode(customer.code ? customer.code.replace('#P-', '') : '');
    setFormGender(customer.gender);

    // Parse Phone
    const phoneStr = customer.phone || '';
    const phoneParts = phoneStr.split(' ');
    if (phoneParts.length > 1 && phoneParts[0].startsWith('+')) {
      setFormPhoneCountry(phoneParts[0]);
      setFormPhoneVal(phoneParts.slice(1).join(' '));
    } else {
      setFormPhoneCountry('+91');
      setFormPhoneVal(phoneStr);
    }

    // Parse secondary, WhatsApp, Telegram or set defaults
    const secPhoneStr = customer.secondaryPhone || '';
    const secPhoneParts = secPhoneStr.split(' ');
    if (secPhoneParts.length > 1 && secPhoneParts[0].startsWith('+')) {
      setFormSecPhoneCountry(secPhoneParts[0]);
      setFormSecPhoneVal(secPhoneParts.slice(1).join(' '));
    } else {
      setFormSecPhoneCountry('+91');
      setFormSecPhoneVal(secPhoneStr);
    }

    const waStr = customer.whatsapp || '';
    const waParts = waStr.split(' ');
    if (waParts.length > 1 && waParts[0].startsWith('+')) {
      setFormWhatsappCountry(waParts[0]);
      setFormWhatsappVal(waParts.slice(1).join(' '));
    } else {
      setFormWhatsappCountry('+91');
      setFormWhatsappVal(waStr);
    }

    const tgStr = customer.telegram || '';
    const tgParts = tgStr.split(' ');
    if (tgParts.length > 1 && tgParts[0].startsWith('+')) {
      setFormTelegramCountry(tgParts[0]);
      setFormTelegramVal(tgParts.slice(1).join(' '));
    } else {
      setFormTelegramCountry('+91');
      setFormTelegramVal(tgStr);
    }

    setFormEmail(customer.email || '');
    setFormDob(customer.dob || '');
    setFormAgeY(customer.ageY !== undefined ? customer.ageY : (customer.age !== undefined ? customer.age : ''));
    setFormAgeM(customer.ageM !== undefined ? customer.ageM : '');
    setFormAgeD(customer.ageD !== undefined ? customer.ageD : '');
    setFormAddress(customer.address || '');
    setFormStatus(customer.status);
    setFormBloodGroup(customer.bloodGroup || 'O+');
    setFormAllergies(customer.allergies || '');
    setFormInsuranceProvider(customer.insuranceProvider || '');
    setFormInsuranceNo(customer.insuranceNo || '');

    // Only treat WhatsApp as "same as primary" when it genuinely matches.
    setFormWhatsappSame(!customer.whatsapp || customer.whatsapp === customer.phone);
    setFormShowSecondary(Boolean(customer.secondaryPhone));
    setFormPhotoPreview(null);
    setFormSelectedLabels([]);

    setShowForm(true);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this customer/patient record?')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSelectedIds(prev => prev.filter(cur => cur !== id));
      if (selectedDetails?.id === id) {
        setSelectedDetails(null);
      }
      deleteCustomerMutation.mutate(id);
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Confirm deleting the selected ${selectedIds.length} customer records?`)) {
      setCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim()) return;

    // Synthesize name
    const combinedName = `${formSalutation}. ${formFirstName.trim()} ${formLastName.trim()}`.replace(/\s+/g, ' ');
    // suggestion starts as editable patient ID code
    const cleanCode = formCode.startsWith('#P-') ? formCode : `#P-${formCode.trim().padStart(5, '0')}`;

    const formattedPhone = formPhoneVal.trim() ? `${formPhoneCountry} ${formPhoneVal.trim()}` : 'N/A';
    const formattedSecPhone = formShowSecondary && formSecPhoneVal.trim()
      ? `${formSecPhoneCountry} ${formSecPhoneVal.trim()}`
      : '';
    // "Same as primary" mirrors the primary mobile rather than storing a stale value.
    const formattedWhatsapp = formWhatsappSame
      ? (formPhoneVal.trim() ? `${formPhoneCountry} ${formPhoneVal.trim()}` : '')
      : (formWhatsappVal.trim() ? `${formWhatsappCountry} ${formWhatsappVal.trim()}` : '');
    const formattedTelegram = formTelegramVal.trim() ? `${formTelegramCountry} ${formTelegramVal.trim()}` : '';

    const ageValue = formAgeY !== '' ? Number(formAgeY) : 0;

    if (editTarget) {
      // Editing
      setCustomers(prev => prev.map(c => c.id === editTarget.id ? {
        ...c,
        name: combinedName,
        code: cleanCode,
        gender: formGender,
        age: ageValue,
        phone: formattedPhone,
        email: formEmail.trim(),
        status: formStatus,
        bloodGroup: formBloodGroup,
        allergies: formAllergies.trim(),
        insuranceProvider: formInsuranceProvider.trim(),
        insuranceNo: formInsuranceNo.trim(),
        address: formAddress.trim(),

        // Exact custom fields mapped & preserved
        salutation: formSalutation,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        secondaryPhone: formattedSecPhone,
        whatsapp: formattedWhatsapp,
        telegram: formattedTelegram,
        dob: formDob,
        ageY: formAgeY !== '' ? Number(formAgeY) : undefined,
        ageM: formAgeM !== '' ? Number(formAgeM) : undefined,
        ageD: formAgeD !== '' ? Number(formAgeD) : undefined,
      } : c));

      updateCustomerMutation.mutate({
        uid: editTarget.id,
        title: formSalutation || undefined,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim() || undefined,
        primaryCountryCode: formPhoneCountry || undefined,
        primaryNumber: formPhoneVal.trim() || undefined,
        email: formEmail.trim() || undefined,
        gender: formGender === 'Male' ? 'MALE' : formGender === 'Female' ? 'FEMALE' : undefined,
        dob: formDob || undefined,
        address: formAddress.trim() || undefined,
      });
    } else {
      // Adding new
      const newCustomer: CustomerItem = {
        id: String(Date.now()),
        name: combinedName,
        code: cleanCode,
        gender: formGender,
        age: ageValue,
        phone: formattedPhone,
        email: formEmail.trim() || 'N/A',
        status: formStatus,
        bloodGroup: formBloodGroup,
        lastVisit: 'Today',
        totalVisits: 1,
        totalBilled: 0,
        outstanding: 0,
        allergies: formAllergies.trim() || 'None',
        insuranceProvider: formInsuranceProvider.trim() || 'None',
        insuranceNo: formInsuranceNo.trim() || 'None',
        address: formAddress.trim(),

        // Map custom fields
        salutation: formSalutation,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        secondaryPhone: formattedSecPhone,
        whatsapp: formattedWhatsapp,
        telegram: formattedTelegram,
        dob: formDob,
        ageY: formAgeY !== '' ? Number(formAgeY) : undefined,
        ageM: formAgeM !== '' ? Number(formAgeM) : undefined,
        ageD: formAgeD !== '' ? Number(formAgeD) : undefined,
      };
      setCustomers(prev => [newCustomer, ...prev]);
      // Persist to commerce-service (CRM). On success the query refetches real data.
      createCustomerMutation.mutate({
        title: formSalutation || undefined,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim() || undefined,
        primaryCountryCode: formPhoneCountry || undefined,
        primaryNumber: formPhoneVal.trim() || undefined,
        email: formEmail.trim() || undefined,
        gender: formGender === 'Male' ? 'MALE' : formGender === 'Female' ? 'FEMALE' : undefined,
        dob: formDob || undefined,
        address: formAddress.trim() || undefined,
      });
    }
    setShowForm(false);
  };

  // ==================== OPERATIONAL GROUPS ACTIONS ====================
  const handleCreateGroupInit = () => {
    setGroupFormMode('create');
    setGroupFormData({
      name: '',
      description: '',
      category: 'Wellness',
      memberIds: [],
      generateMemberId: false
    });
    setEditingGroupId(null);
    setIsGroupFormOpen(true);
  };

  const handleEditGroupInit = (group: GroupItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setGroupFormMode('edit');
    setEditingGroupId(group.id);
    setGroupFormData({
      name: group.name,
      description: group.description,
      category: group.category || 'Wellness',
      memberIds: group.memberIds,
      generateMemberId: (group as any).generateMemberId || false
    });
    setIsGroupFormOpen(true);
  };

  const handleDeleteGroup = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Are you absolutely sure you want to delete this group? Members will not be deleted.')) {
      setGroups(prev => prev.filter(g => g.id !== id));
      if (selectedGroupDetails?.id === id) {
        setSelectedGroupDetails(null);
      }
    }
  };

  const handleGroupFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) {
      alert('Please provide a group name.');
      return;
    }

    if (groupFormMode === 'create') {
      const newGroup: GroupItem = {
        id: `g-${Date.now()}`,
        name: groupFormData.name.trim(),
        description: groupFormData.description.trim(),
        category: groupFormData.category,
        createdDate: '11-Jun-2026',
        memberIds: groupFormData.memberIds,
        ...({ generateMemberId: groupFormData.generateMemberId })
      } as any;
      setGroups(prev => [newGroup, ...prev]);
    } else {
      if (!editingGroupId) return;
      setGroups(prev => prev.map(g => {
        if (g.id === editingGroupId) {
          const updated = {
            ...g,
            name: groupFormData.name.trim(),
            description: groupFormData.description.trim(),
            category: groupFormData.category,
            memberIds: groupFormData.memberIds,
            generateMemberId: groupFormData.generateMemberId
          };
          if (selectedGroupDetails?.id === editingGroupId) {
            setSelectedGroupDetails(updated);
          }
          return updated;
        }
        return g;
      }));
    }
    setIsGroupFormOpen(false);
  };

  const toggleGroupMember = (customerId: string) => {
    setGroupFormData(prev => {
      const isEnrolled = prev.memberIds.includes(customerId);
      return {
        ...prev,
        memberIds: isEnrolled
          ? prev.memberIds.filter(id => id !== customerId)
          : [...prev.memberIds, customerId]
      };
    });
  };

  const handleAddMemberToGroup = (customerId: string) => {
    if (!selectedGroupDetails) return;
    if (selectedGroupDetails.memberIds.includes(customerId)) return;
    const updatedGroup = {
      ...selectedGroupDetails,
      memberIds: [...selectedGroupDetails.memberIds, customerId]
    };
    setGroups(prev => prev.map(g => g.id === selectedGroupDetails.id ? updatedGroup : g));
    setSelectedGroupDetails(updatedGroup);
  };

  const handleRemoveMemberFromGroup = (customerId: string) => {
    if (!selectedGroupDetails) return;
    const updatedGroup = {
      ...selectedGroupDetails,
      memberIds: selectedGroupDetails.memberIds.filter(id => id !== customerId)
    };
    setGroups(prev => prev.map(g => g.id === selectedGroupDetails.id ? updatedGroup : g));
    setSelectedGroupDetails(updatedGroup);
  };
  // ====================================================================

  // Selection logic
  const toggleAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(cur => cur !== id) : [...prev, id]
    );
  };

  // Note updates
  const handleSaveNotes = () => {
    if (!selectedDetails) return;
    setVisitNotes(prev => ({
      ...prev,
      [selectedDetails.id]: rawNote
    }));
    alert('Patient note updated successfully');
  };

  // Filter calculations
  const filteredCustomers = customers.filter(cust => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      cust.name.toLowerCase().includes(query) ||
      cust.code.toLowerCase().includes(query) ||
      cust.phone.toLowerCase().includes(query) ||
      cust.email.toLowerCase().includes(query) ||
      cust.bloodGroup.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || cust.status === statusFilter;
    const matchesGender = genderFilter === 'All' || cust.gender === genderFilter;

    return matchesSearch && matchesStatus && matchesGender;
  });

  // Pagination calculation
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  // Global statistics
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.status === 'Active').length;
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);
  const highRiskWithAllergies = customers.filter(c => c.allergies && c.allergies !== 'None').length;

  if (showForm) {
    const fieldCls =
      "w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium focus:bg-white focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10";
    const labelSm = "block text-[10px] font-black text-slate-400 uppercase tracking-wider";
    const quickLabels = (crmLabels || []).map(l => l.name);

    return (
      <div id="customers-form-view" className="flex flex-col flex-1 bg-[#FAFAFA] min-h-screen text-left select-none pb-28">

        {/* ------------------------- Sticky header ------------------------- */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 border border-slate-100 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              {editTarget ? 'Edit Customer Profile' : 'Create New Customer Profile'}
            </h1>
          </div>
          <span className="hidden sm:inline text-xs bg-[#55349A]/5 text-[#55349A] border border-[#55349A]/15 font-bold tracking-tight rounded-full px-3 py-1">
            HIPAA Audited Data Entry
          </span>
        </div>

        <form onSubmit={handleSaveForm}>
          {/* ---------------------------- Body grid ---------------------------- */}
          <div className="w-full px-4 py-4 sm:px-6 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ==================== LEFT (2 cols) ==================== */}
            <div className="lg:col-span-2 space-y-8">

              {/* -------------------- Card 1: demographics ------------------- */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#55349A]/10 flex items-center justify-center text-[#55349A]">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Basic Customer Information</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration demographics card</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Salutation */}
                  <div className="col-span-2 sm:col-span-1 space-y-1.5">
                    <label className={labelSm}>Salutation</label>
                    <div className="relative">
                      <select
                        value={formSalutation}
                        onChange={(e) => setFormSalutation(e.target.value as typeof formSalutation)}
                        className={cn(fieldCls, "appearance-none pr-8 cursor-pointer")}
                      >
                        {(['Mr', 'Mrs', 'Ms', 'Dr', 'Mx'] as const).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Customer ID */}
                  <div className="col-span-2 sm:col-span-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className={labelSm}>Customer ID *</label>
                      <span className="text-[9px] text-slate-400 font-bold italic">Auto-generated default</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. 856"
                      className={cn(fieldCls, "font-mono font-bold text-slate-800")}
                    />
                  </div>

                  {/* Names */}
                  <div className="space-y-1.5">
                    <label className={labelSm}>First Name *</label>
                    <input
                      type="text"
                      required
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      placeholder="e.g. Emily"
                      className={fieldCls}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelSm}>Last Name</label>
                    <input
                      type="text"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      placeholder="e.g. Watson"
                      className={fieldCls}
                    />
                  </div>

                  {/* Gender segmented control */}
                  <div className="col-span-2 space-y-2">
                    <label className={labelSm}>Gender Selection *</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(['Female', 'Male', 'Other'] as const).map(g => (
                        <button
                          type="button"
                          key={g}
                          onClick={() => setFormGender(g)}
                          className={cn(
                            "py-2 px-3 border rounded-xl text-xs font-bold text-center transition-all cursor-pointer",
                            formGender === g
                              ? "border-[#55349A] bg-[#FAF8FF] text-[#55349A] shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="space-y-1.5">
                    <label className={labelSm}>Date of Birth</label>
                    <input
                      type="date"
                      value={formDob}
                      onChange={(e) => handleDobChange(e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  {/* Clinic status */}
                  <div className="space-y-1.5">
                    <label className={labelSm}>Clinic Status</label>
                    <div className="relative">
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                        className={cn(fieldCls, "appearance-none pr-8 cursor-pointer")}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Age Y/M/D — auto-filled from DOB, still manually overridable */}
                  <div className="col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className={labelSm}>Age (Years, Months, Days)</label>
                      <span className="text-[9px] text-slate-400 font-bold italic">Auto-filled from DOB — editable</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <input
                        type="number"
                        min={0}
                        placeholder="Years"
                        value={formAgeY}
                        onChange={(e) => setFormAgeY(e.target.value === '' ? '' : Number(e.target.value))}
                        className={fieldCls}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Months"
                        value={formAgeM}
                        onChange={(e) => setFormAgeM(e.target.value === '' ? '' : Number(e.target.value))}
                        className={fieldCls}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Days"
                        value={formAgeD}
                        onChange={(e) => setFormAgeD(e.target.value === '' ? '' : Number(e.target.value))}
                        className={fieldCls}
                      />
                    </div>
                  </div>

                  {/* Blood group */}
                  <div className="col-span-2 sm:col-span-1 space-y-1.5">
                    <label className={labelSm}>Blood Group</label>
                    <div className="relative">
                      <select
                        value={formBloodGroup}
                        onChange={(e) => setFormBloodGroup(e.target.value)}
                        className={cn(fieldCls, "appearance-none pr-8 cursor-pointer")}
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------------- Card 2: contact & messengers --------------- */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Contact Information &amp; Messengers</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verify channels and communication handles</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Primary mobile */}
                  <div className="col-span-2 space-y-1.5">
                    <label className={labelSm}>Primary Mobile Phone *</label>
                    <CountryPhoneInput
                      countryValue={formPhoneCountry}
                      onCountryChange={setFormPhoneCountry}
                      phoneValue={formPhoneVal}
                      onPhoneChange={setFormPhoneVal}
                      placeholder="e.g. 98470 12345"
                    />
                  </div>

                  {/* WhatsApp same-as toggle */}
                  <div className="col-span-2 bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 space-y-3">
                    <label className="relative flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formWhatsappSame}
                        onChange={(e) => setFormWhatsappSame(e.target.checked)}
                        className="h-4 w-4 text-[#55349A] border-slate-300 rounded-md focus:ring-[#55349A]/20 cursor-pointer"
                      />
                      <span className="text-xs">
                        <span className="font-extrabold text-slate-800 block">WhatsApp handle is same as primary mobile</span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Utilize same catalog routing for automated confirmations.
                        </span>
                      </span>
                    </label>

                    <AnimatePresence>
                      {!formWhatsappSame && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-1.5 pt-2"
                        >
                          <label className={labelSm}>Dedicated WhatsApp Messenger Number</label>
                          <CountryPhoneInput
                            countryValue={formWhatsappCountry}
                            onCountryChange={setFormWhatsappCountry}
                            phoneValue={formWhatsappVal}
                            onPhoneChange={setFormWhatsappVal}
                            placeholder="e.g. 98470 99999"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Secondary number */}
                  <div className="col-span-2">
                    {!formShowSecondary ? (
                      <button
                        type="button"
                        onClick={() => setFormShowSecondary(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55349A] hover:underline cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Secondary Contact Number</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5 bg-slate-50/50 p-4 border border-slate-200/60 rounded-xl">
                        <div className="flex items-center justify-between">
                          <label className={labelSm}>Secondary Contact Number</label>
                          <button
                            type="button"
                            onClick={() => {
                              setFormShowSecondary(false);
                              setFormSecPhoneVal('');
                            }}
                            className="text-slate-400 hover:text-rose-600 text-[10px] font-bold hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <CountryPhoneInput
                          countryValue={formSecPhoneCountry}
                          onCountryChange={setFormSecPhoneCountry}
                          phoneValue={formSecPhoneVal}
                          onPhoneChange={setFormSecPhoneVal}
                          placeholder="e.g. 0487 244 1234"
                        />
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="col-span-2 sm:col-span-1 space-y-1.5">
                    <label className={labelSm}>Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="e.g. name@domain.com"
                        className={cn(fieldCls, "pl-9")}
                      />
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className="col-span-2 sm:col-span-1 space-y-1.5">
                    <label className={labelSm}>Telegram Username / Number</label>
                    <CountryPhoneInput
                      countryValue={formTelegramCountry}
                      onCountryChange={setFormTelegramCountry}
                      phoneValue={formTelegramVal}
                      onPhoneChange={setFormTelegramVal}
                      placeholder="Telegram user ID or phone"
                    />
                  </div>

                  {/* Address */}
                  <div className="col-span-2 border-t border-slate-100 pt-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Physical Post / Home Address</h4>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelSm}>Full Address</label>
                        <span className="text-[9px] text-slate-400 font-bold italic">Stored as one address field by commerce-service</span>
                      </div>
                      <textarea
                        rows={4}
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="House/building, street, landmark, city, state, pincode, country…"
                        className={cn(fieldCls, "resize-none leading-relaxed")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== RIGHT (1 col) ==================== */}
            <div className="space-y-8">

              {/* -------------------- Profile image (no backend) ------------- */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <label className={labelSm}>Client Profile Image</label>

                <div
                  onDragOver={(e) => { e.preventDefault(); setFormPhotoDragOver(true); }}
                  onDragLeave={() => setFormPhotoDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setFormPhotoDragOver(false);
                    readPhotoFile(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all",
                    formPhotoDragOver
                      ? "border-[#55349A] bg-[#FAF8FF]"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  )}
                >
                  {formPhotoPreview ? (
                    <div className="relative">
                      <img
                        src={formPhotoPreview}
                        alt="Customer avatar"
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-full object-cover border border-slate-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setFormPhotoPreview(null)}
                        title="Remove image"
                        className="absolute -top-1 -right-1 p-1 bg-rose-600 text-white rounded-full shadow-sm hover:scale-105 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-[#55349A]/10 text-[#55349A] rounded-full flex items-center justify-center mb-3">
                        <Camera className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-extrabold text-slate-700">Drag &amp; Drop Image</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPEG or PNG up to 2MB</p>
                      <label className="mt-3.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm">
                        <span>Browse Files</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => readPhotoFile(e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="text-[10px] font-semibold leading-relaxed text-amber-800">
                    Preview only — commerce-service has no customer-avatar upload endpoint, so this image is <strong>not saved</strong>.
                  </p>
                </div>
              </div>

              {/* ---------------------- Relationship labels ------------------ */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Tag className="h-4 w-4 text-slate-400" />
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800">Add Relationship Labels</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tag client segments for targeted filtering</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                  {formSelectedLabels.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No labels selected yet. Tap a preset below.</span>
                  ) : (
                    formSelectedLabels.map(lbl => (
                      <span
                        key={lbl}
                        className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide leading-none"
                      >
                        <span>{lbl}</span>
                        <button
                          type="button"
                          onClick={() => toggleFormLabel(lbl)}
                          className="hover:bg-purple-100 text-purple-600 rounded p-0.5 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Labels from CRM catalogue</span>
                  {quickLabels.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">
                      No labels configured for this tenant yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {quickLabels.map(lbl => {
                        const isSelected = formSelectedLabels.includes(lbl);
                        return (
                          <button
                            type="button"
                            key={lbl}
                            onClick={() => toggleFormLabel(lbl)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer uppercase",
                              isSelected
                                ? "bg-[#55349A] border-[#55349A] text-white shadow-sm"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                            )}
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="text-[10px] font-semibold leading-relaxed text-amber-800">
                    Presets are read live from the CRM label catalogue, but there is no
                    assign-label-on-create endpoint yet — selections here are <strong>not saved</strong>.
                  </p>
                </div>
              </div>

              {/* --------------------- Clinical & insurance ------------------ */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800">Clinical Cover &amp; Warnings</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Allergies and insurance policy</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelSm}>Allergies / Clinical Warnings</label>
                  <textarea
                    rows={2}
                    value={formAllergies}
                    onChange={(e) => setFormAllergies(e.target.value)}
                    placeholder="e.g. Lactose intolerance, Penicillin"
                    className={cn(fieldCls, "resize-none")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelSm}>Insurance Carrier Provider</label>
                  <input
                    type="text"
                    value={formInsuranceProvider}
                    onChange={(e) => setFormInsuranceProvider(e.target.value)}
                    placeholder="e.g. Star Health / Niva Bupa"
                    className={fieldCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelSm}>Policy Reference No</label>
                  <input
                    type="text"
                    value={formInsuranceNo}
                    onChange={(e) => setFormInsuranceNo(e.target.value)}
                    placeholder="e.g. POLICY-REG-90284X"
                    className={fieldCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------- Sticky footer -------------------------- */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-4 px-6 sm:px-8 flex items-center justify-between z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-semibold">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>* indicates required setup demographics rules</span>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 sm:flex-initial px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-extrabold text-slate-700 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-initial px-8 py-3 bg-[#55349A] hover:bg-[#432380] text-white rounded-xl text-xs sm:text-[13px] font-extrabold transition-all shadow-sm hover:shadow-md cursor-pointer text-center flex items-center justify-center gap-2.5"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
                <span>{editTarget ? 'Save Changes' : 'Save Customer Profile'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (selectedDetails) {
    const custId = selectedDetails.id;
    const patientVisits = visits[custId] || [];
    const patientInvoices = (customerOrdersData || []).map((o: any) => ({
      id: o.orderNo || o.uid,
      date: new Date(o.createdAt || Date.now()).toLocaleDateString(),
      category: 'Order',
      amount: o.netTotal || 0,
      paymentStatus: o.paymentStatus || 'Unpaid'
    }));
    const noteContent = visitNotes[custId] || 'No physician clinical notes on file.';

    return (
      <div id="customers-details-view" className="flex flex-col flex-1 bg-[#FAFAFA] min-h-screen">
        {/* Header bar */}
        <div className="bg-white border-b border-[#EBEBEB] py-4 px-8 flex items-center justify-between shrink-0 shadow-3xs select-none">
          <button
            type="button"
            onClick={() => setSelectedDetails(null)}
            className="flex items-center gap-1.5 text-slate-800 hover:text-[#55349A] font-extrabold transition-colors cursor-pointer border-none bg-transparent"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            <span className="text-[13px] tracking-tight">Back to Patient Directory</span>
          </button>

          <button
            onClick={(e) => handleEditInit(selectedDetails, e)}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white text-slate-700 font-bold text-xs rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit File
          </button>
        </div>

        {/* Detailed Sheet Content */}
        <div id="customer-profile-content" className="flex-1 overflow-y-auto p-6 md:p-8 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Column A: Left Primary Info Block */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 text-center space-y-5">

              {/* Badges/ID */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-400">{selectedDetails.code}</span>
                <span className={cn(
                  "px-2.5 py-0.5 text-[9px] font-black rounded-full border shadow-4xs uppercase tracking-wider",
                  selectedDetails.status === 'Active'
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  {selectedDetails.status}
                </span>
              </div>

              {/* Patient Initials */}
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-2xl bg-[#55349A]/5 border border-[#55349A]/15 flex items-center justify-center text-[#55349A] font-black text-xl shadow-4xs">
                  {selectedDetails.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>

              {/* Name Details */}
              <div className="space-y-1.5">
                <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">{selectedDetails.name}</h2>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                  <span className="uppercase">{selectedDetails.gender}</span>
                  <span>&middot;</span>
                  <span>{selectedDetails.age} Yrs</span>
                  <span>&middot;</span>
                  <span className="text-rose-500 font-extrabold">{selectedDetails.bloodGroup}</span>
                </div>
              </div>

              {/* Core metrics box */}
              <div className="grid grid-cols-3 border-t border-slate-100 pt-5 text-center gap-2 select-none">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Visits</span>
                  <span className="text-xs font-black text-slate-800 mt-1 block">{selectedDetails.totalVisits}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Outst.</span>
                  <span className="text-xs font-black text-rose-600 mt-1 block">₹{selectedDetails.outstanding.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Billed</span>
                  <span className="text-xs font-black text-[#55349A] mt-1 block">₹{(selectedDetails.totalBilled / 1000).toFixed(1)}k</span>
                </div>
              </div>
            </div>

            {/* Quick Contact detail info block */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
              <h4 className="text-[10px] font-black text-[#55349A] uppercase tracking-widest border-b border-slate-100 pb-2 text-left">Clinical Cover File</h4>

              <div className="space-y-3 text-xs text-left">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-400">Emergency Phone</span>
                  <span className="font-black text-slate-800 text-right">{selectedDetails.phone}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-400">Email Contact</span>
                  <span className="font-black text-slate-800 text-right truncate max-w-[150px]" title={selectedDetails.email}>{selectedDetails.email || 'None'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-400">Allergen Notice</span>
                  <span className="font-black text-red-650 bg-red-50/70 border border-red-200 rounded text-[9px] uppercase font-sans tracking-wide max-w-[150px] truncate px-1.5 py-0.5" title={selectedDetails.allergies}>
                    {selectedDetails.allergies || 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-400">Carrier Provider</span>
                  <span className="font-black text-slate-800 text-right truncate max-w-[150px]">{selectedDetails.insuranceProvider || 'Private Cash'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-400">Coverage Code</span>
                  <span className="font-black text-slate-800 text-right font-mono text-[11px] truncate max-w-[130px]">{selectedDetails.insuranceNo || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100">
                  <span className="font-bold text-slate-400">Resident Location Address:</span>
                  <span className="font-semibold text-slate-700 leading-relaxed text-[11px]">{selectedDetails.address || 'No residential address on file.'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column B: Right Dynamic Tabs Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">

              {/* Tab options bar */}
              <div className="border-b border-slate-100 bg-white/50 px-6 py-2 flex gap-4 select-none">
                {(['Check-ups', 'Invoices', 'Notes'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveDetailTab(tab);
                      if (tab === 'Notes') setRawNote(noteContent);
                    }}
                    className={cn(
                      "py-3 px-1 text-[11px] font-extrabold relative transition-colors focus:outline-none cursor-pointer border-none bg-transparent",
                      activeDetailTab === tab
                        ? "text-[#55349A]"
                        : "text-slate-400 hover:text-slate-800"
                    )}
                  >
                    {activeDetailTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#55349A]" />
                    )}
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Dynamic rendering of selected tab */}
              <div className="p-6">
                {activeDetailTab === 'Check-ups' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appointment History</span>
                      <button
                        onClick={() => {
                          const dept = prompt('Enter department name:');
                          const doc = prompt('Enter attending Doctor\'s name:');
                          const diag = prompt('Enter Diagnosis overview:');
                          if (dept && doc && diag) {
                            const newV: VisitRecord = {
                              id: `v-${Date.now()}`,
                              date: '11-Jun-2026',
                              department: dept,
                              doctorName: doc,
                              diagnoses: diag,
                              status: 'Completed'
                            };
                            setVisits(prev => ({
                              ...prev,
                              [custId]: [newV, ...(prev[custId] || [])]
                            }));
                          }
                        }}
                        className="text-[10px] font-black text-[#55349A] hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> NEW ENTRY
                      </button>
                    </div>

                    {patientVisits.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <Calendar className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-400">No scheduled visits recorded for this patient.</p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {patientVisits.map(v => (
                          <div key={v.id} className="border border-slate-150 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white hover:border-[#55349A]/30 transition-all shadow-4xs">
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="bg-[#55349A]/5 text-[#55349A] font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">{v.department}</span>
                                <span className="text-slate-400 text-[10px] font-bold">{v.date}</span>
                              </div>
                              <h5 className="font-extrabold text-xs text-slate-900 tracking-tight mt-1">{v.diagnoses}</h5>
                              <p className="text-[10px] font-bold text-slate-500">Physician: <span className="text-slate-700">{v.doctorName}</span></p>
                            </div>
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase text-center border self-start md:self-center shrink-0 tracking-wide",
                              v.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              v.status === 'Follow-up' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            )}>
                              {v.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'Invoices' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transactions & Ledger</span>
                      <button
                        onClick={() => {
                          const cat = prompt('Enter invoice line item category:');
                          const amt = Number(prompt('Enter bill amount in ₹:'));
                          if (cat && amt) {
                            const newIn: BillingInvoices = {
                              id: `inv-${Date.now()}`,
                              date: '11-Jun-2026',
                              category: cat,
                              amount: amt,
                              paymentStatus: 'Unpaid'
                            };
                            setInvoices(prev => ({
                              ...prev,
                              [custId]: [newIn, ...(prev[custId] || [])]
                            }));
                            setCustomers(prev => prev.map(c => c.id === custId ? {
                              ...c,
                              totalBilled: c.totalBilled + amt,
                              outstanding: c.outstanding + amt
                            } : c));
                          }
                        }}
                        className="text-[10px] font-black text-[#55349A] hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> POST INVOICE
                      </button>
                    </div>

                    {patientInvoices.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-400">No invoices or billing receipts on file.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-150">
                        {patientInvoices.map(inv => (
                          <div key={inv.id} className="py-3 flex items-center justify-between text-xs gap-3">
                            <div className="min-w-0 text-left">
                              <span className="text-[9px] text-slate-400 block font-bold">{inv.date} &middot; ID: {inv.id}</span>
                              <span className="font-extrabold text-[#111] mt-0.5 block truncate max-w-[280px]" title={inv.category}>{inv.category}</span>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <span className="font-black text-slate-800">₹{inv.amount.toLocaleString()}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider w-[72px] text-center",
                                inv.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                inv.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                              )}>
                                {inv.paymentStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'Notes' && (
                  <div className="space-y-4 text-left">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Confidential Clinic Outpatient Diary Notes</span>

                    <textarea
                      value={rawNote}
                      onChange={(e) => setRawNote(e.target.value)}
                      placeholder="Add clinical diagnoses, diagnostic reviews, prescriptions, specific instructions..."
                      className="w-full h-36 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all placeholder:text-slate-300 resize-none font-sans"
                    />

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        className="px-5 py-2 bg-[#55349A] hover:bg-[#402476] text-white font-extrabold rounded-xl text-xs cursor-pointer transition-colors shadow-xs"
                      >
                        SAVE CLINICAL DIARY
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // DEFAULT VIEW: LISTING DIRECTORY
  return (
    <div id="customers-list-view" className="flex flex-col flex-1 bg-[#FAFAFA]">

      {/* 1. Header Bar */}
      <div className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between shrink-0 shadow-3xs select-none">
        <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowLeft
            onClick={onBack}
            className="h-5 w-5 text-slate-600 hover:text-[#55349A] transition-colors cursor-pointer stroke-[2.5]"
          />
          Customers list
        </h1>
      </div>

      {/* 2. Tabs Switcher for Customers and Groups */}
      <div className="bg-white border-b border-slate-150 px-8 flex gap-6 select-none shrink-0">
        <button
          onClick={() => {
            setActiveTab('customers');
            setSelectedGroupDetails(null);
          }}
          className={cn(
            "py-3 font-extrabold text-xs uppercase tracking-wider relative transition-colors focus:outline-none cursor-pointer border-none bg-transparent",
            activeTab === 'customers' && !selectedGroupDetails
              ? "text-[#55349A]"
              : "text-slate-400 hover:text-slate-800"
          )}
        >
          {activeTab === 'customers' && !selectedGroupDetails && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#55349A]" />
          )}
          Customers View
        </button>
        <button
          onClick={() => {
            setActiveTab('groups');
            setSelectedGroupDetails(null);
          }}
          className={cn(
            "py-3 font-extrabold text-xs uppercase tracking-wider relative transition-colors focus:outline-none cursor-pointer border-none bg-transparent",
            activeTab === 'groups' || selectedGroupDetails
              ? "text-[#55349A]"
              : "text-slate-400 hover:text-slate-800"
          )}
        >
          {activeTab === 'groups' || selectedGroupDetails ? (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#55349A]" />
          ) : null}
          Groups View
        </button>
      </div>

      {/* 3. Main Body Area */}
      <div id="customers-body-area" className="p-6 md:p-8 space-y-6">

        {/* ================================== CUSTOMERS TAB VIEW ================================== */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-4xs overflow-hidden">

            {/* Toolbar Controllers */}
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 select-none">

              {/* Search Input Filter */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search patient name, UHID, emergency phone..."
                  className="w-full pl-11 pr-4 py-2 bg-[#FAFBFD] border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Quick selectors dropdown */}
              <div className="flex items-center gap-3">

                {/* Delete Selection Control */}
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                  >
                    <Trash2 className="h-4 w-4" />
                    DELETE SELECTED ({selectedIds.length})
                  </button>
                )}



                {/* Gender Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setShowGenderDropdown(!showGenderDropdown); setShowStatusDropdown(false); }}
                    className="flex items-center justify-between gap-4 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-700 bg-white hover:border-slate-300 transition-all cursor-pointer"
                  >
                    <span>{genderFilter === 'All' ? 'Filter' : `Filter: ${genderFilter}`}</span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", showGenderDropdown && "rotate-180")} />
                  </button>

                  {showGenderDropdown && (
                    <div className="absolute right-0 mt-1.5 bg-white border border-[#E8E8E8] rounded-xl shadow-lg z-20 py-1 px-1 min-w-[130px] border-slate-200">
                      {(['All', 'Male', 'Female'] as const).map(option => (
                        <button
                          key={option}
                          onClick={() => { setGenderFilter(option); setShowGenderDropdown(false); setCurrentPage(1); }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer border-none bg-transparent block",
                            genderFilter === option ? "bg-[#55349A]/5 text-[#55349A]" : "text-slate-650 hover:bg-slate-50"
                          )}
                        >
                          {option === 'All' ? 'ALL GENDER' : option.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unified "Create" button dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#55349A] hover:bg-[#402476] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer h-9 shrink-0 whitespace-nowrap uppercase tracking-wider border-none"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Create</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-white/90 transition-transform duration-200", showCreateDropdown && "rotate-180")} />
                  </button>

                  {showCreateDropdown && (
                    <>
                      {/* Click-away backdrop overlay */}
                      <div
                        className="fixed inset-0 z-15"
                        onClick={() => setShowCreateDropdown(false)}
                      />
                      <div className="absolute right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 px-1 min-w-[140px] text-left">
                        <button
                          onClick={() => { handleCreateInit(); setShowCreateDropdown(false); }}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#55349A] rounded-lg transition-colors cursor-pointer border-none bg-transparent block"
                        >
                          Customer
                        </button>
                        <button
                          onClick={() => { handleCreateGroupInit(); setShowCreateDropdown(false); }}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#55349A] rounded-lg transition-colors cursor-pointer border-none bg-transparent block"
                        >
                          Group
                        </button>
                      </div>
                    </>
                  )}
                </div>

              </div>

            </div>

            {/* Table Element */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/50 select-none">
                    <th className="py-3 px-5 text-left border-b border-slate-100 w-11">
                      <button
                        onClick={toggleAll}
                        className={cn(
                          "h-4 w-4 rounded-md border flex items-center justify-center transition-all cursor-pointer bg-white",
                          selectedIds.length === filteredCustomers.length && selectedIds.length > 0
                            ? "bg-[#55349A] border-[#55349A] text-white"
                            : "border-slate-300 hover:border-slate-400"
                        )}
                      >
                        {selectedIds.length === filteredCustomers.length && selectedIds.length > 0 && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Customer Name & ID</th>
                    <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Age</th>
                    <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Gender</th>
                    <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Phone Number</th>
                    <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Email Address</th>
                    <th className="py-3.5 px-5 text-center border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider w-64">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-xs">
                        No customer/patient records located using your filter parameters.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map(cust => (
                      <tr
                        key={cust.id}
                        onClick={() => setSelectedDetails(cust)}
                        className="hover:bg-slate-50/40 transition-colors cursor-pointer group"
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => toggleSelectOne(cust.id, e)}
                            className={cn(
                              "h-4 w-4 rounded-md border flex items-center justify-center transition-all cursor-pointer bg-white",
                              selectedIds.includes(cust.id)
                                ? "bg-[#55349A] border-[#55349A] text-white"
                                : "border-slate-300 hover:border-slate-400"
                            )}
                          >
                            {selectedIds.includes(cust.id) && (
                              <Check className="h-3 w-3 stroke-[3]" />
                            )}
                          </button>
                        </td>

                        {/* Name & UHID */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-[#55349A]/5 border border-[#55349A]/10 text-[#55349A] font-black text-xs flex items-center justify-center select-none shrink-0 shadow-4xs">
                              {cust.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="text-left min-w-0">
                              <span className="font-extrabold text-xs text-slate-900 block group-hover:text-[#55349A] transition-colors truncate max-w-[160px]" title={cust.name}>
                                {cust.name}
                              </span>
                              <span className="font-mono text-[9px] text-slate-400 font-bold block mt-0.5">{cust.code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Age with Icon */}
                        <td className="py-3 px-5 text-left">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-100 select-none">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{cust.age} years</span>
                          </span>
                        </td>

                        {/* Gender with status dot & Icon */}
                        <td className="py-3 px-5 text-left">
                          {cust.gender === 'Female' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-750 border border-pink-100 select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-pink-550 shrink-0" />
                              <span>Female</span>
                            </span>
                          ) : cust.gender === 'Male' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-755 border border-blue-100 select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-550 shrink-0" />
                              <span>Male</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-755 border border-purple-100 select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-550 shrink-0" />
                              <span>Other</span>
                            </span>
                          )}
                        </td>

                        {/* Phone with Icon */}
                        <td className="py-3 px-5 text-left">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-100/85 px-2.5 py-1 rounded-lg w-fit whitespace-nowrap">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono">{cust.phone}</span>
                          </div>
                        </td>

                        {/* Email with Icon */}
                        <td className="py-3 px-5 text-left">
                          {cust.email ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50/50 border border-slate-100/85 px-2.5 py-1 rounded-lg w-fit whitespace-nowrap overflow-hidden max-w-[200px]" title={cust.email}>
                              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No email on file</span>
                          )}
                        </td>

                        {/* View, Edit, More Actions Buttons */}
                        <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleEditInit(cust, e)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-650 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border border-slate-200 shadow-3xs"
                            >
                              <Pencil className="h-3.5 w-3.5 stroke-[2]" />
                              <span>Edit</span>
                            </button>

                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMoreId(openMoreId === cust.id ? null : cust.id);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border border-slate-200 shadow-3xs hover:border-slate-300"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5 stroke-[2]" />
                                <span>More</span>
                              </button>

                              {openMoreId === cust.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10 bg-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMoreId(null);
                                    }}
                                  />
                                  <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 px-1 select-none text-left">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMoreId(null);
                                        setSelectedDetails(cust);
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                                      <span>View</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMoreId(null);
                                        setSelectedDetails(cust);
                                        setActiveDetailTab('Check-ups');
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                      <Activity className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Add Check-up</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMoreId(null);
                                        setSelectedDetails(cust);
                                        setActiveDetailTab('Invoices');
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Post Invoice</span>
                                    </button>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMoreId(null);
                                        handleDeleteItem(cust.id, e);
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-rose-50 text-rose-600 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                      <span>Delete File</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-between select-none">
              <span className="text-xs font-bold text-slate-400">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} patients
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-xs font-extrabold text-slate-700 px-2 select-none">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ================================== GROUPS TAB VIEW ================================== */}
        {activeTab === 'groups' && (
          <div className="space-y-6">

            {/* A. Single Selected Group details list view */}
            {selectedGroupDetails ? (
              <div className="space-y-6">

                {/* Back button and profile cover */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-4xs text-left">
                  <div>
                    <button
                      onClick={() => setSelectedGroupDetails(null)}
                      className="flex items-center gap-1 text-xs font-black text-slate-500 hover:text-[#55349A] transition-colors mb-2 bg-transparent border-none cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Groups</span>
                    </button>
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#55349A]" />
                      <span>{selectedGroupDetails.name}</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold max-w-xl mt-1 leading-relaxed">
                      {selectedGroupDetails.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3 select-none">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-[#55349A] text-[10px] font-extrabold rounded border border-violet-100 uppercase">
                        {selectedGroupDetails.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Created on <strong className="font-mono text-slate-700">{selectedGroupDetails.createdDate}</strong>
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Enrolled: <strong className="text-[#55349A] font-extrabold">{selectedGroupDetails.memberIds.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Enrollment select */}
                  <div className="shrink-0 p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Enroll New Customer</label>
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleAddMemberToGroup(val);
                            e.target.value = '';
                          }
                        }}
                        className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-slate-700 focus:outline-none hover:border-slate-300 cursor-pointer shadow-3xs w-56 h-8"
                        defaultValue=""
                      >
                        <option value="" disabled>Select customer...</option>
                        {customers
                          .filter(c => !selectedGroupDetails.memberIds.includes(c.id))
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                </div>

                {/* Table containing customers inside that group */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-4xs overflow-hidden">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-left flex items-center justify-between select-none">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">GROUP ENROLLMENT</h3>

                    {/* Double action links also in detail subview */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreateInit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#55349A] hover:bg-[#402476] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer tracking-wider"
                      >
                        <Plus className="h-3 w-3" />
                        New Customer
                      </button>
                      <button
                        onClick={handleCreateGroupInit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#55349A] rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer tracking-wider"
                      >
                        <Plus className="h-3 w-3" />
                        New Group
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50/30">
                          <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Customer Name & ID</th>
                          <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Age</th>
                          <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Gender</th>
                          <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Phone Number</th>
                          <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Email Address</th>
                          <th className="py-3 px-5 text-center border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider w-64">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedGroupDetails.memberIds.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs">
                              No active customers enrolled in this group. Use the selector above to enroll customers.
                            </td>
                          </tr>
                        ) : (
                          customers
                            .filter(c => selectedGroupDetails.memberIds.includes(c.id))
                            .map((cust) => (
                              <tr key={cust.id} onClick={() => setSelectedDetails(cust)} className="hover:bg-slate-50/30 cursor-pointer transition-colors group">
                                <td className="py-2.5 px-5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8.5 w-8.5 rounded-xl bg-[#55349A]/5 border border-[#55349A]/10 text-[#55349A] font-black text-xs flex items-center justify-center select-none shrink-0 shadow-3xs">
                                      {cust.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="text-left min-w-0">
                                      <span className="font-extrabold text-xs text-slate-900 block group-hover:text-[#55349A] transition-colors truncate max-w-[160px] text-left">{cust.name}</span>
                                      <span className="font-mono text-[9px] text-slate-400 font-bold block mt-0.5 text-left">{cust.code}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-5 text-left">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-100 select-none">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>{cust.age} years</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-5 text-left">
                                  {cust.gender === 'Female' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-750 border border-pink-100 select-none">
                                      <span className="h-1.5 w-1.5 rounded-full bg-pink-550 shrink-0" />
                                      <span>Female</span>
                                    </span>
                                  ) : cust.gender === 'Male' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-755 border border-blue-100 select-none">
                                      <span className="h-1.5 w-1.5 rounded-full bg-blue-550 shrink-0" />
                                      <span>Male</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-755 border border-purple-100 select-none">
                                      <span className="h-1.5 w-1.5 rounded-full bg-purple-550 shrink-0" />
                                      <span>Other</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-5 text-left">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-100/85 px-2.5 py-1 rounded-lg w-fit whitespace-nowrap">
                                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono">{cust.phone}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-5 text-left">
                                  {cust.email ? (
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50/50 border border-slate-100/85 px-2.5 py-1 rounded-lg w-fit whitespace-nowrap overflow-hidden max-w-[200px]" title={cust.email}>
                                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{cust.email}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">No email on file</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => setSelectedDetails(cust)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-150 text-slate-700 font-extrabold text-[11px] rounded-lg transition-all border border-slate-200 cursor-pointer"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>Profile</span>
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMemberFromGroup(cust.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] rounded-lg transition-all border border-rose-100 cursor-pointer"
                                    >
                                      <X className="h-3 w-3" />
                                      <span>Dismiss</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            ) : (
              /* B. Groups directory list view grid */
              <div className="space-y-6">

                {/* Search controller and triggers */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-4xs text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative min-w-[280px] flex-1 max-w-sm">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        placeholder="Search group description, category, target tags..."
                        className="text-left w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-9"
                      />
                    </div>

                    {/* Double button links */}
                    <div className="flex items-center gap-2 select-none">
                      <button
                        onClick={handleCreateInit}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#55349A] rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer h-9 shrink-0 whitespace-nowrap uppercase tracking-wider animate-fade-in"
                      >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                        <span>Create New Customer</span>
                      </button>

                      <button
                        onClick={handleCreateGroupInit}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-[#55349A] hover:bg-[#402476] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer h-9 shrink-0 whitespace-nowrap uppercase tracking-wider border-none"
                      >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                        <span>Create New Group</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid layout containing Group Items */}
                {groups.filter(g =>
                  g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                  g.category.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                  g.description.toLowerCase().includes(groupSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs">
                    No active groups matching your parameters found. Create a new group package to start!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups
                      .filter(g =>
                        g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                        g.category.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                        g.description.toLowerCase().includes(groupSearchQuery.toLowerCase())
                      )
                      .map((g) => {
                        const enrolledEnrolments = customers.filter(c => g.memberIds.includes(c.id));
                        return (
                          <div
                            key={g.id}
                            onClick={() => setSelectedGroupDetails(g)}
                            className="bg-white rounded-2xl border border-slate-200 shadow-4xs hover:shadow-2xs hover:border-[#55349A]/35 p-5 transition-all cursor-pointer flex flex-col justify-between group text-left relative overflow-hidden"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-[#55349A] text-[10px] font-extrabold rounded select-none border border-violet-100 uppercase">
                                  {g.category || 'Outpatients'}
                                </span>
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => handleEditGroupInit(g, e)}
                                    className="p-1 hover:bg-slate-100 rounded-md transition-colors border-none bg-transparent cursor-pointer"
                                    title="Edit group configuration"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-[#55349A]" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteGroup(g.id, e)}
                                    className="p-1 hover:bg-rose-50 rounded-md transition-colors border-none bg-transparent cursor-pointer"
                                    title="Delete support group"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600" />
                                  </button>
                                </div>
                              </div>

                              <h3 className="text-sm font-black text-slate-900 group-hover:text-[#55349A] transition-colors tracking-tight font-sans">
                                {g.name}
                              </h3>
                              <p className="text-[11px] text-slate-450 font-semibold leading-normal line-clamp-2" title={g.description}>
                                {g.description}
                              </p>
                            </div>

                            {/* Card sub roster avatar line */}
                            <div className="border-t border-slate-100 pt-4 mt-5 flex items-center justify-between">
                              <div className="flex items-center -space-x-2 overflow-hidden">
                                {enrolledEnrolments.slice(0, 4).map((member) => (
                                  <div
                                    key={member.id}
                                    className="h-7 w-7 rounded-lg bg-[#55349A]/5 border border-[#55349A]/10 text-[9px] font-black text-[#55349A] flex items-center justify-center select-none shadow-3xs hover:-translate-y-0.5 transition-transform"
                                    title={member.name}
                                  >
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                ))}
                                {enrolledEnrolments.length > 4 && (
                                  <div className="h-7 w-7 rounded-lg bg-violet-50 border border-violet-100 text-[9px] font-extrabold text-[#55349A] flex items-center justify-center select-none shadow-3xs">
                                    +{enrolledEnrolments.length - 4}
                                  </div>
                                )}
                                {enrolledEnrolments.length === 0 && (
                                  <span className="text-[10px] text-slate-400 font-bold italic">No members yet</span>
                                )}
                              </div>

                              <span className="text-[11px] font-black text-[#55349A] group-hover:underline inline-flex items-center gap-0.5 pointer-events-none">
                                <span>Open Group ({g.memberIds.length})</span>
                                <ChevronRight className="h-3.5 w-3.5 text-[#55349A]" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>

      {/* ================================== GROUP FORM DIALOG MODAL ================================== */}
      <AnimatePresence>
        {isGroupFormOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-lg w-full"
            >
              {/* Modal header */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-[#55349A]" />
                  <span>{groupFormMode === 'create' ? 'Create New Operational Group' : 'Edit Operational Group'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsGroupFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleGroupFormSubmit} className="p-6 space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Group Name</label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Geriatrics Support Circle"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Short Description</label>
                  <textarea
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the outpatient support group or clinical trial cohorts."
                    className="w-full h-16 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 placeholder:text-slate-400 focus:border-[#55349A] outline-none resize-none focus:ring-1 focus:ring-[#55349A]"
                  />
                </div>

                {/* Generate Group Member ID Checkbox */}
                <div className="flex items-center gap-2 py-1 select-none">
                  <input
                    type="checkbox"
                    id="generateGroupMemberIdCheckbox"
                    checked={groupFormData.generateMemberId}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, generateMemberId: e.target.checked }))}
                    className="h-4 w-4 text-[#55349A] focus:ring-[#55349A] border-slate-300 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="generateGroupMemberIdCheckbox"
                    className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    Generate Group Member Id
                  </label>
                </div>

                {/* Member selection checkboard */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Select Members / Roster</label>
                    <span className="text-[10px] font-black text-[#55349A]">{groupFormData.memberIds.length} Selected</span>
                  </div>

                  <div className="border border-slate-150 rounded-xl h-36 overflow-y-auto bg-slate-50 p-2 divide-y divide-slate-100 space-y-1">
                    <input
                      type="text"
                      placeholder="Search customers to add..."
                      value={groupMemberSearchQuery}
                      onChange={(e) => setGroupMemberSearchQuery(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium outline-none mb-1 text-slate-800"
                    />
                    {customers
                      .filter(c => c.name.toLowerCase().includes(groupMemberSearchQuery.toLowerCase()))
                      .map(c => {
                        const isChecked = groupFormData.memberIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleGroupMember(c.id)}
                            className="flex items-center gap-2 py-1.5 px-1 cursor-pointer hover:bg-white rounded-lg transition-colors text-xs"
                          >
                            <div className={cn(
                              "h-3.5 w-3.5 rounded-md border flex items-center justify-center transition-all bg-white",
                              isChecked ? "bg-[#55349A] border-[#55349A] text-white" : "border-slate-300"
                            )}>
                              {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                            <span className="font-semibold text-slate-700">{c.name}</span>
                            <span className="font-mono text-[9px] text-slate-400 ml-auto">{c.code}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Footer submit action */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGroupFormOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-bold border border-slate-200 rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#55349A] hover:bg-[#402476] text-white font-bold rounded-xl text-xs cursor-pointer border-none shadow-xs"
                  >
                    {groupFormMode === 'create' ? 'Create Group' : 'Save Changes'}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
