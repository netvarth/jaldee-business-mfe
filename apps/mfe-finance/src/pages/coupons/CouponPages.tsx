import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Icon, Input, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";
type CouponStatus="ACTIVE"|"INACTIVE"|"RETIRED";

export function CouponsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCoupons() {
    setLoading(true);
    try {
      const res = await financeApi.coupons.list<any>({ from: 0, count: 100 });
      const payload = res.data?.content || res.data?.data?.content || res.data?.data || res.data || [];
      const records = Array.isArray(payload) ? payload : [];
      setCoupons(records.map((item: any, index: number) => ({
        uid: String(item.uid ?? item.couponId ?? item.id ?? `coupon-${index}`),
        code: String(item.couponCode ?? item.code ?? item.name ?? `COUPON-${index + 1}`),
        name: String(item.name ?? item.displayName ?? item.couponCode ?? item.code ?? "Coupon"),
        feature: String(item.feature ?? item.featureModule ?? item.module ?? "FINANCE"),
        calculationType: String(item.calculationType ?? "FIXED_AMOUNT"),
        discountType: String(item.discountType ?? "PREDEFINED"),
        discountValue: Number(item.discountValue ?? item.discount ?? item.value ?? item.amount ?? 0),
        status: String(
          item.published === true
            ? "PUBLISHED"
            : item.couponStatus ?? item.status ?? "INACTIVE"
        ),
        published: Boolean(item.published ?? item.isPublished ?? false),
      })));
    } catch (error) {
      console.error("Failed to fetch coupons", error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "code", header: "Coupon Code" },
      { key: "name", header: "Coupon Name" },
      { key: "feature", header: "Feature" },
      { key: "calculationType", header: "Calculation Type" },
      { key: "discountType", header: "Coupon Type" },
      { key: "discountValue", header: "Value", align: "right", render: (row) => String(row.discountValue ?? 0) },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge
            variant={
              row.status === "ACTIVE"
                ? "success"
                : row.status === "PUBLISHED"
                  ? "info"
                  : "neutral"
            }
          >
            {row.status || "INACTIVE"}
          </Badge>
        ),
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
              trigger={(
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Coupon actions"
                />
              )}
            >
              <div className="grid min-w-[220px] p-1">
                {!row.published ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={async () => {
                      const nextStatus: CouponStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                      try {
                        await financeApi.coupons.updateStatus(row.uid, nextStatus);
                        await loadCoupons();
                      } catch (error) {
                        console.error("Failed to update coupon status", error);
                        alert("Failed to update coupon status");
                      }
                    }}
                  >
                    {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                ) : null}
                {!row.published ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={async () => {
                      try {
                        await financeApi.coupons.publish(row.uid, row);
                        await loadCoupons();
                      } catch (error) {
                        console.error("Failed to publish coupon", error);
                        alert("Failed to publish coupon");
                      }
                    }}
                  >
                    Publish Coupon
                  </Button>
                ) : null}
                {row.status !== "RETIRED" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal text-rose-600"
                    onClick={async () => {
                      try {
                        await financeApi.coupons.remove(row.uid);
                        await loadCoupons();
                      } catch (error) {
                        console.error("Failed to remove coupon", error);
                        alert("Failed to remove coupon");
                      }
                    }}
                  >
                    Remove Coupon
                  </Button>
                ) : null}
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
      title="Coupons"
      subtitle="Manage finance coupons used in invoice and billing flows."
      actions={<Button onClick={() => navigate("create")}>Create Coupon</Button>}
      main={(
        <DataTableCard
          title="Coupon List"
          subtitle="Available finance coupons."
          data={coupons}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No coupons"
          emptyDescription={loading ? "Loading..." : "Coupons will appear here."}
        />
      )}
    />
  );
}

