import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Tag,
  Check,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  User,
  ShoppingBag,
  Clock,
  Send,
  Sparkles,
  Package,
  Layers,
  ChevronRight,
  Printer,
  ChevronDown,
  Info,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Edit2,
  Lock,
  ShoppingCart,
  Truck,
  Copy,
  Share2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DraftOrderStep1 } from './DraftOrderStep1';
import { DraftOrderStep2 } from './DraftOrderStep2';
import { SingleLabelPreview } from '../../../pages/shipping/LabelPreview';
import { PhotoLightbox } from './OrdersModals';
import type { OrderItem, POSProduct, POSCartItem } from './OrdersTable';

export interface OrderCreateWizardProps {
  orderError: string | null;
  setOrderError: (e: string | null) => void;
  orderSuccess: any;
  setOrderSuccess: (s: any) => void;
  createStep: number;
  setCreateStep: (s: number) => void;
  onClose: () => void;
  availableStores: any[];
  selectedStore: string;
  setSelectedStore: (s: string) => void;
  availableCatalogs: any[];
  selectedCatalogs: string[];
  setSelectedCatalogs: (c: string[]) => void;
  selectedInvoiceType: string;
  setSelectedInvoiceType: (t: string) => void;
  customerMode: 'existing' | 'new' | 'guest';
  setCustomerMode: (m: any) => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  newCustomerName: string;
  setNewCustomerName: (n: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (p: string) => void;
  newCustomerEmail: string;
  setNewCustomerEmail: (e: string) => void;
  newCustomerAddress: string;
  setNewCustomerAddress: (a: string) => void;
  existingCustomers: any[];
  searchCustomerQuery: string;
  setSearchCustomerQuery: (q: string) => void;
  searchB2bPartnerQuery: string;
  setSearchB2bPartnerQuery: (q: string) => void;
  businessName: string;
  setBusinessName: (b: string) => void;
  enableOrderPreSetup: boolean;
  setEnableOrderPreSetup: (e: boolean) => void;
  posCart: POSCartItem[];
  setPosCart: React.Dispatch<React.SetStateAction<POSCartItem[]>>;
  prescribedBy: string;
  setPrescribedBy: (p: string) => void;
  doctorNotes: string;
  setDoctorNotes: (n: string) => void;
  billingAddress: string;
  setBillingAddress: (a: string) => void;
  shippingAddress: string;
  setShippingAddress: (a: string) => void;
  shippingAddressSame: boolean;
  setShippingAddressSame: (s: boolean) => void;
  getActiveCustomerDetails: () => any;
  setShowCreateModal: (show: boolean) => void;
  setShowInvoiceDetailsPage: (show: boolean) => void;
  setActiveGeneratedOrderId: (id: string) => void;
  pickerProducts: POSProduct[];
  currentOrderStatus: OrderItem['status'];
  setCurrentOrderStatus: (s: OrderItem['status']) => void;
  invoiceGenerated: boolean;
  setInvoiceGenerated: (g: boolean) => void;
  setOrders: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  handleCreateOrder: () => void;
  activeGeneratedOrderNo: string;
  activeGeneratedOrderId: string;
  showShippingLabelModal: boolean;
  setShowShippingLabelModal: (show: boolean) => void;
  handleUpdateOrderStatus: (status: 'Completed' | 'Cancelled') => void;
  updateStatusMutation: any;
  orderLogExpanded: boolean;
  setOrderLogExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  activePhotoLightbox: string | null;
  setActivePhotoLightbox: (photo: string | null) => void;
  customerNotes: string;
  setCustomerNotes: (notes: string) => void;
  isEditingAddress: boolean;
  setIsEditingAddress: (editing: boolean) => void;
  discountValue: number;
  setDiscountValue: (d: number) => void;
  gstInvoice: any;
  gstInvoiceLoading: boolean;
  handleGetPayment: (mode: string, label: string) => void;
  paymentDropdownOpen: boolean;
  setPaymentDropdownOpen: (open: boolean) => void;
  onOpenInvoice?: (order: OrderItem) => void;
  moreActionsDropdownOpen: boolean;
  setMoreActionsDropdownOpen: (open: boolean) => void;
  isOrderEditable: boolean;
  setIsOrderEditable: (editable: boolean) => void;
  selectedOrderForView?: any;
  viewOrderConsumerUid?: string | null;
}

export function OrderCreateWizard(props: OrderCreateWizardProps) {
  const {
    orderError,
    setOrderError,
    orderSuccess,
    setOrderSuccess,
    createStep,
    setCreateStep,
    onClose,
    availableStores,
    selectedStore,
    setSelectedStore,
    availableCatalogs,
    selectedCatalogs,
    setSelectedCatalogs,
    selectedInvoiceType,
    setSelectedInvoiceType,
    customerMode,
    setCustomerMode,
    selectedCustomerId,
    setSelectedCustomerId,
    newCustomerName,
    setNewCustomerName,
    newCustomerPhone,
    setNewCustomerPhone,
    newCustomerEmail,
    setNewCustomerEmail,
    newCustomerAddress,
    setNewCustomerAddress,
    existingCustomers,
    searchCustomerQuery,
    setSearchCustomerQuery,
    searchB2bPartnerQuery,
    setSearchB2bPartnerQuery,
    businessName,
    setBusinessName,
    enableOrderPreSetup,
    setEnableOrderPreSetup,
    posCart,
    setPosCart,
    prescribedBy,
    setPrescribedBy,
    doctorNotes,
    setDoctorNotes,
    billingAddress,
    setBillingAddress,
    shippingAddress,
    setShippingAddress,
    shippingAddressSame,
    setShippingAddressSame,
    getActiveCustomerDetails,
    setShowCreateModal,
    setShowInvoiceDetailsPage,
    setActiveGeneratedOrderId,
    pickerProducts,
    currentOrderStatus,
    setCurrentOrderStatus,
    invoiceGenerated,
    setInvoiceGenerated,
    setOrders,
    handleCreateOrder,
    activeGeneratedOrderNo,
    activeGeneratedOrderId,
    showShippingLabelModal,
    setShowShippingLabelModal,
    handleUpdateOrderStatus,
    updateStatusMutation,
    orderLogExpanded,
    setOrderLogExpanded,
    activePhotoLightbox,
    setActivePhotoLightbox,
    customerNotes,
    setCustomerNotes,
    isEditingAddress,
    setIsEditingAddress,
    discountValue,
    setDiscountValue,
    gstInvoice,
    gstInvoiceLoading,
    handleGetPayment,
    paymentDropdownOpen,
    setPaymentDropdownOpen,
    moreActionsDropdownOpen,
    setMoreActionsDropdownOpen,
    isOrderEditable,
    setIsOrderEditable,
    selectedOrderForView,
    viewOrderConsumerUid,
    onOpenInvoice,
  } = props;

  // useNavigate was imported but never called — `navigate(...)` at the tax-invoice link threw
  // "navigate is not defined" at runtime.
  const navigate = useNavigate();
  const [courierPartner, setCourierPartner] = useState('');
  const [awbTrackingNo, setAwbTrackingNo] = useState('');
  const [courierOrderId, setCourierOrderId] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState('Pending Dispatch');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [isEditingDispatch, setIsEditingDispatch] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);

