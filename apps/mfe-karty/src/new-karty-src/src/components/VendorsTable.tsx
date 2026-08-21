import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Search, Plus, ChevronDown, ChevronUp, Pencil,
  MoreHorizontal, ChevronLeft, ChevronRight, Check, Trash2,
  Mail, Phone, Store, Copy, Archive, Eye, CreditCard, Landmark, CheckCircle2, X,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TablePagination } from './TablePagination';

const VENDOR_PAGE_SIZE = 10;
import { useVendors, useCreateVendor, useUpdateVendor, useUpdateVendorStatus, useDeleteVendor } from '../../../services/useVendors';

export interface VendorItem {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Draft' | 'Archived';
  storeType: string;
  email: string;
  phone: string;
  ownerName?: string;
  address?: string;
  state?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  branch?: string;
  gstNo?: string;
  panNo?: string;
  imageUrl?: string;
}

interface TransactionItem {
  id: string;
  date: string;
  amount: number; // in numerical rupees
  category: string;
  paymentMode: string;
  status: 'Completed' | 'Pending' | 'Failed';
}

// Beautiful custom SVGs representing storefront shop
const StorefrontIcon = ({ imageUrl }: { imageUrl?: string }) => {
  if (imageUrl) {
    return (
      <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden group-hover/row:scale-105 transition-transform duration-200">
        <img
          src={imageUrl}
          alt="Vendor Logo"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl bg-[#FDF4F5] border border-[#FBE3E4] flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden group-hover/row:scale-105 transition-transform duration-200">
      <svg viewBox="0 0 100 100" className="w-9 h-9">
        {/* Store Base/Wall */}
        <rect x="25" y="48" width="50" height="32" rx="4" fill="#9F8EC2" />
        {/* Wall trim */}
        <rect x="25" y="74" width="50" height="6" fill="#8471AF" />
        {/* Door */}
        <rect x="44" y="58" width="14" height="22" rx="2" fill="#55349A" />
        {/* Windows */}
        <rect x="30" y="58" width="8" height="10" rx="1.5" fill="#E8DDF4" />
        <rect x="62" y="58" width="8" height="10" rx="1.5" fill="#E8DDF4" />
        {/* Door handle */}
        <circle cx="55" cy="69" r="1.5" fill="#FFC857" />
        {/* Shop Awning (Red & White Stripes) */}
        <path d="M 20 48 L 80 48 L 76 34 L 24 34 Z" fill="#DE4E4E" />
        {/* White stripes overlay */}
        <path d="M 27.5 34 L 33 34 L 29.5 48 L 24 48 Z M 39.5 34 L 45 34 L 41.5 48 L 36 48 Z M 51.5 34 L 57 34 L 53.5 48 L 48 48 Z M 63.5 34 L 69 34 L 65.5 48 L 60 48 Z M 75.5 34 L 76 34 L 77.5 48 L 72 48 Z" fill="#FFFFFF" opacity="0.9" />
        {/* Shop Sign Board */}
        <rect x="34" y="24" width="32" height="7" rx="1.5" fill="#DE4E4E" />
        <rect x="38" y="26.5" width="24" height="2" rx="0.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

// Large Icon representing storefront shop for details page
const DetailStorefrontIcon = ({ imageUrl }: { imageUrl?: string }) => {
  if (imageUrl) {
    return (
      <div className="w-16 h-16 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
        <img
          src={imageUrl}
          alt="Vendor Logo"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div className="w-16 h-16 rounded-2xl bg-[#FFF6F6] border border-[#FEE2E2] flex items-center justify-center shrink-0 shadow-md">
      <svg viewBox="0 0 100 100" className="w-12 h-12">
        <rect x="25" y="48" width="50" height="32" rx="4" fill="#9F8EC2" />
        <rect x="25" y="74" width="50" height="6" fill="#8471AF" />
        <rect x="44" y="58" width="14" height="22" rx="2" fill="#55349A" />
        <rect x="30" y="58" width="8" height="10" rx="1.5" fill="#E8DDF4" />
        <rect x="62" y="58" width="8" height="10" rx="1.5" fill="#E8DDF4" />
        <circle cx="55" cy="69" r="1.5" fill="#FFC857" />
        <path d="M 20 48 L 80 48 L 76 34 L 24 34 Z" fill="#DE4E4E" />
        <path d="M 27.5 34 L 33 34 L 29.5 48 L 24 48 Z M 39.5 34 L 45 34 L 41.5 48 L 36 48 Z M 51.5 34 L 57 34 L 53.5 48 L 48 48 Z M 63.5 34 L 69 34 L 65.5 48 L 60 48 Z M 75.5 34 L 76 34 L 77.5 48 L 72 48 Z" fill="#FFFFFF" opacity="0.9" />
        <rect x="34" y="24" width="32" height="7" rx="1.5" fill="#DE4E4E" />
        <rect x="38" y="26.5" width="24" height="2" rx="0.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const VendorsTable = () => {
  const { data: backendVendors } = useVendors();
  const createVendorMutation = useCreateVendor();
  const updateVendorMutation = useUpdateVendor();
  const updateStatusMutation = useUpdateVendorStatus();
  const deleteVendorMutation = useDeleteVendor();

  const [vendors, setVendors] = useState<VendorItem[]>([]);

  React.useEffect(() => {
    if (backendVendors) {
      const mapped = backendVendors.map((v: any) => ({
        id: v.uid || v.id,
        name: v.name || v.vendorName || 'Unknown Vendor',
        code: v.code || `#V${v.uid?.substring(0,4).toUpperCase()}`,
        status: v.status === 'ACTIVE' || v.status === 'Active' ? 'Active' : v.status === 'ARCHIVED' ? 'Archived' : 'Draft',
        storeType: v.type || v.storeType || 'Retail',
        email: v.email || '',
        phone: v.contactNumber || v.phone || '',
        address: v.address || v.location || '',
        bankName: v.bankName || '',
        accountNo: v.accountNo || v.accountNumber || '',
        ifsc: v.ifsc || v.ifscCode || '',
        ownerName: v.ownerName || '',
      }));
      setVendors(mapped);
    }
  }, [backendVendors]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeTypeDropdownOpen, setStoreTypeDropdownOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('All');

  // View states
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVendorDetails, setSelectedVendorDetails] = useState<VendorItem | null>(null);
  const [vendorToEdit, setVendorToEdit] = useState<VendorItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formStoreType, setFormStoreType] = useState('BAKERY');
  const [formStatus, setFormStatus] = useState<'Active' | 'Draft' | 'Archived'>('Active');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formState, setFormState] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadedFile) {
      setFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(uploadedFile);
    setFilePreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [uploadedFile]);

  // Form Dropdowns
  const [formTypeDropdownOpen, setFormTypeDropdownOpen] = useState(false);
  const [formStatusDropdownOpen, setFormStatusDropdownOpen] = useState(false);
  const [formStateDropdownOpen, setFormStateDropdownOpen] = useState(false);

  const STATES = [
    'Kerala',
    'Tamil Nadu',
    'Karnataka',
    'Maharashtra',
    'Delhi',
    'Telangana',
    'Andhra Pradesh',
    'Gujarat',
    'Goa',
    'Punjab',
    'Uttar Pradesh',
    'West Bengal',
    'Rajasthan'
  ];

  // Country code dropdown states
  const [selectedCountry, setSelectedCountry] = useState({ name: 'India', flag: '🇮🇳', code: '+91' });
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  const COUNTRIES = [
    { name: 'India', flag: '🇮🇳', code: '+91' },
    { name: 'United States', flag: '🇺🇸', code: '+1' },
    { name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
    { name: 'United Arab Emirates', flag: '🇦🇪', code: '+971' },
    { name: 'Singapore', flag: '🇸🇬', code: '+65' },
    { name: 'Canada', flag: '🇨🇦', code: '+1' },
    { name: 'Australia', flag: '🇦🇺', code: '+61' },
    { name: 'Saudi Arabia', flag: '🇸🇦', code: '+966' },
    { name: 'Germany', flag: '🇩🇪', code: '+49' },
    { name: 'France', flag: '🇫🇷', code: '+33' },
  ];

  // Detail View States
  const [detailsTab, setDetailsTab] = useState<'Expense' | 'Payout'>('Expense');
  const [detailsSearch, setDetailsSearch] = useState('');
  const [detailsStatusFilter, setDetailsStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [detailsFilterDropdownOpen, setDetailsFilterDropdownOpen] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [bankInfoOpen, setBankInfoOpen] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bName, setBName] = useState('');
  const [bAccount, setBAccount] = useState('');
  const [bBranch, setBBranch] = useState('');
  const [bGst, setBGst] = useState('');
  const [bIfsc, setBIfsc] = useState('');
  const [bPan, setBPan] = useState('');

  // Selected Transaction details for "Update Expense" view
  const [selectedTransactionDetails, setSelectedTransactionDetails] = useState<TransactionItem | null>(null);
  const [txProduct, setTxProduct] = useState('Finance');
  const [txCategory, setTxCategory] = useState('');
  const [txLocation, setTxLocation] = useState('Veliyannur');
  const [txExpenseFor, setTxExpenseFor] = useState('');
  const [txReferenceNo, setTxReferenceNo] = useState('00002');
  const [txAmount, setTxAmount] = useState('2499.00');
  const [txVendorName, setTxVendorName] = useState('vendor1');
  const [txAmountDue, setTxAmountDue] = useState('2499.00');
  const [txAmountPaid, setTxAmountPaid] = useState('0.00');
  const [txStatus, setTxStatus] = useState('New');
  const [txDate, setTxDate] = useState('06/04/2026');
  const [txNotes, setTxNotes] = useState('');
  const [txActionsDropdownOpen, setTxActionsDropdownOpen] = useState(false);

  const handleViewTransactionDetails = (item: TransactionItem) => {
    setSelectedTransactionDetails(item);
    setTxProduct('Finance');
    setTxCategory(item.category || 'Purchase');
    setTxLocation(selectedVendorDetails?.address || 'Veliyannur');
    setTxExpenseFor('');
    const numericId = item.id.replace('tx-', '').replace('po-', '');
    setTxReferenceNo(numericId.padStart(5, '0'));
    setTxAmount(item.amount.toFixed(2));
    setTxVendorName(selectedVendorDetails?.name || 'vendor1');
    setTxAmountDue(item.status === 'Completed' ? '0.00' : item.amount.toFixed(2));
    setTxAmountPaid(item.status === 'Completed' ? item.amount.toFixed(2) : '0.00');
    setTxStatus(item.status === 'Completed' ? 'Completed' : 'New');
    setTxDate(item.date || '06/04/2026');
    setTxNotes('');
    setTxActionsDropdownOpen(false);
  };

  const handleSaveTransactionDetails = () => {
    if (!selectedTransactionDetails || !selectedVendorDetails) return;
    const amountNum = parseFloat(txAmount) || 0;
    const updated: TransactionItem = {
      ...selectedTransactionDetails,
      category: txCategory,
      amount: amountNum,
      date: txDate,
      status: txStatus === 'Completed' ? 'Completed' : 'Pending'
    };

    const vId = selectedVendorDetails.id;
    if (detailsTab === 'Expense') {
      setExpenses(prev => ({
        ...prev,
        [vId]: (prev[vId] || []).map(t => t.id === selectedTransactionDetails.id ? updated : t)
      }));
    } else {
      setPayouts(prev => ({
        ...prev,
        [vId]: (prev[vId] || []).map(t => t.id === selectedTransactionDetails.id ? updated : t)
      }));
    }
    setSelectedTransactionDetails(null);
  };

  const handleStartEditBank = () => {
    if (selectedVendorDetails) {
      setBName(selectedVendorDetails.bankName || '');
      setBAccount(selectedVendorDetails.accountNo || '');
      setBBranch(selectedVendorDetails.branch || '');
      setBGst(selectedVendorDetails.gstNo || '');
      setBIfsc(selectedVendorDetails.ifsc || '');
      setBPan(selectedVendorDetails.panNo || '');
      setIsEditingBank(true);
    }
  };

  const handleSaveBankInfo = () => {
    if (!selectedVendorDetails) return;
    const updated: VendorItem = {
      ...selectedVendorDetails,
      bankName: bName,
      accountNo: bAccount,
      branch: bBranch,
      gstNo: bGst,
      ifsc: bIfsc,
      panNo: bPan
    };

    setVendors(prev => prev.map(v => v.id === selectedVendorDetails.id ? updated : v));
    setSelectedVendorDetails(updated);
    setIsEditingBank(false);
  };

  const [expenses] = useState<Record<string, TransactionItem[]>>({});
  const [payouts] = useState<Record<string, TransactionItem[]>>({});

  // Row-specific active menu dropdown
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  const [storeTypes, setStoreTypes] = useState<string[]>(['Bakery', 'Pharmacy', 'Grocery', 'Boutique', 'Cafe', 'Restaurant', 'Supermarket']);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (storeTypes.some(t => t.toLowerCase() === formatted.toLowerCase())) {
      alert("This category already exists!");
      return;
    }
    setStoreTypes(prev => [...prev, formatted]);
    setFormStoreType(formatted.toUpperCase());
    setShowNewCategoryModal(false);
    setNewCategoryName('');
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          vendor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          vendor.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || vendor.storeType.toLowerCase() === selectedType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const [vendorPage, setVendorPage] = useState(1);
  React.useEffect(() => { setVendorPage(1); }, [searchQuery, selectedType, vendors.length]);
  const pagedVendors = filteredVendors.slice(
    (vendorPage - 1) * VENDOR_PAGE_SIZE,
    vendorPage * VENDOR_PAGE_SIZE
  );

  const toggleAll = () => {
    if (selectedIds.length === filteredVendors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVendors.map(v => v.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} vendor(s)?`)) {
      setVendors(prev => prev.filter(v => !selectedIds.includes(v.id)));
      selectedIds.forEach(id => deleteVendorMutation.mutate(id));
      setSelectedIds([]);
    }
  };

  const handleEditInit = (vendor: VendorItem) => {
    setVendorToEdit(vendor);
    setFormName(vendor.name);
    setFormCode(vendor.code.replace('#', ''));
    setFormStoreType(vendor.storeType.toUpperCase());
    setFormStatus(vendor.status);
    setFormEmail(vendor.email);
    setFormPhone(vendor.phone);
    setFormOwnerName(vendor.ownerName || '');
    setFormAddress(vendor.address || '');
    setFormState(vendor.state || '');
    setUploadedFile(null);
    setExistingImageUrl(vendor.imageUrl || null);
    setShowCreate(true);
    setSelectedVendorDetails(null); // Close details when opening edit
  };

  const handleCreateInit = () => {
    setVendorToEdit(null);
    setFormName('');
    setFormCode('');
    setFormStoreType('');
    setFormStatus('Active');
    setFormEmail('');
    setFormPhone('');
    setFormOwnerName('');
    setFormAddress('');
    setFormState('');
    setUploadedFile(null);
    setExistingImageUrl(null);
    setShowCreate(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please fill out the vendor store name');
      return;
    }

    let savedVendor: VendorItem;

    // F8: store the phone with its country code so the detail (which renders "+{phone}") shows
    // the full E.164 number, not "+<10 digits>" with the country code dropped. Guard against
    // double-prepending when editing a number that already carries the code.
    const ccDigits = (selectedCountry.code || '+91').replace(/\D/g, '');
    const rawPhone = (formPhone || '').replace(/\D/g, '');
    const fullPhone = !rawPhone ? '' : (rawPhone.startsWith(ccDigits) ? rawPhone : ccDigits + rawPhone);

    if (vendorToEdit) {
      // Edit mode
      savedVendor = {
        ...vendorToEdit,
        name: formName,
        code: formCode.startsWith('#') ? formCode : `#${formCode}`,
        storeType: formStoreType.charAt(0) + formStoreType.slice(1).toLowerCase(),
        status: formStatus,
        email: formEmail,
        phone: fullPhone,
        ownerName: formOwnerName,
        address: formAddress,
        state: formState,
        imageUrl: filePreviewUrl || existingImageUrl || undefined,
      };

      updateVendorMutation.mutate({ uid: vendorToEdit.id, data: savedVendor });
      setVendors(prev => prev.map(v => v.id === vendorToEdit.id ? savedVendor : v));
    } else {
      // Create mode
      const newId = String(Date.now());
      savedVendor = {
        id: newId,
        name: formName,
        code: formCode.startsWith('#') ? formCode : `#${formCode}`,
        storeType: formStoreType ? formStoreType.charAt(0) + formStoreType.slice(1).toLowerCase() : '',
        status: formStatus,
        email: formEmail,
        phone: fullPhone,
        ownerName: formOwnerName,
        address: formAddress,
        state: formState || '',
        bankName: '',
        accountNo: '',
        ifsc: '',
        imageUrl: filePreviewUrl || undefined,
      };

      createVendorMutation.mutate(savedVendor);
      setVendors(prev => [savedVendor, ...prev]);
    }

    setShowCreate(false);
    setVendorToEdit(null);
    setSelectedVendorDetails(savedVendor); // CRITICAL: Go straight to Vendor Details page
  };

  const handleDuplicateVendor = (vendor: VendorItem) => {
    const duplicated: VendorItem = {
      ...vendor,
      id: String(Date.now()),
      name: `Copy of ${vendor.name}`,
      code: `${vendor.code}-DUP`,
    };

    setVendors(prev => [duplicated, ...prev]);
    setSelectedVendorDetails(duplicated);
    setMoreActionsOpen(false);
    alert(`Vendor "${vendor.name}" duplicated successfully!`);
  };

  const handleArchiveVendor = (vendor: VendorItem) => {
    const updated: VendorItem = {
      ...vendor,
      status: 'Archived'
    };

    updateStatusMutation.mutate({ uid: vendor.id, status: 'ARCHIVED' });
    setVendors(prev => prev.map(v => v.id === vendor.id ? updated : v));
    setSelectedVendorDetails(updated);
    setMoreActionsOpen(false);
    alert(`Vendor "${vendor.name}" has been marked as Archived.`);
  };

  const getStatusStyles = (status: VendorItem['status']) => {
    switch (status) {
      case 'Active':
        return "bg-[#E6F4EA] text-[#0F623F] hover:bg-[#DDF0E2] font-semibold";
      case 'Draft':
        return "bg-[#E8EFFF] text-[#1B66EC] hover:bg-[#DEE7FD] font-semibold";
      case 'Archived':
        return "bg-[#FDF2F2] text-[#C5221F] hover:bg-[#FAECEC] font-semibold";
      default:
        return "bg-slate-50 text-slate-500";
    }
  };

  const getStatusDot = (status: VendorItem['status']) => {
    switch (status) {
      case 'Active': return "bg-[#0F623F]";
      case 'Draft': return "bg-[#1B66EC]";
      case 'Archived': return "bg-[#C5221F]";
      default: return "bg-slate-400";
    }
  };

  // Render form setup
  if (showCreate) {
    return (
      <div id="vendors-form-view" className="flex flex-col flex-1 bg-[#F8F9FA] min-h-screen">
        {/* Header bar */}
        <div className="bg-white border-b border-slate-100/80 py-5.5 px-8 flex items-center shrink-0 select-none">
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setVendorToEdit(null);
            }}
            className="flex items-center justify-center text-slate-800 hover:text-slate-950 transition-colors mr-3 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <h1 className="text-[21px] font-black text-slate-900 tracking-tight leading-none">
            {vendorToEdit ? 'Edit Vendor' : 'Create Vendors'}
          </h1>
        </div>

        {/* Dual Panel Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <form onSubmit={handleSaveForm} className="space-y-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {/* LEFT PANEL: Store Details */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-white">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Store Details</h2>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Row 1: Vendor Name & Vendor ID */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">
                        Vendor Name<span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Vendor 1"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">
                        Vendor ID
                      </label>
                      <input
                        type="text"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        placeholder="V1"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                      />
                    </div>

                    {/* Row 2: Vendor Category & Owner Name */}
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-slate-500 block">
                        Vendor Category<span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFormTypeDropdownOpen(!formTypeDropdownOpen);
                            }}
                            className="w-full h-[38px] flex items-center justify-between px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 hover:border-slate-300 transition-colors focus:ring-2 focus:ring-[#55349A]/10 outline-none text-left"
                          >
                            <span>{formStoreType.toUpperCase()}</span>
                            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", formTypeDropdownOpen && "rotate-180")} />
                          </button>

                          {formTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 max-h-52 overflow-y-auto">
                              {storeTypes.map(type => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    setFormStoreType(type.toUpperCase());
                                    setFormTypeDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  {type.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowNewCategoryModal(true)}
                          className="flex items-center justify-center shrink-0 w-[38px] h-[38px] bg-[#EBE9F5] text-[#55349A] rounded-xl hover:bg-[#DDD9F0] transition-colors border border-[#DEE2E6]"
                        >
                          <Plus className="h-5 w-5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">
                        Owner Name
                      </label>
                      <input
                        type="text"
                        value={formOwnerName}
                        onChange={(e) => setFormOwnerName(e.target.value)}
                        placeholder="Owner Name"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                      />
                    </div>

                    {/* Row 3: Email & Mobile Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                      />
                    </div>

                     <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 block">
                         Mobile Number
                       </label>
                       <div className="relative">
                         <div
                           onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                           className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-700 cursor-pointer select-none hover:bg-slate-50 py-1 px-2 rounded-lg border border-transparent hover:border-slate-200 transition-all z-20"
                         >
                           <span className="text-[17px] select-none leading-none">{selectedCountry.flag}</span>
                           <span className="text-xs font-bold text-slate-600">{selectedCountry.code}</span>
                           <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 stroke-[2] transition-transform duration-200", countryDropdownOpen && "rotate-180")} />
                           <span className="h-4 w-[1px] bg-slate-200 ml-1.5" />
                         </div>
                         <input
                           type="text"
                           value={formPhone}
                           onChange={(e) => setFormPhone(e.target.value)}
                           placeholder="Phone number"
                           className="w-full pl-[108px] pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                         />

                         {countryDropdownOpen && (
                           <>
                             <div
                               className="fixed inset-0 z-30"
                               onClick={() => setCountryDropdownOpen(false)}
                             />
                             <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1.5 max-h-52 overflow-y-auto w-64 animate-in fade-in slide-in-from-top-1 duration-150">
                               <div className="px-3 py-1.5 border-b border-slate-50 mb-1.5">
                                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Country Code</span>
                               </div>
                               {COUNTRIES.map(country => (
                                 <button
                                   key={country.name + country.code}
                                   type="button"
                                   onClick={() => {
                                     setSelectedCountry(country);
                                     setCountryDropdownOpen(false);
                                   }}
                                   className={cn(
                                     "w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 font-bold transition-colors cursor-pointer",
                                     selectedCountry.code === country.code && selectedCountry.name === country.name ? "text-[#55349A] bg-purple-50/40" : "text-slate-700"
                                   )}
                                 >
                                   <div className="flex items-center gap-2">
                                     <span className="text-base">{country.flag}</span>
                                     <span>{country.name}</span>
                                   </div>
                                   <span className="text-slate-400 font-medium">{country.code}</span>
                                 </button>
                               ))}
                             </div>
                           </>
                         )}
                       </div>
                     </div>

                    {/* Row 4: Address & State */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Vendor 1"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">
                        State
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setFormStateDropdownOpen(!formStateDropdownOpen)}
                          className="w-full flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all text-left h-[38px]"
                        >
                          <span>{formState || 'Select State'}</span>
                          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", formStateDropdownOpen && "rotate-180")} />
                        </button>
                        {formStateDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-50" onClick={() => setFormStateDropdownOpen(false)} />
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1.5 max-h-52 overflow-y-auto">
                              {STATES.map(st => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    setFormState(st);
                                    setFormStateDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 font-semibold transition-colors cursor-pointer text-slate-700",
                                    formState === st && "text-[#55349A] bg-purple-50/40"
                                  )}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: Upload Zone */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-white">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Upload File/Attachment</h2>
                </div>

                <div className="p-6">
                  <div className="border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-[#FAFAFA] hover:bg-slate-50 transition-colors duration-150 group/upload relative cursor-pointer min-h-[160px]">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-slate-400 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 mb-1">
                      Drag & Drop or <span className="text-[#55349A] font-bold underline">Choose file</span> to upload
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">jpg, png, jpeg</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFile(file);
                        }
                      }}
                    />
                    {(uploadedFile || existingImageUrl) && (
                      <div className="absolute inset-0 bg-white rounded-xl flex flex-col items-center justify-center p-3 z-10 border border-slate-200 shadow-inner">
                        {(filePreviewUrl || existingImageUrl) ? (
                          <div className="flex flex-col items-center justify-center w-full h-full">
                            <div className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shadow-sm mb-2 flex items-center justify-center">
                              <img
                                src={filePreviewUrl || existingImageUrl || ''}
                                alt="Image Preview"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-750 truncate max-w-[220px] text-center px-2">
                              {uploadedFile ? uploadedFile.name : 'Current Image'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedFile(null);
                                setExistingImageUrl(null);
                              }}
                              className="text-[11px] text-red-500 hover:text-red-600 font-bold transition-colors mt-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                            >
                              Remove Image
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <Check className="h-8 w-8 text-green-500 mb-1" />
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                              {uploadedFile ? uploadedFile.name : ''}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedFile(null);
                                setExistingImageUrl(null);
                              }}
                              className="text-[10px] text-red-500 font-bold hover:underline mt-1 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Form actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setVendorToEdit(null);
                }}
                className="px-8 h-[44px] flex items-center justify-center bg-[#EAEAEA] hover:bg-[#DDD] rounded-xl text-sm font-bold text-slate-700 transition-all cursor-pointer shadow-sm border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 h-[44px] flex items-center justify-center bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-[#452a7d] transition-all shadow-md shadow-purple-900/10 cursor-pointer"
              >
                Create Vendor
              </button>
            </div>

          </form>
        </div>

        {/* Real Dynamic Add Category Modal Overlay */}
        {showNewCategoryModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryName('');
                }}
                className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-md font-extrabold text-slate-900 pr-8">Create New Category</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Specify a unique category name for the vendors.</p>

              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Electrical, Hardware, Packaging"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewCategory();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategoryModal(false);
                    setNewCategoryName('');
                  }}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer border border-slate-200 shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="flex-1 py-1.5 bg-[#55349A] text-white rounded-lg text-xs font-bold hover:bg-[#452a7d] transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER: VENDOR DETAILS VIEW (MATCHES IMAGE PERFECTLY!)
  if (selectedVendorDetails) {
    if (selectedTransactionDetails) {
      return (
        <div id="tx-details-edit-view" className="flex flex-col flex-1 bg-[#F5F6F8] min-h-screen">
          {/* Header bar styled exactly like image.png */}
          <div className="bg-white border-b border-slate-100 py-6 px-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col text-left">
              <button
                type="button"
                onClick={() => setSelectedTransactionDetails(null)}
                className="flex items-center gap-2.5 text-slate-800 hover:text-slate-900 transition-colors cursor-pointer text-left select-none group"
              >
                <ArrowLeft className="h-5 w-5 stroke-[3] text-slate-900 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[20px] font-extrabold tracking-tight text-slate-900 font-sans">
                  Update Expense
                </span>
              </button>
              <p className="text-xs text-slate-500 font-bold tracking-tight mt-1 ml-7">
                Manage your Expense
              </p>
            </div>

            {/* Actions button with list card */}
            <div className="relative self-end md:self-center">
              <button
                type="button"
                onClick={() => setTxActionsDropdownOpen(!txActionsDropdownOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#55349A] text-[#55349A] hover:bg-[#55349A]/5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer select-none"
              >
                {/* Purple Action circle symbol */}
                <svg className="w-4 h-4 fill-none stroke-[2.5]" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Actions</span>
              </button>

              {/* Actions dropdown block floating */}
              {txActionsDropdownOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-200 py-3 rounded-xl shadow-xl z-50 min-w-[190px] text-left animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      alert("Add Expense Category triggered! Code category: " + txCategory);
                      setTxActionsDropdownOpen(false);
                    }}
                    className="w-full text-left inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:text-[#55349A] hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#55349A] stroke-[3]" />
                    <span>Expense category</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert("Create Vendor triggered from actions! Code: " + txVendorName);
                      setTxActionsDropdownOpen(false);
                    }}
                    className="w-full text-left inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:text-[#55349A] hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#55349A] stroke-[3]" />
                    <span>Create Vendor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert("Edit Expense Status triggered! Current Status: " + txStatus);
                      setTxActionsDropdownOpen(false);
                    }}
                    className="w-full text-left inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:text-[#55349A] hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#55349A] stroke-[3]" />
                    <span>Expense Status</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form container body */}
          <div className="flex-1 px-10 pb-12">
            <div className="max-w-6xl mx-auto bg-white border border-slate-150 rounded-2xl p-8 md:p-10 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">

                {/* Product */}
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">Product</label>
                  <input
                    type="text"
                    value={txProduct}
                    onChange={(e) => setTxProduct(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>
                <div className="hidden md:block"></div>

                {/* Category * and Location * */}
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">
                    Category <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">
                    Location <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={txLocation}
                    onChange={(e) => setTxLocation(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>

                {/* Expense For and Reference No. */}
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">Expense for</label>
                  <input
                    type="text"
                    value={txExpenseFor}
                    onChange={(e) => setTxExpenseFor(e.target.value)}
                    placeholder="Describe expense focus"
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5 font-sans">Reference No.</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={txReferenceNo}
                      onChange={(e) => setTxReferenceNo(e.target.value)}
                      className="w-full border border-slate-250 rounded-lg py-2 pl-3 pr-10 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                    />
                    <div className="absolute right-3 text-slate-700">
                      {/* Interactive receipt/document stamp icon inside Reference No. input inside image.png */}
                      <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Amount(₹) * and Vendor */}
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">
                    Amount(₹) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">Vendor</label>
                  <input
                    type="text"
                    value={txVendorName}
                    disabled
                    className="w-full border border-slate-200 rounded-lg py-2 px-3 text-slate-500 bg-slate-50/75 font-semibold text-xs cursor-not-allowed outline-none"
                  />
                </div>

                {/* Amount Due and Amount Paid */}
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">Amount Due</label>
                  <input
                    type="text"
                    value={txAmountDue}
                    onChange={(e) => setTxAmountDue(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">Amount Paid</label>
                  <input
                    type="text"
                    value={txAmountPaid}
                    onChange={(e) => setTxAmountPaid(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>

                {/* Status and Expense Date * */}
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">Status</label>
                  <input
                    type="text"
                    value={txStatus}
                    onChange={(e) => setTxStatus(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">
                    Expense Date <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg py-2 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm transition-all"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2 text-left">
                  <label className="text-[13px] font-extrabold text-slate-700 block mb-1.5">Notes</label>
                  <textarea
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder="Max.500 Characters"
                    className="w-full h-28 border border-slate-250 rounded-lg py-3 px-3 text-slate-850 focus:ring-1 focus:outline-none focus:ring-[#55349A]/30 focus:border-[#55349A] bg-white font-semibold text-sm placeholder:text-slate-400/80 transition-all resize-none"
                  />
                </div>

              </div>

              {/* Action Buttons to save or cancel changes */}
              <div className="flex gap-4 items-center justify-end border-t border-slate-100 pt-8 mt-8">
                <button
                  type="button"
                  onClick={() => setSelectedTransactionDetails(null)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-xs cursor-pointer select-none transition-colors border border-slate-200 shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTransactionDetails}
                  className="px-6 py-2.5 bg-[#55349A] hover:bg-[#402476] text-white font-extrabold rounded-lg text-xs cursor-pointer select-none transition-transform transform active:scale-95 shadow-md shadow-indigo-600/10"
                >
                  Save Changes
                </button>
              </div>

            </div>
          </div>
        </div>
      );
    }

    const vId = selectedVendorDetails.id;
    // F7: no placeholder money. A vendor with no recorded expenses/payouts shows empty totals,
    // not fabricated "Bakery raw material" rows (which appeared identically on every vendor,
    // including ones created seconds ago). Real per-vendor expense/payout wiring is a follow-up.
    const vendorExpenseList = expenses[vId] || [];
    const vendorPayoutList = payouts[vId] || [];

    // Compute stats
    const totalExpense = vendorExpenseList.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = vendorExpenseList.filter(t => t.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);
    const totalPayments = vendorPayoutList.filter(t => t.status === 'Completed').reduce((acc, curr) => acc + curr.amount, 0);

    const currentTabRecords = detailsTab === 'Expense' ? vendorExpenseList : vendorPayoutList;

    // Filter records
    const filteredRecords = currentTabRecords.filter(rec => {
      const matchesSearch = rec.category.toLowerCase().includes(detailsSearch.toLowerCase()) ||
        rec.paymentMode.toLowerCase().includes(detailsSearch.toLowerCase()) ||
        rec.date.toLowerCase().includes(detailsSearch.toLowerCase());
      const matchesStatus = detailsStatusFilter === 'All' || rec.status === detailsStatusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div id="vendors-details-view" className="flex flex-col flex-1 bg-[#F5F6F8] min-h-screen">
        {/* Header bar */}
        <div className="bg-white border-b border-[#f9f9f9] py-4 px-8 flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setSelectedVendorDetails(null)}
            className="flex items-center gap-2 text-slate-900 font-bold hover:text-slate-700 transition-colors cursor-pointer mr-2"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            <span className="text-[17px] font-bold tracking-tight text-slate-900">
              Vendor Details
            </span>
          </button>
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* TOP CARD: Primary Identity Detail Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">

            {/* Top Identity Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">

              <div className="flex items-start gap-4">
                <DetailStorefrontIcon imageUrl={selectedVendorDetails.imageUrl} />
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight leading-none">
                      {selectedVendorDetails.name}
                    </h2>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold select-none h-[22px]",
                      getStatusStyles(selectedVendorDetails.status)
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDot(selectedVendorDetails.status))} />
                      {selectedVendorDetails.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[13px] text-slate-450 mt-2 font-medium">
                    <span className="font-mono font-bold tracking-wide text-slate-550">
                      {selectedVendorDetails.code}
                    </span>
                    <span className="text-slate-350">|</span>
                    <span>
                      {selectedVendorDetails.address || 'Address'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit and Actions Right */}
              <div className="flex items-center gap-3 self-end md:self-center relative">

                <button
                  type="button"
                  onClick={() => handleEditInit(selectedVendorDetails)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#EBF0F5] hover:bg-[#DEE5EC] rounded-lg text-xs font-bold text-slate-750 transition-colors border border-[#EAEBF0] cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600 stroke-[2.5]" />
                  Edit Vendor
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreActionsOpen(!moreActionsOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2D2D2D] hover:bg-[#1A1A1A] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    More Actions
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", moreActionsOpen && "rotate-180")} />
                  </button>

                  {moreActionsOpen && (
                    <div className="absolute right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 min-w-[150px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        type="button"
                        onClick={() => handleDuplicateVendor(selectedVendorDetails)}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-650 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4 text-slate-500" />
                        Duplicate
                      </button>

                      <button
                        type="button"
                        onClick={() => handleArchiveVendor(selectedVendorDetails)}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-650 hover:bg-slate-50 hover:text-red-600 transition-colors flex items-center gap-2"
                      >
                        <Archive className="h-4 w-4 text-slate-500" />
                        Archive
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Bottom Horizontal Detail Strip */}
            <div className="pt-5 flex flex-wrap gap-x-12 gap-y-4 text-sm font-medium text-slate-600">

              {/* Category */}
              <div className="flex items-center">
                <div className="bg-[#F3F4F6] border border-[#EAEBF0] px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  Category: <span className="font-extrabold text-slate-900">{selectedVendorDetails.storeType}</span>
                </div>
              </div>

              {/* Mobile */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Mobile</span>
                <span className="text-slate-900 font-bold">
                  +{selectedVendorDetails.phone}
                </span>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Email</span>
                <span className="text-slate-950 font-bold">
                  {selectedVendorDetails.email}
                </span>
              </div>

              {/* State */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">State</span>
                <span className="text-slate-950 font-bold">
                  {selectedVendorDetails.state || '—'}
                </span>
              </div>

              {/* Bank Details View */}
              <div className="flex items-center gap-2 relative">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Bank Details</span>
                <button
                  type="button"
                  onClick={() => setBankInfoOpen(!bankInfoOpen)}
                  className="flex items-center gap-1 text-[#55349A] hover:text-[#452a7d] font-bold underline text-sm transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
                  View
                </button>

                {/* Bank Info Drop-card context overlay */}
                {bankInfoOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl z-45 min-w-[340px] text-left">
                    {isEditingBank ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Update Bank Info</span>
                          <button
                            type="button"
                            onClick={() => setIsEditingBank(false)}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded text-slate-700 font-bold cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bank Name</label>
                            <input
                              type="text"
                              value={bName}
                              onChange={(e) => setBName(e.target.value)}
                              placeholder="Bank name"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#55349A]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Account No</label>
                            <input
                              type="text"
                              value={bAccount}
                              onChange={(e) => setBAccount(e.target.value)}
                              placeholder="e.g. 302910482093"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#55349A]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Branch</label>
                            <input
                              type="text"
                              value={bBranch}
                              onChange={(e) => setBBranch(e.target.value)}
                              placeholder="e.g. Thrissur Main"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#55349A]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">GST No</label>
                            <input
                              type="text"
                              value={bGst}
                              onChange={(e) => setBGst(e.target.value)}
                              placeholder="e.g. 32AAAAA0000A1Z5"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#55349A]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">IFSC Code</label>
                            <input
                              type="text"
                              value={bIfsc}
                              onChange={(e) => setBIfsc(e.target.value)}
                              placeholder="e.g. SBIN0004051"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#55349A]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PAN No</label>
                            <input
                              type="text"
                              value={bPan}
                              onChange={(e) => setBPan(e.target.value)}
                              placeholder="e.g. ABCDE1234F"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#55349A]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingBank(false)}
                            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer border border-slate-200 shadow-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveBankInfo}
                            className="flex-1 py-1.5 bg-[#55349A] text-white rounded-lg text-xs font-bold hover:bg-[#452a7d] transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                          >
                            Save Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 mb-2">
                          <span className="text-[15px] font-extrabold text-slate-800 font-sans tracking-tight">
                            Bank Information
                          </span>
                          <button
                            type="button"
                            onClick={handleStartEditBank}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#55349A] hover:bg-[#402476] active:bg-[#321c5c] text-white rounded-lg text-xs font-bold shadow-xs select-none cursor-pointer transition-all active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5 fill-none stroke-[2.5]" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Add</span>
                          </button>
                        </div>

                        <div className="space-y-2 mt-1">
                          <div className="flex items-center text-xs text-left py-0.5">
                            <span className="text-slate-400 font-semibold w-24 shrink-0">Bank Name</span>
                            <span className="text-slate-800 font-bold ml-3 flex-1">
                              - {selectedVendorDetails.bankName || ''}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-left py-0.5">
                            <span className="text-slate-400 font-semibold w-24 shrink-0">Account No</span>
                            <span className="text-slate-800 font-bold ml-3 flex-1">
                              - {selectedVendorDetails.accountNo || ''}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-left py-0.5">
                            <span className="text-slate-400 font-semibold w-24 shrink-0">Branch</span>
                            <span className="text-slate-800 font-bold ml-3 flex-1">
                              - {selectedVendorDetails.branch || ''}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-left py-0.5">
                            <span className="text-slate-400 font-semibold w-24 shrink-0">GST No</span>
                            <span className="text-slate-800 font-bold ml-3 flex-1">
                              - {selectedVendorDetails.gstNo || ''}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-left py-0.5">
                            <span className="text-slate-400 font-semibold w-24 shrink-0">IFSC Code</span>
                            <span className="text-slate-800 font-bold ml-3 flex-1">
                              - {selectedVendorDetails.ifsc || ''}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-left py-0.5">
                            <span className="text-slate-400 font-semibold w-24 shrink-0">PAN No</span>
                            <span className="text-slate-800 font-bold ml-3 flex-1">
                              - {selectedVendorDetails.panNo || ''}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setBankInfoOpen(false)}
                            className="text-[11px] bg-slate-105 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-700 font-bold transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* LOWER SECTION: TABS & STATS & DETAILS GRID */}
          {/* clip-fix: no overflow-hidden — it clips the details filter dropdown (mt-1.5). rounded+border keep corners. */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">

            {/* Unified row containing tabs and statistics indicators */}
            <div className="px-6 py-4 border-b border-slate-100 bg-[#FCFDFE] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

              {/* TABS LEFT WITH STATUS FILTER */}
              <div className="flex items-center gap-4 border-b border-slate-150 xl:border-b-0 w-full xl:w-auto">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDetailsTab('Expense')}
                    className={cn(
                      "px-5 py-2.5 text-[15px] font-bold tracking-tight border-b-2 transition-all cursor-pointer",
                      detailsTab === 'Expense'
                        ? "border-[#55349A] text-[#55349A]"
                        : "border-transparent text-slate-450 hover:text-slate-700"
                    )}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsTab('Payout')}
                    className={cn(
                      "px-5 py-2.5 text-[15px] font-bold tracking-tight border-b-2 transition-all cursor-pointer",
                      detailsTab === 'Payout'
                        ? "border-[#55349A] text-[#55349A]"
                        : "border-transparent text-slate-450 hover:text-slate-700"
                    )}
                  >
                    Payout
                  </button>
                </div>

                {/* Filter Icon and Dropdown */}
                <div className="relative ml-2">
                  <button
                    type="button"
                    onClick={() => setDetailsFilterDropdownOpen(!detailsFilterDropdownOpen)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-xs cursor-pointer select-none",
                      detailsStatusFilter !== 'All'
                        ? "bg-[#55349A] text-white border-[#55349A] hover:bg-[#452a7d]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-350"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Filter</span>
                    {detailsStatusFilter !== 'All' && (
                      <span className="inline-flex items-center justify-center bg-white text-[#55349A] text-[9.5px] font-black rounded-full h-4 min-w-4 px-1 leading-none shadow-xs">
                        {detailsStatusFilter}
                      </span>
                    )}
                  </button>

                  {detailsFilterDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 min-w-[150px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Filter By Status
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsStatusFilter('All');
                          setDetailsFilterDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-xs font-bold transition-colors block",
                          detailsStatusFilter === 'All'
                            ? "bg-slate-50 text-[#55349A] font-extrabold"
                            : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        All Statuses
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsStatusFilter('Pending');
                          setDetailsFilterDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-xs font-bold transition-colors block",
                          detailsStatusFilter === 'Pending'
                            ? "bg-slate-50 text-[#55349A] font-extrabold"
                            : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsStatusFilter('Completed');
                          setDetailsFilterDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-xs font-bold transition-colors block",
                          detailsStatusFilter === 'Completed'
                            ? "bg-slate-50 text-[#55349A] font-extrabold"
                            : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        Completed
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* STAT CARDS RIGHT (MATCHES IMAGE PERFECTLY!) */}
              <div className="flex items-center flex-wrap gap-4 shrink-0 xl:self-end">

                {/* Stat block 1: Total Expense Amount */}
                <div className="bg-slate-50/50 border border-[#EAEBF0] rounded-xl px-4 py-2 flex items-center justify-between min-w-[190px] h-[58px] shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Total Expense Amount
                    </span>
                    <span className="text-[15px] font-black text-slate-900 mt-0.5">
                      ₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#E6F9F2] flex items-center justify-center shrink-0 ml-3">
                    <svg className="w-4 h-4 text-[#12B76A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </div>
                </div>

                {/* Stat block 2: Pending Amount */}
                <div className="bg-slate-50/50 border border-[#EAEBF0] rounded-xl px-4 py-2 flex items-center justify-between min-w-[190px] h-[58px] shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Pending Amount
                    </span>
                    <span className="text-[15px] font-black text-slate-900 mt-0.5">
                      ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#FFF0F0] flex items-center justify-center shrink-0 ml-3">
                    <svg className="w-4 h-4 text-[#FA5C5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Stat block 3: Total Payments */}
                <div className="bg-slate-50/50 border border-[#EAEBF0] rounded-xl px-4 py-2 flex items-center justify-between min-w-[190px] h-[58px] shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Total Payments
                    </span>
                    <span className="text-[15px] font-black text-slate-900 mt-0.5">
                      ₹{totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#FEF9E6] flex items-center justify-center shrink-0 ml-3">
                    <svg className="w-4 h-4 text-[#F7B500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>

              </div>

            </div>

            {/* LOWER CARD BODY: Search Input Filter bar */}
            <div className="p-6">
              <div className="relative max-w-md w-full mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={detailsSearch}
                  onChange={(e) => setDetailsSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-11 pr-4 py-2.5 bg-[#F9FAFB] border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-900"
                />
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-[#EAEBF0] rounded-xl">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150">
                      <th className="py-4 px-6 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                        DATE
                      </th>
                      <th className="py-4 px-6 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest text-right">
                        AMOUNT
                      </th>
                      <th className="py-4 px-6 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                        CATEGORY
                      </th>
                      <th className="py-4 px-6 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                        PAYMENT MODE
                      </th>
                      <th className="py-4 px-6 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                        STATUS
                      </th>
                      <th className="py-4 px-6 text-[10.5px] font-extrabold text-[#55349A] uppercase tracking-widest text-[#55349A]/90">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400 bg-white">
                          No {detailsTab.toLowerCase()} records linked to this vendor yet.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-100/10 transition-colors bg-white font-medium text-slate-800 text-[13.5px]">
                          {/* Date */}
                          <td className="py-4 px-6 font-semibold">
                            {item.date}
                          </td>
                          {/* Amount */}
                          <td className="py-4 px-6 font-extrabold text-slate-900 text-right">
                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {/* Category */}
                          <td className="py-4 px-6 text-slate-650 font-semibold">
                            {item.category}
                          </td>
                          {/* Payment Mode */}
                          <td className="py-4 px-6 text-slate-500 font-mono text-[12px] font-semibold">
                            {item.paymentMode}
                          </td>
                          {/* Status */}
                          <td className="py-4 px-6">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[13px] font-bold select-none h-[28px] shrink-0 min-w-[90px]",
                              item.status === 'Completed' ? "bg-[#E6F4EA] text-[#0F623F]" : "bg-[#FEF5E7] text-[#FA8B0C]"
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.status === 'Completed' ? "bg-[#0F623F]" : "bg-[#FA8B0C]")} />
                              {item.status}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="py-4 px-6">
                            <button
                              type="button"
                              onClick={() => handleViewTransactionDetails(item)}
                              className="text-xs bg-[#55349A] hover:bg-[#402476] text-white px-3 py-1.5 rounded-lg font-bold shadow-xs transition-transform transform active:scale-95 inline-flex items-center gap-1 cursor-pointer select-none"
                            >
                              <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>
      </div>
    );
  }

  // DEFAULT VIEW: VENDOR SEARCH TABLE DIRECTORY
  return (
    <div id="vendors-list-view" className="flex flex-col flex-1 bg-[#FAFAFA]">
      {/* Page Header Bar */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-surface-900 tracking-tight">Vendors</h1>
        </div>
      </div>

      {/* Main Page Area */}
      <div id="vendors-body-area" className="p-8 space-y-6">
        {/* clip-fix: no overflow-hidden — it clips the per-row actions menu (mt-1.5). rounded+border keep corners. */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">

          {/* Toolbar Control Bar */}
          <div className="p-6 border-b border-surface-100 flex flex-wrap items-center justify-between gap-4">

            {/* Search Vendor inputs */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-11 pr-4 py-2.5 bg-[#FAFAFA] border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all placeholder:text-surface-300 font-semibold"
              />
            </div>

            {/* Dropdowns & Buttons */}
            <div className="flex items-center gap-3">
              {/* Delete Selection Trigger */}
              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedIds.length})
                </button>
              )}

              {/* Store Type Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStoreTypeDropdownOpen(!storeTypeDropdownOpen)}
                  className="flex items-center justify-between gap-8 px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-bold text-surface-700 min-w-[#130px] hover:border-surface-300 transition-all cursor-pointer"
                >
                  <span className="truncate">
                    {selectedType === 'All' ? 'Store Type' : selectedType}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", storeTypeDropdownOpen && "rotate-180")} />
                </button>

                {storeTypeDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-1.5 min-w-[160px] max-h-60 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedType('All'); setStoreTypeDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-50 hover:text-[#55349A] transition-colors"
                    >
                      All Types
                    </button>
                    {storeTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => { setSelectedType(type); setStoreTypeDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-50 hover:text-[#55349A] transition-colors"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Vendor Button */}
              <button
                onClick={handleCreateInit}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] border border-[#55349A] rounded-xl text-sm font-bold text-white hover:bg-[#452a7d] transition-colors shadow-lg shadow-primary-500/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Vendor
              </button>
            </div>
          </div>

          {/* Table Element container */}
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                    <th className="px-[22px] py-2.5 w-12 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={filteredVendors.length > 0 && selectedIds.length === filteredVendors.length}
                          onChange={toggleAll}
                          className="appearance-none h-5 w-5 rounded-[4px] border border-slate-200 bg-white checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[#55349A]/10 outline-none"
                        />
                      </div>
                    </th>
                    <th className="px-[22px] py-2.5 font-bold tracking-wider">STORE NAME</th>
                    <th className="px-[22px] py-2.5 font-bold tracking-wider">STATUS</th>
                    <th className="px-[22px] py-2.5 font-bold tracking-wider text-right">ACTIONS</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-semibold text-slate-400 bg-white">
                      No vendors found matching search filters.
                    </td>
                  </tr>
                ) : (
                  pagedVendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors bg-white">
                      {/* Checkbox */}
                      <td className="px-[22px] py-2.5">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(vendor.id)}
                            onChange={() => toggleOne(vendor.id)}
                            className="appearance-none h-5 w-5 rounded-[4px] border border-slate-200 bg-white checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[#55349A]/10 outline-none"
                          />
                        </div>
                      </td>
                      {/* Vendor Store logo and Info */}
                      <td className="px-[22px] py-2.5">
                        <div className="flex items-center gap-4">
                          <StorefrontIcon imageUrl={vendor.imageUrl} />
                          <div className="flex flex-col">
                            <span
                              className="font-bold text-slate-900 text-[14px] leading-tight hover:text-[#55349A] transition-colors cursor-pointer"
                              onClick={() => setSelectedVendorDetails(vendor)}
                            >
                              {vendor.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium mt-0.5">{vendor.code}</span>
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-[22px] py-2.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[13px] font-bold select-none h-[28px]",
                          getStatusStyles(vendor.status)
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDot(vendor.status))} />
                          {vendor.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-[22px] py-2.5 text-right relative">
                        <div className="flex items-center justify-end gap-2 pr-6">
                          <button
                            onClick={() => handleEditInit(vendor)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#E1E5F2] bg-white hover:bg-[#F8F9FD] text-[#55349A] hover:text-[#452a7d] font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer h-9 shrink-0"
                          >
                            <Pencil className="h-3.5 w-3.5 text-[#55349A]" />
                            Edit
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId(activeRowMenuId === vendor.id ? null : vendor.id);
                              }}
                              className="p-2 border border-[#E1E5F2] bg-white text-slate-400 hover:text-slate-900 hover:bg-[#F8F9FD] hover:border-slate-300 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center h-9 w-9 shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {activeRowMenuId === vendor.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveRowMenuId(null)}
                                />
                                <div className="absolute right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 px-1 min-w-[120px] overflow-hidden text-left animate-in fade-in slide-in-from-top-1 duration-150">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedVendorDetails(vendor);
                                      setActiveRowMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 rounded-lg cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleArchiveVendor(vendor);
                                      setActiveRowMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 hover:text-red-600 transition-colors flex items-center gap-2 rounded-lg cursor-pointer"
                                  >
                                    <Archive className="h-3.5 w-3.5 text-slate-500" />
                                    Archive
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
          <TablePagination
            total={filteredVendors.length}
            page={vendorPage}
            pageSize={VENDOR_PAGE_SIZE}
            onPageChange={setVendorPage}
            noun="vendors"
          />

        </div>
      </div>
    </div>
  );
};
