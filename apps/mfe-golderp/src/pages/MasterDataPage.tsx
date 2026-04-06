import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Dialog,
  DialogFooter,
  EmptyState,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Tabs,
  type ColumnDef,
} from "@jaldee/design-system";
import { masterDataService } from "@/services";
import { formatCurrency } from "@/lib/gold-erp-utils";
import type {
  EntityStatus,
  Metal,
  MetalPurity,
  Stone,
  StoneClarity,
  StoneCut,
  StoneShape,
  StoneType,
} from "@/lib/gold-erp-types";

type MasterTab = "metals" | "purities" | "stones";

type MetalFormState = {
  metalCode: string;
  name: string;
  status: EntityStatus;
};

type PurityFormState = {
  metalUid: string;
  purityCode: string;
  label: string;
  purityRatio: string;
  status: EntityStatus;
};

type StoneFormState = {
  stoneCode: string;
  name: string;
  stoneType: StoneType;
  shape: StoneShape;
  clarity: StoneClarity;
  cut: StoneCut;
  pricePerPiece: string;
  status: EntityStatus;
};

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
] as const;

const stoneTypeOptions: Array<{ label: string; value: StoneType }> = [
  { label: "Diamond", value: "DIAMOND" },
  { label: "Ruby", value: "RUBY" },
  { label: "Emerald", value: "EMERALD" },
  { label: "Sapphire", value: "SAPPHIRE" },
  { label: "Pearl", value: "PEARL" },
  { label: "Topaz", value: "TOPAZ" },
  { label: "Amethyst", value: "AMETHYST" },
  { label: "Other", value: "OTHER" },
];

const stoneShapeOptions: Array<{ label: string; value: StoneShape }> = [
  { label: "Round", value: "ROUND" },
  { label: "Princess", value: "PRINCESS" },
  { label: "Oval", value: "OVAL" },
  { label: "Marquise", value: "MARQUISE" },
  { label: "Pear", value: "PEAR" },
  { label: "Cushion", value: "CUSHION" },
  { label: "Heart", value: "HEART" },
  { label: "Emerald Cut", value: "EMERALD_CUT" },
  { label: "Other", value: "OTHER" },
];

const stoneClarityOptions: Array<{ label: string; value: StoneClarity }> = [
  { label: "FL", value: "FL" },
  { label: "IF", value: "IF" },
  { label: "VVS1", value: "VVS1" },
  { label: "VVS2", value: "VVS2" },
  { label: "VS1", value: "VS1" },
  { label: "VS2", value: "VS2" },
  { label: "SI1", value: "SI1" },
  { label: "SI2", value: "SI2" },
  { label: "I1", value: "I1" },
  { label: "Not Applicable", value: "NOT_APPLICABLE" },
];

const stoneCutOptions: Array<{ label: string; value: StoneCut }> = [
  { label: "Excellent", value: "EXCELLENT" },
  { label: "Very Good", value: "VERY_GOOD" },
  { label: "Good", value: "GOOD" },
  { label: "Fair", value: "FAIR" },
  { label: "Not Applicable", value: "NOT_APPLICABLE" },
];

function normalizeMetal(metal: Metal): Metal {
  return {
    ...metal,
    metalUid: String(metal.metalUid ?? ""),
    metalCode: String(metal.metalCode ?? "-"),
    name: String(metal.name ?? "Metal"),
    status: metal.status ?? "ACTIVE",
  };
}

function normalizePurity(purity: MetalPurity, metals: Metal[]): MetalPurity {
  const metalName = purity.metalName || metals.find((metal) => metal.metalUid === purity.metalUid)?.name || "";
  return {
    ...purity,
    purityUid: String(purity.purityUid ?? ""),
    metalUid: String(purity.metalUid ?? ""),
    purityCode: String(purity.purityCode ?? "-"),
    label: String(purity.label ?? purity.purityCode ?? "-"),
    purityRatio: Number(purity.purityRatio ?? 0),
    metalName,
    status: purity.status ?? "ACTIVE",
  };
}

