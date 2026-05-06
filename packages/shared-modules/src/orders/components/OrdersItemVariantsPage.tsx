import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, Dialog, EmptyState, Input, Popover, PopoverSection, SectionCard, Select, Switch, Textarea, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersItemFormSettings } from "../queries/orders";
import { buildOrdersModuleHref } from "../services/orders";
import type { OrdersItemSettings, OrdersItemSettingsOption } from "../types";
import { SharedOrdersLayout } from "./shared";

type VariantSubviewKey =
  | "categories"
  | "groups"
  | "tags"
  | "types"
  | "manufacturers"
  | "units"
  | "compositions"
  | "hsn-codes"
  | "remarks";

type VariantViewConfig = {
  title: string;
  subtitle: string;
  settingsKey?: keyof OrdersItemSettings;
  emptyTitle: string;
  emptyDescription: string;
};

const variantViewConfig: Record<VariantSubviewKey, VariantViewConfig> = {
  categories: {
    title: "Categories",
    subtitle: "Manage item categories used by the item master.",
    settingsKey: "categories",
    emptyTitle: "No categories found",
    emptyDescription: "Categories will appear here when they are available.",
  },
  groups: {
    title: "Groups",
    subtitle: "Manage item groups used by the item master.",
    settingsKey: "groups",
    emptyTitle: "No groups found",
    emptyDescription: "Groups will appear here when they are available.",
  },
  tags: {
    title: "Tags",
    subtitle: "Tag configuration is not wired in this module yet.",
    emptyTitle: "Tags unavailable",
    emptyDescription: "This screen is reserved for tag management.",
  },
  types: {
    title: "Types",
    subtitle: "Manage item types used by the item master.",
    settingsKey: "types",
    emptyTitle: "No types found",
    emptyDescription: "Types will appear here when they are available.",
  },
  manufacturers: {
    title: "Manufacturers",
    subtitle: "Manage manufacturers used by the item master.",
    settingsKey: "manufacturers",
    emptyTitle: "No manufacturers found",
    emptyDescription: "Manufacturers will appear here when they are available.",
  },
  units: {
    title: "Units",
    subtitle: "Manage item units used by the item master.",
    settingsKey: "units",
    emptyTitle: "No units found",
    emptyDescription: "Units will appear here when they are available.",
  },
  compositions: {
    title: "Compositions",
    subtitle: "Manage item compositions used by the item master.",
    settingsKey: "compositions",
    emptyTitle: "No compositions found",
    emptyDescription: "Compositions will appear here when they are available.",
  },
  "hsn-codes": {
    title: "HSN Codes",
    subtitle: "Manage HSN codes used by the item master.",
    settingsKey: "hsn",
    emptyTitle: "No HSN codes found",
    emptyDescription: "HSN codes will appear here when they are available.",
  },
  remarks: {
    title: "Remarks",
    subtitle: "Manage remark settings used by the item master.",
    emptyTitle: "No remarks found",
    emptyDescription: "Remarks will appear here when they are available.",
  },
};

const columns: ColumnDef<{ id: string; label: string }>[] = [
  { key: "label", header: "Name", sortable: true },
  { key: "id", header: "Code", sortable: true },
];

