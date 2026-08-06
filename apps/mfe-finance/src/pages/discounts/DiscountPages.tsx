import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Icon, Input, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";
type DiscountCalculationType="FIXED_AMOUNT"|"FIXED_PCT";type DiscountType="PREDEFINED"|"ONDEMAND";type DiscountStatus="ACTIVE"|"INACTIVE"|"RETIRED";

export function DiscountsPage() {
  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDiscounts() {
    setLoading(true);
    try {
      const res = await financeApi.discounts.list<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
      });
      const payload = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data?.data?.content)
          ? res.data.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];
      setDiscounts(payload);
    } catch (error) {
      console.error("Failed to fetch discounts", error);
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiscounts();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Discount Name" },
      { key: "calculationType", header: "Calculation Type" },
      { key: "discountType", header: "Discount Type" },
      { key: "discountValue", header: "Value", align: "right", render: (row) => String(row.discountValue ?? 0) },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "ACTIVE" ? "success" : row.status === "RETIRED" ? "warning" : "neutral"}>{row.status || "INACTIVE"}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Discount actions"
                />
              }
            >
              <div className="grid min-w-[220px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    const nextStatus: DiscountStatus =
                      row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                    try {
                      await financeApi.discounts.updateStatus(row.uid, nextStatus);
                      loadDiscounts();
                    } catch (error) {
                      console.error("Failed to update discount status", error);
                      alert("Failed to update discount status");
                    }
                  }}
                >
                  {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal text-rose-600"
                  onClick={async () => {
                    try {
                      await financeApi.discounts.remove(row.uid);
                      loadDiscounts();
                    } catch (error) {
                      console.error("Failed to retire discount", error);
                      alert("Failed to retire discount");
                    }
                  }}
                >
                  Retire Discount
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Discounts"
      subtitle="Manage finance discounts used in invoices and item-level discount application."
      actions={<Button onClick={() => navigate("create")}>Create Discount</Button>}
      main={
        <DataTableCard
          title="Discount List"
          subtitle="Available finance discounts."
          data={discounts}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No discounts"
          emptyDescription={loading ? "Loading..." : "Discounts will appear here."}
        />
      }
    />
  );
}

export function DiscountCreatePage() {
  const navigate = useNavigate();
  const mfeProps = useMFEProps();
  const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
  const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
  const navigateToDiscountList = () => navigate("..", { relative: "path", replace: true });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [discountValue, setDiscountValue] = useState("");
  const [status, setStatus] = useState<DiscountStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Discount name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.discounts.create({
        tenantUid: tenantUid || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        calculationType,
        discountType,
        discountValue: Number(discountValue) || 0,
        discountedAmount: Number(discountValue) || 0,
        status,
      });
      navigateToDiscountList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create discount", error);
      setFormError(error instanceof Error ? error.message : "Could not create discount.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Discount"
      subtitle="Add a finance discount for invoice and item-level application."
      back={{ label: "Back to Discounts", href: "/discount" }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Discount Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Value" type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
            <Select
              label="Calculation Type"
              value={calculationType}
              onChange={(event) => setCalculationType(event.target.value as DiscountCalculationType)}
              options={[
                { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                { value: "FIXED_PCT", label: "Fixed Percentage" },
              ]}
            />
            <Select
              label="Discount Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as DiscountStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/discount")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export function DiscountEditPage() {
  const navigate = useNavigate();
  const mfeProps = useMFEProps();
  const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
  const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
  const navigateToDiscountList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [discountValue, setDiscountValue] = useState("");
  const [status, setStatus] = useState<DiscountStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDiscount() {
      if (!id) return;
      try {
        const res = await financeApi.discounts.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setName(String(data.name || ""));
          setDescription(String(data.description || ""));
          setCalculationType((data.calculationType || "FIXED_AMOUNT") as DiscountCalculationType);
          setDiscountType((data.discountType || "PREDEFINED") as DiscountType);
          setDiscountValue(String(data.discountValue ?? data.discountedAmount ?? 0));
          setStatus((data.status || "ACTIVE") as DiscountStatus);
        }
      } catch (error) {
        console.error("Failed to load discount", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDiscount();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Discount name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.discounts.update(id!, {
        uid: id,
        tenantUid: tenantUid || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        calculationType,
        discountType,
        discountValue: Number(discountValue) || 0,
        discountedAmount: Number(discountValue) || 0,
        status,
      });
      navigateToDiscountList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update discount", error);
      setFormError(error instanceof Error ? error.message : "Could not update discount.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading discount...</div>;
  }

  return (
    <PageShell
      title="Edit Discount"
      subtitle="Update discount details for invoice use."
      back={{ label: "Back to Discounts", href: "/discount" }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Discount Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Value" type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
            <Select
              label="Calculation Type"
              value={calculationType}
              onChange={(event) => setCalculationType(event.target.value as DiscountCalculationType)}
              options={[
                { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                { value: "FIXED_PCT", label: "Fixed Percentage" },
              ]}
            />
            <Select
              label="Discount Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as DiscountStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/discount")}>
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