function normalizeStone(stone: Stone): Stone {
  return {
    ...stone,
    stoneUid: String(stone.stoneUid ?? ""),
    stoneCode: String(stone.stoneCode ?? "-"),
    name: String(stone.name ?? "Stone"),
    stoneType: stone.stoneType ?? "OTHER",
    shape: stone.shape ?? "OTHER",
    clarity: stone.clarity ?? "NOT_APPLICABLE",
    cut: stone.cut ?? "NOT_APPLICABLE",
    pricePerPiece: Number(stone.pricePerPiece ?? 0),
    status: stone.status ?? "ACTIVE",
  };
}

function getStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  return status === "ACTIVE" ? "success" : "neutral";
}

function createEmptyMetalForm(): MetalFormState {
  return { metalCode: "", name: "", status: "ACTIVE" };
}

function createEmptyPurityForm(): PurityFormState {
  return { metalUid: "", purityCode: "", label: "", purityRatio: "", status: "ACTIVE" };
}

function createEmptyStoneForm(): StoneFormState {
  return {
    stoneCode: "",
    name: "",
    stoneType: "OTHER",
    shape: "OTHER",
    clarity: "NOT_APPLICABLE",
    cut: "NOT_APPLICABLE",
    pricePerPiece: "",
    status: "ACTIVE",
  };
}

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<MasterTab>("metals");
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<MetalPurity[]>([]);
  const [stones, setStones] = useState<Stone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchMetal, setSearchMetal] = useState("");
  const [searchPurity, setSearchPurity] = useState("");
  const [searchStone, setSearchStone] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMetal, setEditingMetal] = useState<Metal | null>(null);
  const [editingPurity, setEditingPurity] = useState<MetalPurity | null>(null);
  const [editingStone, setEditingStone] = useState<Stone | null>(null);
  const [metalForm, setMetalForm] = useState<MetalFormState>(createEmptyMetalForm());
  const [purityForm, setPurityForm] = useState<PurityFormState>(createEmptyPurityForm());
  const [stoneForm, setStoneForm] = useState<StoneFormState>(createEmptyStoneForm());
  const [isSaving, setIsSaving] = useState(false);

  async function loadMasterData() {
    setIsLoading(true);
    setError("");

    try {
      const [loadedMetals, loadedPurities, loadedStones] = await Promise.all([
        masterDataService.getMetals(),
        masterDataService.getPurities(),
        masterDataService.getStones(),
      ]);

      const normalizedMetals = Array.isArray(loadedMetals) ? loadedMetals.map(normalizeMetal) : [];
      setMetals(normalizedMetals);
      setPurities(Array.isArray(loadedPurities) ? loadedPurities.map((purity) => normalizePurity(purity, normalizedMetals)) : []);
      setStones(Array.isArray(loadedStones) ? loadedStones.map(normalizeStone) : []);
    } catch (loadError) {
      console.error("[MasterDataPage] failed to load master data", loadError);
      setMetals([]);
      setPurities([]);
      setStones([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load master data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMasterData();
  }, []);

  const filteredMetals = useMemo(
    () =>
      metals.filter((metal) => {
        const query = searchMetal.trim().toLowerCase();
        return !query || metal.name.toLowerCase().includes(query) || metal.metalCode.toLowerCase().includes(query);
      }),
    [metals, searchMetal],
  );

  const filteredPurities = useMemo(
    () =>
      purities.filter((purity) => {
        const query = searchPurity.trim().toLowerCase();
        return (
          !query ||
          purity.purityCode.toLowerCase().includes(query) ||
          purity.label.toLowerCase().includes(query) ||
          String(purity.metalName ?? "").toLowerCase().includes(query)
        );
      }),
    [purities, searchPurity],
  );

  const filteredStones = useMemo(
    () =>
      stones.filter((stone) => {
        const query = searchStone.trim().toLowerCase();
        return (
          !query ||
          stone.name.toLowerCase().includes(query) ||
          stone.stoneCode.toLowerCase().includes(query) ||
          stone.stoneType.toLowerCase().includes(query) ||
          stone.shape.toLowerCase().includes(query) ||
          stone.clarity.toLowerCase().includes(query) ||
          stone.cut.toLowerCase().includes(query)
        );
      }),
    [stones, searchStone],
  );

  function resetDialogState() {
    setEditingMetal(null);
    setEditingPurity(null);
    setEditingStone(null);
    setMetalForm(createEmptyMetalForm());
    setPurityForm(createEmptyPurityForm());
    setStoneForm(createEmptyStoneForm());
  }

  function openCreateDialog() {
    resetDialogState();
    setIsDialogOpen(true);
  }

  function openMetalEdit(metal: Metal) {
    resetDialogState();
    setEditingMetal(metal);
    setActiveTab("metals");
    setMetalForm({ metalCode: metal.metalCode, name: metal.name, status: metal.status });
    setIsDialogOpen(true);
  }

  function openPurityEdit(purity: MetalPurity) {
    resetDialogState();
    setEditingPurity(purity);
    setActiveTab("purities");
    setPurityForm({
      metalUid: purity.metalUid,
      purityCode: purity.purityCode,
      label: purity.label,
      purityRatio: String(purity.purityRatio),
      status: purity.status,
    });
    setIsDialogOpen(true);
  }

  function openStoneEdit(stone: Stone) {
    resetDialogState();
    setEditingStone(stone);
    setActiveTab("stones");
    setStoneForm({
      stoneCode: stone.stoneCode,
      name: stone.name,
      stoneType: stone.stoneType,
      shape: stone.shape,
      clarity: stone.clarity,
      cut: stone.cut,
      pricePerPiece: String(stone.pricePerPiece),
      status: stone.status,
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");

    try {
      if (activeTab === "metals") {
        if (!metalForm.name.trim() || !metalForm.metalCode.trim()) {
          setError("Metal name and code are required.");
          setIsSaving(false);
          return;
        }

        if (editingMetal) {
          await masterDataService.updateMetal(editingMetal.metalUid, {
            metalCode: metalForm.metalCode.trim(),
            name: metalForm.name.trim(),
            status: metalForm.status,
          });
        } else {
          await masterDataService.createMetal({
            metalCode: metalForm.metalCode.trim(),
            name: metalForm.name.trim(),
            status: metalForm.status,
          });
        }
      }

      if (activeTab === "purities") {
        if (!purityForm.metalUid || !purityForm.purityCode.trim() || !purityForm.label.trim()) {
          setError("Metal, purity code, and label are required.");
          setIsSaving(false);
          return;
        }

        const payload = {
          metalUid: purityForm.metalUid,
          purityCode: purityForm.purityCode.trim(),
          label: purityForm.label.trim(),
          purityRatio: Number(purityForm.purityRatio || 0),
          status: purityForm.status,
        };

        if (editingPurity) {
          await masterDataService.updatePurity(editingPurity.purityUid, payload);
        } else {
          await masterDataService.createPurity(payload);
        }
      }

      if (activeTab === "stones") {
        if (!stoneForm.stoneCode.trim() || !stoneForm.name.trim()) {
          setError("Stone code and name are required.");
          setIsSaving(false);
          return;
        }

        const payload = {
          stoneCode: stoneForm.stoneCode.trim(),
          name: stoneForm.name.trim(),
          stoneType: stoneForm.stoneType,
          shape: stoneForm.shape,
          clarity: stoneForm.clarity,
          cut: stoneForm.cut,
          pricePerPiece: Number(stoneForm.pricePerPiece || 0),
          status: stoneForm.status,
        };

        if (editingStone) {
          await masterDataService.updateStone(editingStone.stoneUid, payload);
        } else {
          await masterDataService.createStone(payload);
        }
      }

      await loadMasterData();
      setIsDialogOpen(false);
      resetDialogState();
    } catch (saveError) {
      console.error("[MasterDataPage] failed to save master record", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save master record.");
    } finally {
      setIsSaving(false);
    }
  }

  const metalColumns = useMemo<ColumnDef<Metal>[]>(
    () => [
      { key: "name", header: "Metal", render: (row) => <span className="font-medium">{row.name}</span> },
      { key: "metalCode", header: "Code" },
      { key: "status", header: "Status", render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => <Button variant="ghost" size="sm" onClick={() => openMetalEdit(row)}>Edit</Button>,
      },
    ],
    [],
  );

  const purityColumns = useMemo<ColumnDef<MetalPurity>[]>(
    () => [
      { key: "metalName", header: "Metal", render: (row) => row.metalName || "-" },
      { key: "purityCode", header: "Purity", render: (row) => <span className="font-medium">{row.purityCode}</span> },
      { key: "label", header: "Label" },
      { key: "purityRatio", header: "Ratio", align: "right", render: (row) => <span className="tabular-nums">{Number(row.purityRatio).toFixed(4)}</span> },
      { key: "status", header: "Status", render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => <Button variant="ghost" size="sm" onClick={() => openPurityEdit(row)}>Edit</Button>,
      },
    ],
    [],
  );

  const stoneColumns = useMemo<ColumnDef<Stone>[]>(
    () => [
      { key: "stoneCode", header: "Code", render: (row) => <span className="font-mono text-xs font-medium">{row.stoneCode}</span> },
      { key: "name", header: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
      { key: "stoneType", header: "Type" },
      { key: "shape", header: "Shape" },
      { key: "clarity", header: "Clarity" },
      { key: "cut", header: "Cut" },
      { key: "pricePerPiece", header: "Price / Piece", align: "right", render: (row) => <span className="tabular-nums font-medium">{formatCurrency(row.pricePerPiece)}</span> },
      { key: "status", header: "Status", render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => <Button variant="ghost" size="sm" onClick={() => openStoneEdit(row)}>Edit</Button>,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Master Data"
          subtitle="Configure metals, purities, stones, and supported reference values"
          actions={<Button size="sm" onClick={openCreateDialog}>Add New</Button>}
        />

        {error ? (
          <Alert variant="danger" title="Master data error">
            {error}
          </Alert>
        ) : null}

        <SectionCard>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as MasterTab)}
            items={[
              { value: "metals", label: "Metal Master", count: metals.length },
              { value: "purities", label: "Metal Purity Master", count: purities.length },
              { value: "stones", label: "Stone Master", count: stones.length },
            ]}
            className="mb-4"
          />

          {activeTab === "metals" ? (
            <div className="space-y-4">
              <DataTableToolbar
                query={searchMetal}
                onQueryChange={setSearchMetal}
                searchPlaceholder="Search metal..."
                recordCount={filteredMetals.length}
              />
              <DataTable
                data={filteredMetals}
                columns={metalColumns}
                getRowId={(row) => row.metalUid}
                loading={isLoading}
                emptyState={<EmptyState title="No metals available" description="Add a metal master to start configuring purities and rates." />}
                className="border-0 shadow-none"
              />
            </div>
          ) : null}

          {activeTab === "purities" ? (
            <div className="space-y-4">
              <DataTableToolbar
                query={searchPurity}
                onQueryChange={setSearchPurity}
                searchPlaceholder="Search purity..."
                recordCount={filteredPurities.length}
              />
              <DataTable
                data={filteredPurities}
                columns={purityColumns}
                getRowId={(row) => row.purityUid}
                loading={isLoading}
                emptyState={<EmptyState title="No purities available" description="Create a purity for one of the configured metals." />}
                className="border-0 shadow-none"
              />
            </div>
          ) : null}

          {activeTab === "stones" ? (
            <div className="space-y-4">
              <DataTableToolbar
                query={searchStone}
                onQueryChange={setSearchStone}
                searchPlaceholder="Search stone..."
                recordCount={filteredStones.length}
              />
              <DataTable
                data={filteredStones}
                columns={stoneColumns}
                getRowId={(row) => row.stoneUid}
                loading={isLoading}
                emptyState={<EmptyState title="No stones available" description="Add a stone master to use it in item templates and GRN tag details." />}
                className="border-0 shadow-none"
              />
            </div>
          ) : null}
        </SectionCard>

        <Dialog
          open={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            resetDialogState();
          }}
          title={
            activeTab === "metals"
              ? editingMetal ? "Edit Metal" : "Add Metal"
              : activeTab === "purities"
                ? editingPurity ? "Edit Purity" : "Add Purity"
                : editingStone ? "Edit Stone" : "Add Stone"
          }
          description="Maintain Gold ERP master records."
          size="lg"
        >
          {activeTab === "metals" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Metal Code" value={metalForm.metalCode} onChange={(event) => setMetalForm((current) => ({ ...current, metalCode: event.target.value }))} />
              <Input label="Metal Name" value={metalForm.name} onChange={(event) => setMetalForm((current) => ({ ...current, name: event.target.value }))} />
              <Select
                label="Status"
                value={metalForm.status}
                onChange={(event) => setMetalForm((current) => ({ ...current, status: event.target.value as EntityStatus }))}
                options={statusOptions.map((option) => ({ label: option.label, value: option.value }))}
              />
            </div>
          ) : null}

          {activeTab === "purities" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Metal"
                value={purityForm.metalUid}
                onChange={(event) => setPurityForm((current) => ({ ...current, metalUid: event.target.value }))}
                options={metals.map((metal) => ({ label: metal.name, value: metal.metalUid }))}
                placeholder="Select metal"
              />
              <Input label="Purity Code" value={purityForm.purityCode} onChange={(event) => setPurityForm((current) => ({ ...current, purityCode: event.target.value }))} />
              <Input label="Label" value={purityForm.label} onChange={(event) => setPurityForm((current) => ({ ...current, label: event.target.value }))} />
              <Input label="Purity Ratio" type="number" value={purityForm.purityRatio} onChange={(event) => setPurityForm((current) => ({ ...current, purityRatio: event.target.value }))} />
              <Select
                label="Status"
                value={purityForm.status}
                onChange={(event) => setPurityForm((current) => ({ ...current, status: event.target.value as EntityStatus }))}
                options={statusOptions.map((option) => ({ label: option.label, value: option.value }))}
              />
            </div>
          ) : null}

          {activeTab === "stones" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Stone Code" value={stoneForm.stoneCode} onChange={(event) => setStoneForm((current) => ({ ...current, stoneCode: event.target.value }))} />
              <Input label="Stone Name" value={stoneForm.name} onChange={(event) => setStoneForm((current) => ({ ...current, name: event.target.value }))} />
              <Select label="Stone Type" value={stoneForm.stoneType} onChange={(event) => setStoneForm((current) => ({ ...current, stoneType: event.target.value as StoneType }))} options={stoneTypeOptions.map((option) => ({ label: option.label, value: option.value }))} />
              <Select label="Shape" value={stoneForm.shape} onChange={(event) => setStoneForm((current) => ({ ...current, shape: event.target.value as StoneShape }))} options={stoneShapeOptions.map((option) => ({ label: option.label, value: option.value }))} />
              <Select label="Clarity" value={stoneForm.clarity} onChange={(event) => setStoneForm((current) => ({ ...current, clarity: event.target.value as StoneClarity }))} options={stoneClarityOptions.map((option) => ({ label: option.label, value: option.value }))} />
              <Select label="Cut" value={stoneForm.cut} onChange={(event) => setStoneForm((current) => ({ ...current, cut: event.target.value as StoneCut }))} options={stoneCutOptions.map((option) => ({ label: option.label, value: option.value }))} />
              <Input label="Price / Piece" type="number" value={stoneForm.pricePerPiece} onChange={(event) => setStoneForm((current) => ({ ...current, pricePerPiece: event.target.value }))} />
              <Select
                label="Status"
                value={stoneForm.status}
                onChange={(event) => setStoneForm((current) => ({ ...current, status: event.target.value as EntityStatus }))}
                options={statusOptions.map((option) => ({ label: option.label, value: option.value }))}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDialogOpen(false);
                resetDialogState();
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} loading={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}
