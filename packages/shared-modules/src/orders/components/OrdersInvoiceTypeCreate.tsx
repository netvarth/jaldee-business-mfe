import { FormEvent, useEffect, useState } from "react";
import { Button, Icon, Input, SectionCard, Switch } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useCreateOrdersInvoiceType, useOrdersInvoiceTypeDetail, useUpdateOrdersInvoiceType } from "../queries/orders";
import { SharedOrdersLayout } from "./shared";

export function OrdersInvoiceTypeCreate() {
  const { basePath, routeParams } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  // Support both path-based and query-based parameters
  const queryParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const queryAction = queryParams.get("action");
  const queryUid = queryParams.get("uid");

  const subview = routeParams?.subview || queryAction || "create";
  const recordId = routeParams?.recordId || queryUid;

  const isEdit = subview === "edit" && Boolean(recordId);
  const isView = subview === "view" && Boolean(recordId);

  const detailQuery = useOrdersInvoiceTypeDetail(recordId || null);
  const createMutation = useCreateOrdersInvoiceType();
  const updateMutation = useUpdateOrdersInvoiceType();

  const [form, setForm] = useState({
    name: "",
    prefix: "",
    suffix: "",
    enabled: true,
  });

  useEffect(() => {
    if (detailQuery.data) {
      const data = detailQuery.data;
      setForm({
        name: data.type === "-" ? "" : data.type,
        prefix: data.prefix === "-" ? "" : data.prefix,
        suffix: data.suffix === "-" ? "" : data.suffix,
        enabled:
          String(data.status).toLowerCase() === "enable" ||
          String(data.status).toLowerCase() === "enabled" ||
          String(data.status).toLowerCase() === "active",
      });
    }
  }, [detailQuery.data]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      orderInvoiceType: form.name,
      prefix: form.prefix,
      suffix: form.suffix,
      status: form.enabled ? "Enable" : "Disable",
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ uid: recordId!, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate(`${basePath}/invoice-types`);
    } catch (error) {
      console.error("Failed to save invoice type:", error);
    }
  };

  const loading = detailQuery.isLoading;
  const saving = createMutation.isPending || updateMutation.isPending;

  if (loading) {
    return (
      <SharedOrdersLayout title="Loading...">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="py-10 text-center text-slate-500 text-sm">Loading invoice type details...</div>
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  return (
    <SharedOrdersLayout title={isEdit ? "Edit Invoice Type" : isView ? "View Invoice Type" : "Create Invoice Type"}>
      <SectionCard className="max-w-2xl border-slate-200 shadow-sm" padding={true}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={isView}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">Prefix</label>
              <Input
                placeholder="Prefix"
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                disabled={isView}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">Suffix</label>
              <Input
                placeholder="Suffix"
                value={form.suffix}
                onChange={(e) => setForm({ ...form, suffix: e.target.value })}
                disabled={isView}
              />
            </div>

            <div className="rounded-xl border border-blue-50 bg-blue-50/30 p-4">
              <div className="text-sm text-slate-600">Invoice Number Preview:</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {form.prefix || "Prefix"}-- 001 --{form.suffix || "Suffix"}
              </div>
            </div>

            <div className="rounded-xl border border-blue-50 bg-blue-50/30 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">Status</div>
                  <div className="text-sm text-slate-500">Invoice Type is {form.enabled ? "Enabled" : "Disabled"}</div>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                  disabled={isView}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`${basePath}/invoice-types`)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            {!isView && (
              <Button
                type="submit"
                variant="primary"
                className="bg-indigo-900 hover:bg-indigo-950 min-w-[100px]"
                disabled={saving || !form.name.trim()}
              >
                {saving ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            )}
          </div>
        </form>
      </SectionCard>
    </SharedOrdersLayout>
  );
}
