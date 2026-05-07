import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dialog, Input, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { type Customer } from "../../customers";
import { useStoresList } from "../../stores";
import { useOrdersDealers } from "../queries/orders";

declare global {
  interface Window {
    __JALDEE_SUPERADMIN_API_BASE_URL__?: string;
  }
}

type SelectionType = "customer" | "dealer";

export type CreateOrderSetupData = {
  guestMode: boolean;
  guestName: string;
  selectionType: SelectionType;
  selectedCustomer: Customer | null;
  selectedDealerId: string;
  selectedDealerName: string;
  selectedStoreId: string;
  selectedStoreName: string;
  selectedInvoiceType: string;
  selectedCatalogId: string;
  selectedCatalogName: string;
};

export const CREATE_ORDER_SETUP_STORAGE_KEY = "orders:create-order-setup";

export function persistCreateOrderSetup(data: CreateOrderSetupData) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CREATE_ORDER_SETUP_STORAGE_KEY, JSON.stringify(data));
}

export function readPersistedCreateOrderSetup(): CreateOrderSetupData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CREATE_ORDER_SETUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CreateOrderSetupData;
  } catch {
    return null;
  }
}

export function clearPersistedCreateOrderSetup() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CREATE_ORDER_SETUP_STORAGE_KEY);
}

