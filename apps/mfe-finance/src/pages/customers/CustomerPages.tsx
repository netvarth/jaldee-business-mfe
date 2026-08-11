import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Icon,
  Input,
  Popover,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { DataTableCard, FinanceFilterButton, PageShell } from "../../components/FinancePageLayout";
import { formatCurrency } from "../../lib/financeData";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { buildFinanceSearchBody, useCustomersSearchSchema } from "../../lib/financeSearch";

export function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { schema } = useCustomersSearchSchema();

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, schema).length,
    [advancedFilters, schema]
  );

  const openFilters = () => {
    setDraftFilters(
      advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(schema)
    );
    setFiltersOpen(true);
  };

  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(schema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
  };

  const resetFilters = () => {
    clearFilters();
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setAdvancedFilters(draftFilters);
    setFiltersOpen(false);
  };

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      setLoading(true);
      try {
        const searchBody = buildFinanceSearchBody(advancedFilters, schema, 0, 200);
        const response = await financeApi.customers.search<any>({
          ...searchBody,
          // view: "SUMMARY",
        });
        if (!active) {
          return;
        }

        const records = Array.isArray(response.data?.content)
          ? response.data.content
          : Array.isArray(response.data?.data?.content)
            ? response.data.data.content
            : Array.isArray(response.data?.data)
              ? response.data.data
              : Array.isArray(response.data)
                ? response.data
                : [];

        setCustomers(
          records.map((item: any, index: number) => ({
            uid: String(item.uid ?? item.consumerUid ?? item.id ?? item.userId ?? `consumer-${index}`),
            name: String(
              item.displayName
              || item.name
              || item.consumerName
              || [item.firstName, item.lastName].filter(Boolean).join(" ")
              || "Consumer"
            ).trim(),
            phone: String(
              item.phoneE164
              || item.whatsAppE164
              || item.consumerPhone
              || item.mobile
              || item.mobileNo
              || item.phoneNo
              || item.phone
              || item.primaryPhone
              || "-"
            ).trim(),
            status: String(item.status || (item.deleted ? "DELETED" : "ACTIVE")).trim(),
          }))
        );
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("Failed to fetch finance consumers", error);
        setCustomers([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCustomers();
    return () => {
      active = false;
    };
  }, [advancedFilters, schema]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    { key: "name", header: "Consumer Name", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: "phone", header: "Phone Number" },
    { key: "status", header: "Status" },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-[52px] px-3 text-[length:var(--text-xs)]"
            onClick={() => navigate(row.uid)}
          >
            View
          </Button>
          <Popover
            placement="bottom"
            align="end"
            portal
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`More actions for consumer ${row.name}`}
                className="h-8 w-8 px-0"
                icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
              />
            }
          >
            <div className="flex min-w-[120px] flex-col gap-0.5 p-1">
              <Button
                variant="ghost"
                className="w-full justify-start h-8 px-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50"
                onClick={() => navigate(`edit/${row.uid}`)}
                icon={<Icon name="pencil" className="h-3.5 w-3.5 text-slate-500" />}
              >
                Edit
              </Button>
            </div>
          </Popover>
        </div>
      ),
    },
  ], [navigate]);

  return (
    <PageShell
      title={`Finance Consumers (${customers.length})`}
      subtitle="Manage consumers available in the finance module."
    >
      <DataTableCard
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("create")}>Create Consumer</Button>
            <FinanceFilterButton
              testId="finance-consumers-filter"
              label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
              active={appliedFilterCount > 0}
              onClick={openFilters}
            />
          </div>
        }
        data={customers}
        columns={columns}
        loading={loading}
        emptyTitle="No finance consumers found"
        emptyDescription="Finance consumers will appear here once available from the finance consumer API."
        getRowId={(row) => row.uid}
      />
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-consumers-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={schema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No consumer filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="finance-consumers-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="finance-consumers-filter-apply"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </PageShell>
  );
}

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [locations, setLocations] = useState<Array<{ value: string; id?: number; label: string }>>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [masterSelectionMode, setMasterSelectionMode] = useState(false);
  const [creatingMasterInvoice, setCreatingMasterInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");

  function extractInvoiceRecords(payload: any) {
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.data?.content)) return payload.data.content;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  function readInvoiceConsumerUid(item: any) {
    return String(
      item?.consumerUid ??
      item?.consumer?.uid ??
      item?.consumer?.consumerUid ??
      item?.consumerSnapshot?.uid ??
      item?.customerUid ??
      ""
    ).trim();
  }

  function getInvoiceSelectionId(item: any) {
    return String(item?.detailUid || item?.uid || item?.id || item?.invoiceNum || "");
  }

  function buildMasterInvoicePayload(baseInvoice: any, linkedInvoiceUids: string[], fallbackLocationId?: string) {
    const nowIso = new Date().toISOString();
    const resolvedLocationStr = (locationFilter !== "ALL" ? locationFilter : "")
      || baseInvoice?.locationId
      || baseInvoice?.locationUid
      || fallbackLocationId
      || customer?.locationId
      || locations[0]?.value
      || "";

    const matchedLoc = locations.find((loc) => 
      String(loc.value).toLowerCase() === resolvedLocationStr.toLowerCase() 
      || String(loc.id) === resolvedLocationStr
    );
    const finalLocationUid = matchedLoc?.value ?? resolvedLocationStr;

    return sanitizeFinancePayload({
      tenantId: baseInvoice?.tenantId ?? baseInvoice?.tenantUid,
      locationUid: finalLocationUid,
      sourceService: "FINANCE_SERVICE",
      feature: "FINANCE",
      sourceServiceCategory: "FINANCE",
      invoiceDate: nowIso,
      createdDate: nowIso,
      dueDate: baseInvoice?.dueDate ?? nowIso,
      consumerType: baseInvoice?.consumerType ?? "TENANT_CONSUMER",
      consumerUid: baseInvoice?.consumerUid ?? id,
      partyType: baseInvoice?.partyType ?? "B2C",
      supplyType: baseInvoice?.supplyType ?? "INTRA_STATE",
      linkedInvoices: linkedInvoiceUids.map((uid) => ({ uid })),
    });
  }

  useEffect(() => {
    let active = true;

    async function loadCustomerInvoices() {
      setLoading(true);
      try {
        const [customerResponse, invoiceResponse, locationResponse] = await Promise.all([
          financeApi.customers.detail<any>(id),
          financeApi.invoices.listGeneral<any>({
            from: 0,
            count: 200,
            consumerUid: id,
            ...(locationFilter !== "ALL" ? { locationUid: locationFilter } : {}),
          }),
          financeApi.locations.tenant<any>({ page: 0, size: 200 }),
        ]);

        if (!active) {
          return;
        }

        const rawLocations = Array.isArray(locationResponse.data?.content)
          ? locationResponse.data.content
          : Array.isArray(locationResponse.data?.data?.content)
            ? locationResponse.data.data.content
            : Array.isArray(locationResponse.data?.data)
              ? locationResponse.data.data
              : Array.isArray(locationResponse.data)
                ? locationResponse.data
                : [];
        const nextLocations = rawLocations
          .map((item: any) => ({
            value: String(item.locationUid ?? item.uid ?? item.locationId ?? ""),
            id: item.id !== undefined && item.id !== null ? Number(item.id) : undefined,
            label: String(item.place ?? item.locationName ?? item.name ?? item.displayName ?? "Location").trim(),
          }))
          .filter((item: any) => item.value && item.label);
        setLocations(nextLocations);
        if (nextLocations.length === 1 && locationFilter === "ALL") {
          setLocationFilter(nextLocations[0].value);
        }

        const customerData = customerResponse.data ?? {};
        const payload = extractInvoiceRecords(invoiceResponse.data);
        const firstInvoiceRecord = payload?.[0] ?? {};

        const customerLocationId = String(
          customerData.locationId 
          || customerData.locationUid 
          || customerData.location?.id 
          || customerData.location?.uid 
          || firstInvoiceRecord.locationId 
          || firstInvoiceRecord.locationUid 
          || ""
        );
        const matchedLocation = nextLocations.find((loc: any) => loc.value === customerLocationId);
        const resolvedLocationName = customerData.locationName 
          || matchedLocation?.label 
          || firstInvoiceRecord.locationName 
          || firstInvoiceRecord.location 
          || "-";

        setCustomer({
          uid: id,
          name: String(
            customerData.displayName ??
            customerData.name ??
            customerData.consumerName ??
            firstInvoiceRecord.consumerName ??
            firstInvoiceRecord.name ??
            firstInvoiceRecord.displayName ??
            customerData.consumerName ??
            [customerData.firstName, customerData.lastName].filter(Boolean).join(" ") ??
            "Consumer"
          ).trim(),
          phone: String(
            customerData.phoneE164 ??
            customerData.whatsAppE164 ??
            customerData.consumerPhone ??
            firstInvoiceRecord.consumerPhone ??
            customerData.mobile ??
            customerData.mobileNo ??
            customerData.phoneNo ??
            customerData.phone ??
            customerData.primaryPhone ??
            "-"
          ).trim(),
          consumerType: String(customerData.consumerType ?? firstInvoiceRecord.consumerType ?? "NONE").trim(),
          locationId: customerLocationId,
          locationName: String(resolvedLocationName).trim(),
          status: String(customerData.status ?? "ACTIVE").trim(),
        });

        const normalizedInvoices = payload
          .filter((item: any) => {
            const consumerUid = readInvoiceConsumerUid(item);
            return !consumerUid || consumerUid === id;
          })
          .map((item: any, index: number) => ({
          id: String(item.uid || item.invoiceNum || item.invoiceId || `invoice-${index}`),
          detailUid: String(item.uid || item.invoiceUid || item.invoiceEncId || item.id || item.invoiceId || ""),
          invoiceNum: String(item.invoiceNum || item.invoiceId || item.uid || `invoice-${index}`),
          invoiceDate: item.invoiceDate || item.createdDate || item.createdAt
            ? new Date(item.invoiceDate || item.createdDate || item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "-",
          amount: Number(item.netRate || item.netTotal || item.totalAmount || item.amountDue || 0),
          amountDue: Number(item.amountDue || item.netRate || item.netTotal || item.totalAmount || 0),
          invoiceType: String(item.internalInvoiceType || item.invoiceType || item.type || "INDIVIDUAL_INVOICE"),
          status: String(item.invoiceStatus || item.billStatus || item.status || item.invoicePaymentStatus || "New"),
          product: String(item.product || item.productName || item.featureModule || "FINANCE"),
          location: String(item.locationName || item.location || item.locationPlace || "Unknown"),
          consumerUid: readInvoiceConsumerUid(item),
          tenantUid: String(item.tenantUid || ""),
          locationId: String(
            item.locationId 
            || item.locationUid 
            || item.location?.id 
            || item.location?.uid 
            || item.location?.locationId 
            || ""
          ),
          locationUid: String(item.locationUid || item.location?.uid || ""),
          locationName: String(item.locationName || item.location?.name || item.location || ""),
          storeUid: String(item.storeUid || ""),
          storeName: String(item.storeName || ""),
          departmentUid: String(item.departmentUid || ""),
          departmentName: String(item.departmentName || ""),
        }));
        setInvoices(normalizedInvoices);
        setSelectedInvoiceIds((current) => current.filter((invoiceId) => normalizedInvoices.some((item) => getInvoiceSelectionId(item) === invoiceId)));
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("Failed to load finance consumer invoices", error);
        setFormError(error instanceof Error ? error.message : "Could not load consumer invoice list.");
        setInvoices([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCustomerInvoices();
    return () => {
      active = false;
    };
  }, [id, locationFilter]);

  function toggleInvoiceSelection(invoiceId: string, checked: boolean) {
    setSelectedInvoiceIds((current) =>
      checked ? Array.from(new Set([...current, invoiceId])) : current.filter((idValue) => idValue !== invoiceId)
    );
  }

  function handleStartMasterInvoiceSelection() {
    setFormError("");
    setMasterSelectionMode(true);
    setSelectedInvoiceIds([]);
  }

  async function handleGenerateMasterInvoice() {
    if (selectedInvoiceIds.length < 2 || creatingMasterInvoice) {
      return;
    }

    setFormError("");
    setCreatingMasterInvoice(true);
    try {
      const selectedInvoices = displayedInvoices.filter((item) => selectedInvoiceIds.includes(getInvoiceSelectionId(item)));
      const primaryInvoice = selectedInvoices[0];
      if (!primaryInvoice?.detailUid) {
        throw new Error("Select valid invoices to create a master invoice.");
      }

      const detailResponse = await financeApi.invoices.detailGeneral<any>(primaryInvoice.detailUid);
      const payload = buildMasterInvoicePayload(
        detailResponse.data ?? {},
        selectedInvoices.map((item) => String(item.detailUid || item.id)).filter(Boolean),
        primaryInvoice?.locationId || primaryInvoice?.locationUid,
      );
      const response = await financeApi.invoices.createMaster<any>(payload);
      const masterInvoiceUid = String(
        response.data?.uid ??
        response.data?.masterInvoiceUid ??
        response.data?.invoiceUid ??
        response.data?.id ??
        ""
      );

      setMasterSelectionMode(false);
      setSelectedInvoiceIds([]);
      if (masterInvoiceUid) {
        navigate(`/master-invoice/${masterInvoiceUid}`, { state: { from: `/customers/${id}` } });
        return;
      }
      await Promise.all([
        financeApi.customers.detail<any>(id),
        financeApi.invoices.listGeneral<any>({ from: 0, count: 200, consumerUid: id }),
      ]);
      window.location.reload();
    } catch (error) {
      console.error("Failed to create master invoice", error);
      setFormError(error instanceof Error ? error.message : "Could not create master invoice.");
    } finally {
      setCreatingMasterInvoice(false);
    }
  }

  const locationOptions = useMemo(
    () => [{ value: "ALL", label: "All Locations" }, ...locations],
    [locations]
  );

  const displayedInvoices = useMemo(() => (
    invoices.filter((item) => {
      const statusMatches = invoiceStatusFilter === "ALL" || String(item.status).toUpperCase() === invoiceStatusFilter;
      const locationMatches = locationFilter === "ALL" || item.locationUid === locationFilter || item.locationId === locationFilter;
      const consumerMatches = String(item.consumerUid || "") === id || !item.consumerUid;
      return statusMatches && locationMatches && consumerMatches;
    })
  ), [invoiceStatusFilter, invoices, locationFilter]);

  useEffect(() => {
    if (displayedInvoices.length < 2 && masterSelectionMode) {
      setMasterSelectionMode(false);
      setSelectedInvoiceIds([]);
    }
  }, [displayedInvoices.length, masterSelectionMode]);

  const invoiceColumns = useMemo<ColumnDef<any>[]>(() => {
    const columns: ColumnDef<any>[] = [];
    if (masterSelectionMode) {
      columns.push({
        key: "select",
        header: "",
        render: (row) => {
          const selectionId = getInvoiceSelectionId(row);
          return (
            <input
              type="checkbox"
              checked={selectedInvoiceIds.includes(selectionId)}
              onChange={(event) => toggleInvoiceSelection(selectionId, event.target.checked)}
              aria-label={`Select invoice ${row.invoiceNum}`}
            />
          );
        },
      });
    }
    columns.push(
      { key: "invoiceNum", header: "ID" },
      { key: "invoiceDate", header: "Date" },
      { key: "amount", header: "Amount (INR)", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "amountDue", header: "Amount Due (INR)", align: "right", render: (row) => formatCurrency(row.amountDue) },
      { key: "invoiceType", header: "Invoice Type" },
      { key: "status", header: "Status" },
      { key: "product", header: "Product" },
      {
        key: "actions",
        header: "Actions",
        render: (row) => {
          const isMaster = String(row.invoiceType || "").toUpperCase().includes("MASTER");
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isMaster) {
                  navigate(`/master-invoice/${row.detailUid || row.id}`, { state: { from: `/customers/${id}` } });
                } else {
                  navigate(`/invoice/view/${row.detailUid || row.id}`, { state: { from: `/customers/${id}` } });
                }
              }}
            >
              View
            </Button>
          );
        },
      },
    );
    return columns;
  }, [masterSelectionMode, navigate, selectedInvoiceIds]);

  return (
    <PageShell
      title={customer ? customer.name : "Consumer"}
      subtitle="Consumer-level invoice view for finance operations."
      back={{ label: "Back to Customers", href: "/customers" }}
      actions={(
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/customers/edit/${id}`)}>
            Edit Consumer
          </Button>
          <Button onClick={() => navigate(`/invoice/newInvoice?consumerUid=${id}`)}>
            Create Invoice
          </Button>
        </div>
      )}
    >
      {customer ? (
        <div className="grid gap-4">
          <SectionCard className="border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-2xl font-extrabold text-[var(--color-primary)]">
                    {String(customer.name || "C").trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{customer.name}</h1>
                    <p className="text-xs font-semibold text-[var(--color-primary)]">Consumer ID: {id}</p>
                  </div>
                </div>
                <div>
                  <Badge variant={customer.status === "ACTIVE" || !customer.status ? "success" : "neutral"} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5">
                    {customer.status || "ACTIVE"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Phone Number</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{customer.phone || "-"}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Consumer Type</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{customer.consumerType || "NONE"}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Location</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{customer.locationName || "-"}</div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="px-4 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-[22px] font-semibold text-slate-900">Invoice ({displayedInvoices.length})</div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-64">
                <Select
                  value={invoiceStatusFilter}
                  onChange={(event) => setInvoiceStatusFilter(event.target.value)}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "NEW", label: "New" },
                    { value: "SETTLED", label: "Settled" },
                    { value: "CANCELLED", label: "Cancelled" },
                    { value: "PAID", label: "Paid" },
                  ]}
                />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  options={locationOptions}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {masterSelectionMode ? (
              <>
                <Button
                  onClick={() => void handleGenerateMasterInvoice()}
                  disabled={selectedInvoiceIds.length < 2 || creatingMasterInvoice}
                >
                  {creatingMasterInvoice ? "Generating..." : "Generate Invoice"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMasterSelectionMode(false);
                    setSelectedInvoiceIds([]);
                    setFormError("");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Popover
                portal
                placement="bottom-start"
                trigger={<Button icon={<Icon name="plus" className="h-4 w-4" />}>Create Invoice</Button>}
              >
                <div className="grid min-w-[180px] p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => navigate(`/invoice/newInvoice?consumerUid=${id}`)}
                  >
                    New Invoice
                  </Button>
                  {displayedInvoices.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start font-normal"
                      onClick={handleStartMasterInvoiceSelection}
                    >
                      Master Invoice
                    </Button>
                  ) : null}
                </div>
              </Popover>
            )}
          </div>
        </div>

        {formError ? (
          <div className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {formError}
          </div>
        ) : null}

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading consumer invoices...</div>
        ) : displayedInvoices.length ? (
          <div className="mt-1">
            <DataTableCard
              bare
              data={displayedInvoices}
              columns={invoiceColumns}
              getRowId={(row) => row.id}
              emptyTitle="No invoices found"
              emptyDescription="This consumer does not have finance invoices yet."
            />
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No invoices found"
              description="This consumer does not have finance invoices yet."
            />
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}

export function CustomerCreatePage() {
  const { eventBus } = useMFEProps();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("INACTIVE");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("MALE");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!firstName.trim()) {
      setFormError("First name is required.");
      return;
    }

    if (!phoneNo.trim() && !email.trim()) {
      setFormError("Phone number or email is required.");
      return;
    }

    setSaving(true);
    try {
      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
      const normalizedPhone = phoneNo.trim().replace(/\s+/g, "");
      const normalizedCountryCode = countryCode.trim() || "+91";
      const phoneE164 = normalizedPhone ? `${normalizedCountryCode}${normalizedPhone}`.replace(/\s+/g, "") : undefined;
      const statusEnum = status === "ACTIVE" ? "Enabled" : "Disabled";

      await financeApi.customers.create({
        consumerType: "TENANT_CONSUMER",
        title: title.trim() || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phoneNumber: normalizedPhone ? {
          countryCode: normalizedCountryCode,
          number: normalizedPhone,
        } : undefined,
        email: email.trim() || undefined,
        status,
        consumerSnapshot: {
          title: title.trim() || undefined,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          displayName: displayName || firstName.trim(),
          statusEnum,
          phoneE164,
          email: email.trim() || undefined,
          gender,
          dob: dob || undefined,
          systemGeneratedDob: false,
          address: address.trim() || undefined,
          allowLogin: false,
          internationalConsumer: normalizedCountryCode !== "+91",
        },
      });
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Create Consumer",
        message: "Consumer created successfully.",
      });
      navigate("..", { relative: "path", replace: true });
    } catch (error) {
      console.error("[mfe-finance] Failed to create consumer", error);
      const msg = error instanceof Error ? error.message : "Could not create consumer.";
      setFormError(msg);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Create Consumer",
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Consumer"
      subtitle="Create a finance consumer using the finance consumer API."
      back={{ label: "Back to Customers", href: "/customers" }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5 p-5 md:p-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              options={[
                { value: "Mr", label: "Mr" },
                { value: "Ms", label: "Ms" },
                { value: "Mrs", label: "Mrs" },
                { value: "Dr", label: "Dr" },
              ]}
              fullWidth
            />
            <Input label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="John" fullWidth />
            <Input label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Doe" fullWidth />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
              fullWidth
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
              fullWidth
            />
            <div className="grid gap-4 grid-cols-[100px_1fr]">
              <Input label="Country Code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="+91" fullWidth />
              <Input label="Phone Number" value={phoneNo} onChange={(event) => setPhoneNo(event.target.value)} placeholder="9876543210" fullWidth />
            </div>
            <Input label="Date of Birth" type="date" value={dob} onChange={(event) => setDob(event.target.value)} fullWidth />
            <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="john@example.com" fullWidth />
          </div>

          <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Add address" />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/customers")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export function CustomerEditPage() {
  const { eventBus } = useMFEProps();
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const [originalCustomer, setOriginalCustomer] = useState<any>(null);
  
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("INACTIVE");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("MALE");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCustomer() {
      try {
        const response = await financeApi.customers.detail<any>(id);
        if (!active) return;
        const data = response.data ?? {};
        setOriginalCustomer(data);

        setTitle(data.title || data.consumerSnapshot?.title || "Mr");
        setFirstName(data.firstName || data.consumerSnapshot?.firstName || "");
        setLastName(data.lastName || data.consumerSnapshot?.lastName || "");
        setStatus(data.status || "INACTIVE");
        setGender(data.consumerSnapshot?.gender || "MALE");
        setEmail(data.email || data.consumerSnapshot?.email || "");
        setDob(data.consumerSnapshot?.dob || "");
        setAddress(data.consumerSnapshot?.address || "");

        const rawCountryCode = data.phoneNumber?.countryCode ?? "";
        const rawNumber = data.phoneNumber?.number ?? "";
        let resolvedCountryCode = rawCountryCode || "+91";
        let resolvedNumber = rawNumber;

        if (!resolvedNumber && data.consumerSnapshot?.phoneE164) {
          const phoneE164 = String(data.consumerSnapshot.phoneE164);
          if (phoneE164.startsWith("+")) {
            if (phoneE164.startsWith("+91")) {
              resolvedCountryCode = "+91";
              resolvedNumber = phoneE164.slice(3);
            } else {
              resolvedCountryCode = phoneE164.slice(0, 3);
              resolvedNumber = phoneE164.slice(3);
            }
          } else {
            resolvedNumber = phoneE164;
          }
        }
        setCountryCode(resolvedCountryCode);
        setPhoneNo(resolvedNumber);
      } catch (error) {
        if (!active) return;
        console.error("[mfe-finance] Failed to load consumer detail for editing", error);
        setFormError(error instanceof Error ? error.message : "Could not load consumer details.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void loadCustomer();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!firstName.trim()) {
      setFormError("First name is required.");
      return;
    }

    if (!phoneNo.trim() && !email.trim()) {
      setFormError("Phone number or email is required.");
      return;
    }

    setSaving(true);
    try {
      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
      const normalizedPhone = phoneNo.trim().replace(/\s+/g, "");
      const normalizedCountryCode = countryCode.trim() || "+91";
      const phoneE164 = normalizedPhone ? `${normalizedCountryCode}${normalizedPhone}`.replace(/\s+/g, "") : undefined;
      const statusEnum = status === "ACTIVE" ? "Enabled" : "Disabled";

      const payload = {
        ...originalCustomer,
        consumerType: "TENANT_CONSUMER",
        title: title.trim() || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phoneNumber: normalizedPhone ? {
          countryCode: normalizedCountryCode,
          number: normalizedPhone,
        } : undefined,
        email: email.trim() || undefined,
        status,
        consumerSnapshot: {
          ...(originalCustomer?.consumerSnapshot ?? {}),
          title: title.trim() || undefined,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          displayName: displayName || firstName.trim(),
          statusEnum,
          phoneE164,
          email: email.trim() || undefined,
          gender,
          dob: dob || undefined,
          systemGeneratedDob: originalCustomer?.consumerSnapshot?.systemGeneratedDob ?? false,
          address: address.trim() || undefined,
          allowLogin: originalCustomer?.consumerSnapshot?.allowLogin ?? false,
          internationalConsumer: normalizedCountryCode !== "+91",
        },
      };

      await financeApi.customers.update(id, payload);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Update Consumer",
        message: "Consumer updated successfully.",
      });
      navigate(`/customers/${id}`);
    } catch (error) {
      console.error("[mfe-finance] Failed to update consumer", error);
      const msg = error instanceof Error ? error.message : "Could not update consumer.";
      setFormError(msg);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Update Consumer",
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Edit Consumer"
      subtitle="Edit a finance consumer using the finance consumer API."
      back={{ label: "Back to Consumer Details", href: `/customers/${id}` }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading consumer details...</div>
        ) : (
          <form className="grid gap-5 p-5 md:p-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                options={[
                  { value: "Mr", label: "Mr" },
                  { value: "Ms", label: "Ms" },
                  { value: "Mrs", label: "Mrs" },
                  { value: "Dr", label: "Dr" },
                ]}
                fullWidth
              />
              <Input label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="John" fullWidth />
              <Input label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Doe" fullWidth />
              <Select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                ]}
                fullWidth
              />
              <Select
                label="Gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                options={[
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                  { value: "OTHER", label: "Other" },
                ]}
                fullWidth
              />
              <div className="grid gap-4 grid-cols-[100px_1fr]">
                <Input label="Country Code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="+91" fullWidth />
                <Input label="Phone Number" value={phoneNo} onChange={(event) => setPhoneNo(event.target.value)} placeholder="9876543210" fullWidth />
              </div>
              <Input label="Date of Birth" type="date" value={dob} onChange={(event) => setDob(event.target.value)} fullWidth />
              <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="john@example.com" fullWidth />
            </div>

            <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Add address" />

            {formError ? (
              <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="flex justify-start gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/customers/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        )}
      </SectionCard>
    </PageShell>
  );
}