export function OrdersItemVariantsPage() {
  const { basePath, product, routeParams } = useSharedModulesContext();
  const subview = routeParams?.subview as VariantSubviewKey | null;
  const config = subview ? variantViewConfig[subview] : null;
  const backHref = buildOrdersModuleHref(basePath, product, "dashboard");
  const usesStandaloneDataSource =
    subview === "tags" ||
    subview === "remarks" ||
    subview === "hsn-codes" ||
    subview === "types" ||
    subview === "manufacturers" ||
    subview === "units" ||
    subview === "compositions";
  const settingsQuery = useOrdersItemFormSettings({ enabled: !usesStandaloneDataSource });

  if (!config) {
    return (
      <SharedOrdersLayout title="Item Variants" subtitle="Choose a variant section from the dashboard modal." backHref={backHref} backLabel="Dashboard">
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState title="Variant page unavailable" description="Open one of the variant sections from the Item Variants chooser." />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if (!usesStandaloneDataSource && settingsQuery.isLoading) {
    return (
      <SharedOrdersLayout title={config.title} subtitle={config.subtitle} backHref={backHref} backLabel="Dashboard">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500">Loading {config.title.toLowerCase()}...</div>
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if (!usesStandaloneDataSource && settingsQuery.isError) {
    return (
      <SharedOrdersLayout title={config.title} subtitle={config.subtitle} backHref={backHref} backLabel="Dashboard">
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState title={`${config.title} unavailable`} description="The settings data could not be loaded." />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if (subview === "tags") {
    return (
      <OrdersTagVariantsTable
        backHref={backHref}
        subtitle={config.subtitle}
        title={config.title}
      />
    );
  }

  if (subview === "remarks") {
    return (
      <OrdersRemarkVariantsTable
        backHref={backHref}
        subtitle={config.subtitle}
        title={config.title}
      />
    );
  }

  if (subview === "hsn-codes") {
    return (
      <OrdersHsnVariantsTable
        backHref={backHref}
        subtitle={config.subtitle}
        title={config.title}
      />
    );
  }

  if (!config.settingsKey) {
    return (
      <SharedOrdersLayout title={config.title} subtitle={config.subtitle} backHref={backHref} backLabel="Dashboard">
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState title={config.emptyTitle} description={config.emptyDescription} />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  const rows = settingsQuery.data?.[config.settingsKey] ?? [];

  if (subview === "categories") {
    return (
      <OrdersCategoryVariantsTable
        backHref={backHref}
        subtitle={config.subtitle}
        title={config.title}
        rows={rows}
      />
    );
  }

  if (subview === "groups") {
    return (
      <OrdersGroupVariantsTable
        backHref={backHref}
        subtitle={config.subtitle}
        title={config.title}
        rows={rows}
      />
    );
  }

  if (subview === "types") {
    return (
      <OrdersManagedSettingsTable
        backHref={backHref}
        title={config.title}
        subtitle={config.subtitle}
        countLabel="Types"
        searchPlaceholder="Search Type"
        endpoint="provider/spitem/settings/type"
        queryPath="provider/spitem/settings/type"
        queryParams={{ "status-eq": "Enable" }}
        initialRows={rows}
        fields={[
          { key: "name", payloadKey: "typeName", label: "Type Name*", type: "text", required: true },
        ]}
        columns={[
          { key: "name", header: "Type Name", width: "46%" },
          { key: "__status__", header: "Status", width: "24%" },
          { key: "__actions__", header: "Actions", width: "30%" },
        ]}
        mapRows={(items) =>
          items.map((item, index) => ({
            id: readTypeCode(item.raw, item.id || `type-${index + 1}`),
            raw: item.raw,
            values: {
              name: item.label || item.id || "-",
            },
          }))
        }
        buildPayload={(values, existing) => ({
          typeName: values.name,
          ...(existing ? { typeCode: readTypeCode(existing.raw, existing.id) } : {}),
        })}
        dialogTitle="Create Type"
        createLabel="Create Type"
        updateLabel="Update Type"
        invalidateOrdersOnSuccess={false}
      />
    );
  }

  if (subview === "manufacturers") {
    return (
      <OrdersManagedSettingsTable
        backHref={backHref}
        title={config.title}
        subtitle={config.subtitle}
        countLabel="Manufacturers"
        searchPlaceholder="Search Manufacturer"
        endpoint="provider/spitem/settings/manufacturer"
        queryPath="provider/spitem/settings/manufacturer"
        queryParams={{ "status-eq": "Enable" }}
        initialRows={rows}
        fields={[
          { key: "name", payloadKey: "manufacturerName", label: "Manufacturer Name*", type: "text", required: true },
        ]}
        columns={[
          { key: "name", header: "Manufacturer Name", width: "68%" },
          { key: "__status__", header: "Status", width: "16%" },
          { key: "__actions__", header: "Actions", width: "16%" },
        ]}
        mapRows={(items) =>
          items.map((item, index) => ({
            id: readManufacturerCode(item.raw, item.id || `manufacturer-${index + 1}`),
            raw: item.raw,
            values: {
              name: item.label || item.id || "-",
            },
          }))
        }
        buildPayload={(values, existing) => ({
          manufacturerName: values.name,
          ...(existing ? { manufacturerCode: readManufacturerCode(existing.raw, existing.id) } : {}),
        })}
        dialogTitle="Create Manufacturer"
        createLabel="Create Manufacturer"
        updateLabel="Update Manufacturer"
        invalidateOrdersOnSuccess={false}
      />
    );
  }

  if (subview === "compositions") {
    return (
      <OrdersManagedSettingsTable
        backHref={backHref}
        title={config.title}
        subtitle={config.subtitle}
        countLabel="Compositions"
        searchPlaceholder="Search Composition"
        endpoint="provider/spitem/settings/composition"
        queryPath="provider/spitem/settings/composition"
        initialRows={rows}
        fields={[
          { key: "name", payloadKey: "compositionName", label: "Composition Name*", type: "text", required: true },
        ]}
        columns={[
          { key: "name", header: "Composition Name", width: "68%" },
          { key: "__status__", header: "Status", width: "16%" },
          { key: "__actions__", header: "Actions", width: "16%" },
        ]}
        mapRows={(items) =>
          items.map((item, index) => ({
            id: readCompositionCode(item.raw, item.id || `composition-${index + 1}`),
            raw: item.raw,
            values: {
              name: item.label || item.id || "-",
            },
          }))
        }
        buildPayload={(values, existing) => ({
          compositionName: values.name,
          ...(existing ? { compositionCode: readCompositionCode(existing.raw, existing.id) } : {}),
        })}
        dialogTitle="Create Composition"
        createLabel="Create Composition"
        updateLabel="Update Composition"
        invalidateOrdersOnSuccess={false}
      />
    );
  }

  if (subview === "units") {
    return (
      <OrdersManagedSettingsTable
        backHref={backHref}
        title={config.title}
        subtitle={config.subtitle}
        countLabel="Units"
        searchPlaceholder="Search Unit"
        endpoint="provider/spitem/settings/unit"
        queryPath="provider/spitem/settings/unit"
        initialRows={rows}
        fields={[
          { key: "name", payloadKey: "unitName", label: "Unit Name*", type: "text", required: true },
          { key: "conversionQty", payloadKey: "unitConversionQty", label: "Unit Conversion Quantity*", type: "number", required: true },
        ]}
        columns={[
          { key: "name", header: "Unit Name", width: "34%" },
          { key: "conversionQty", header: "Conversion Qty", width: "28%" },
          { key: "__status__", header: "Status", width: "18%" },
          { key: "__actions__", header: "Actions", width: "20%" },
        ]}
        mapRows={(items) =>
          items.map((item, index) => ({
            id: readUnitCode(item.raw, item.id || `unit-${index + 1}`),
            raw: item.raw,
            values: {
              name: item.label || item.id || "-",
              conversionQty: readUnitConversionQty(item.raw),
            },
          }))
        }
        buildPayload={(values, existing) => ({
          unitName: values.name,
          convertionQty: values.conversionQty,
          ...(existing ? { unitCode: readUnitCode(existing.raw, existing.id) } : {}),
        })}
        dialogTitle="Create Unit"
        createLabel="Create Unit"
        updateLabel="Update Unit"
        invalidateOrdersOnSuccess={false}
      />
    );
  }

  if (subview === "hsn-codes") {
    return (
      <OrdersHsnVariantsTable
        backHref={backHref}
        subtitle={config.subtitle}
        title={config.title}
      />
    );
  }

  const mappedRows = rows.map(mapVariantSettingRow);

  return (
    <SharedOrdersLayout title={config.title} subtitle={config.subtitle} backHref={backHref} backLabel="Dashboard">
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-600">
          {mappedRows.length} {mappedRows.length === 1 ? "record" : "records"}
        </div>
        <DataTable
          data={mappedRows}
          columns={columns}
          emptyState={<EmptyState title={config.emptyTitle} description={config.emptyDescription} />}
        />
      </SectionCard>
    </SharedOrdersLayout>
  );
}

function mapVariantSettingRow(option: OrdersItemSettingsOption) {
  return {
    id: option.id || "-",
    label: option.label || "-",
  };
}

type OrdersCategoryVariantsTableProps = {
  backHref: string;
  subtitle: string;
  title: string;
  rows: OrdersItemSettingsOption[];
};

type OrdersGroupVariantsTableProps = {
  backHref: string;
  subtitle: string;
  title: string;
  rows: OrdersItemSettingsOption[];
};

type OrdersTagVariantsTableProps = {
  backHref: string;
  subtitle: string;
  title: string;
};

type OrdersRemarkVariantsTableProps = {
  backHref: string;
  subtitle: string;
  title: string;
};

type OrdersTypeVariantsTableProps = {
  backHref: string;
  subtitle: string;
  title: string;
};

type OrdersHsnVariantsTableProps = {
  backHref: string;
  subtitle: string;
  title: string;
};

type ManagedSettingField = {
  key: string;
  payloadKey: string;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

type ManagedSettingRow = {
  id: string;
  raw?: unknown;
  values: Record<string, string>;
};

type ManagedSettingColumn = {
  key: string;
  header: string;
  width?: string;
};

type OrdersManagedSettingsTableProps = {
  backHref: string;
  title: string;
  subtitle: string;
  countLabel: string;
  searchPlaceholder: string;
  endpoint: string;
  queryPath?: string;
  queryParams?: Record<string, unknown>;
  initialRows?: OrdersItemSettingsOption[];
  fields: ManagedSettingField[];
  columns: ManagedSettingColumn[];
  mapRows: (items: OrdersItemSettingsOption[]) => ManagedSettingRow[];
  buildPayload: (values: Record<string, string>, existing?: ManagedSettingRow | null) => Record<string, unknown>;
  dialogTitle: string;
  createLabel: string;
  updateLabel: string;
  invalidateOrdersOnSuccess?: boolean;
};

type CategoryVariantRow = {
  id: string;
  label: string;
  imageSeed: string;
  imageUrl: string;
  raw?: unknown;
  attachments: Record<string, unknown>[];
};

function OrdersCategoryVariantsTable({ backHref, subtitle, title, rows }: OrdersCategoryVariantsTableProps) {
  const { api, account } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const baseCategoryRows = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row.id || row.label || `category-${index + 1}`,
        label: row.label || row.id || "-",
        imageSeed: row.label || row.id || "Category",
        imageUrl: readCategoryImageUrl(row.raw),
        raw: row.raw,
        attachments: readCategoryAttachments(row.raw),
      })),
    [rows]
  );
  const [categoryRows, setCategoryRows] = useState<CategoryVariantRow[]>(baseCategoryRows);
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [imageDialogCategoryId, setImageDialogCategoryId] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState("");
  const [existingImageRemoved, setExistingImageRemoved] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategoryRows(baseCategoryRows);
  }, [baseCategoryRows]);

  useEffect(() => {
    setStatusMap((current) => {
      const next = { ...current };
      for (const row of categoryRows) {
        if (!(row.id in next)) {
          next[row.id] = true;
        }
      }
      return next;
    });
  }, [categoryRows]);

  useEffect(() => {
    return () => {
      if (pendingImagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pendingImagePreviewUrl);
      }
    };
  }, [pendingImagePreviewUrl]);

  const editingCategory = editingCategoryId ? categoryRows.find((row) => row.id === editingCategoryId) ?? null : null;
  const imageDialogCategory = imageDialogCategoryId ? categoryRows.find((row) => row.id === imageDialogCategoryId) ?? null : null;
  const currentImagePreview = pendingImagePreviewUrl || (!existingImageRemoved ? imageDialogCategory?.imageUrl || "" : "");
  const updateCategoryMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateOrderCategory(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const categoryColumns = useMemo<ColumnDef<CategoryVariantRow>[]>(
    () => [
      {
        key: "label",
        header: "Category Name",
        className: "py-5",
        render: (row) => (
            <div className="flex items-center gap-7">
            <CategoryThumbnail seed={row.imageSeed} imageUrl={row.imageUrl} />
            <div className="text-[16px] font-medium text-slate-800">{row.label}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "18%",
        className: "py-5",
        render: (row) => (
          <div className="flex justify-start">
            <Switch
              checked={statusMap[row.id] ?? true}
              onChange={(checked) =>
                setStatusMap((current) => ({
                  ...current,
                  [row.id]: checked,
                }))
              }
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "18%",
        className: "py-5",
        render: (row) => (
          <Popover
            open={openActionId === row.id}
            onOpenChange={(open) => setOpenActionId(open ? row.id : null)}
            align="start"
            contentClassName="min-w-[196px] rounded-lg p-2"
            trigger={
              <Button type="button" variant="outline" size="sm">
                Actions
              </Button>
            }
          >
            <PopoverSection className="space-y-1">
              <button
                type="button"
                onClick={() => openUpdateCategoryDialog(row)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] text-slate-800 hover:bg-slate-50"
              >
                <EyeActionIcon />
                <span>Update</span>
              </button>
              <button
                type="button"
                onClick={() => openUpdateImageDialog(row)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] text-slate-800 hover:bg-slate-50"
              >
                <PencilActionIcon />
                <span>Update Image</span>
              </button>
            </PopoverSection>
          </Popover>
        ),
      },
    ],
    [openActionId, statusMap]
  );

  function openUpdateCategoryDialog(row: CategoryVariantRow) {
    setOpenActionId(null);
    setEditingCategoryId(row.id);
    setEditingCategoryName(row.label);
  }

  function closeUpdateCategoryDialog() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setDialogError("");
  }

  async function saveCategoryName() {
    if (!editingCategory || !editingCategoryName.trim()) return;
    setDialogError("");

    try {
      await updateCategoryMutation.mutateAsync({
        categoryName: editingCategoryName.trim(),
        categoryCode: readCategoryCode(editingCategory.raw, editingCategory.id),
      });
      setCategoryRows((current) =>
        current.map((row) =>
          row.id === editingCategory.id
            ? { ...row, label: editingCategoryName.trim(), imageSeed: editingCategoryName.trim() }
            : row
        )
      );
      closeUpdateCategoryDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to update category.");
    }
  }

  function openUpdateImageDialog(row: CategoryVariantRow) {
    setOpenActionId(null);
    if (pendingImagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImagePreviewUrl);
    }
    setPendingImagePreviewUrl("");
    setPendingImageFile(null);
    setExistingImageRemoved(false);
    setDialogError("");
    setImageDialogCategoryId(row.id);
  }

  function closeUpdateImageDialog() {
    if (pendingImagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImagePreviewUrl);
    }
    setImageDialogCategoryId(null);
    setPendingImageFile(null);
    setPendingImagePreviewUrl("");
    setExistingImageRemoved(false);
    setDialogError("");
  }

  function handlePickImageFile(file: File | null) {
    if (!file) return;
    if (pendingImagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImagePreviewUrl);
    }
    setPendingImageFile(file);
    setPendingImagePreviewUrl(URL.createObjectURL(file));
  }

  async function saveCategoryImage() {
    if (!imageDialogCategory) return;
    setDialogError("");

    try {
      const nextAttachments: Record<string, unknown>[] = [];
      const currentAttachment = imageDialogCategory.attachments[0];

      if (currentAttachment && (existingImageRemoved || pendingImageFile)) {
        nextAttachments.push({ ...currentAttachment, action: "remove" });
      }

      if (pendingImageFile) {
        const uploadedAttachment = await uploadCategoryImageAttachment(
          api,
          String((account as { id?: string | number | null })?.id ?? ""),
          pendingImageFile,
          nextAttachments.length
        );
        nextAttachments.push(uploadedAttachment);
      }

      await updateCategoryMutation.mutateAsync({
        categoryName: imageDialogCategory.label,
        categoryCode: readCategoryCode(imageDialogCategory.raw, imageDialogCategory.id),
        attachments: nextAttachments,
      });

      setCategoryRows((current) =>
        current.map((row) =>
          row.id === imageDialogCategory.id
            ? {
                ...row,
                imageUrl: existingImageRemoved && !pendingImagePreviewUrl ? "" : currentImagePreview,
                attachments: nextAttachments
                  .filter((attachment) => attachment.action !== "remove")
                  .map((attachment) => ({
                    ...attachment,
                    s3path:
                      typeof attachment.s3path === "string" && attachment.s3path.trim()
                        ? attachment.s3path
                        : existingImageRemoved && !pendingImagePreviewUrl
                          ? ""
                          : currentImagePreview,
                  })),
              }
            : row
        )
      );
      closeUpdateImageDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to update category image.");
    }
  }

  function removeCategoryImage() {
    if (!imageDialogCategoryId) return;
    if (pendingImagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImagePreviewUrl);
    }
    setPendingImageFile(null);
    setPendingImagePreviewUrl("");
    setExistingImageRemoved(true);
  }

  return (
    <SharedOrdersLayout title={title} subtitle={subtitle} backHref={backHref} backLabel="Dashboard">
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <DataTable
          data={categoryRows}
          columns={categoryColumns}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="text-base"
          emptyState={<EmptyState title="No categories found" description="Categories will appear here when they are available." />}
        />
      </SectionCard>

      <Dialog
        open={Boolean(editingCategory)}
        onClose={closeUpdateCategoryDialog}
        title="Create Category"
        description=""
        size="lg"
        contentClassName="max-w-[670px] rounded-xl px-7 py-9"
        closeIcon={<DialogCloseIcon />}
        closeButtonClassName="text-slate-500 hover:bg-transparent"
      >
        <div className="space-y-8">
          <Input
            id="orders-category-name"
            label="Category Name*"
            value={editingCategoryName}
            onChange={(event) => setEditingCategoryName(event.target.value)}
            className="h-[50px]"
          />
          {dialogError ? <div className="text-sm text-red-600">{dialogError}</div> : null}
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={saveCategoryName} disabled={!editingCategoryName.trim()} loading={updateCategoryMutation.isPending}>
              Update Category
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(imageDialogCategory)}
        onClose={closeUpdateImageDialog}
        title={imageDialogCategory?.imageUrl || pendingImagePreviewUrl ? "Update Category Image" : "Add Category Image"}
        description=""
        size="lg"
        contentClassName="max-w-[670px] rounded-xl px-7 py-9"
        closeIcon={<DialogCloseIcon />}
        closeButtonClassName="text-slate-500 hover:bg-transparent"
      >
        <div className="rounded-xl border border-slate-100 bg-white px-7 py-10 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-[190px] w-[220px] items-center justify-center overflow-hidden rounded-md border border-slate-100 bg-white shadow-sm">
              {currentImagePreview ? (
                <img src={currentImagePreview} alt={imageDialogCategory?.label ?? "Category"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-200">
                  <ImagePlaceholderLargeIcon />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (currentImagePreview) {
                    removeCategoryImage();
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-md hover:bg-slate-50"
                aria-label={currentImagePreview ? "Remove image" : "Choose image"}
              >
                {currentImagePreview ? <TrashActionIcon /> : <PencilActionIcon />}
              </button>
            </div>

            <div className="mt-8 max-w-[470px] text-[18px] font-semibold leading-8 text-slate-400">
              Set the product thumbnail image. Only *.png, *.jpg and *.jpeg image files are accepted
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="hidden"
              onChange={(event) => handlePickImageFile(event.target.files?.[0] ?? null)}
            />

            <div className="mt-7">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={updateCategoryMutation.isPending}>
                Upload
              </Button>
            </div>

            {pendingImageFile ? (
              <div className="mt-4 text-sm text-slate-500">{pendingImageFile.name}</div>
            ) : null}
            {dialogError ? <div className="mt-4 text-sm text-red-600">{dialogError}</div> : null}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="primary"
            onClick={saveCategoryImage}
            disabled={!pendingImageFile && !existingImageRemoved}
            loading={updateCategoryMutation.isPending}
          >
            Save Image
          </Button>
        </div>
      </Dialog>
    </SharedOrdersLayout>
  );
}

type GroupVariantRow = {
  id: string;
  label: string;
  raw?: unknown;
};

function OrdersGroupVariantsTable({ backHref, subtitle, title, rows }: OrdersGroupVariantsTableProps) {
  const { api } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const baseGroupRows = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row.id || row.label || `group-${index + 1}`,
        label: row.label || row.id || "-",
        raw: row.raw,
      })),
    [rows]
  );
  const [groupRows, setGroupRows] = useState<GroupVariantRow[]>(baseGroupRows);
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    setGroupRows(baseGroupRows);
  }, [baseGroupRows]);

  useEffect(() => {
    setStatusMap((current) => {
      const next = { ...current };
      for (const row of groupRows) {
        if (!(row.id in next)) {
          next[row.id] = true;
        }
      }
      return next;
    });
  }, [groupRows]);

  const saveGroupMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (payload.id) {
        return updateOrderGroup(api, payload);
      }
      return createOrderGroup(api, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groupRows;
    return groupRows.filter((row) => row.label.toLowerCase().includes(normalized));
  }, [groupRows, query]);

  const editingGroup = editingGroupId ? groupRows.find((row) => row.id === editingGroupId) ?? null : null;

  const groupColumns = useMemo<ColumnDef<GroupVariantRow>[]>(
    () => [
      {
        key: "label",
        header: "Group Name",
        className: "py-5",
        render: (row) => <div className="text-[16px] font-medium text-slate-800">{row.label}</div>,
      },
      {
        key: "status",
        header: "Status",
        width: "22%",
        className: "py-5",
        render: (row) => (
          <div className="flex justify-start">
            <Switch
              checked={statusMap[row.id] ?? true}
              onChange={(checked) =>
                setStatusMap((current) => ({
                  ...current,
                  [row.id]: checked,
                }))
              }
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "26%",
        className: "py-5",
        render: (row) => (
          <Button type="button" variant="primary" size="sm" onClick={() => openGroupDialog(row)}>
            Update
          </Button>
        ),
      },
    ],
    [statusMap]
  );

  function openGroupDialog(row?: GroupVariantRow) {
    setDialogError("");
    setEditingGroupId(row?.id ?? "create");
    setGroupName(row?.label ?? "");
  }

  function closeGroupDialog() {
    setEditingGroupId(null);
    setGroupName("");
    setDialogError("");
  }

  async function saveGroup() {
    const trimmedName = groupName.trim();
    if (!trimmedName) return;

      try {
        const payload = editingGroup && editingGroup.id !== "create"
          ? {
              groupName: trimmedName,
              id: readGroupId(editingGroup.raw, editingGroup.id),
            }
          : {
              groupName: trimmedName,
            };

        const result = await saveGroupMutation.mutateAsync(payload);
      const nextId = readGroupId(result, trimmedName) || (editingGroup && editingGroup.id !== "create" ? editingGroup.id : trimmedName);

      setGroupRows((current) => {
        if (editingGroup && editingGroup.id !== "create") {
          return current.map((row) =>
            row.id === editingGroup.id
              ? { ...row, id: nextId, label: trimmedName, raw: result ?? row.raw }
              : row
          );
        }

        return [
          {
            id: nextId,
            label: trimmedName,
            raw: result ?? payload,
          },
          ...current,
        ];
      });
      closeGroupDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to save group.");
    }
  }

  return (
    <SharedOrdersLayout
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel="Dashboard"
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => openGroupDialog()}>
          + Create
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-5 py-6">
          <div className="mb-6 text-[18px] font-semibold text-slate-900">Groups ({groupRows.length})</div>
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-[330px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Group"
                className="h-[42px] w-full rounded-[6px] border border-slate-300 bg-white pl-4 pr-14 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="absolute right-0 top-0 flex h-[42px] w-14 items-center justify-center rounded-r-[6px] bg-slate-100 text-white">
                <SearchIcon />
              </div>
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center text-indigo-700" aria-label="Filter groups">
              <FilterIcon />
            </button>
          </div>
        </div>
        <DataTable
          data={filteredRows}
          columns={groupColumns}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="text-base"
          emptyState={<EmptyState title="No groups found" description="Groups will appear here when they are available." />}
        />
      </SectionCard>

      <Dialog
        open={Boolean(editingGroupId)}
        onClose={closeGroupDialog}
        title={editingGroup && editingGroup.id !== "create" ? "Create Group" : "Create Group"}
        description=""
        size="lg"
        contentClassName="max-w-[670px] rounded-xl px-7 py-9"
        closeIcon={<DialogCloseIcon />}
        closeButtonClassName="text-slate-500 hover:bg-transparent"
      >
        <div className="space-y-8">
          <Input
            id="orders-group-name"
            label="Group Name*"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            className="h-[50px]"
          />
          {dialogError ? <div className="text-sm text-red-600">{dialogError}</div> : null}
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={saveGroup} disabled={!groupName.trim()} loading={saveGroupMutation.isPending}>
              {editingGroup && editingGroup.id !== "create" ? "Update Group" : "Create Group"}
            </Button>
          </div>
        </div>
      </Dialog>
    </SharedOrdersLayout>
  );
}