  const currentOrderObj: OrderItem = {
    id: activeGeneratedOrderId || `ORD-${activeGeneratedOrderNo}`,
    orderNo: activeGeneratedOrderNo || undefined,
    date: new Date().toISOString(),
    customerName: getActiveCustomerDetails().name || 'Customer',
    customerPhone: getActiveCustomerDetails().phone || '',
    customerEmail: getActiveCustomerDetails().email || '',
    items: posCart.map(c => ({
      name: c.product.name,
      qty: c.qty,
      price: c.unitPrice ?? c.product.price,
      unitName: c.unitName,
    })),
    total: posCart.reduce((total, c) => total + c.qty * (c.unitPrice ?? c.product.price), 0),
    status: currentOrderStatus,
    paymentStatus: 'UNPAID',
    deliveryType: 'PICKUP',
    shippingAddress: shippingAddress || getActiveCustomerDetails().address,
    billingAddress: (shippingAddressSame ? (shippingAddress || getActiveCustomerDetails().address) : billingAddress) || undefined,
  };

  const orderErrorToast = orderError ? (
    <div className="fixed top-4 right-4 z-[99999] bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 max-w-md">
      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
      <span className="flex-1">{orderError}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(orderError);
          }}
          className="text-rose-600 hover:text-rose-900 text-[10px] font-bold underline cursor-pointer"
        >
          Copy
        </button>
        <button type="button" onClick={() => setOrderError(null)} className="text-slate-400 hover:text-slate-600 text-base font-bold leading-none">×</button>
      </div>
    </div>
  ) : null;

  const orderSuccessPopup = orderSuccess ? (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans"
      onClick={() => setOrderSuccess(null)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Check className="h-7 w-7 stroke-[2.5]" />
        </div>
        <h3 className="text-base font-black text-slate-900 tracking-tight">Order Created Successfully</h3>
        <div className="my-3 py-2 px-3 bg-slate-50 border border-slate-200/80 rounded-xl inline-flex flex-col items-center gap-0.5 max-w-full">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Order No</span>
          <span className="font-mono text-sm font-black text-[#55349A] break-all">{orderSuccess.orderNo || orderSuccess.orderUid}</span>
        </div>
        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-5">
          Order saved. You can view the live status in the orders list below.
        </p>
        <button
          type="button"
          onClick={() => setOrderSuccess(null)}
          className="w-full py-2.5 px-4 bg-[#55349A] hover:bg-[#462980] text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
        >
          View Orders List
        </button>
      </div>
    </div>
  ) : null;

  return (

      <div className="flex flex-col flex-1 h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] bg-slate-50 font-sans overflow-hidden relative">
        {orderErrorToast}
        {orderSuccessPopup}
        {createStep === 1 ? (
          <DraftOrderStep1
            availableStores={availableStores}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            availableCatalogs={availableCatalogs}
            selectedCatalogs={selectedCatalogs}
            setSelectedCatalogs={setSelectedCatalogs}
            selectedInvoiceType={selectedInvoiceType}
            setSelectedInvoiceType={setSelectedInvoiceType}
            customerMode={customerMode}
            setCustomerMode={setCustomerMode}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            newCustomerName={newCustomerName}
            setNewCustomerName={setNewCustomerName}
            newCustomerPhone={newCustomerPhone}
            setNewCustomerPhone={setNewCustomerPhone}
            newCustomerEmail={newCustomerEmail}
            setNewCustomerEmail={setNewCustomerEmail}
            newCustomerAddress={newCustomerAddress}
            setNewCustomerAddress={setNewCustomerAddress}
            existingCustomers={existingCustomers}
            searchCustomerQuery={searchCustomerQuery}
            setSearchCustomerQuery={setSearchCustomerQuery}
            searchB2bPartnerQuery={searchB2bPartnerQuery}
            setSearchB2bPartnerQuery={setSearchB2bPartnerQuery}
            businessName={businessName}
            setBusinessName={setBusinessName}
            enableOrderPreSetup={enableOrderPreSetup}
            setEnableOrderPreSetup={setEnableOrderPreSetup}
            onProceed={() => setCreateStep(2)}
            onCancel={() => {
              setShowCreateModal(false);
              setPosCart([]);
            }}
          />
        ) : createStep === 2 ? (
          <DraftOrderStep2
            enableOrderPreSetup={enableOrderPreSetup}
            availableStores={availableStores}
            availableCatalogs={availableCatalogs}
            posCart={posCart}
            setPosCart={setPosCart}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            selectedInvoiceType={selectedInvoiceType}
            setSelectedInvoiceType={setSelectedInvoiceType}
            selectedCatalogs={selectedCatalogs}
            setSelectedCatalogs={setSelectedCatalogs}
            prescribedBy={prescribedBy}
            setPrescribedBy={setPrescribedBy}
            doctorNotes={doctorNotes}
            setDoctorNotes={setDoctorNotes}
            billingAddress={billingAddress}
            setBillingAddress={setBillingAddress}
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
            shippingAddressSame={shippingAddressSame}
            setShippingAddressSame={setShippingAddressSame}
            businessName={businessName}
            setBusinessName={setBusinessName}
            getActiveCustomerDetails={getActiveCustomerDetails}
            setCreateStep={setCreateStep}
            setShowCreateModal={setShowCreateModal}
            setShowInvoiceDetailsPage={setShowInvoiceDetailsPage}
            setActiveGeneratedOrderId={setActiveGeneratedOrderId}
            POS_PRODUCTS={pickerProducts}
            currentOrderStatus={currentOrderStatus}
            setCurrentOrderStatus={setCurrentOrderStatus}
            invoiceGenerated={invoiceGenerated}
            setInvoiceGenerated={setInvoiceGenerated}
            setOrders={setOrders}
            onPlaceOrder={handleCreateOrder}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            customerMode={customerMode}
            setCustomerMode={setCustomerMode}
            newCustomerName={newCustomerName}
            setNewCustomerName={setNewCustomerName}
            newCustomerPhone={newCustomerPhone}
            setNewCustomerPhone={setNewCustomerPhone}
            newCustomerEmail={newCustomerEmail}
            setNewCustomerEmail={setNewCustomerEmail}
            newCustomerAddress={newCustomerAddress}
            setNewCustomerAddress={setNewCustomerAddress}
            existingCustomers={existingCustomers}
          />
        ) : (

            /* STEP 3: CLEAN ZERO-SCROLL ORDER DETAILS WITH TRAIN TIMELINE & STICKY FOOTER */
            <div className="flex-1 flex flex-col bg-[#F8FAFC] font-sans h-full overflow-hidden justify-between">

              {/* 1. TOP HEADER */}
              <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-3xs z-20">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateStep(1);
                      setPosCart([]);
                    }}
                    className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                    title="Back to Orders List"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        Order #{activeGeneratedOrderNo || activeGeneratedOrderId?.slice(0, 8) || '00037'}
                      </h2>
                      <span className={cn(
                        "text-[10.5px] font-mono font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1.5",
                        currentOrderStatus === 'Completed' ? "bg-[#DEF7EC] text-[#03543F] border border-emerald-300" :
                        currentOrderStatus === 'Delivered' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        currentOrderStatus === 'Shipped' ? "bg-purple-100 text-[#55349A] border border-[#55349A]/20" :
                        "bg-blue-100 text-[#1A73E8] border border-[#1A73E8]/20"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full",
                          currentOrderStatus === 'Completed' ? "bg-[#03543F]" :
                          currentOrderStatus === 'Delivered' ? "bg-emerald-500" :
                          currentOrderStatus === 'Shipped' ? "bg-[#55349A]" :
                          "bg-[#1A73E8]"
                        )} />
                        {String(currentOrderStatus || 'CONFIRMED').toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 font-mono uppercase">
                        {selectedStore || 'Main Store'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 font-mono uppercase">
                        {selectedInvoiceType || 'B2C'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Placed Today · {posCart.reduce((total, c) => total + c.qty, 0)} Units · {posCart.length} Products
                    </p>
                  </div>
                </div>

                {/* Top Action Shortcuts */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const id = activeGeneratedOrderId || currentOrderObj?.id || currentOrderObj?.uid;
                      if (id) {
                        navigate(`/orders/${id}/tax-invoice`);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/30 text-slate-800 hover:text-[#55349A] rounded-xl text-xs font-bold shadow-3xs cursor-pointer transition-all"
                  >
                    <FileText className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>View / Print Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateStep(2)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/30 text-slate-800 hover:text-[#55349A] rounded-xl text-xs font-bold shadow-3xs cursor-pointer transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Edit Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowShippingLabelModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/30 text-slate-800 hover:text-[#55349A] rounded-xl text-xs font-bold shadow-3xs cursor-pointer transition-all"
                  >
                    <Tag className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Shipping Label</span>
                  </button>

                  {currentOrderStatus === 'Confirmed' || currentOrderStatus === 'Draft' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus('Delivered')}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-98"
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>{updateStatusMutation.isPending ? 'Updating…' : 'Mark Delivered'}</span>
                    </button>
                  ) : currentOrderStatus === 'Shipped' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus('Delivered')}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-98"
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>{updateStatusMutation.isPending ? 'Updating…' : 'Mark Delivered'}</span>
                    </button>
                  ) : currentOrderStatus === 'Delivered' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus('Completed')}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#03543F] hover:bg-[#023e2f] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-98"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{updateStatusMutation.isPending ? 'Completing…' : 'Complete Order (Settle)'}</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 px-4 py-2 bg-[#DEF7EC] text-[#03543F] border border-emerald-300 rounded-xl text-xs font-black">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Order Completed</span>
                    </span>
                  )}
                </div>
              </header>

              {/* 2. ORDER PROGRESS TIMELINE */}
              <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 shadow-3xs">
                <div className="max-w-6xl mx-auto flex items-center justify-between relative">

                  {/* Step 1: Placed */}
                  <div className="flex items-center gap-2 z-10 bg-white pr-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 leading-none">Placed</div>
                      <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 leading-none">Created</div>
                    </div>
                  </div>

                  <div className="flex-1 h-0.5 bg-emerald-500 mx-1.5" />

                  {/* Step 2: Confirmed */}
                  <div className="flex items-center gap-2 z-10 bg-white px-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 leading-none">Confirmed</div>
                      <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 leading-none">Ready</div>
                    </div>
                  </div>

                  <div className={cn("flex-1 h-0.5 mx-1.5", (currentOrderStatus === 'Shipped' || currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? "bg-emerald-500" : "bg-slate-200")} />

                  {/* Step 3: Shipped */}
                  <div className="flex items-center gap-2 z-10 bg-white px-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs",
                      (currentOrderStatus === 'Shipped' || currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed')
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    )}>
                      {(currentOrderStatus === 'Shipped' || currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? '✓' : '3'}
                    </div>
                    <div>
                      <div className={cn("text-xs font-black leading-none", (currentOrderStatus === 'Shipped' || currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? "text-slate-900" : "text-slate-400")}>
                        Shipped
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 leading-none">
                        {(currentOrderStatus === 'Shipped' || currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? 'Dispatched' : 'Pending'}
                      </div>
                    </div>
                  </div>

                  <div className={cn("flex-1 h-0.5 mx-1.5", (currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? "bg-emerald-500" : "bg-slate-200")} />

                  {/* Step 4: Delivered */}
                  <div className="flex items-center gap-2 z-10 bg-white px-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs",
                      (currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed')
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    )}>
                      {(currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? '✓' : '4'}
                    </div>
                    <div>
                      <div className={cn("text-xs font-black leading-none", (currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? "text-slate-900" : "text-slate-400")}>
                        Delivered
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 leading-none">
                        {(currentOrderStatus === 'Delivered' || currentOrderStatus === 'Completed') ? 'Handed Over' : 'Pending'}
                      </div>
                    </div>
                  </div>

                  <div className={cn("flex-1 h-0.5 mx-1.5", currentOrderStatus === 'Completed' ? "bg-emerald-500" : "bg-slate-200")} />

                  {/* Step 5: Completed */}
                  <div className="flex items-center gap-2 z-10 bg-white pl-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs",
                      currentOrderStatus === 'Completed' ? "bg-[#03543F] text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
                    )}>
                      {currentOrderStatus === 'Completed' ? '✓' : '5'}
                    </div>
                    <div>
                      <div className={cn("text-xs font-black leading-none", currentOrderStatus === 'Completed' ? "text-[#03543F]" : "text-slate-400")}>
                        Completed
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 leading-none">
                        {currentOrderStatus === 'Completed' ? 'Closed & Paid' : 'Final Step'}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 3. MAIN DENSE 2-COLUMN ORDER WORKSPACE */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 min-h-0 bg-[#F8FAFC]">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                  {/* LEFT COLUMN: Items Table & Fulfillment Tracker (7 Cols) */}
                  <div className="lg:col-span-7 space-y-4">

                    {/* Purchased Items Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-[#55349A]" />
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Purchased Items ({posCart.length} products · {posCart.reduce((total, c) => total + c.qty, 0)} units)
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {selectedStore || 'Main Store'}
                        </span>
                      </div>

                      {/* Items Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400">
                            <tr>
                              <th className="py-2.5 px-4">Item Details</th>
                              <th className="py-2.5 px-2 text-center">Batch</th>
                              <th className="py-2.5 px-2 text-right">Unit Price</th>
                              <th className="py-2.5 px-2 text-center">Qty</th>
                              <th className="py-2.5 px-4 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {posCart.map((item, idx) => (
                              <tr key={`${item.product.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 overflow-hidden">
                                      {item.product.image ? (
                                        <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        item.product.name.charAt(0)
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]">
                                        {item.product.name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        {[item.unitName || 'Unit', item.selectedSize !== 'Standard' && item.selectedSize, item.product.brand || item.product.sku].filter(Boolean).join(' · ')}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10.5px] font-bold font-mono border border-slate-200">
                                    Batch 1
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-slate-700">
                                  ₹{item.product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-[#55349A] font-mono font-black text-xs border border-purple-200/60">
                                    {item.qty}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                                  ₹{(item.qty * item.product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Delivery & Logistics Dispatch Tracker Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-teal-600" />
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Dispatch & Delivery Details
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {courierPartner && (
                            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-black uppercase border border-teal-200">
                              {courierPartner}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsEditingDispatch(!isEditingDispatch)}
                            className="text-primary-600 hover:text-primary-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                          >
                            <Edit2 className="h-2.5 w-2.5" />
                            <span>{isEditingDispatch ? 'Done' : (awbTrackingNo || courierOrderId ? 'Edit Tracking' : '+ Record Tracking')}</span>
                          </button>
                        </div>
                      </div>

                      {isEditingDispatch ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Courier / Logistics Partner
                              </label>
                              <input
                                type="text"
                                value={courierPartner}
                                onChange={(e) => setCourierPartner(e.target.value)}
                                placeholder="e.g. Delhivery, Shiprocket, BlueDart, In-House..."
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Courier Order Reference ID
                              </label>
                              <input
                                type="text"
                                value={courierOrderId}
                                onChange={(e) => setCourierOrderId(e.target.value)}
                                placeholder="e.g. SR-8931201"
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary-600"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Tracking AWB Number
                              </label>
                              <input
                                type="text"
                                value={awbTrackingNo}
                                onChange={(e) => setAwbTrackingNo(e.target.value)}
                                placeholder="e.g. AWB-948201948IN"
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium font-mono outline-none focus:border-primary-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Dispatch / Delivery Status
                              </label>
                              <select
                                value={dispatchStatus}
                                onChange={(e) => {
                                  setDispatchStatus(e.target.value);
                                  if (e.target.value === 'Delivered') {
                                    handleUpdateOrderStatus('Completed');
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-primary-600"
                              >
                                <option value="Ready for Dispatch">Ready for Dispatch</option>
                                <option value="Dispatched / In Transit">Dispatched / In Transit</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Delivered">Delivered (Completed)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Estimated Arrival
                              </label>
                              <input
                                type="text"
                                value={estimatedDelivery}
                                onChange={(e) => setEstimatedDelivery(e.target.value)}
                                placeholder="e.g. Tomorrow by 2:00 PM"
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary-600"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setIsEditingDispatch(false)}
                              className="px-4 py-1.5 bg-[#55349A] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer border-none"
                            >
                              Save Tracking Details
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TRACKING AWB</span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-slate-900 text-xs">
                                {awbTrackingNo || 'Not recorded yet'}
                              </span>
                              {awbTrackingNo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(awbTrackingNo);
                                    setCopiedAwb(true);
                                    setTimeout(() => setCopiedAwb(false), 2000);
                                  }}
                                  className="text-slate-400 hover:text-[#55349A] cursor-pointer bg-transparent border-none p-0"
                                  title="Copy AWB"
                                >
                                  {copiedAwb ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                            {courierOrderId && (
                              <div className="text-[10.5px] text-slate-500 font-mono">Ref: {courierOrderId}</div>
                            )}
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DISPATCH STATUS</span>
                            <span className="font-bold text-emerald-700 text-xs block">{dispatchStatus}</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ESTIMATED ARRIVAL</span>
                            <span className="font-medium text-slate-700 text-xs block">{estimatedDelivery || '—'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Doctor Rx Notes (if available) */}
                    {doctorNotes && doctorNotes.trim().length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1 text-xs animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[10.5px] uppercase tracking-wider">
                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Doctor Advice / Rx Notes</span>
                        </div>
                        <p className="text-emerald-950 font-medium leading-relaxed">{doctorNotes}</p>
                      </div>
                    )}

                    {/* Customer Remarks / Delivery Notes */}
                    {customerNotes && customerNotes.trim().length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 text-xs animate-fadeIn shadow-3xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Customer Remarks / Delivery Notes</span>
                        <p className="text-slate-800 font-medium leading-relaxed">{customerNotes}</p>
                      </div>
                    )}

                  </div>

                  {/* RIGHT COLUMN: Customer Profile, Shipping Label & Financials (5 Cols) */}
                  <div className="lg:col-span-5 space-y-4">

                    {/* Customer Profile Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Customer Profile</h3>
                        {viewOrderConsumerUid ? (
                          <span className="text-[9.5px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                            REGISTERED CRM
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            GUEST WALKIN
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#55349A] flex items-center justify-center font-black text-sm shrink-0">
                          {getActiveCustomerDetails().initials || (getActiveCustomerDetails().name || 'C').charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-900 truncate">
                            {getActiveCustomerDetails().name || 'Walk-in Customer'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            {[getActiveCustomerDetails().phone, getActiveCustomerDetails().email].filter(Boolean).join(' · ') || '#Walk-in'}
                          </div>
                        </div>
                      </div>

                      {/* Address Card */}
                      <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-[#55349A] block uppercase tracking-wider">
                            Delivery & Billing Address
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingAddress(!isEditingAddress)}
                            className="text-[10.5px] font-bold text-[#55349A] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                          >
                            <Edit2 className="h-2.5 w-2.5" />
                            <span>{isEditingAddress ? 'Cancel' : (shippingAddress || billingAddress ? 'Edit Address' : '+ Add Address')}</span>
                          </button>
                        </div>

                        {!isEditingAddress ? (
                          <p className="text-slate-800 font-medium text-xs leading-snug">
                            {shippingAddress || billingAddress || newCustomerAddress || getActiveCustomerDetails().address || 'Counter Walk-in / In-Store Pickup'}
                          </p>
                        ) : (
                          <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                Shipping Address
                              </label>
                              <textarea
                                rows={2}
                                value={shippingAddress || ''}
                                onChange={(e) => setShippingAddress(e.target.value)}
                                placeholder="House/Flat No, Street, City, Pincode"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#55349A] resize-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="step3SameAddress"
                                checked={shippingAddressSame}
                                onChange={(e) => {
                                  setShippingAddressSame(e.target.checked);
                                  if (e.target.checked) setBillingAddress(shippingAddress);
                                }}
                                className="h-3.5 w-3.5 accent-[#55349A] cursor-pointer rounded"
                              />
                              <label htmlFor="step3SameAddress" className="text-[11px] font-bold text-slate-600 cursor-pointer">
                                Billing address same as shipping
                              </label>
                            </div>
                            {!shippingAddressSame && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                  Billing Address
                                </label>
                                <textarea
                                  rows={2}
                                  value={billingAddress || ''}
                                  onChange={(e) => setBillingAddress(e.target.value)}
                                  placeholder="Billing address"
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#55349A] resize-none"
                                />
                              </div>
                            )}
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingAddress(false);
                                }}
                                className="px-3 py-1 bg-[#55349A] text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-xs"
                              >
                                Save Address
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Interactive Dispatch Alert Action */}
                      <button
                        type="button"
                        onClick={() => alert(`Dispatch confirmation SMS & WhatsApp receipt sent to ${getActiveCustomerDetails().phone || 'customer'}!`)}
                        className="w-full py-2 bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-[#55349A] text-slate-700 hover:text-[#55349A] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Send WhatsApp Receipt & Tracking</span>
                      </button>
                    </div>

                    {/* Shipping Label Quick Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-[#55349A]" />
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Shipping Label (4" × 6")
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">READY</span>
                      </div>

                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 font-mono text-[11px]">
                        <div className="flex justify-between items-center text-slate-400 text-[10px]">
                          <span>SHIP TO: {getActiveCustomerDetails().name || 'Customer'}</span>
                          <span className="text-emerald-400 font-bold">PREPAID</span>
                        </div>
                        <div className="font-bold text-xs tracking-wider">
                          AWB: {currentOrderObj?.awbCode || awbTrackingNo || 'Not Generated'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Fulfillment: {shippingAddress ? 'Home Delivery' : 'In-Store Pickup'} · {posCart.reduce((total, c) => total + c.qty, 0)} items
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowShippingLabelModal(true)}
                        className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print Shipping Label</span>
                      </button>
                    </div>

                    {/* Payment & Tax Breakdown Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                        Payment & Tax Breakdown
                      </h3>

                      <div className="space-y-2 text-xs font-medium text-slate-600">
                        <div className="flex justify-between">
                          <span>Items Subtotal</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{posCart.reduce((total, c) => total + (c.product.price * c.qty), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Estimated Tax (18%)</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{(posCart.reduce((total, c) => total + (c.product.price * c.qty), 0) * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {discountValue > 0 && (
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>Discount Applied</span>
                            <span className="font-mono">− ₹{discountValue.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-100">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Grand Total</span>
                          <span className="font-mono text-base font-black text-[#55349A]">
                            ₹{(posCart.reduce((total, c) => total + (c.product.price * c.qty), 0) * 1.18 - discountValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* 4. BOTTOM ACTION FOOTER */}
              <footer className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-3xs z-20">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">TOTAL PAYABLE:</span>
                  <span className="text-base font-black text-[#55349A] font-mono">
                    ₹{(posCart.reduce((total, c) => total + (c.product.price * c.qty), 0) * 1.18 - discountValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">({posCart.reduce((total, c) => total + c.qty, 0)} units)</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenInvoice) {
                        onOpenInvoice(currentOrderObj);
                      } else {
                        setInvoiceGenerated(true);
                        setShowInvoiceDetailsPage(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/40 text-slate-800 hover:text-[#55349A] text-xs font-bold transition-all shadow-3xs cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>View / Print Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateStep(2)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/40 text-slate-800 hover:text-[#55349A] text-xs font-bold transition-all shadow-3xs cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowShippingLabelModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/40 text-slate-800 hover:text-[#55349A] text-xs font-bold transition-all shadow-3xs cursor-pointer"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>Shipping Label</span>
                  </button>

                  {currentOrderStatus !== 'Completed' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus('Completed')}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>{updateStatusMutation.isPending ? 'Completing…' : 'Complete Order'}</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Order Completed</span>
                    </span>
                  )}
                </div>
              </footer>

            </div>
        )}

        {/* Shipping Label Modal */}
        {showShippingLabelModal && (
          <SingleLabelPreview
            orderUid={activeGeneratedOrderId || (selectedOrderForView?.id ?? 'ORD-00037')}
            sellerName={selectedStore || 'Test Business Pvt Ltd'}
            onClose={() => setShowShippingLabelModal(false)}
          />
        )}
{/* Lightbox Modal */}
        {activePhotoLightbox && (
          <PhotoLightbox src={activePhotoLightbox} onClose={() => setActivePhotoLightbox(null)} />
        )}
      </div>  );
}