export function CreateOrderSetupDialog({
  open,
  initialData,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialData?: CreateOrderSetupData | null;
  onClose: () => void;
  onSubmit: (data: CreateOrderSetupData) => void;
}) {
  const { api, account } = useSharedModulesContext();
  const [guestMode, setGuestMode] = useState(initialData?.guestMode ?? false);
  const [guestName, setGuestName] = useState(initialData?.guestName ?? "");
  const [selectionType, setSelectionType] = useState<SelectionType>(initialData?.selectionType ?? "customer");
  const [customerSearch, setCustomerSearch] = useState("");
  const [dealerSearch, setDealerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialData?.selectedCustomer ?? null);
  const [selectedDealerId, setSelectedDealerId] = useState(initialData?.selectedDealerId ?? "");
  const [selectedStoreId, setSelectedStoreId] = useState(initialData?.selectedStoreId ?? "");
  const [selectedInvoiceType, setSelectedInvoiceType] = useState(initialData?.selectedInvoiceType ?? "");
  const [selectedCatalogId, setSelectedCatalogId] = useState(initialData?.selectedCatalogId ?? "");

  useEffect(() => {
    if (!open) return;

    setGuestMode(initialData?.guestMode ?? false);
    setGuestName(initialData?.guestName ?? "");
    setSelectionType(initialData?.selectionType ?? "customer");
    setSelectedCustomer(initialData?.selectedCustomer ?? null);
    setSelectedDealerId(initialData?.selectedDealerId ?? "");
    setSelectedStoreId(initialData?.selectedStoreId ?? "");
    setSelectedInvoiceType(initialData?.selectedInvoiceType ?? "");
    setSelectedCatalogId(initialData?.selectedCatalogId ?? "");
    setCustomerSearch("");
    setDealerSearch("");
  }, [initialData, open]);

  const settingsQuery = useQuery({
    queryKey: ["orders", "create-order", "settings"],
    queryFn: () => api.get<any>("provider/sorder/settings/SALES_ORDER").then((response) => response.data),
    staleTime: 60_000,
  });
  const businessProfileQuery = useQuery({
    queryKey: ["orders", "create-order", "business-profile"],
    enabled: open,
    queryFn: () => api.get<any>("provider/bProfile").then((response) => response.data),
    staleTime: 300_000,
  });

  const storesQuery = useStoresList({ page: 1, pageSize: 200, status: "Active" });
  const providerSearchId = resolveProviderSearchId(businessProfileQuery.data);
  const activeSearchId = providerSearchId || account.id;

  const customersQuery = useQuery({
    queryKey: ["orders", "create-order", "customer-search", activeSearchId, customerSearch.trim()],
    enabled:
      open &&
      selectionType === "customer" &&
      Boolean(customerSearch.trim()) &&
      !selectedCustomer &&
      Boolean(activeSearchId),
    queryFn: async () => {
      const normalizedSearch = customerSearch.trim();
      const baseUrl = resolveSuperadminBaseUrl();

      if (!baseUrl) {
        throw new Error("Superadmin base URL is not configured.");
      }
      if (!activeSearchId) {
        throw new Error("Provider search id is not available from business profile.");
      }

      const params = new URLSearchParams({
        phoneNumber: `${normalizedSearch}*`,
        firstName: `${normalizedSearch}*`,
        lastName: `${normalizedSearch}*`,
        emailId: `${normalizedSearch}*`,
        jaldeeId: `${normalizedSearch}*`,
      });
      const fullUrl = `${baseUrl}/searchdetails/${encodeURIComponent(activeSearchId)}/providerconsumer/search?${params.toString()}`;

      const response = await fetch(fullUrl, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Customer search failed: ${response.status}`);
      }
      const payload = await response.json();

      return (Array.isArray(payload) ? payload : []).map(mapLuceneCustomerResult);
    },
    staleTime: 10_000,
  });
  const dealersQuery = useOrdersDealers(1, 20, dealerSearch.trim() ? { "name-like": dealerSearch.trim() } : {});

  const stores = storesQuery.data ?? [];
  const dealers = dealersQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const allowDealerSelection = Boolean(settingsQuery.data?.isPartnerSalesorder);
  const requiresCustomerSelection = Boolean(settingsQuery.data?.draftCreationWithProviderConsumer ?? true);

  const invoiceTypesQuery = useQuery({
    queryKey: ["orders", "create-order", "invoice-types", selectedStoreId],
    enabled: Boolean(selectedStoreId) && open,
    queryFn: async () => {
      const payload = await api
        .get<any[]>(`provider/store/order/invoice/type/details/${encodeURIComponent(selectedStoreId)}`)
        .then((response) => response.data);

      return (Array.isArray(payload) ? payload : [])
        .filter((item) => String(item?.status ?? "").trim().toLowerCase() === "active")
        .filter((item) => String(item?.orderMode ?? "").trim().toUpperCase() === "WALKIN_ORDER")
        .map((item, index) => ({
          id: String(item?.orderInvoiceType ?? item?.uid ?? item?.id ?? `invoice-type-${index + 1}`),
          label: String(item?.orderInvoiceType ?? item?.displayName ?? item?.name ?? "Invoice Type"),
        }));
    },
    staleTime: 30_000,
  });

  const catalogsQuery = useQuery({
    queryKey: ["orders", "create-order", "catalogs", selectedStoreId],
    enabled: Boolean(selectedStoreId) && open,
    queryFn: async () => {
      const payload = await api
        .get<any[]>("provider/so/catalog", {
          params: {
            from: 0,
            count: 100,
            "status-eq": "Enable",
            "walkInOrder-eq": true,
            "storeEncId-eq": selectedStoreId,
            "orderCategory-eq": "SALES_ORDER",
          },
        })
        .then((response) => response.data);

      return (Array.isArray(payload) ? payload : []).map((item, index) => ({
        id: String(item?.encId ?? item?.uid ?? item?.id ?? `catalog-${index + 1}`),
        name: String(item?.catalogName ?? item?.name ?? item?.displayName ?? "Catalog"),
      }));
    },
    staleTime: 30_000,
  });

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
  const selectedDealer = dealers.find((dealer) => dealer.id === selectedDealerId) ?? null;
  const invoiceTypes = invoiceTypesQuery.data ?? [];
  const catalogs = catalogsQuery.data ?? [];
  const canProceed =
    Boolean(selectedStoreId) &&
    Boolean(selectedCatalogId) &&
    (guestMode || !requiresCustomerSelection || Boolean(selectedCustomer) || Boolean(selectedDealer)) &&
    (invoiceTypes.length === 0 || Boolean(selectedInvoiceType));

  useEffect(() => {
    if (!allowDealerSelection && selectionType === "dealer") {
      setSelectionType("customer");
      setSelectedDealerId("");
    }
  }, [allowDealerSelection, selectionType]);

  useEffect(() => {
    if (!selectedStoreId && stores.length === 1) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  useEffect(() => {
    setSelectedInvoiceType("");
    setSelectedCatalogId("");
  }, [selectedStoreId]);

  useEffect(() => {
    if (!selectedInvoiceType && invoiceTypes.length === 1) {
      setSelectedInvoiceType(invoiceTypes[0].id);
    }
  }, [invoiceTypes, selectedInvoiceType]);

  useEffect(() => {
    if (!selectedCatalogId && catalogs.length === 1) {
      setSelectedCatalogId(catalogs[0].id);
    }
  }, [catalogs, selectedCatalogId]);

  const storeOptions = useMemo(() => stores.map((store) => ({ value: store.id, label: store.name })), [stores]);

  function submit() {
    if (!canProceed) return;
    const selectedCatalog = catalogs.find((catalog) => catalog.id === selectedCatalogId) ?? null;
    onSubmit({
      guestMode,
      guestName: guestName.trim(),
      selectionType,
      selectedCustomer,
      selectedDealerId,
      selectedDealerName: selectedDealer?.name ?? "",
      selectedStoreId,
      selectedStoreName: selectedStore?.name ?? "",
      selectedInvoiceType,
      selectedCatalogId,
      selectedCatalogName: selectedCatalog?.name ?? "",
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create Order"
      description=""
      size="xl"
      contentClassName="max-w-[760px] rounded-xl px-7 py-8"
      closeButtonClassName="text-slate-500 hover:bg-transparent"
      closeIcon={<DialogCloseGlyph />}
    >
      <div className="space-y-4">
        <SectionCard className="border-slate-100 shadow-none">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = !guestMode;
                  setGuestMode(next);
                  if (next) {
                    setSelectedCustomer(null);
                    setSelectedDealerId("");
                  }
                }}
                className={`mt-1 flex h-6 w-11 items-center rounded-full p-0.5 transition ${guestMode ? "bg-indigo-600" : "bg-slate-300"}`}
                aria-label="Toggle guest mode"
              >
                <span className={`h-5 w-5 rounded-full bg-white shadow transition ${guestMode ? "translate-x-5" : ""}`} />
              </button>
              <div>
                <div className="text-[16px] font-semibold text-slate-900">Guest Mode</div>
                <div className="text-sm text-slate-500">Easy order creation without profile creation</div>
              </div>
            </div>

            {guestMode ? (
              <Input id="orders-create-guest-name" label="Guest Name" value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Enter name" className="h-[42px]" />
            ) : selectedCustomer ? (
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ProfileBadge letter={(selectedCustomer.firstName?.[0] ?? "C").toUpperCase()} />
                    <div>
                      <div className="font-semibold text-slate-900">{formatCustomerName(selectedCustomer)}</div>
                      <div className="text-sm text-slate-500">Id : {selectedCustomer.jaldeeId || selectedCustomer.id}</div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setSelectedCustomer(null)}>
                    Remove
                  </Button>
                </div>
                <div className="mt-5">
                  <DetailBlock title="Contact Information" lines={[formatCustomerPhone(selectedCustomer), selectedCustomer.email ?? ""]} />
                </div>
              </div>
            ) : selectedDealer ? (
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ProfileBadge letter={(selectedDealer.name?.[0] ?? "D").toUpperCase()} />
                    <div>
                      <div className="font-semibold text-slate-900">{selectedDealer.name}</div>
                      <div className="text-sm text-slate-500">Dealer</div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setSelectedDealerId("")}>
                    Remove
                  </Button>
                </div>
                <div className="mt-5">
                  <DetailBlock title="Contact Information" lines={[selectedDealer.phone]} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)]">
                  <Select
                    id="orders-create-selection-type"
                    value={selectionType}
                    options={allowDealerSelection ? [{ value: "customer", label: "Customer" }, { value: "dealer", label: "Dealer" }] : [{ value: "customer", label: "Customer" }]}
                    onChange={(event) => {
                      const next = event.target.value as SelectionType;
                      setSelectionType(next);
                      setSelectedDealerId("");
                      setSelectedCustomer(null);
                    }}
                  />
                  {selectionType === "customer" ? (
                    <Input
                      id="orders-create-customer-search"
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      placeholder={customersQuery.isLoading ? "Loading customers..." : "Search customer"}
                      className="h-[42px]"
                    />
                  ) : (
                    <Select
                      id="orders-create-dealer-select"
                      value={selectedDealerId}
                      options={[{ value: "", label: dealersQuery.isLoading ? "Loading dealers..." : "Select Dealer" }, ...dealers.map((dealer) => ({ value: dealer.id, label: dealer.name }))]}
                      onChange={(event) => setSelectedDealerId(event.target.value)}
                    />
                  )}
                </div>

                {selectionType === "customer" && customerSearch.trim() ? (
                  <div className="max-h-[220px] overflow-y-auto rounded-lg border border-slate-200">
                    {customersQuery.isLoading ? (
                      <div className="px-4 py-5 text-sm text-slate-500">Loading customers...</div>
                    ) : customers.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-slate-500">No customers found.</div>
                    ) : (
                      customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setSelectedDealerId("");
                            setGuestMode(false);
                            setCustomerSearch("");
                          }}
                          className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{formatCustomerName(customer)}</div>
                            <div className="text-sm text-slate-500">Id : {customer.jaldeeId || customer.id}</div>
                          </div>
                          <div className="text-right text-sm text-slate-500">
                            <div>{formatCustomerPhone(customer)}</div>
                            <div>{customer.email ?? ""}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : selectionType === "dealer" ? (
                  <Input id="orders-create-dealer-search" value={dealerSearch} onChange={(event) => setDealerSearch(event.target.value)} placeholder="Search dealer" className="h-[42px]" />
                ) : null}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard className="border-slate-100 shadow-none">
          <Select id="orders-create-store" label="Select Store" value={selectedStoreId} options={[{ value: "", label: storesQuery.isLoading ? "Loading stores..." : "Select store" }, ...storeOptions]} onChange={(event) => setSelectedStoreId(event.target.value)} />
        </SectionCard>

        <SectionCard className="border-slate-100 shadow-none">
          <Select
            id="orders-create-invoice-type"
            label="Select Invoice Type"
            value={selectedInvoiceType}
            options={[{ value: "", label: invoiceTypesQuery.isLoading ? "Loading invoice types..." : invoiceTypes.length ? "Select invoice type" : "No active walk-in invoice types" }, ...invoiceTypes.map((type) => ({ value: type.id, label: type.label }))]}
            onChange={(event) => setSelectedInvoiceType(event.target.value)}
            disabled={!selectedStoreId || invoiceTypes.length === 0}
          />
        </SectionCard>

        <SectionCard className="border-slate-100 shadow-none">
          <Select
            id="orders-create-catalog"
            label="Select Catalog"
            value={selectedCatalogId}
            options={[{ value: "", label: catalogsQuery.isLoading ? "Loading catalogs..." : catalogs.length ? "Select catalog" : "No walk-in catalogs available" }, ...catalogs.map((catalog) => ({ value: catalog.id, label: catalog.name }))]}
            onChange={(event) => setSelectedCatalogId(event.target.value)}
            disabled={!selectedStoreId || catalogs.length === 0}
          />
        </SectionCard>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={!canProceed}>
            Next
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function formatCustomerName(customer: Customer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Customer";
}

function formatCustomerPhone(customer: Customer) {
  const countryCode = String(customer.countryCode ?? "").trim();
  const phone = String(customer.phoneNo ?? "").trim();
  if (!countryCode && !phone) return "";
  return `${countryCode ? `+${countryCode} ` : ""}${phone}`.trim();
}

function ProfileBadge({ letter }: { letter: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-lg font-semibold text-white">
      {letter}
    </div>
  );
}

function DetailBlock({ title, lines }: { title: string; lines: string[] }) {
  const visibleLines = lines.filter((line) => Boolean(line.trim()));
  if (visibleLines.length === 0) return null;

  return (
    <div>
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-2 space-y-1 text-slate-700">
        {visibleLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function DialogCloseGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M5.5 5.5L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.5 5.5L5.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function resolveSuperadminBaseUrl() {
  if (typeof window !== "undefined") {
    const configuredWindowUrl = window.__JALDEE_SUPERADMIN_API_BASE_URL__?.trim();
    if (configuredWindowUrl) {
      const cleaned = configuredWindowUrl.replace(/\/$/, "");
      // If it's a relative path, make it absolute using the current origin
      return cleaned.startsWith("http") ? cleaned : window.location.origin + cleaned;
    }
  }

  const configuredEnvUrl = import.meta.env.VITE_SUPERADMIN_API_BASE_URL?.trim();
  if (configuredEnvUrl) {
    const cleaned = configuredEnvUrl.replace(/\/$/, "");
    // If it's a relative path, make it absolute using the current origin
    if (typeof window !== "undefined") {
      return cleaned.startsWith("http") ? cleaned : window.location.origin + cleaned;
    }
    return cleaned;
  }

  return "";
}

function resolveProviderSearchId(payload: unknown) {
  const profile = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  
  // Log the exact payload for debugging purposes
  console.log("[CreateOrderSetupDialog] provider/bprofile payload:", profile);

  // Lock to the exact accountId field instead of the fallback chain
  // Also falling back to id just in case accountId is missing in some scenarios
  const accountId = String(profile.accountId ?? "").trim();
  if (accountId) {
    return accountId;
  }

  // Fallback to ID to ensure it fires
  const id = String(profile.id ?? "").trim();
  if (id) {
    return id;
  }

  return "";
}

function mapLuceneCustomerResult(raw: unknown): Customer {
  const row = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const firstName = String(row.firstName ?? row.fname ?? row.givenName ?? row.name ?? "").trim();
  const lastName = String(row.lastName ?? row.lname ?? row.familyName ?? "").trim();
  const resolvedId = row.id ?? row.consumerId ?? row.providerConsumerId ?? row.jaldeeConsumerId ?? row.encId ?? firstName ?? "customer";
  const id = String(resolvedId);
  const countryCode = readCountryCode(row);
  const phoneNo = String(row.phoneNo ?? row.phoneNumber ?? row.mobileNo ?? row.mobileNumber ?? "").trim();

  return {
    id,
    jaldeeId: readOptionalString(row.jaldeeId ?? row.jaldeeConsumerId ?? row.consumerJaldeeId),
    firstName: firstName || "Customer",
    lastName: lastName || undefined,
    phoneNo: phoneNo || undefined,
    countryCode: countryCode || undefined,
    email: readOptionalString(row.email ?? row.emailId),
    gender: readOptionalString(row.gender),
    dob: readOptionalString(row.dob),
    address: readOptionalString(row.address),
    status: readOptionalString(row.status),
  };
}

function readCountryCode(row: Record<string, unknown>) {
  const direct = readOptionalString(row.countryCode ?? row.country_code);
  if (direct) {
    return direct.replace(/^\+/, "");
  }

  const country = row.countryCodeObj;
  if (typeof country === "object" && country !== null) {
    const record = country as Record<string, unknown>;
    const code = readOptionalString(record.countryCode ?? record.code ?? record.dialCode);
    return code ? code.replace(/^\+/, "") : "";
  }

  return "";
}

function readOptionalString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}
