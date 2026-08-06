import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
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

export function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      try {
        const response = await financeApi.customers.search<any>({
          page: 0,
          size: 200,
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
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    { key: "name", header: "Consumer Name", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: "phone", header: "Phone Number" },
    { key: "status", header: "Status" },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => navigate(row.uid)}>
          View
        </Button>
      ),
    },
  ], [navigate]);

  return (
    <PageShell
      title={`Finance Consumers (${customers.length})`}
      subtitle="Manage consumers available in the finance module."
      actions={<Button onClick={() => navigate("create")}>Create Consumer</Button>}
    >
      <DataTableCard
        actions={
          <FinanceFilterButton testId="finance-consumers-filter" />
        }
        data={customers}
        columns={columns}
        loading={loading}
        emptyTitle="No finance consumers found"
        emptyDescription="Finance consumers will appear here once available from the finance consumer API."
        getRowId={(row) => row.uid}
      />
    </PageShell>
  );
}

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [locations, setLocations] = useState<Array<{ value: string; label: string }>>([]);
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

  function buildMasterInvoicePayload(baseInvoice: any, linkedInvoiceUids: string[]) {
    const nowIso = new Date().toISOString();
    const resolvedLocationId = locationFilter !== "ALL"
      ? locationFilter
      : baseInvoice?.locationId ?? baseInvoice?.locationUid;
    return sanitizeFinancePayload({
      tenantId: baseInvoice?.tenantId ?? baseInvoice?.tenantUid,
      locationId: resolvedLocationId,
      sourceService: "FINANCE_SERVICE",
      sourceServiceCategory: "FINANCE",
      invoiceDate: nowIso,
      createdDate: nowIso,
      dueDate: baseInvoice?.dueDate ?? nowIso,
      consumerType: baseInvoice?.consumerType ?? "TENANT_CONSUMER",
      consumerUid: baseInvoice?.consumerUid ?? id,
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
        setLocations(
          rawLocations
            .map((item: any) => ({
              value: String(item.uid ?? item.locationUid ?? item.id ?? ""),
              label: String(item.locationName ?? item.name ?? item.displayName ?? "").trim(),
            }))
            .filter((item: { value: string; label: string }) => item.value && item.label)
        );

        const customerData = customerResponse.data ?? {};
        const payload = extractInvoiceRecords(invoiceResponse.data);
        const firstInvoiceRecord = payload?.[0] ?? {};
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
          locationName: String(customerData.locationName ?? firstInvoiceRecord.locationName ?? firstInvoiceRecord.location ?? "-").trim(),
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
          locationId: String(item.locationId || item.locationUid || ""),
          locationUid: String(item.locationUid || ""),
          locationName: String(item.locationName || item.location || ""),
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
        navigate(`/finance/master-invoice/${masterInvoiceUid}`);
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
        render: (row) => (
          <Button variant="outline" size="sm" onClick={() => navigate(`/invoice/view/${row.detailUid || row.id}`)}>
            View
          </Button>
        ),
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
        <Button onClick={() => navigate(`/invoice/newInvoice?consumerUid=${id}`)}>
          Create Invoice
        </Button>
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
  const navigate = useNavigate();
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [consumerType, setConsumerType] = useState("NONE");
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
        consumerType,
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

      navigate("..", { relative: "path", replace: true });
    } catch (error) {
      console.error("[mfe-finance] Failed to create consumer", error);
      setFormError(error instanceof Error ? error.message : "Could not create consumer.");
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
            <Select
              label="Consumer Type"
              value={consumerType}
              onChange={(event) => setConsumerType(event.target.value)}
              options={[{ value: "NONE", label: "None" }]}
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
