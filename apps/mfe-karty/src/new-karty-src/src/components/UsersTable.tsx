import React, { useState } from 'react';
import {
  ArrowLeft, Search, Plus, ChevronDown, Pencil,
  MoreHorizontal, ChevronLeft, ChevronRight, Check, Trash2,
  Mail, Phone, Eye, Calendar, PlusCircle, CheckCircle2, X,
  Filter, Shield, User, UserCheck, UserX, Briefcase,
  Key, Settings, Sparkles, Building, Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useUsers, useCreateUser, useUpdateUser, useUpdateUserStatus } from '../../../services/useUsers';

export interface UserItem {
  id: string;
  name: string;
  staffId: string; // e.g., STAFF-10294
  role: 'Doctor' | 'Nurse' | 'Admin' | 'Receptionist' | 'IT Admin' | 'Pharmacist' | 'Assistant';
  department: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  joinedDate: string;
  permissions: string[];
  products?: { name: string; role: string }[];
  calendars?: string[];
  assignedBy?: string;
  gender?: string;
  dob?: string;
  pincode?: string;
}

export interface TeamItem {
  id: string;
  name: string;
  description: string;
  memberIds: string[]; // references UserItem['id']
  department: string;
  createdDate: string;
}

const INITIAL_TEAMS: TeamItem[] = [
  {
    id: 't1',
    name: 'Cardiology Clinical Team',
    description: 'Specialist clinical care, diagnostics, and procedures for cardiovascular patients.',
    memberIds: ['1', '7'], // Rachel Green, Bruce Banner
    department: 'Cardiology',
    createdDate: '12-Jan-2022'
  },
  {
    id: 't2',
    name: 'Emergency Response Unit',
    description: 'High-intensity triage, emergency medicine, and critical-care clinical operations.',
    memberIds: ['3', '4'], // John Carter, Sarah Connor
    department: 'Emergency Medicine',
    createdDate: '15-Mar-2023'
  },
  {
    id: 't3',
    name: 'Information Technology Squad',
    description: 'Hospital infrastructure, network systems, hardware setup, and access permission compliance.',
    memberIds: ['5'], // Thomas Anderson
    department: 'Information Technology',
    createdDate: '05-May-2021'
  },
  {
    id: 't4',
    name: 'Administration & Front Desk',
    description: 'Scheduling appointments, patient bookkeeping, billing collections, and records lookup.',
    memberIds: ['2', '6'], // David Beckham, Penelope Cruz
    department: 'Management',
    createdDate: '01-Aug-2020'
  }
];

const INITIAL_USERS: UserItem[] = [];

// Helper components for Add User Page
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

interface UsersTableProps {
  onBack?: () => void;
}