type TagVariantRow = {
  id: string;
  label: string;
  raw?: unknown;
};

function OrdersTagVariantsTable({ backHref, subtitle, title }: OrdersTagVariantsTableProps) {
  const { api, location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [dialogError, setDialogError] = useState("");

  const tagsQuery = useQuery({
    queryKey: ["orders", "tags", location?.id],
    enabled: Boolean(location?.id),
    queryFn: async () => {
      const response = await api.get<any>("provider/spitem/settings/tag");
      return mapTagOptions(response.data);
    },
  });

  const saveTagMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (payload.id) {
        return updateOrderTag(api, payload);
      }
      return createOrderTag(api, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "tags", location?.id] });
    },
  });

  const rows = tagsQuery.data ?? [];
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => row.label.toLowerCase().includes(normalized));
  }, [rows, query]);
  const editingTag = editingTagId ? rows.find((row) => row.id === editingTagId) ?? null : null;

  const tagColumns = useMemo<ColumnDef<TagVariantRow>[]>(
    () => [
      {
        key: "label",
        header: "Tag Name",
        className: "py-5",
        render: (row) => <div className="text-[16px] font-medium text-slate-800">{row.label}</div>,
      },
      {
        key: "actions",
        header: "Action",
        width: "42%",
        className: "py-5",
        render: (row) => (
          <Button type="button" variant="primary" size="sm" onClick={() => openTagDialog(row)}>
            Update
          </Button>
        ),
      },
    ],
    []
  );

  function openTagDialog(row?: TagVariantRow) {
    setDialogError("");
    setEditingTagId(row?.id ?? "create");
    setTagName(row?.label ?? "");
  }

  function closeTagDialog() {
    setEditingTagId(null);
    setTagName("");
    setDialogError("");
  }

  async function saveTag() {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    try {
      await saveTagMutation.mutateAsync(
        editingTag && editingTag.id !== "create"
          ? {
              tagName: trimmedName,
              id: readTagId(editingTag.raw, editingTag.id),
            }
          : {
              tagName: trimmedName,
            }
      );
      closeTagDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to save tag.");
    }
  }

  return (
    <SharedOrdersLayout
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel="Dashboard"
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => openTagDialog()}>
          + Create
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-5 py-6">
          <div className="mb-6 text-[18px] font-semibold text-slate-900">Tags ({rows.length})</div>
          <div className="relative w-full max-w-[360px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Tag"
              className="h-[42px] w-full rounded-[6px] border border-slate-300 bg-white pl-4 pr-14 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
            <div className="absolute right-0 top-0 flex h-[42px] w-14 items-center justify-center rounded-r-[6px] bg-indigo-600 text-white">
              <SearchIcon />
            </div>
          </div>
        </div>
        <DataTable
          data={filteredRows}
          columns={tagColumns}
          loading={tagsQuery.isLoading}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="text-base"
          emptyState={<EmptyState title="No tags found" description="Tags will appear here when they are available." />}
        />
      </SectionCard>

      <Dialog
        open={Boolean(editingTagId)}
        onClose={closeTagDialog}
        title="Create Tag"
        description=""
        size="lg"
        contentClassName="max-w-[670px] rounded-xl px-7 py-9"
        closeIcon={<DialogCloseIcon />}
        closeButtonClassName="text-slate-500 hover:bg-transparent"
      >
        <div className="space-y-8">
          <Input
            id="orders-tag-name"
            label="Tag Name*"
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            className="h-[50px]"
          />
          {dialogError ? <div className="text-sm text-red-600">{dialogError}</div> : null}
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={saveTag} disabled={!tagName.trim()} loading={saveTagMutation.isPending}>
              {editingTag && editingTag.id !== "create" ? "Update Tag" : "Create Tag"}
            </Button>
          </div>
        </div>
      </Dialog>
    </SharedOrdersLayout>
  );
}

