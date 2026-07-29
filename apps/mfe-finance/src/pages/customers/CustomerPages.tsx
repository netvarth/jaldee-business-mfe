import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { DataTableCard, FinanceFilterButton, PageShell } from "../../components/FinancePageLayout";

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
  ], []);

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
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-4 md:max-w-2xl" onSubmit={handleSubmit}>
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
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="John" fullWidth />
            <Input label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Doe" fullWidth />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
          <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
            <Input label="Country Code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="+91" fullWidth />
            <Input label="Phone Number" value={phoneNo} onChange={(event) => setPhoneNo(event.target.value)} placeholder="9876543210" fullWidth />
          </div>
          <Input label="Date of Birth" type="date" value={dob} onChange={(event) => setDob(event.target.value)} fullWidth />
          <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="john@example.com" fullWidth />
          <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Add address" />
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating" : "Create Consumer"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}