export const UsersTable = ({ onBack }: UsersTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data: usersData, isLoading: isUsersLoading } = useUsers(searchQuery, statusFilter, roleFilter, currentPage - 1, itemsPerPage);
  const { data: allUsersData } = useUsers('', 'All', 'All', 0, 500);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();

  const mapToUserItem = (dto: any): UserItem => ({
    id: dto.uid,
    name: `${dto.firstName || ''} ${dto.lastName || ''}`.trim(),
    staffId: dto.employeeId || `STAFF-${dto.uid?.substring(0, 5) || '0000'}`,
    role: dto.userDisplayName || 'Assistant',
    department: dto.departmentName || 'General',
    phone: dto.primaryPhoneNumber ? `${dto.primaryPhoneNumber.countryCode || ''} ${dto.primaryPhoneNumber.number || ''}`.trim() : 'N/A',
    email: dto.email || 'N/A',
    status: dto.userStatus === 'ACTIVE' ? 'Active' : (dto.userStatus === 'INACTIVE' ? 'Inactive' : 'On Leave'),
    joinedDate: dto.availableUpto ? new Date(dto.availableUpto).toLocaleDateString() : 'N/A',
    permissions: [],
    products: [],
    calendars: [],
    assignedBy: 'System',
    gender: dto.gender || 'Not specified',
    dob: dto.dob || 'N/A',
    pincode: dto.pincode || 'N/A'
  });

  const users = allUsersData?.content.map(mapToUserItem) || [];
  const paginatedUsers = usersData?.content.map(mapToUserItem) || [];
  const totalElements = usersData?.totalElements || 0;
  const totalPages = usersData?.totalPages || 1;
  const filteredUsers = paginatedUsers; // the API handles filtering

  // Views navigation tab state
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');

  // Dedicated user creation page state
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false);
  const [creationPageMode, setCreationPageMode] = useState<'create' | 'edit'>('create');
  const [editingPageUserId, setEditingPageUserId] = useState<string | null>(null);
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(true);
  const [creationFormData, setCreationFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneCountry: '+91',
    phoneVal: '',
    whatsappCountry: '+91',
    whatsappVal: '',
    telegramCountry: '+91',
    telegramVal: '',
    role: 'Assistant' as UserItem['role'],
    employeeId: '',
    pincode: '',
    adminPrivileges: false,
    showPatientsList: false,
    showFinanceManager: false,
    showInventoryManager: false,
    gender: '',
    dob: '',
    assignedBy: 'David Beckham',
    products: [] as { name: string; role: string }[],
    calendars: [] as string[]
  });

  const handleCreatePageInit = () => {
    setCreationPageMode('create');
    setEditingPageUserId(null);
    setCreationFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneCountry: '+91',
      phoneVal: '',
      whatsappCountry: '+91',
      whatsappVal: '',
      telegramCountry: '+91',
      telegramVal: '',
      role: 'Assistant',
      employeeId: '',
      pincode: '',
      adminPrivileges: false,
      showPatientsList: false,
      showFinanceManager: false,
      showInventoryManager: false,
      gender: '',
      dob: '',
      assignedBy: 'David Beckham',
      products: [],
      calendars: []
    });
    setIsCreatePageOpen(true);
  };

  const handleEditPageInit = (user: UserItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCreationPageMode('edit');
    setEditingPageUserId(user.id);

    // Split firstName and lastName gracefully
    const cleanName = user.name.replace('Dr. ', '').replace('Nurse ', '').trim();
    const parts = cleanName.split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    // Split phone
    let phoneCountry = '+91';
    let phoneVal = '';
    if (user.phone && user.phone !== 'N/A') {
      const spaceIndex = user.phone.indexOf(' ');
      if (spaceIndex !== -1 && user.phone.startsWith('+')) {
        phoneCountry = user.phone.substring(0, spaceIndex);
        phoneVal = user.phone.substring(spaceIndex + 1);
      } else {
        phoneVal = user.phone;
      }
    }

    setCreationFormData({
      firstName,
      lastName,
      email: user.email === 'N/A' ? '' : user.email,
      phoneCountry,
      phoneVal,
      whatsappCountry: '+91',
      whatsappVal: '',
      telegramCountry: '+91',
      telegramVal: '',
      role: user.role,
      employeeId: user.staffId,
      pincode: user.pincode === 'N/A' ? '' : (user.pincode || ''),
      adminPrivileges: user.permissions.includes('Full Access') || user.permissions.includes('User Provisioning'),
      showPatientsList: user.permissions.includes('Patient Records Read'),
      showFinanceManager: user.permissions.includes('Financial Auditing') || user.permissions.includes('Billing Collection'),
      showInventoryManager: user.permissions.includes('Inventory Sourcing'),
      gender: user.gender === 'Not specified' ? '' : (user.gender || ''),
      dob: user.dob === 'N/A' ? '' : (user.dob || ''),
      assignedBy: user.assignedBy || 'David Beckham',
      products: user.products || [],
      calendars: user.calendars || []
    });
    setIsCreatePageOpen(true);
  };

  const handleCreatePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!creationFormData.firstName.trim() || !creationFormData.lastName.trim()) {
      return;
    }

    let detectedDept = 'General Operations';
    if (creationFormData.role === 'Doctor') detectedDept = 'Cardiology';
    else if (creationFormData.role === 'Nurse') detectedDept = 'Intensive Care Unit (ICU)';
    else if (creationFormData.role === 'Admin') detectedDept = 'Management';
    else if (creationFormData.role === 'IT Admin') detectedDept = 'Information Technology';
    else if (creationFormData.role === 'Receptionist') detectedDept = 'Front Desk / Op-Desk';
    else if (creationFormData.role === 'Pharmacist') detectedDept = 'Pharmacy Services';
    else if (creationFormData.role === 'Assistant') detectedDept = 'Clinical Support';

    const payload = {
      firstName: creationFormData.firstName.trim(),
      lastName: creationFormData.lastName.trim(),
      email: creationFormData.email.trim() || undefined,
      primaryPhoneNumber: creationFormData.phoneVal.trim() ? {
        countryCode: creationFormData.phoneCountry,
        number: creationFormData.phoneVal.trim()
      } : undefined,
      userDisplayName: creationFormData.role,
      departmentName: detectedDept,
      employeeId: creationFormData.employeeId.trim() || undefined,
      pincode: creationFormData.pincode || undefined,
      gender: creationFormData.gender || undefined,
      dob: creationFormData.dob || undefined
    };

    if (creationPageMode === 'edit' && editingPageUserId) {
      updateUserMutation.mutate({ uid: editingPageUserId, data: payload });
    } else {
      createUserMutation.mutate(payload);
    }

    setIsCreatePageOpen(false);
  };

  // Teams management states
  const [teams, setTeams] = useState<TeamItem[]>(INITIAL_TEAMS);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState<TeamItem | null>(null);

  // Dual creation dropdown list toggle
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);

  // Team Modal forms states
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [teamFormMode, setTeamFormMode] = useState<'create' | 'edit'>('create');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: '',
    department: '',
    memberIds: [] as string[]
  });

  // Selected row tracking for batch controls
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);

  // Set Login ID Modal states
  const [isLoginIdModalOpen, setIsLoginIdModalOpen] = useState(false);
  const [loginIdUser, setLoginIdUser] = useState<UserItem | null>(null);
  const [tempLoginId, setTempLoginId] = useState('');
  const [loginIdHasAttemptedSubmit, setLoginIdHasAttemptedSubmit] = useState(false);

  // Quick Add Member Dropdown states
  const [isAddRosterDropdownOpen, setIsAddRosterDropdownOpen] = useState(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  // Drill down detailed view
  const [selectedDetails, setSelectedDetails] = useState<UserItem | null>(null);

  // Product inline edit & options inside drill down drawer
  const [editingProdIndex, setEditingProdIndex] = useState<number | null>(null);
  const [editingProdRoleVal, setEditingProdRoleVal] = useState<string>('');
  const [productMoreOpenIndex, setProductMoreOpenIndex] = useState<number | null>(null);

  const handleSaveProductRole = (prodIdx: number, newRole: string) => {
    if (!selectedDetails || !newRole.trim()) return;
    const updatedProducts = [...(selectedDetails.products || [])];
    updatedProducts[prodIdx] = { ...updatedProducts[prodIdx], role: newRole.trim() };
    const updatedUser = { ...selectedDetails, products: updatedProducts };
    setSelectedDetails(updatedUser);
    setEditingProdIndex(null);
  };

  // Modal forms states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Modal input fields
  const [formData, setFormData] = useState({
    name: '',
    role: 'Doctor' as UserItem['role'],
    department: '',
    phone: '',
    email: '',
    status: 'Active' as UserItem['status'],
    permissionsInput: ''
  });

  // Filter handlers removed since the backend filters them

  // Selection toggle helper
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedUsers.map(u => u.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Actions trigger: Delete
  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you absolutely sure you want to remove this user from the workspace?')) {
      alert('Delete logic not yet supported by API');
      setSelectedIds(prev => prev.filter(x => x !== id));
      if (selectedDetails?.id === id) {
        setSelectedDetails(null);
      }
    }
  };

  // Actions trigger: Batch Delete
  const handleBatchDelete = () => {
    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected user profiles?`)) {
      alert('Batch delete not fully supported via API yet');
      setSelectedIds([]);
    }
  };

  // Actions trigger: Create Form initialization
  const handleCreateInit = () => {
    setFormMode('create');
    setFormData({
      name: '',
      role: 'Doctor',
      department: '',
      phone: '',
      email: '',
      status: 'Active',
      permissionsInput: 'Patient Records Read, Scheduled access'
    });
    setEditingUserId(null);
    setIsFormOpen(true);
  };

  // Actions trigger: Edit Form initialization
  const handleEditInit = (user: UserItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormMode('edit');
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      email: user.email,
      status: user.status,
      permissionsInput: user.permissions.join(', ')
    });
    setIsFormOpen(true);
  };

  // Form submit persistence handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.department.trim()) {
      alert('Please fill out all required fields securely.');
      return;
    }

    const parts = formData.name.split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '-';

    const payload = {
      firstName,
      lastName,
      email: formData.email.trim() || undefined,
      userDisplayName: formData.role,
      departmentName: formData.department,
      userStatus: formData.status === 'Active' ? 'ACTIVE' : (formData.status === 'Inactive' ? 'INACTIVE' : 'ON_LEAVE')
    };

    if (formMode === 'edit' && editingUserId) {
      updateUserMutation.mutate({ uid: editingUserId, data: payload });
      if (selectedDetails && selectedDetails.id === editingUserId) {
         setSelectedDetails(null);
      }
    } else {
      createUserMutation.mutate(payload);
    }

    setIsFormOpen(false);
  };

  // Create Team Action triggers
  const handleCreateTeamInit = () => {
    setTeamFormMode('create');
    setTeamFormData({
      name: '',
      description: '',
      department: '',
      memberIds: []
    });
    setEditingTeamId(null);
    setIsTeamFormOpen(true);
    setIsCreateDropdownOpen(false);
  };

  // Edit Team Action triggers
  const handleEditTeamInit = (team: TeamItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTeamFormMode('edit');
    setEditingTeamId(team.id);
    setTeamFormData({
      name: team.name,
      description: team.description,
      department: team.department,
      memberIds: team.memberIds
    });
    setIsTeamFormOpen(true);
  };

  // Delete Team Action triggers
  const handleDeleteTeam = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you absolutely sure you want to delete this team? Members will not be deleted.')) {
      setTeams(prev => prev.filter(t => t.id !== id));
      if (selectedTeamDetails?.id === id) {
        setSelectedTeamDetails(null);
      }
    }
  };

  // Form submit persistence for Teams
  const handleTeamFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormData.name.trim()) {
      alert('Please fill out all required fields securely.');
      return;
    }

    const finalDept = teamFormData.department.trim() || 'General Operations';

    if (teamFormMode === 'create') {
      const newId = `t-${Date.now()}`;
      const newTeam: TeamItem = {
        id: newId,
        name: teamFormData.name,
        description: teamFormData.description,
        department: finalDept,
        memberIds: teamFormData.memberIds,
        createdDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
      };
      setTeams(prev => [newTeam, ...prev]);
    } else {
      if (!editingTeamId) return;
      setTeams(prev => prev.map(t => {
        if (t.id === editingTeamId) {
          const updated = {
            ...t,
            name: teamFormData.name,
            description: teamFormData.description,
            department: finalDept,
            memberIds: teamFormData.memberIds
          };
          if (selectedTeamDetails?.id === editingTeamId) {
            setSelectedTeamDetails(updated);
          }
          return updated;
        }
        return t;
      }));
    }
    setIsTeamFormOpen(false);
  };

  // Toggle team members inside checkable lists
  const toggleTeamMember = (userId: string) => {
    setTeamFormData(prev => {
      const isMember = prev.memberIds.includes(userId);
      const newMembers = isMember
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId];
      return { ...prev, memberIds: newMembers };
    });
  };

  const handleAddMemberToTeam = (userId: string) => {
    if (!selectedTeamDetails) return;
    if (selectedTeamDetails.memberIds.includes(userId)) return;

    const updatedTeam = {
      ...selectedTeamDetails,
      memberIds: [...selectedTeamDetails.memberIds, userId]
    };

    setTeams(prev => prev.map(t => t.id === selectedTeamDetails.id ? updatedTeam : t));
    setSelectedTeamDetails(updatedTeam);
  };

  const handleRemoveMemberFromTeam = (userId: string) => {
    if (!selectedTeamDetails) return;
    const updatedTeam = {
      ...selectedTeamDetails,
      memberIds: selectedTeamDetails.memberIds.filter(id => id !== userId)
    };

    setTeams(prev => prev.map(t => t.id === selectedTeamDetails.id ? updatedTeam : t));
    setSelectedTeamDetails(updatedTeam);
  };

  if (isCreatePageOpen) {
    return (
      <div className="flex flex-col flex-1 h-full bg-[#F8F9FA] select-none text-left font-sans">
        {/* Header Bar */}
        <div className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center gap-4 shrink-0 shadow-3xs">
          <button
            type="button"
            onClick={() => setIsCreatePageOpen(false)}
            className="p-1 hover:bg-slate-100 rounded transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5 text-slate-800 stroke-[2.5]" />
          </button>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
            {creationPageMode === 'create' ? 'Add User' : 'Edit Details'}
          </h1>
        </div>

        {/* Scrollable Form Body Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-24">
          <form onSubmit={handleCreatePageSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-4xs p-6 md:p-8 space-y-6">

              {/* Form Section Header */}
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xs font-black text-[#55349A] uppercase tracking-widest">
                  User Account Information
                </h2>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  Enter credentials and demographic credentials to provision a new user access panel.
                </p>
              </div>

              {/* Grid of basic fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* First Name */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    First Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter first name"
                    value={creationFormData.firstName}
                    onChange={(e) => setCreationFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-10"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Last Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter last name"
                    value={creationFormData.lastName}
                    onChange={(e) => setCreationFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-10"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={creationFormData.email}
                    onChange={(e) => setCreationFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-10"
                  />
                </div>

                {/* Phone Number with custom Country Code */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Phone Number
                  </label>
                  <CountryPhoneInput
                    countryValue={creationFormData.phoneCountry}
                    onCountryChange={(val) => setCreationFormData(prev => ({ ...prev, phoneCountry: val }))}
                    phoneValue={creationFormData.phoneVal}
                    onPhoneChange={(val) => setCreationFormData(prev => ({ ...prev, phoneVal: val }))}
                    placeholder="074104 10123"
                  />
                </div>

                {/* Whatsapp Number */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Whatsapp Number
                  </label>
                  <CountryPhoneInput
                    countryValue={creationFormData.whatsappCountry}
                    onCountryChange={(val) => setCreationFormData(prev => ({ ...prev, whatsappCountry: val }))}
                    phoneValue={creationFormData.whatsappVal}
                    onPhoneChange={(val) => setCreationFormData(prev => ({ ...prev, whatsappVal: val }))}
                    placeholder="074104 10123"
                  />
                </div>

                {/* Telegram Number */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Telegram Number
                  </label>
                  <CountryPhoneInput
                    countryValue={creationFormData.telegramCountry}
                    onCountryChange={(val) => setCreationFormData(prev => ({ ...prev, telegramCountry: val }))}
                    phoneValue={creationFormData.telegramVal}
                    onPhoneChange={(val) => setCreationFormData(prev => ({ ...prev, telegramVal: val }))}
                    placeholder="074104 10123"
                  />
                </div>

                {/* Usertype Select */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Usertype
                  </label>
                  <div className="relative">
                    <select
                      value={creationFormData.role}
                      onChange={(e) => setCreationFormData(prev => ({ ...prev, role: e.target.value as UserItem['role'] }))}
                      className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 focus:outline-none hover:border-slate-300 focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] cursor-pointer shadow-3xs w-full h-10"
                    >
                      <option value="Assistant">Assistant</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Admin">Admin</option>
                      <option value="Receptionist">Receptionist</option>
                      <option value="IT Admin">IT Admin</option>
                      <option value="Pharmacist">Pharmacist</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Employee ID */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-98231"
                    value={creationFormData.employeeId}
                    onChange={(e) => setCreationFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-10"
                  />
                </div>

                {/* Pincode */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="Enter pincode"
                    value={creationFormData.pincode}
                    onChange={(e) => setCreationFormData(prev => ({ ...prev, pincode: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-10"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Gender
                  </label>
                  <div className="flex items-center gap-6 h-10">
                    {/* Male */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        checked={creationFormData.gender === 'Male'}
                        onChange={() => setCreationFormData(prev => ({ ...prev, gender: 'Male' }))}
                        className="h-4 w-4 text-[#55349A] focus:ring-[#55349A] border-slate-300 pointer-events-auto"
                      />
                      <span className="text-xs font-extrabold text-slate-700 group-hover:text-slate-900 select-none">
                        Male
                      </span>
                    </label>

                    {/* Female */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        checked={creationFormData.gender === 'Female'}
                        onChange={() => setCreationFormData(prev => ({ ...prev, gender: 'Female' }))}
                        className="h-4 w-4 text-[#55349A] focus:ring-[#55349A] border-slate-300 pointer-events-auto"
                      />
                      <span className="text-xs font-extrabold text-slate-700 group-hover:text-slate-900 select-none">
                        Female
                      </span>
                    </label>

                    {/* Other */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="gender"
                        value="Other"
                        checked={creationFormData.gender === 'Other'}
                        onChange={() => setCreationFormData(prev => ({ ...prev, gender: 'Other' }))}
                        className="h-4 w-4 text-[#55349A] focus:ring-[#55349A] border-slate-300 pointer-events-auto"
                      />
                      <span className="text-xs font-extrabold text-slate-700 group-hover:text-slate-900 select-none">
                        Other
                      </span>
                    </label>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden focus-within:border-[#55349A] focus-within:ring-1 focus-within:ring-[#55349A] transition-all shadow-3xs h-10 select-none">
                      <input
                        type="text"
                        placeholder="Date of Birth"
                        value={creationFormData.dob}
                        onChange={(e) => setCreationFormData(prev => ({ ...prev, dob: e.target.value }))}
                        onFocus={(e) => (e.target.type = "date")}
                        onBlur={(e) => (e.target.type = "text")}
                        className="flex-1 border-none outline-none px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent h-full"
                      />
                      <div className="bg-slate-400 text-white flex items-center justify-center shrink-0 w-11 h-10 pointer-events-none">
                        <Calendar className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Accordion list: Additional details */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs bg-[#FAFAFD]/40">

                {/* Accordion Clickable Header */}
                <button
                  type="button"
                  onClick={() => setIsAdditionalOpen(!isAdditionalOpen)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-[#E2E8F0] border-solid cursor-pointer select-none text-left"
                >
                  <span className="text-xs font-black text-slate-700 tracking-wide">
                    Additional details
                  </span>
                  <div className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500 shrink-0">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform stroke-[2.5]",
                        isAdditionalOpen ? "" : "rotate-90"
                      )}
                    />
                  </div>
                </button>

                {/* Accordion Body contents */}
                {isAdditionalOpen && (
                  <div className="p-6 space-y-6 bg-white border-t border-slate-100">
                    <div className="grid grid-cols-1 gap-6">

                      {/* Left: Privilege Checkboxes */}
                      <div className="space-y-4 text-left">

                        {/* Checkbox 1: Admin Privileges */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={creationFormData.adminPrivileges}
                            onChange={(e) => setCreationFormData(prev => ({ ...prev, adminPrivileges: e.target.checked }))}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#55349A] focus:ring-[#55349A]"
                          />
                          <div className="text-left select-none">
                            <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#55349A] transition-colors">
                              Admin Privileges
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-relaxed">
                              This privilege will allow the user to create new user, modify existing user etc.
                            </span>
                          </div>
                        </label>

                        {/* Checkbox 2: Show Patients List */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={creationFormData.showPatientsList}
                            onChange={(e) => setCreationFormData(prev => ({ ...prev, showPatientsList: e.target.checked }))}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#55349A] focus:ring-[#55349A]"
                          />
                          <div className="text-left select-none">
                            <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#55349A] transition-colors">
                              Show Patients List
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-relaxed">
                              This privilege will allow the user to see patients data base.
                            </span>
                          </div>
                        </label>

                        {/* Checkbox 3: Show Finance Manager */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={creationFormData.showFinanceManager}
                            onChange={(e) => setCreationFormData(prev => ({ ...prev, showFinanceManager: e.target.checked }))}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#55349A] focus:ring-[#55349A]"
                          />
                          <div className="text-left select-none">
                            <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#55349A] transition-colors">
                              Show Finance Manager
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-relaxed">
                              This privilege will allow the user to see finance manager.
                            </span>
                          </div>
                        </label>

                        {/* Checkbox 4: Show Inventory Manager */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={creationFormData.showInventoryManager}
                            onChange={(e) => setCreationFormData(prev => ({ ...prev, showInventoryManager: e.target.checked }))}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#55349A] focus:ring-[#55349A]"
                          />
                          <div className="text-left select-none">
                            <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#55349A] transition-colors">
                              Show Inventory Manager
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-relaxed">
                              This privilege will allow the user to see inventory manager.
                            </span>
                          </div>
                        </label>

                      </div>

                    </div>
                  </div>
                )}

              </div>



              {/* Action Buttons bar (Cancel, Save) */}
              <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePageOpen(false)}
                  className="px-8 py-2.5 bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#475569] text-xs font-black rounded-lg transition-all cursor-pointer select-none uppercase border-none"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-10 py-2.5 bg-[#55349A] hover:bg-[#402476] text-white text-xs font-black rounded-lg transition-all shadow-xs cursor-pointer select-none uppercase border-none"
                >
                  SAVE
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="users-list-view" className="flex flex-col flex-1 min-w-0" style={{ contentVisibility: 'auto' }}>

      {/* 1. Header Bar */}
      <div className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between shrink-0 shadow-3xs select-none">
        <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          {onBack && (
            <ArrowLeft
              onClick={onBack}
              className="h-5 w-5 text-slate-600 hover:text-[#55349A] transition-colors cursor-pointer stroke-[2.5]"
            />
          )}
          <span>User Overview</span>
        </h1>
      </div>

      {/* Tabs Row */}
      <div className="bg-white border-b border-slate-100 px-8 flex gap-6 select-none shrink-0">
        <button
          onClick={() => {
            setActiveTab('users');
            setSelectedTeamDetails(null);
          }}
          className={cn(
            "py-3 text-xs font-black border-b-2 tracking-wide uppercase transition-all cursor-pointer border-none bg-transparent outline-none",
            activeTab === 'users' && !selectedTeamDetails
              ? "border-b-2 border-[#55349A] text-[#55349A]"
              : "border-b-2 border-transparent text-slate-400 hover:text-slate-700"
          )}
        >
          Users list
        </button>
        <button
          onClick={() => {
            setActiveTab('teams');
            setSelectedTeamDetails(null);
          }}
          className={cn(
            "py-3 text-xs font-black border-b-2 tracking-wide uppercase transition-all cursor-pointer border-none bg-transparent outline-none",
            activeTab === 'teams' || selectedTeamDetails
              ? "border-b-2 border-[#55349A] text-[#55349A]"
              : "border-b-2 border-transparent text-slate-400 hover:text-slate-700"
          )}
        >
          Teams View
        </button>
      </div>

      <div id="users-body-area" className="p-6 md:p-8 space-y-6">

        {activeTab === 'users' ? (
          /* ==================== USERS TAB VIEW ==================== */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-4xs overflow-hidden">

          {/* Top filtering controller panel */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div className="flex flex-1 flex-wrap items-center gap-3">
                {/* Search query input */}
                <div className="relative min-w-[240px] flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search staff name, ID, email..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-9"
                  />
                </div>

                {/* Role dropdown filter */}
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-700 focus:outline-none hover:border-slate-300 cursor-pointer shadow-3xs h-9"
                  >
                    <option value="All">All Roles</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Admin">Admin</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="IT Admin">IT Admin</option>
                    <option value="Pharmacist">Pharmacist</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Status dropdown filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-700 focus:outline-none hover:border-slate-300 cursor-pointer shadow-3xs h-9"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Bulk delete action display trigger */}
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-extrabold transition-all cursor-pointer h-9 shadow-3xs"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </button>
                )}
              </div>

              {/* Dual Create Trigger Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#55349A] hover:bg-[#402476] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer h-9 shrink-0 whitespace-nowrap border-none"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>CREATE...</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </button>

                {isCreateDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10 bg-transparent"
                      onClick={() => setIsCreateDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 px-1 select-none text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateDropdownOpen(false);
                          handleCreatePageInit();
                        }}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <User className="h-3.5 w-3.5 text-slate-400 stroke-[2.5]" />
                        <span>Create New User</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateDropdownOpen(false);
                          handleCreateTeamInit();
                        }}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5 text-slate-400 stroke-[2.5]" />
                        <span>Create New Team</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* 3. Table Element Container */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50 select-none">
                  <th className="py-3 px-5 text-left border-b border-slate-100 w-11">
                    <button
                      onClick={toggleSelectAll}
                      className={cn(
                        "h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors cursor-pointer border-slate-350 bg-white",
                        selectedIds.length === paginatedUsers.length && paginatedUsers.length > 0
                          ? "bg-[#55349A] border-[#55349A]"
                          : "hover:border-slate-400"
                      )}
                    >
                      {selectedIds.length === paginatedUsers.length && paginatedUsers.length > 0 && (
                        <Check className="h-3 w-3 text-white stroke-[3.5]" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">User Name & ID</th>
                  <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Contact Info</th>
                  <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-5 text-center border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider w-64">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90 bg-white">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs">
                      No system staff members located using your filter parameters.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const isSelected = selectedIds.includes(user.id);
                    return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedDetails(user)}
                        className="hover:bg-slate-50/40 transition-colors cursor-pointer group"
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => toggleSelectOne(user.id, e)}
                            className={cn(
                              "h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors cursor-pointer border-slate-300 bg-white",
                              isSelected
                                ? "bg-[#55349A] border-[#55349A]"
                                : "hover:border-slate-400"
                            )}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white stroke-[3.5]" />
                            )}
                          </button>
                        </td>

                        {/* Name & UHID */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-[#55349A]/5 border border-[#55349A]/10 text-[#55349A] font-black text-xs flex items-center justify-center select-none shrink-0 shadow-4xs">
                              {user.name.replace('Dr. ', '').replace('Nurse ', '').split(' ').map(n => n[0]).join('')}
                            </div>
                             <div className="text-left min-w-0">
                              <span className="font-extrabold text-xs text-slate-900 block group-hover:text-[#55349A] transition-colors truncate max-w-[160px]" title={user.name}>
                                {user.name}
                              </span>
                              <span className="font-mono text-[9px] text-slate-400 font-bold block mt-0.5">{user.staffId}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role text as requested */}
                        <td className="py-3 px-5 text-left">
                          <span className="text-xs font-bold text-slate-650">{user.role}</span>
                        </td>

                        {/* Contact details */}
                        <td className="py-3 px-5 text-left">
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="text-[11px] font-mono font-bold text-slate-700">{user.phone}</span>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[170px]" title={user.email}>{user.email}</span>
                          </div>
                        </td>

                        {/* Status Checkbox marker style */}
                        <td className="py-3 px-5 text-left">
                          {user.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <span className="h-1 w-1 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </span>
                          ) : user.status === 'On Leave' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100">
                              <span className="h-1 w-1 rounded-full bg-amber-500" />
                              <span>On Leave</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200">
                              <span className="h-1 w-1 rounded-full bg-slate-400" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedDetails(user)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#55349A] font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border border-slate-200 shadow-3xs"
                            >
                              <Eye className="h-3.5 w-3.5 stroke-[2]" />
                              <span>View</span>
                            </button>

                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMoreId(openMoreId === user.id ? null : user.id);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border border-slate-200 shadow-3xs hover:border-slate-300"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5 stroke-[2]" />
                                <span>More</span>
                              </button>

                              {openMoreId === user.id && (
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
                                        handleEditPageInit(user, e);
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMoreId(null);
                                        const newStatus = user.status === 'Active' ? 'INACTIVE' : 'ACTIVE';
                                        updateStatusMutation.mutate({ uid: user.id, status: newStatus });
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                      {user.status === 'Active' ? <UserX className="h-3.5 w-3.5 text-slate-450" /> : <UserCheck className="h-3.5 w-3.5 text-slate-450" />}
                                      <span>{user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMoreId(null);
                                        setLoginIdUser(user);
                                        setTempLoginId(user.loginId || '');
                                        setLoginIdHasAttemptedSubmit(false);
                                        setIsLoginIdModalOpen(true);
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-extrabold hover:bg-slate-50 rounded-lg text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                      <Key className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Set Login ID</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Footer Pagination controls */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-slate-500 text-xs font-semibold select-none">
            <span>
              Showing <strong className="text-slate-800">{Math.min(totalElements, (currentPage - 1) * itemsPerPage + 1)}</strong> to{' '}
              <strong className="text-slate-800">{Math.min(totalElements, currentPage * itemsPerPage)}</strong> of{' '}
              <strong className="text-slate-800">{totalElements}</strong> staff items
            </span>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 px-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg disabled:opacity-40 disabled:hover:border-slate-200 text-slate-600 font-extrabold cursor-pointer transition-all flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "h-7 w-7 rounded-lg text-xs font-black transition-all cursor-pointer",
                      currentPage === i + 1
                        ? "bg-[#55349A] text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 px-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg disabled:opacity-40 disabled:hover:border-slate-200 text-slate-600 font-extrabold cursor-pointer transition-all flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
        ) : (
          /* ==================== TEAMS TAB VIEW ==================== */
          selectedTeamDetails ? (
            /* ==================== TEAM DETAIL SUBVIEW ==================== */
            <div className="space-y-6">
              {/* Breadcrumb row & Quick Member Add */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-4xs">
                <div>
                  <button
                    onClick={() => setSelectedTeamDetails(null)}
                    className="flex items-center gap-1 text-xs font-black text-slate-500 hover:text-[#55349A] transition-colors mb-2 bg-transparent border-none cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Teams</span>
                  </button>
                  <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#55349A]" />
                    <span>{selectedTeamDetails.name}</span>
                  </h2>
                  <p className="text-xs text-slate-450 font-semibold max-w-xl mt-1 leading-relaxed text-left">
                    {selectedTeamDetails.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-[#55349A] text-[10px] font-extrabold rounded border border-violet-100 uppercase select-none">
                      {selectedTeamDetails.department}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Created on <strong className="font-mono text-slate-700">{selectedTeamDetails.createdDate}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Members: <strong className="text-[#55349A] font-extrabold">{selectedTeamDetails.memberIds.length}</strong>
                    </span>
                  </div>
                </div>


              </div>

              {/* Members of this team list table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-4xs overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-left flex justify-between items-center relative">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">TEAM ROSTER</h3>

                  {/* "+ Add" button dropdown control */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddRosterDropdownOpen(!isAddRosterDropdownOpen);
                        setRosterSearchQuery('');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#55349A] hover:bg-[#402476] text-white rounded-xl text-xs font-black transition-all shadow-3xs cursor-pointer uppercase tracking-wider border-none h-8 select-none"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Add</span>
                    </button>

                    <AnimatePresence>
                      {isAddRosterDropdownOpen && (
                        <>
                          {/* Close overlay */}
                          <div
                            className="fixed inset-0 z-30 bg-transparent"
                            onClick={() => setIsAddRosterDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-45 p-3 text-left space-y-2.5"
                          >
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Add Staff to Team</span>

                            {/* Search box within dropdown */}
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search staff name or role..."
                                value={rosterSearchQuery}
                                onChange={(e) => setRosterSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-150 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#55349A] transition-colors h-8"
                                autoFocus
                              />
                            </div>

                            {/* Options Scroll List */}
                            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 rounded-lg border border-slate-100 pr-0.5">
                              {(() => {
                                const candidates = users.filter(
                                  u => !selectedTeamDetails.memberIds.includes(u.id) &&
                                  (u.name.toLowerCase().includes(rosterSearchQuery.toLowerCase()) ||
                                   u.role.toLowerCase().includes(rosterSearchQuery.toLowerCase()))
                                );

                                if (candidates.length === 0) {
                                  return (
                                    <div className="py-6 text-center text-slate-400 text-[11px] font-bold">
                                      {users.filter(u => !selectedTeamDetails.memberIds.includes(u.id)).length === 0
                                        ? "All staff are already enrolled"
                                        : "No matching staff found"}
                                    </div>
                                  );
                                }

                                return candidates.map(u => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      handleAddMemberToTeam(u.id);
                                    }}
                                    className="w-full text-left px-2.5 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between group border-none bg-transparent cursor-pointer"
                                  >
                                    <div className="min-w-0">
                                      <span className="text-xs font-extrabold text-slate-800 block truncate group-hover:text-[#55349A]">{u.name}</span>
                                      <span className="text-[10px] text-slate-400 font-bold block">{u.role} &bull; {u.staffId}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-[#55349A] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0 flex items-center gap-0.5 uppercase tracking-wider">
                                      <Plus className="h-3 w-3 stroke-[3.5]" />
                                      <span>Enroll</span>
                                    </span>
                                  </button>
                                ));
                              })()}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/30">
                        <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">User Name & ID</th>
                        <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Contact Info</th>
                        <th className="py-3 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-5 text-center border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider w-64">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedTeamDetails.memberIds.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-xs animate-pulse">
                            No active users enrolled in this team roster. Use the selector above to enroll staff.
                          </td>
                        </tr>
                      ) : (
                        users
                          .filter(u => selectedTeamDetails.memberIds.includes(u.id))
                          .map((user) => (
                            <tr key={user.id} onClick={() => setSelectedDetails(user)} className="hover:bg-slate-50/30 cursor-pointer transition-colors group">
                              <td className="py-2.5 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="h-8.5 w-8.5 rounded-xl bg-[#55349A]/5 border border-[#55349A]/10 text-[#55349A] font-black text-xs flex items-center justify-center select-none shrink-0 shadow-3xs">
                                    {user.name.replace('Dr. ', '').replace('Nurse ', '').split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div className="text-left min-w-0">
                                    <span className="font-extrabold text-xs text-slate-900 block group-hover:text-[#55349A] transition-colors truncate max-w-[160px] text-left">{user.name}</span>
                                    <span className="font-mono text-[9px] text-slate-400 font-bold block mt-0.5 text-left">{user.staffId}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-5 text-left">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-750 text-[11px] font-semibold border border-slate-100 rounded select-none font-sans font-medium tracking-tight text-gray-900">
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-2.5 px-5 text-left">
                                <div className="flex flex-col text-left font-mono text-[11px] font-bold text-slate-700">
                                  <span>{user.phone}</span>
                                  <span className="text-[10px] font-bold text-slate-400 select-none truncate max-w-[170px]" title={user.email}>{user.email}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-5 text-left">
                                {user.status === 'Active' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                    <span>Active</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-550 border border-slate-200">
                                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                                    <span>{user.status}</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setSelectedDetails(user)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-extrabold text-[11px] rounded-lg transition-all border border-slate-200 border-none cursor-pointer"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Profile</span>
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMemberFromTeam(user.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] rounded-lg transition-all border border-rose-100 border-none cursor-pointer"
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
            /* ==================== GENERAL TEAMS DIRECTORY GRID ==================== */
            <div className="space-y-6">
              {/* Teams search filter row */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-4xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative min-w-[280px] flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      placeholder="Search team names, department, or description..."
                      className="text-left w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A] transition-all shadow-3xs h-9"
                    />
                  </div>

                  <button
                    onClick={handleCreateTeamInit}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#55349A] hover:bg-[#402476] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer h-9 shrink-0 whitespace-nowrap border-none"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>CREATE TEAM</span>
                  </button>
                </div>
              </div>

              {/* Renders Teams List Grid */}
              {teams.filter(t =>
                t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
                t.department.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(teamSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs">
                  No operational groups mapped using your parameter tags. Create a new team roster to begin.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-4xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50/50 select-none">
                          <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Team Name</th>
                          <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Description</th>
                          <th className="py-3.5 px-5 text-left border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Members</th>
                          <th className="py-3.5 px-5 text-center border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider w-64">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/90 bg-white">
                        {teams
                          .filter(t =>
                            t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
                            t.department.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
                            t.description.toLowerCase().includes(teamSearchQuery.toLowerCase())
                          )
                          .map((team) => {
                            return (
                              <tr
                                key={team.id}
                                onClick={() => setSelectedTeamDetails(team)}
                                className="hover:bg-slate-50/40 transition-colors cursor-pointer group"
                              >
                                {/* Team Name */}
                                <td className="py-4 px-5 text-left">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 bg-violet-50 text-[#55349A] rounded-xl flex items-center justify-center font-bold">
                                      <Users className="h-4.5 w-4.5" />
                                    </div>
                                    <div>
                                      <span className="text-xs font-black text-slate-900 group-hover:text-[#55349A] transition-colors">{team.name}</span>
                                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">ID: {team.id}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Description */}
                                <td className="py-4 px-5 text-left max-w-sm truncate" title={team.description}>
                                  {team.description ? (
                                    <span className="text-xs font-semibold text-slate-650 line-clamp-1">
                                      {team.description}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-650 line-clamp-1 opacity-50">
                                      No description provided
                                    </span>
                                  )}
                                </td>

                                {/* Total Members Count */}
                                <td className="py-4 px-5 text-left text-xs font-bold text-slate-700">
                                  {team.memberIds.length}
                                </td>

                                {/* Actions */}
                                <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={(e) => handleEditTeamInit(team, e)}
                                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                      title="Edit Team"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-[#55349A]" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteTeam(team.id, e)}
                                      className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors border-none bg-[#fff0f3]/0 cursor-pointer"
                                      title="Delete Team"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        )}

      </div>

      {/* 5. Create or Edit User Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-amber-500 fill-amber-500 animate-pulse" />
                    <span>{formMode === 'create' ? 'REGISTER NEW USER' : 'EDIT USER PROFILE'}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold block mt-0.5">Define workspace profile, access controls and responsibilities.</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="h-4.5 w-4.5 text-slate-400" />
                </button>
              </div>

              {/* Form elements */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Jane Smith"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] transition-colors"
                    />
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Workspace Role *</label>
                    <div className="relative">
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserItem['role'] }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-450 focus:outline-none focus:border-[#55349A] transition-colors appearance-none"
                      >
                        <option value="Doctor">Doctor</option>
                        <option value="Nurse">Nurse</option>
                        <option value="Admin">Admin</option>
                        <option value="Receptionist">Receptionist</option>
                        <option value="IT Admin">IT Admin</option>
                        <option value="Pharmacist">Pharmacist</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department Assigned *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cardiology"
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] transition-colors"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9845302914"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. employee@globalcare.org"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] transition-colors"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Employment Status</label>
                    <div className="relative">
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as UserItem['status'] }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-450 focus:outline-none focus:border-[#55349A] transition-colors appearance-none"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8] pointer-events-none" />
                    </div>
                  </div>

                  {/* Permissions tags */}
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Custom Permissions (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Patient Write, Prescribe Meds, Billing Audits"
                      value={formData.permissionsInput}
                      onChange={(e) => setFormData(prev => ({ ...prev, permissionsInput: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-450 focus:outline-none focus:border-[#55349A] transition-colors"
                    />
                  </div>

                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-[#55349A] hover:bg-[#402476] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer border-none"
                  >
                    {formMode === 'create' ? 'Add User Account' : 'Save Changes'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Modal Form */}
      <AnimatePresence>
        {isTeamFormOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                    <Users className="h-4.5 w-4.5 text-[#55349A] fill-[#55349A]/10" />
                    <span>{teamFormMode === 'create' ? 'Create Team' : 'Edit Team Details'}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold block mt-0.5">
                    Define operational workgroups, department metrics, and assign staff rosters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTeamFormOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="h-4.5 w-4.5 text-slate-400" />
                </button>
              </div>

              {/* Form Scroll Container */}
              <form onSubmit={handleTeamFormSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">

                  {/* Team Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Team Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pediatrics Nurse Roster or Cardiology ICU Team"
                      value={teamFormData.name}
                      onChange={(e) => setTeamFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Team Description</label>
                    <textarea
                      placeholder="Describe workgroup schedules, procedure focuses, or general operations guidelines..."
                      value={teamFormData.description}
                      onChange={(e) => setTeamFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full h-16 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#55349A] transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Member Enrollment Selector Section */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between gap-2.5 flex-wrap">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Enroll Team Members ({teamFormData.memberIds.length})</label>
                        <p className="text-[9px] text-slate-400 font-bold">Select from active clinical and admin staff</p>
                      </div>

                      {/* Search box inside modal */}
                      <div className="relative w-44">
                        <input
                          type="text"
                          placeholder="Search staff name..."
                          value={teamMemberSearchQuery}
                          onChange={(e) => setTeamMemberSearchQuery(e.target.value)}
                          className="w-full h-7 pl-7 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-800 focus:outline-none focus:border-[#55349A] placeholder:text-slate-400"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                        {teamMemberSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setTeamMemberSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold p-0.5"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Member selection scroll widget */}
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-44 overflow-y-auto bg-slate-50/50">
                      {users
                        .filter(u => !teamMemberSearchQuery || u.name.toLowerCase().includes(teamMemberSearchQuery.toLowerCase()))
                        .map(user => {
                          const isChecked = teamFormData.memberIds.includes(user.id);
                          return (
                            <div
                              key={user.id}
                              onClick={() => toggleTeamMember(user.id)}
                              className={cn(
                                "flex items-center justify-between p-2.5 px-3.5 text-left transition-colors cursor-pointer select-none",
                                isChecked ? "bg-[#55349A]/5" : "hover:bg-slate-50"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center transition-all",
                                  isChecked
                                    ? "bg-[#55349A] border-[#55349A] text-white"
                                    : "border-slate-300 bg-white"
                                )}>
                                  {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-slate-800">{user.name}</span>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-2">
                                    {user.role}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {users.filter(u => !teamMemberSearchQuery || u.name.toLowerCase().includes(teamMemberSearchQuery.toLowerCase())).length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-xs font-bold font-sans">
                          No workers match your filter description.
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Sticky Footer */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTeamFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#55349A] hover:bg-[#402476] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer border-none uppercase tracking-wide"
                  >
                    {teamFormMode === 'create' ? 'Create Team' : 'Save Team Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Drill Down Detail Slide-Over Drawer panel */}
      <AnimatePresence>
        {selectedDetails && (
          <div className="fixed inset-0 z-50 overflow-hidden select-none">
            {/* Dark blur glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetails(null)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs"
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                className="w-screen max-w-md bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl overflow-hidden"
              >

                {/* Header view profile title */}
                <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#55349A]/10 text-[#55349A] flex items-center justify-center font-black text-sm border border-[#55349A]/20">
                      {selectedDetails.name.replace('Dr. ', '').replace('Nurse ', '').split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black text-slate-900 tracking-tight block max-w-[220px] truncate" title={selectedDetails.name}>
                        {selectedDetails.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-extrabold font-mono mt-0.5 block">{selectedDetails.staffId}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDetails(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <X className="h-4.5 w-4.5 text-slate-450" />
                  </button>
                </div>

                {/* Content Stream list info items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">

                  {/* Account Metadata State badge */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Joined Since</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">{selectedDetails.joinedDate}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Code</span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                        selectedDetails.status === 'Active'
                          ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                          : selectedDetails.status === 'On Leave'
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-slate-50 text-slate-500 border-slate-100"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          selectedDetails.status === 'Active' ? "bg-emerald-500" : selectedDetails.status === 'On Leave' ? "bg-amber-500" : "bg-slate-400"
                        )} />
                        <span>{selectedDetails.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Demographics Profile Segment (Gender, DOB, Pincode) */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-[#55349A]/80 uppercase tracking-widest border-b border-slate-100 pb-1.5">Personal Info (from Add User)</h4>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Gender</span>
                        <span className="text-xs font-bold text-slate-800">{selectedDetails.gender || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Date of Birth</span>
                        <span className="text-xs font-bold text-slate-800">{selectedDetails.dob || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Resident Pincode</span>
                        <span className="text-xs font-bold text-slate-850 font-mono">{selectedDetails.pincode || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Assigned By</span>
                        <span className="text-xs font-bold text-indigo-600 font-extrabold">{selectedDetails.assignedBy || 'David Beckham'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Job Details Card Section */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-[#55349A]/80 uppercase tracking-widest border-b border-slate-100 pb-1.5">Employment Profile</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Assigned Role</span>
                        <span className="text-xs font-bold text-slate-800">{selectedDetails.role}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Department Unit</span>
                        <span className="text-xs font-bold text-slate-800">{selectedDetails.department}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Methods card */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-[#55349A]/80 uppercase tracking-widest border-b border-slate-100 pb-1.5">Contact Channels</h4>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="font-mono">{selectedDetails.phone}</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-slate-50 border border-slate-100 p-2.5 rounded-xl overflow-hidden">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedDetails.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Included Calendars and Planning Modules */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-[#55349A]/80 uppercase tracking-widest border-b border-slate-100 pb-1.5">Included Calendars</h4>
                    <div className="space-y-2">
                      {selectedDetails.calendars && selectedDetails.calendars.length > 0 ? (
                        selectedDetails.calendars.map((cal, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                            <Calendar className="h-4 w-4 text-[#55349A]" />
                            <span>{cal}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-450 italic bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200 text-center font-bold">
                          No calendars assigned to this user.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Workspace Products & Roles assigned as requested */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-[#55349A]/80 uppercase tracking-widest border-b border-slate-100 pb-1.5">Product & Role Access list</h4>
                    <div className="space-y-2">
                      {selectedDetails.products && selectedDetails.products.length > 0 ? (
                        selectedDetails.products.map((prod, idx) => {
                          const isEditing = editingProdIndex === idx;
                          const isMoreOpen = productMoreOpenIndex === idx;
                          return (
                            <div key={idx} className="relative bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex flex-col gap-2 hover:bg-slate-100/40 transition-all shadow-4xs text-left">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-[#55349A]" />
                                    <span className="text-xs font-black text-slate-800 tracking-tight block">
                                      product : <span className="text-[#55349A] font-extrabold">{prod.name}</span>
                                    </span>
                                  </div>
                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <input
                                        type="text"
                                        value={editingProdRoleVal}
                                        onChange={(e) => setEditingProdRoleVal(e.target.value)}
                                        className="bg-white border border-slate-250 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-[#55349A] h-7 w-40 text-slate-800"
                                        placeholder="Enter role..."
                                      />
                                      <button
                                        onClick={() => handleSaveProductRole(idx, editingProdRoleVal)}
                                        className="p-1 bg-[#55349A] hover:bg-[#402476] text-white rounded-lg transition-colors border-none cursor-pointer"
                                        title="Save role change"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingProdIndex(null)}
                                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-650 rounded-lg transition-colors border-none cursor-pointer"
                                        title="Cancel"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                                      Role : <span className="text-slate-800 font-extrabold">{prod.role}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {!isEditing && (
                                    <button
                                      onClick={() => {
                                        setEditingProdIndex(idx);
                                        setEditingProdRoleVal(prod.role);
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-black uppercase text-[#55349A] hover:bg-violet-50 rounded-lg transition-all border border-violet-100 bg-white cursor-pointer select-none"
                                    >
                                      edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setProductMoreOpenIndex(isMoreOpen ? null : idx)}
                                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                                    title="More options"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {isMoreOpen && (
                                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-end gap-2 text-[9px] font-black uppercase">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Revoke product access helper
                                      if (selectedDetails) {
                                        const updatedProds = (selectedDetails.products || []).filter((_, i) => i !== idx);
                                        const updatedUser = { ...selectedDetails, products: updatedProds };
                                        setSelectedDetails(updatedUser);
                                        setUsers(prev => prev.map(u => u.id === selectedDetails.id ? updatedUser : u));
                                        setProductMoreOpenIndex(null);
                                      }
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-rose-50 border border-rose-100 text-rose-600 rounded transition-all cursor-pointer"
                                  >
                                    revoke access
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Suspend product role action
                                      if (selectedDetails) {
                                        const isSuspended = prod.role.endsWith(' (Suspended)');
                                        const cleanRole = isSuspended ? prod.role.replace(' (Suspended)', '') : prod.role;
                                        const finalRole = isSuspended ? cleanRole : `${cleanRole} (Suspended)`;
                                        const updatedProds = [...(selectedDetails.products || [])];
                                        updatedProds[idx] = { ...updatedProds[idx], role: finalRole };

                                        const updatedUser = { ...selectedDetails, products: updatedProds };
                                        setSelectedDetails(updatedUser);
                                        setUsers(prev => prev.map(u => u.id === selectedDetails.id ? updatedUser : u));
                                        setProductMoreOpenIndex(null);
                                      }
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-amber-50 border border-amber-100 text-amber-600 rounded transition-all cursor-pointer font-black"
                                  >
                                    {prod.role.endsWith(' (Suspended)') ? 'unsuspend role' : 'suspend role'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[11px] text-slate-450 italic bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200 text-center font-bold">
                          No workflow product assignments.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security Access Rules and permissions checklist */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-[#55349A]/80 uppercase tracking-widest border-b border-slate-100 pb-1.5">Access Rights & Permissions</h4>

                    <div className="flex flex-wrap gap-1.5">
                      {selectedDetails.permissions.length === 0 ? (
                        <span className="text-xs text-slate-450 italic">No special authorization modules assigned yet.</span>
                      ) : (
                        selectedDetails.permissions.map((perm, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 bg-violet-50 text-[#55349A] border border-violet-100 text-[10px] font-extrabold rounded lowercase"
                          >
                            ⭐ {perm}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-3.5 text-xs text-amber-805 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-850">
                      <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Security Watch Compliance</span>
                    </div>
                    <p className="text-[11px] text-amber-700 font-bold leading-normal">
                      This employee profile has security compliance clearance level 2. Actions may be audited synchronously for regulatory checkups.
                    </p>
                  </div>

                </div>

                {/* Drawer Footer bottom actions */}
                <div id="drawer-footer" className="p-5 bg-slate-50/55 border-t border-slate-100 flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      setIsFormOpen(false);
                      handleEditInit(selectedDetails, e);
                    }}
                    className="flex-1 py-2 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-black text-slate-700 cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteItem(selectedDetails.id, e)}
                    className="flex-1 py-2 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1 text-center"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    <span>Purge Record</span>
                  </button>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Set Login ID Modal popup as requested by the user */}
      <AnimatePresence>
        {isLoginIdModalOpen && loginIdUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginIdModalOpen(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-3xs cursor-default"
            />

            {/* Modal Body Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative z-10 text-left"
            >
              {/* Header block */}
              <div className="flex items-center justify-between pb-4">
                <span className="text-base font-black text-slate-900 tracking-tight">Set Login ID</span>
                <button
                  type="button"
                  onClick={() => setIsLoginIdModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form body */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoginIdHasAttemptedSubmit(true);
                  const isIdValid = (id: string) => {
                    if (id.length < 5 || id.length > 45) return false;
                    if (/\s/.test(id)) return false;
                    return /^[a-zA-Z0-9@_.]+$/.test(id);
                  };
                  if (isIdValid(tempLoginId)) {
                    setUsers(prev => prev.map(u => u.id === loginIdUser.id ? { ...u, loginId: tempLoginId } : u));
                    setIsLoginIdModalOpen(false);
                  }
                }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block select-none">
                    New Login ID
                  </label>
                  <input
                    type="text"
                    value={tempLoginId}
                    onChange={(e) => setTempLoginId(e.target.value)}
                    placeholder="username"
                    className={cn(
                      "w-full bg-white border rounded px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all h-10 shadow-3xs",
                      (loginIdHasAttemptedSubmit && (tempLoginId.length < 5 || tempLoginId.length > 45 || /\s/.test(tempLoginId) || !/^[a-zA-Z0-9@_.]+$/.test(tempLoginId)))
                        ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-300 focus:border-[#4B90E2] focus:ring-1 focus:ring-[#4B90E2]"
                    )}
                    autoFocus
                  />

                  {/* Info sub-text with lightbulb emoji as requested */}
                  <div className="flex items-center gap-1.5 mt-1 select-none">
                    <span role="img" aria-label="lightbulb" className="text-sm shrink-0">💡</span>
                    <span className={cn(
                      "text-[10px] font-bold tracking-tight",
                      (loginIdHasAttemptedSubmit && (tempLoginId.length < 5 || tempLoginId.length > 45 || /\s/.test(tempLoginId) || !/^[a-zA-Z0-9@_.]+$/.test(tempLoginId)))
                        ? "text-rose-600 font-extrabold"
                        : "text-slate-500"
                    )}>
                      5-45 characters; no spaces; only @ _ . allowed
                    </span>
                  </div>
                </div>

                {/* Sub-aligned button bar as shown in the picture */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLoginIdModalOpen(false)}
                    className="px-6 py-2.5 bg-[#E0E0E0] hover:bg-[#D8D7D7] text-slate-700 hover:text-slate-900 text-xs font-black rounded uppercase tracking-wider transition-colors border-none cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#2A00A3] hover:bg-[#1E0078] text-white text-xs font-black rounded uppercase tracking-wider transition-colors border-none cursor-pointer shadow-3xs"
                  >
                    SAVE
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