type RemarkVariantRow = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  raw?: unknown;
};

function OrdersRemarkVariantsTable({ backHref, subtitle, title }: OrdersRemarkVariantsTableProps) {
  const { api } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({ namespace: "ordersItemVariantRemarks" });
  const [query, setQuery] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remarkName, setRemarkName] = useState("");
  const [remarkType, setRemarkType] = useState("Adjustment");
  const [dialogError, setDialogError] = useState("");

  const remarksQuery = useQuery({
    queryKey: ["orders", "inventory-remarks", page, pageSize],
    queryFn: async () => {
      const from = Math.max(0, (page - 1) * pageSize);
      const count = Math.max(1, pageSize);
      const params = { from, count };
      const [pageResponse, countResponse] = await Promise.all([
        api.get<any>("provider/inventory/remark", { params }),
        api.get<any>("provider/inventory/remark/count", { params }),
      ]);

      return {
        rows: mapRemarkOptions(pageResponse.data),
        total: Math.max(readVariantTotal(countResponse.data), readVariantTotal(pageResponse.data)),
      };
    },
  });

  const saveRemarkMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (payload.encId) {
        return api.put<any>("provider/inventory/remark", removeEmptyValues(payload)).then((response) => response.data);
      }
      return api.post<any>("provider/inventory/remark", removeEmptyValues(payload)).then((response) => response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "inventory-remarks"] });
    },
  });

  const rows = remarksQuery.data?.rows ?? [];
  const total = remarksQuery.data?.total ?? 0;
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => `${row.name} ${row.type}`.toLowerCase().includes(normalized));
  }, [rows, query]);
  const editingRemark = editingRemarkId ? rows.find((row) => row.id === editingRemarkId) ?? null : null;

  useEffect(() => {
    setStatusMap((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (!(row.id in next)) {
          next[row.id] = row.active;
        }
      }
      return next;
    });
  }, [rows]);

  const remarkColumns = useMemo<ColumnDef<RemarkVariantRow>[]>(
    () => [
      {
        key: "name",
        header: "Remark",
        width: "34%",
        className: "py-5",
        render: (row) => <div className="text-[16px] font-medium text-slate-800">{row.name}</div>,
      },
      {
        key: "type",
        header: "Type",
        width: "26%",
        className: "py-5",
        render: (row) => <div className="text-[16px] font-medium text-slate-800">{row.type}</div>,
      },
      {
        key: "status",
        header: "Status",
        width: "18%",
        className: "py-5",
        render: (row) => (
          <div className="flex justify-start">
            <Switch
              checked={statusMap[row.id] ?? true}
              onChange={(checked) =>
                setStatusMap((current) => ({
                  ...current,
                  [row.id]: checked,
                }))
              }
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "22%",
        className: "py-5",
        render: (row) => (
          <Button type="button" variant="primary" size="sm" onClick={() => openRemarkDialog(row)}>
            Update
          </Button>
        ),
      },
    ],
    [statusMap]
  );

  function openRemarkDialog(row?: RemarkVariantRow) {
    setDialogError("");
    setEditingRemarkId(row?.id ?? "create");
    setRemarkName(row?.name ?? "");
    setRemarkType(row?.type ?? "Adjustment");
  }

  function closeRemarkDialog() {
    setEditingRemarkId(null);
    setRemarkName("");
    setRemarkType("Adjustment");
    setDialogError("");
  }

  async function saveRemark() {
    const trimmedName = remarkName.trim();
    if (!trimmedName) return;

    try {
      await saveRemarkMutation.mutateAsync(
        editingRemark && editingRemark.id !== "create"
          ? {
              remark: trimmedName,
              encId: readRemarkEncId(editingRemark.raw, editingRemark.id),
              transactionTypeEnum: readRemarkTypeEnum(editingRemark.raw) || remarkType.toUpperCase(),
            }
          : {
              remark: trimmedName,
              transactionTypeEnum: remarkType.toUpperCase(),
            }
      );
      closeRemarkDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to save remark.");
    }
  }

  return (
    <SharedOrdersLayout
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel="Dashboard"
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => openRemarkDialog()}>
          + Create
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-5 py-6">
          <div className="mb-6 text-[18px] font-semibold text-slate-900">Remarks ({total})</div>
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-[330px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Remark"
                className="h-[42px] w-full rounded-[6px] border border-slate-300 bg-white pl-4 pr-14 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="absolute right-0 top-0 flex h-[42px] w-14 items-center justify-center rounded-r-[6px] bg-slate-100 text-white">
                <SearchIcon />
              </div>
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center text-indigo-700" aria-label="Filter remarks">
              <FilterIcon />
            </button>
          </div>
        </div>
        <DataTable
          data={filteredRows}
          columns={remarkColumns}
          loading={remarksQuery.isLoading}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="text-base"
          pagination={{
            page,
            pageSize,
            total,
            mode: "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={<EmptyState title="No remarks found" description="" />}
        />
      </SectionCard>

      <Dialog
        open={Boolean(editingRemarkId)}
        onClose={closeRemarkDialog}
        title="Create Remark"
        description=""
        size="lg"
        contentClassName="max-w-[720px] rounded-xl px-7 py-9"
        closeIcon={<DialogCloseIcon />}
        closeButtonClassName="text-slate-500 hover:bg-transparent"
      >
        <div className="space-y-5">
          <Input
            id="orders-remark-name"
            label="Remark Name*"
            value={remarkName}
            onChange={(event) => setRemarkName(event.target.value)}
            className="h-[50px]"
          />
          <Select
            id="orders-remark-type"
            label="Remark Type*"
            value={remarkType}
            options={[
              { value: "Adjustment", label: "Adjustment" },
              { value: "Stock", label: "Stock" },
              { value: "General", label: "General" },
            ]}
            onChange={(event) => setRemarkType(event.target.value)}
          />
          {dialogError ? <div className="text-sm text-red-600">{dialogError}</div> : null}
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveRemark}
              disabled={!remarkName.trim() || !remarkType.trim()}
              loading={saveRemarkMutation.isPending}
            >
              {editingRemark && editingRemark.id !== "create" ? "Update Remark" : "Create Remark"}
            </Button>
          </div>
        </div>
      </Dialog>
    </SharedOrdersLayout>
  );
}

type HsnVariantRow = {
  id: string;
  code: string;
  description: string;
  createdBy: string;
  active: boolean;
  raw?: unknown;
};

function OrdersHsnVariantsTable({ backHref, subtitle, title }: OrdersHsnVariantsTableProps) {
  const { api } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({ namespace: "ordersItemVariantHsn" });
  const [query, setQuery] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
  const [editingHsnId, setEditingHsnId] = useState<string | null>(null);
  const [hsnCode, setHsnCode] = useState("");
  const [description, setDescription] = useState("");
  const [dialogError, setDialogError] = useState("");

  const hsnQuery = useQuery({
    queryKey: ["orders", "hsn-codes", page, pageSize],
    queryFn: async () => {
      const from = Math.max(0, (page - 1) * pageSize);
      const count = Math.max(1, pageSize);
      const params = { from, count };
      const [pageResponse, countResponse] = await Promise.all([
        api.get<any>("provider/spitem/settings/hsn", { params }),
        api.get<any>("provider/spitem/settings/hsn/count", { params }),
      ]);

      return {
        rows: mapHsnOptions(pageResponse.data),
        total: Math.max(readVariantTotal(countResponse.data), readVariantTotal(pageResponse.data)),
      };
    },
  });

  const saveHsnMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (payload.id) {
        return api.patch<any>("provider/spitem/settings/hsn", removeEmptyValues(payload)).then((response) => response.data);
      }
      return api.post<any>("provider/spitem/settings/hsn", removeEmptyValues(payload)).then((response) => response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "hsn-codes"] });
    },
  });

  const rows = hsnQuery.data?.rows ?? [];
  const total = hsnQuery.data?.total ?? 0;
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => `${row.code} ${row.description} ${row.createdBy}`.toLowerCase().includes(normalized));
  }, [rows, query]);
  const editingRow = editingHsnId ? rows.find((row) => row.id === editingHsnId) ?? null : null;

  useEffect(() => {
    setStatusMap((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (!(row.id in next)) {
          next[row.id] = row.active;
        }
      }
      return next;
    });
  }, [rows]);

  const hsnColumns = useMemo<ColumnDef<HsnVariantRow>[]>(
    () => [
      {
        key: "code",
        header: "HSN Code",
        width: "54%",
        className: "py-5",
        render: (row) => <div className="text-[16px] font-medium text-slate-800">{row.code}</div>,
      },
      {
        key: "createdBy",
        header: "Created By",
        width: "14%",
        className: "py-5",
        render: (row) => <div className="text-[16px] font-medium text-slate-800">{row.createdBy}</div>,
      },
      {
        key: "status",
        header: "Status",
        width: "14%",
        className: "py-5",
        render: (row) => (
          <div className="flex justify-start">
            <Switch
              checked={statusMap[row.id] ?? true}
              onChange={(checked) =>
                setStatusMap((current) => ({
                  ...current,
                  [row.id]: checked,
                }))
              }
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "18%",
        className: "py-5",
        render: (row) => (
          <Button type="button" variant="primary" size="sm" onClick={() => openDialog(row)}>
            Update
          </Button>
        ),
      },
    ],
    [statusMap]
  );

  function openDialog(row?: HsnVariantRow) {
    setDialogError("");
    setEditingHsnId(row?.id ?? "create");
    setHsnCode(row?.code ?? "");
    setDescription(row?.description ?? "");
  }

  function closeDialog() {
    setEditingHsnId(null);
    setHsnCode("");
    setDescription("");
    setDialogError("");
  }

  async function saveHsn() {
    const trimmedCode = hsnCode.trim();
    if (!trimmedCode) return;

    try {
      await saveHsnMutation.mutateAsync({
        hsnCode: trimmedCode,
        description: description.trim(),
        ...(editingRow ? { id: readHsnId(editingRow.raw, editingRow.id) } : {}),
      });
      closeDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to save HSN.");
    }
  }

  return (
    <SharedOrdersLayout
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel="Dashboard"
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => openDialog()}>
          + Create
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-5 py-6">
          <div className="mb-6 text-[18px] font-semibold text-slate-900">HSN Codes ({total})</div>
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-[330px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search HSN"
                className="h-[42px] w-full rounded-[6px] border border-slate-300 bg-white pl-4 pr-14 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="absolute right-0 top-0 flex h-[42px] w-14 items-center justify-center rounded-r-[6px] bg-slate-100 text-white">
                <SearchIcon />
              </div>
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center text-indigo-700" aria-label="Filter hsn codes">
              <FilterIcon />
            </button>
          </div>
        </div>
        <DataTable
          data={filteredRows}
          columns={hsnColumns}
          loading={hsnQuery.isLoading}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="text-base"
          pagination={{
            page,
            pageSize,
            total,
            mode: "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={<EmptyState title="No HSN codes found" description="" />}
        />
      </SectionCard>

      <Dialog
        open={Boolean(editingHsnId)}
        onClose={closeDialog}
        title="Create HSN"
        description=""
        size="lg"
        contentClassName="max-w-[720px] rounded-xl px-7 py-9"
        closeIcon={<DialogCloseIcon />}
        closeButtonClassName="text-slate-500 hover:bg-transparent"
      >
        <div className="space-y-5">
          <Input
            id="orders-hsn-code"
            label="HSN Code*"
            value={hsnCode}
            onChange={(event) => setHsnCode(event.target.value)}
            className="h-[50px]"
          />
          <Textarea
            id="orders-hsn-description"
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
          {dialogError ? <div className="text-sm text-red-600">{dialogError}</div> : null}
          <div className="flex justify-center pt-2">
            <Button type="button" variant="outline" onClick={saveHsn} disabled={!hsnCode.trim()} loading={saveHsnMutation.isPending}>
              {editingRow ? "Update HSN" : "Create HSN"}
            </Button>
          </div>
        </div>
      </Dialog>
    </SharedOrdersLayout>
  );
}

function OrdersManagedSettingsTable({
  backHref,
  title,
  subtitle,
  countLabel,
  searchPlaceholder,
  endpoint,
  queryPath,
  queryParams,
  initialRows,
  fields,
  columns,
  mapRows,
  buildPayload,
  dialogTitle,
  createLabel,
  updateLabel,
  invalidateOrdersOnSuccess = true,
}: OrdersManagedSettingsTableProps) {
  const { api, location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState("");

  const remoteQuery = useQuery({
    queryKey: ["orders", endpoint, location?.id, queryPath ?? "", JSON.stringify(queryParams ?? {})],
    enabled: Boolean(queryPath),
    queryFn: async () => {
      const response = await api.get<any>(queryPath ?? endpoint, {
        params: queryParams,
      });
      return normalizeSettingOptions(response.data, endpoint);
    },
  });

  const sourceRows = queryPath ? remoteQuery.data ?? [] : initialRows ?? [];
  const mappedRows = useMemo(() => mapRows(sourceRows), [mapRows, sourceRows]);
  const [localRows, setLocalRows] = useState<ManagedSettingRow[]>(mappedRows);
  const editingRow = editingId ? localRows.find((row) => row.id === editingId) ?? null : null;

  useEffect(() => {
    setLocalRows(mappedRows);
  }, [mappedRows]);

  useEffect(() => {
    setStatusMap((current) => {
      const next = { ...current };
      for (const row of localRows) {
        if (!(row.id in next)) next[row.id] = true;
      }
      return next;
    });
  }, [localRows]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return localRows;
    return localRows.filter((row) =>
      Object.values(row.values).some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [localRows, query]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingRow ? api.patch<any>(endpoint, removeEmptyValues(payload)) : api.post<any>(endpoint, removeEmptyValues(payload)),
    onSuccess: () => {
      if (invalidateOrdersOnSuccess) {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
      if (queryPath) {
        queryClient.invalidateQueries({ queryKey: ["orders", endpoint, location?.id] });
      }
    },
  });

  const tableColumns = useMemo<ColumnDef<ManagedSettingRow>[]>(
    () =>
      columns.map((column) => {
        if (column.key === "__status__") {
          return {
            key: column.key,
            header: column.header,
            width: column.width,
            className: "py-5",
            render: (row: ManagedSettingRow) => (
              <div className="flex justify-start">
                <Switch
                  checked={statusMap[row.id] ?? true}
                  onChange={(checked) =>
                    setStatusMap((current) => ({
                      ...current,
                      [row.id]: checked,
                    }))
                  }
                />
              </div>
            ),
          };
        }

        if (column.key === "__actions__") {
          return {
            key: column.key,
            header: column.header,
            width: column.width,
            className: "py-5",
            render: (row: ManagedSettingRow) => (
              <Button type="button" variant="primary" size="sm" onClick={() => openDialog(row)}>
                Update
              </Button>
            ),
          };
        }

        return {
          key: column.key,
          header: column.header,
          width: column.width,
          className: "py-5",
          render: (row: ManagedSettingRow) => <div className="text-[16px] font-medium text-slate-800">{row.values[column.key] || "-"}</div>,
        };
      }),
    [columns, statusMap]
  );

  function openDialog(row?: ManagedSettingRow) {
    setEditingId(row?.id ?? "create");
    setDialogError("");
    const nextValues: Record<string, string> = {};
    for (const field of fields) {
      nextValues[field.key] = row?.values[field.key] ?? (field.options?.[0]?.value ?? "");
    }
    setFormValues(nextValues);
  }

  function closeDialog() {
    setEditingId(null);
    setDialogError("");
    setFormValues({});
  }

  async function saveSetting() {
    try {
      const result = await saveMutation.mutateAsync(buildPayload(formValues, editingRow));
      const nextId =
        readTextValue(
          (result as any)?.id,
          (result as any)?.uid,
          (result as any)?.encId,
          (result as any)?.code,
          (result as any)?.value
        ) ||
        editingRow?.id ||
        formValues.code ||
        formValues.name ||
        `${endpoint}-${Date.now()}`;
      const nextRow: ManagedSettingRow = {
        id: nextId,
        raw: result ?? editingRow?.raw,
        values: { ...formValues },
      };

      setLocalRows((current) => {
        if (editingRow) {
          return current.map((row) => (row.id === editingRow.id ? nextRow : row));
        }
        return [nextRow, ...current];
      });
      closeDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to save setting.");
    }
  }

  const dialogOpen = Boolean(editingId);
  const isUpdate = Boolean(editingRow && editingRow.id !== "create");
  const submitDisabled = fields.some((field) => field.required && !String(formValues[field.key] ?? "").trim());

  return (
    <SharedOrdersLayout
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel="Dashboard"
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => openDialog()}>
          + Create
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-5 py-6">
          <div className="mb-6 text-[18px] font-semibold text-slate-900">{countLabel} ({localRows.length})</div>
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-[330px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-[42px] w-full rounded-[6px] border border-slate-300 bg-white pl-4 pr-14 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="absolute right-0 top-0 flex h-[42px] w-14 items-center justify-center rounded-r-[6px] bg-slate-100 text-white">
                <SearchIcon />
              </div>
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center text-indigo-700" aria-label={`Filter ${countLabel.toLowerCase()}`}>
              <FilterIcon />
            </button>
          </div>
        </div>
        <DataTable
          data={filteredRows}
          columns={tableColumns}
          loading={remoteQuery.isLoading}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="text-base"
          pagination={{
            page: 1,
            pageSize: 10,
            total: filteredRows.length,
            mode: "client",
            onChange: () => undefined,
          }}
          emptyState={<EmptyState title={`No ${countLabel.toLowerCase()} found`} description="" />}
        />
      </SectionCard>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={isUpdate ? updateLabel : dialogTitle}
        description=""
        size="lg"
        contentClassName="max-w-[720px] rounded-xl px-7 py-9"
        closeIcon={<DialogCloseIcon />}
        closeButtonClassName="text-slate-500 hover:bg-transparent"
      >
        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.key}>
              {field.type === "textarea" ? (
                <Textarea
                  id={`orders-setting-${field.key}`}
                  label={field.label}
                  value={formValues[field.key] ?? ""}
                  onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  rows={4}
                />
              ) : field.type === "select" ? (
                <Select
                  id={`orders-setting-${field.key}`}
                  label={field.label}
                  value={formValues[field.key] ?? ""}
                  options={field.options ?? []}
                  onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              ) : (
                <Input
                  id={`orders-setting-${field.key}`}
                  label={field.label}
                  type={field.type === "number" ? "number" : "text"}
                  value={formValues[field.key] ?? ""}
                  onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  className="h-[50px]"
                />
              )}
            </div>
          ))}
          {dialogError ? <div className="text-sm text-red-600">{dialogError}</div> : null}
          <div className="flex justify-center pt-2">
            <Button type="button" variant="outline" onClick={saveSetting} disabled={submitDisabled} loading={saveMutation.isPending}>
              {isUpdate ? updateLabel : createLabel}
            </Button>
          </div>
        </div>
      </Dialog>
    </SharedOrdersLayout>
  );
}