export function CouponCreatePage() {
  const navigate = useNavigate();
  const navigateToCouponList = () => navigate("..", { relative: "path", replace: true });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("FINANCE");
  const [subFeature, setSubFeature] = useState("BASE_CRM");
  const [featureModule, setFeatureModule] = useState("BASE_CRM_CORE");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [amount, setAmount] = useState("");
  const [maxDiscountValue, setMaxDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("2026-07-29");
  const [endDate, setEndDate] = useState("2026-07-29");
  const [termsConditions, setTermsConditions] = useState("");
  const [timezone, setTimezone] = useState("Asia/Calcutta");
  const [status, setStatus] = useState<CouponStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!code.trim()) {
      setFormError("Coupon code is required.");
      return;
    }
    if (!name.trim()) {
      setFormError("Coupon name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.coupons.create({
        couponCode: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        amount: Number(amount) || 0,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        maxDiscountValue: Number(maxDiscountValue || amount) || 0,
        termsConditions: termsConditions.trim() || undefined,
        timezone: timezone.trim() || "Asia/Calcutta",
        sourceService: "API_GATEWAY",
        feature,
        subFeature,
        featureModule,
        calculationType,
        discountType,
        status,
        rules: [],
      });
      navigateToCouponList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create coupon", error);
      setFormError(error instanceof Error ? error.message : "Could not create coupon.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Coupon"
      subtitle="Add a finance coupon using the tenant coupons API."
      back={{ label: "Back to Coupons", href: "/coupons" }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Coupon Code *" value={code} onChange={(event) => setCode(event.target.value)} required />
            <Input label="Coupon Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Input label="Max Discount Value" type="number" min="0" step="0.01" value={maxDiscountValue} onChange={(event) => setMaxDiscountValue(event.target.value)} />
            <Input label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
              options={[
                { value: "FINANCE", label: "Finance" },
                { value: "BASE_CRM", label: "Base CRM" },
              ]}
            />
            <Input label="Sub Feature" value={subFeature} onChange={(event) => setSubFeature(event.target.value)} />
            <Input label="Feature Module" value={featureModule} onChange={(event) => setFeatureModule(event.target.value)} />
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
              label="Coupon Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as CouponStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Textarea label="Terms & Conditions" value={termsConditions} onChange={(event) => setTermsConditions(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/coupons")}>
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

export function CouponEditPage() {
  const navigate = useNavigate();
  const navigateToCouponList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("FINANCE");
  const [subFeature, setSubFeature] = useState("BASE_CRM");
  const [featureModule, setFeatureModule] = useState("BASE_CRM_CORE");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [amount, setAmount] = useState("");
  const [maxDiscountValue, setMaxDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("2026-07-29");
  const [endDate, setEndDate] = useState("2026-07-29");
  const [termsConditions, setTermsConditions] = useState("");
  const [timezone, setTimezone] = useState("Asia/Calcutta");
  const [status, setStatus] = useState<CouponStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadCoupon() {
      if (!id) return;
      try {
        const res = await financeApi.coupons.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setCode(String(data.couponCode ?? data.code ?? ""));
          setName(String(data.name ?? ""));
          setDescription(String(data.description ?? ""));
          setFeature(String(data.feature ?? "FINANCE"));
          setSubFeature(String(data.subFeature ?? "BASE_CRM"));
          setFeatureModule(String(data.featureModule ?? "BASE_CRM_CORE"));
          setCalculationType((data.calculationType || "FIXED_AMOUNT") as DiscountCalculationType);
          setDiscountType((data.discountType || "PREDEFINED") as DiscountType);
          setAmount(String(data.amount ?? data.discountValue ?? data.discount ?? data.value ?? 0));
          setMaxDiscountValue(String(data.maxDiscountValue ?? data.amount ?? data.discountValue ?? 0));
          setStartDate(typeof data.startDate === "string" && data.startDate ? data.startDate.slice(0, 10) : "2026-07-29");
          setEndDate(typeof data.endDate === "string" && data.endDate ? data.endDate.slice(0, 10) : "2026-07-29");
          setTermsConditions(String(data.termsConditions ?? ""));
          setTimezone(String(data.timezone ?? "Asia/Calcutta"));
          setStatus((data.couponStatus || data.status || "ACTIVE") as CouponStatus);
        }
      } catch (error) {
        console.error("Failed to load coupon", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCoupon();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!code.trim()) {
      setFormError("Coupon code is required.");
      return;
    }
    if (!name.trim()) {
      setFormError("Coupon name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.coupons.update(id!, {
        couponCode: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        amount: Number(amount) || 0,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        maxDiscountValue: Number(maxDiscountValue || amount) || 0,
        termsConditions: termsConditions.trim() || undefined,
        timezone: timezone.trim() || "Asia/Calcutta",
        sourceService: "API_GATEWAY",
        feature,
        subFeature,
        featureModule,
        calculationType,
        discountType,
        rules: [],
      });
      navigateToCouponList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update coupon", error);
      setFormError(error instanceof Error ? error.message : "Could not update coupon.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading coupon...</div>;
  }

  return (
    <PageShell
      title="Edit Coupon"
      subtitle="Update coupon details for invoice use."
      back={{ label: "Back to Coupons", href: "/coupons" }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Coupon Code *" value={code} onChange={(event) => setCode(event.target.value)} required />
            <Input label="Coupon Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Input label="Max Discount Value" type="number" min="0" step="0.01" value={maxDiscountValue} onChange={(event) => setMaxDiscountValue(event.target.value)} />
            <Input label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
              options={[
                { value: "FINANCE", label: "Finance" },
                { value: "BASE_CRM", label: "Base CRM" },
              ]}
            />
            <Input label="Sub Feature" value={subFeature} onChange={(event) => setSubFeature(event.target.value)} />
            <Input label="Feature Module" value={featureModule} onChange={(event) => setFeatureModule(event.target.value)} />
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
              label="Coupon Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as CouponStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Textarea label="Terms & Conditions" value={termsConditions} onChange={(event) => setTermsConditions(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/coupons")}>
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