function CategoryThumbnail({ seed, imageUrl }: { seed: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <div className="flex h-[50px] w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <img src={imageUrl} alt={seed} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  const palette = getCategoryPalette(seed);
  const initials = seed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C";

  return (
    <div
      className="flex h-[50px] w-[74px] shrink-0 items-center justify-center rounded-md border border-slate-200 text-xs font-semibold shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        color: palette.text,
      }}
    >
      {initials}
    </div>
  );
}

function getCategoryPalette(seed: string) {
  const palettes = [
    { from: "#FDE68A", to: "#FDBA74", text: "#7C2D12" },
    { from: "#BFDBFE", to: "#C4B5FD", text: "#312E81" },
    { from: "#BBF7D0", to: "#86EFAC", text: "#14532D" },
    { from: "#FBCFE8", to: "#DDD6FE", text: "#831843" },
    { from: "#FED7AA", to: "#FDE68A", text: "#78350F" },
  ];
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

function readCategoryImageUrl(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";

  const attachmentUrl = readAttachmentS3Path(raw);
  if (attachmentUrl) {
    return attachmentUrl;
  }

  const candidateKeys = [
    "image",
    "imageUrl",
    "categoryImage",
    "categoryImageUrl",
    "icon",
    "iconUrl",
    "imgUrl",
  ];

  const queue: unknown[] = [raw];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    const record = current as Record<string, unknown>;
    for (const key of candidateKeys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return "";
}

function readCategoryAttachments(raw: unknown) {
  if (!raw || typeof raw !== "object") return [];

  const directAttachments = (raw as Record<string, unknown>).attachments;
  if (Array.isArray(directAttachments)) {
    return directAttachments.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }

  return [];
}

function readCategoryCode(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.categoryCode ?? record.code ?? record.id ?? record.uid;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readGroupCode(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.groupCode ?? record.code ?? record.id ?? record.uid;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readGroupId(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.id ?? record.groupId ?? record.uid ?? record.groupCode ?? record.code;
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readTagCode(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.tagCode ?? record.code ?? record.id ?? record.uid;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readTagId(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.id ?? record.tagId ?? record.uid ?? record.tagCode ?? record.code;
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readTypeCode(raw: unknown, fallback: string) {
  return readCodeValue(raw, ["typeCode", "code", "id", "uid"], fallback);
}

function readManufacturerCode(raw: unknown, fallback: string) {
  return readCodeValue(raw, ["manufacturerCode", "code", "id", "uid"], fallback);
}

function readCompositionCode(raw: unknown, fallback: string) {
  return readCodeValue(raw, ["compositionCode", "code", "id", "uid"], fallback);
}

function readUnitCode(raw: unknown, fallback: string) {
  return readCodeValue(raw, ["unitCode", "code", "id", "uid"], fallback);
}

function readHsnCode(raw: unknown, fallback: string) {
  return readCodeValue(raw, ["hsnCode", "code", "id", "uid"], fallback);
}

function readHsnId(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.id ?? record.hsnId ?? record.uid ?? record.code ?? record.hsnCode;
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readRemarkCode(raw: unknown, fallback: string) {
  return readCodeValue(raw, ["remarkCode", "code", "id", "uid"], fallback);
}

function readRemarkId(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.id ?? record.remarkId ?? record.uid ?? record.remarkCode ?? record.code;
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readRemarkEncId(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const value = record.encId ?? record.uid ?? record.id;
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readRemarkTypeEnum(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;
  const value = record.transactionTypeEnum ?? record.remarkType ?? record.type;
  if (typeof value === "string" && value.trim()) {
    return value.trim().toUpperCase();
  }
  return "";
}

function readCodeValue(raw: unknown, keys: string[], fallback: string) {
  const value = readFirstString(raw, keys);
  return value || fallback;
}

function readUnitConversionQty(raw: unknown) {
  return (
    readFirstStringDeep(raw, [
      "unitConversionQty",
      "convertionQty",
      "conversionQty",
      "conversionQuantity",
      "unitValue",
      "value",
      "packValue",
      "packQty",
      "packQuantity",
      "unitQty",
      "unitQuantity",
      "qty",
      "quantity",
    ]) || ""
  );
}

function readCreatedBy(raw: unknown) {
  return (
    readFirstString(raw, ["createdByName", "createdBy", "ownerName", "providerName"]) ||
    readNestedString(raw, [["createdByUser", "name"], ["createdBy", "name"]]) ||
    "-"
  );
}

function readFirstString(raw: unknown, keys: string[]) {
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function readFirstStringDeep(raw: unknown, keys: string[]) {
  const direct = readFirstString(raw, keys);
  if (direct) return direct;
  if (!raw || typeof raw !== "object") return "";

  const queue: unknown[] = [raw];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);

    const nested = readFirstString(current, keys);
    if (nested) return nested;

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    for (const value of Object.values(current as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return "";
}

function readNestedString(raw: unknown, paths: string[][]) {
  if (!raw || typeof raw !== "object") return "";
  for (const path of paths) {
    let current: unknown = raw;
    for (const segment of path) {
      if (!current || typeof current !== "object") {
        current = null;
        break;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    if (typeof current === "string" && current.trim()) return current.trim();
  }
  return "";
}

function readAttachmentS3Path(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";

  const queue: unknown[] = [raw];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    const record = current as Record<string, unknown>;
    const attachments = record.attachments;
    if (Array.isArray(attachments)) {
      for (const attachment of attachments) {
        if (!attachment || typeof attachment !== "object") continue;
        const s3path = (attachment as Record<string, unknown>).s3path;
        if (typeof s3path === "string" && s3path.trim()) {
          return s3path.trim();
        }
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return "";
}

async function updateOrderCategory(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  payload: Record<string, unknown>
) {
  return api.patch<any>("provider/spitem/settings/category", removeEmptyValues(payload)).then((response) => response.data);
}

async function createOrderGroup(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  payload: Record<string, unknown>
) {
  return api.post<any>("provider/spitem/group", removeEmptyValues(payload)).then((response) => response.data);
}

async function updateOrderGroup(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  payload: Record<string, unknown>
) {
  return api.patch<any>("provider/spitem/group", removeEmptyValues(payload)).then((response) => response.data);
}

async function createOrderTag(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  payload: Record<string, unknown>
) {
  return api.post<any>("provider/spitem/settings/tag", removeEmptyValues(payload)).then((response) => response.data);
}

async function updateOrderTag(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  payload: Record<string, unknown>
) {
  return api.patch<any>("provider/spitem/settings/tag", removeEmptyValues(payload)).then((response) => response.data);
}

type OrdersUploadTarget = {
  url: string;
  id?: string | number;
  driveId: string;
  orderId?: number;
};

async function uploadCategoryImageAttachment(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  ownerId: string,
  file: File,
  order: number
) {
  const resolvedOwnerId = String(ownerId ?? "").trim();
  if (!resolvedOwnerId) {
    throw new Error("Provider account id is required to upload the category image.");
  }

  const fileType = resolveUploadFileType(file);
  const uploadRequest = [
    {
      owner: resolvedOwnerId,
      ownerType: "Provider" as const,
      fileName: file.name,
      fileSize: file.size / (1024 * 1024),
      caption: "",
      fileType,
      action: "add" as const,
      order,
    },
  ];

  const response = await api.post<OrdersUploadTarget[]>("/provider/fileShare/upload", uploadRequest);
  const target = Array.isArray(response?.data) ? response.data[0] : null;

  const resolvedDriveId = String(target?.id ?? target?.driveId ?? "").trim();

  if (!target?.url || !resolvedDriveId) {
    throw new Error("File upload target was not returned by the server.");
  }

  const uploadResponse = await fetch(target.url, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
  });

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload category image right now.");
  }

  await api.put(`provider/fileShare/upload/COMPLETE/${resolvedDriveId}`, null);

  return {
    file: {},
    type: "photo",
    fileName: file.name,
    fileType,
    fileSize: file.size / (1024 * 1024),
    caption: "",
    driveId: resolvedDriveId,
    action: "add",
    order: typeof target.orderId === "number" ? target.orderId : order,
    lastModified: file.lastModified,
    ownerType: "Provider",
    owner: resolvedOwnerId,
  };
}

function resolveUploadFileType(file: File) {
  const rawType = String(file.type ?? "").trim().toLowerCase();
  if (rawType.startsWith("image/")) {
    return rawType.split("/")[1] || "jpeg";
  }
  const extension = file.name.split(".").pop()?.trim().toLowerCase();
  return extension || "jpeg";
}

function removeEmptyValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => removeEmptyValues(entry))
      .filter((entry) => entry !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, removeEmptyValues(entry)] as const)
        .filter(([, entry]) => entry !== undefined)
    );
  }

  if (value === "" || value == null) return undefined;
  return value;
}

function mapTagOptions(payload: any): TagVariantRow[] {
  return unwrapVariantList(payload)
    .map((item: any, index: number) => {
      const id =
        readTextValue(
          item?.id,
          item?.uid,
          item?.encId,
          item?.tagCode,
          item?.code
        ) || `tag-${index + 1}`;
      const label =
        readTextValue(
          item?.tagName,
          item?.name,
          item?.label,
          item?.displayName,
          item?.code
        ) || id;

      return {
        id,
        label,
        raw: item,
      };
    })
    .filter((item) => item.id && item.label);
}

function mapRemarkOptions(payload: any): RemarkVariantRow[] {
  return unwrapVariantList(payload)
    .map((item: any, index: number) => {
      const id =
        readTextValue(
          item?.id,
          item?.uid,
          item?.encId,
          item?.remarkCode,
          item?.code
        ) || `remark-${index + 1}`;
      const name =
        readFirstNonNumericText(item, [
          "remarkName",
          "remark",
          "remarks",
          "name",
          "label",
          "displayName",
          "description",
          "value",
          "notes",
          "note",
        ]) || id;
      const type =
        readTextValue(
          item?.transactionTypeEnumDisplayName,
          item?.transactionTypeEnum,
          item?.remarkType,
          item?.typeName,
          item?.type
        ) || "Adjustment";

      return {
        id,
        name,
        type,
        active: readStatusFlag(item),
        raw: item,
      };
    })
    .filter((item) => item.id && item.name);
}

function mapHsnOptions(payload: any): HsnVariantRow[] {
  return unwrapVariantList(payload)
    .map((item: any, index: number) => {
      const id =
        readTextValue(
          item?.id,
          item?.uid,
          item?.encId,
          item?.code,
          item?.hsnCode
        ) || `hsn-${index + 1}`;
      const code =
        readTextValue(
          item?.hsnCode,
          item?.code,
          item?.label,
          item?.name
        ) || id;

      return {
        id,
        code,
        description: readFirstString(item, ["description", "desc", "hsnDescription"]),
        createdBy: readCreatedBy(item),
        active: readStatusFlag(item),
        raw: item,
      };
    })
    .filter((item) => item.id && item.code);
}

function normalizeSettingOptions(payload: any, endpoint: string): OrdersItemSettingsOption[] {
  const kind = endpoint.split("/").pop() || "setting";
  return unwrapVariantList(payload)
    .map((item: any, index: number) => {
      const id =
        readTextValue(
          item?.id,
          item?.uid,
          item?.encId,
          item?.code,
          item?.value,
          item?.[`${kind}Code`],
          item?.[`${kind}Id`]
        ) || `${kind}-${index + 1}`;
      const label =
        readTextValue(
          item?.label,
          item?.name,
          item?.displayName,
          item?.title,
          item?.value,
          item?.code,
          item?.[`${kind}Name`],
          item?.[`${kind}Type`]
        ) || id;

      return {
        id,
        label,
        raw: item,
      };
    })
    .filter((item) => item.id && item.label);
}

function unwrapVariantList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
}

function readTextValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function readFirstNonNumericText(raw: unknown, keys: string[]) {
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function readVariantTotal(payload: any) {
  if (typeof payload === "number") {
    return Number.isFinite(payload) && payload >= 0 ? payload : 0;
  }

  if (typeof payload === "string") {
    const parsed = Number(payload);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  if (Array.isArray(payload)) {
    return payload.length;
  }

  const candidates = [
    payload?.totalCount,
    payload?.totalElements,
    payload?.total,
    payload?.count,
    payload?.page?.totalElements,
    payload?.page?.total,
    payload?.data?.totalCount,
    payload?.data?.totalElements,
    payload?.data?.total,
    payload?.response?.totalCount,
    payload?.response?.totalElements,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return 0;
}

function readStatusFlag(raw: unknown) {
  if (!raw || typeof raw !== "object") return true;
  const record = raw as Record<string, unknown>;
  const value = record.status ?? record.active ?? record.enabled;

  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (normalized === "ACTIVE" || normalized === "ENABLED" || normalized === "TRUE") return true;
    if (normalized === "INACTIVE" || normalized === "DISABLED" || normalized === "FALSE") return false;
  }

  return true;
}

function EyeActionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-slate-700">
      <path d="M1.5 9C2.9 6.2 5.65 4.5 9 4.5C12.35 4.5 15.1 6.2 16.5 9C15.1 11.8 12.35 13.5 9 13.5C5.65 13.5 2.9 11.8 1.5 9Z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function PencilActionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-slate-700">
      <path d="M11.85 3.15L14.85 6.15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3 15L6.45 14.25L14.1 6.6C14.55 6.15 14.55 5.4 14.1 4.95L13.05 3.9C12.6 3.45 11.85 3.45 11.4 3.9L3.75 11.55L3 15Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function TrashActionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-slate-700">
      <path d="M3.75 5.25H14.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.75 5.25V4.5C6.75 3.95 7.2 3.5 7.75 3.5H10.25C10.8 3.5 11.25 3.95 11.25 4.5V5.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.25 5.25V13.25C5.25 14.08 5.92 14.75 6.75 14.75H11.25C12.08 14.75 12.75 14.08 12.75 13.25V5.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 7.75V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 7.75V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DialogCloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M5.5 5.5L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.5 5.5L5.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ImagePlaceholderLargeIcon() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" aria-hidden="true">
      <rect x="24" y="18" width="58" height="58" rx="8" stroke="currentColor" strokeWidth="6" />
      <path d="M35 68L47 55L57 64L68 47L82 62" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="38" r="7" fill="currentColor" />
      <path d="M25 74L67 84" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M2.25 3.75A.75.75 0 0 1 3 3h12a.75.75 0 0 1 .58 1.226L11.25 9.52v4.23a.75.75 0 0 1-.44.682l-3 1.385A.75.75 0 0 1 6.75 15V9.52L2.42 4.226A.75.75 0 0 1 2.25 3.75Z" />
    </svg>
  );
}
