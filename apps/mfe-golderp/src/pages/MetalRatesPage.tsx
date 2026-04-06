import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogFooter,
  EmptyState,
  Input,
  PageHeader,
  SectionCard,
  Select,
} from "@jaldee/design-system";
import { masterDataService, rateService } from "@/services";
import { formatCurrency, formatDateTime, toApiDateTime } from "@/lib/gold-erp-utils";
import type { EntityStatus, Metal, MetalPurity, MetalRate } from "@/lib/gold-erp-types";

type HistoryState = {
  metalUid: string;
  purityUid: string;
};

type UpdateState = {
  metalUid: string;
  purityUid: string;
  ratePerGram: string;
  effectiveDate: string;
  status: EntityStatus;
};

function normalizeMetal(metal: Metal): Metal {
  return {
    ...metal,
    metalUid: String(metal.metalUid ?? ""),
    metalCode: String(metal.metalCode ?? "-"),
    name: String(metal.name ?? "Metal"),
    status: metal.status ?? "ACTIVE",
  };
}

function normalizePurity(purity: MetalPurity): MetalPurity {
  return {
    ...purity,
    purityUid: String(purity.purityUid ?? ""),
    metalUid: String(purity.metalUid ?? ""),
    purityCode: String(purity.purityCode ?? "-"),
    label: String(purity.label ?? purity.purityCode ?? "-"),
    purityRatio: Number(purity.purityRatio ?? 0),
    status: purity.status ?? "ACTIVE",
  };
}

function normalizeRate(rate: MetalRate): MetalRate {
  return {
    ...rate,
    rateUid: String(rate.rateUid ?? ""),
    metalUid: String(rate.metalUid ?? ""),
    purityUid: String(rate.purityUid ?? ""),
    metalName: String(rate.metalName ?? "Metal"),
    purityLabel: String(rate.purityLabel ?? rate.purityName ?? "Purity"),
    ratePerGram: Number(rate.ratePerGram ?? 0),
    status: rate.status ?? "ACTIVE",
  };
}

function getBadgeVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "INACTIVE") return "neutral";
  return "info";
}

function getLocalDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function createEmptyUpdateState(): UpdateState {
  return {
    metalUid: "",
    purityUid: "",
    ratePerGram: "",
    effectiveDate: getLocalDateTimeValue(),
    status: "ACTIVE",
  };
}

export default function MetalRatesPage() {
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<MetalPurity[]>([]);
  const [currentRates, setCurrentRates] = useState<MetalRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [historyState, setHistoryState] = useState<HistoryState>({ metalUid: "", purityUid: "" });
  const [historyRows, setHistoryRows] = useState<MetalRate[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>(createEmptyUpdateState());
  const [isSaving, setIsSaving] = useState(false);

  async function loadRatesPage() {
    setIsLoading(true);
    setError("");

    try {
      const [loadedMetals, loadedPurities, loadedRates] = await Promise.all([
        masterDataService.getMetals(),
        masterDataService.getPurities(),
        rateService.getRates(),
      ]);

      setMetals(Array.isArray(loadedMetals) ? loadedMetals.map(normalizeMetal) : []);
      setPurities(Array.isArray(loadedPurities) ? loadedPurities.map(normalizePurity) : []);
      setCurrentRates(Array.isArray(loadedRates) ? loadedRates.map(normalizeRate) : []);
    } catch (loadError) {
      console.error("[MetalRatesPage] failed to load rates data", loadError);
      setMetals([]);
      setPurities([]);
      setCurrentRates([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load metal rates.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRatesPage();
  }, []);

  const activeMetals = useMemo(
    () => metals.filter((metal) => metal.status === "ACTIVE").sort((left, right) => left.name.localeCompare(right.name)),
    [metals],
  );

  const purityRowsByMetal = useMemo(
    () =>
      activeMetals.map((metal) => ({
        metal,
        purities: purities
          .filter((purity) => purity.metalUid === metal.metalUid && purity.status === "ACTIVE")
          .sort((left, right) => Number(right.purityRatio || 0) - Number(left.purityRatio || 0))
          .map((purity) => ({
            purity,
            rate: currentRates.find((rate) => rate.metalUid === metal.metalUid && rate.purityUid === purity.purityUid),
          })),
      })),
    [activeMetals, currentRates, purities],
  );

  const historyPurities = useMemo(
    () => purities.filter((purity) => !historyState.metalUid || purity.metalUid === historyState.metalUid),
    [historyState.metalUid, purities],
  );

  const updatePurities = useMemo(
    () => purities.filter((purity) => !updateState.metalUid || purity.metalUid === updateState.metalUid),
    [purities, updateState.metalUid],
  );

  useEffect(() => {
    if (!isHistoryOpen || !historyState.metalUid || !historyState.purityUid) {
      setHistoryRows([]);
      return;
    }

    let cancelled = false;
    setIsHistoryLoading(true);

    void rateService
      .getRateHistory(historyState.metalUid, historyState.purityUid)
      .then((rows) => {
        if (cancelled) return;
        setHistoryRows(Array.isArray(rows) ? rows.map(normalizeRate) : []);
      })
      .catch((historyError) => {
        console.error("[MetalRatesPage] failed to load rate history", historyError);
        if (cancelled) return;
        setHistoryRows([]);
      })
      .finally(() => {
        if (!cancelled) setIsHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [historyState.metalUid, historyState.purityUid, isHistoryOpen]);

  async function handleSaveRate() {
    if (!updateState.metalUid || !updateState.purityUid || !updateState.ratePerGram.trim()) {
      setError("Metal, purity, and rate per gram are required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await rateService.saveRate({
        metalUid: updateState.metalUid,
        purityUid: updateState.purityUid,
        ratePerGram: Number(updateState.ratePerGram),
        effectiveDate: toApiDateTime(updateState.effectiveDate),
        status: updateState.status,
      });

      await loadRatesPage();
      setIsUpdateOpen(false);
      setUpdateState(createEmptyUpdateState());
    } catch (saveError) {
      console.error("[MetalRatesPage] failed to save rate", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save metal rate.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Metal Rate Engine"
          subtitle="Manage rates by metal master and review live active rates by section"
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsUpdateOpen(true)}>
                Update Rates
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
                Rate History
              </Button>
            </div>
          }
        />

        {error ? (
          <Alert variant="danger" title="Rates error">
            {error}
          </Alert>
        ) : null}

        {activeMetals.length === 0 ? (
          <SectionCard title="Current Active Rates">
            <EmptyState title="No metals configured" description="Create metal master records before managing rates." />
          </SectionCard>
        ) : (
          <div className="space-y-4">
            {purityRowsByMetal.map(({ metal, purities: purityRows }) => (
              <SectionCard
                key={metal.metalUid}
                title={metal.name}
                subtitle={`Metal Code: ${metal.metalCode}`}
                noPadding
              >
                {isLoading ? (
                  <div className="p-4 text-sm text-[var(--color-text-secondary)]">Loading active rates...</div>
                ) : purityRows.length === 0 ? (
                  <EmptyState
                    title={`No purities configured for ${metal.name}`}
                    description="Create active purity master records for this metal before managing rates."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_38%,white)]">
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Purity</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-text-secondary)]">Rate / Gram</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Effective From</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purityRows.map(({ purity, rate }) => (
                          <tr key={rate?.rateUid || `${metal.metalUid}-${purity.purityUid}`} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_24%,white)]">
                            <td className="px-4 py-2 font-medium text-[var(--color-text-primary)]">{purity.label || purity.purityCode || "-"}</td>
                            <td className="px-4 py-2 text-right font-semibold tabular-nums text-[var(--color-text-primary)]">
                              {rate ? `${formatCurrency(rate.ratePerGram)}/g` : "Not set"}
                            </td>
                            <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                              {rate ? formatDateTime(rate.effectiveFrom || rate.effectiveDate) : "Not set"}
                            </td>
                            <td className="px-4 py-2">
                              {rate ? <Badge variant={getBadgeVariant(rate.status || "ACTIVE")}>{rate.status || "ACTIVE"}</Badge> : <span className="text-sm text-[var(--color-text-secondary)]">Not set</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            ))}
          </div>
        )}

        <Dialog
          open={isUpdateOpen}
          onClose={() => {
            setIsUpdateOpen(false);
            setUpdateState(createEmptyFormFromState(updateState));
          }}
          title="Update Rates"
          description="Add a new active rate for a metal and purity combination."
          size="md"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Metal"
              value={updateState.metalUid}
              onChange={(event) => setUpdateState((current) => ({ ...current, metalUid: event.target.value, purityUid: "" }))}
              options={activeMetals.map((metal) => ({ label: metal.name, value: metal.metalUid }))}
              placeholder="Select metal"
            />
            <Select
              label="Purity"
              value={updateState.purityUid}
              onChange={(event) => setUpdateState((current) => ({ ...current, purityUid: event.target.value }))}
              options={updatePurities.map((purity) => ({ label: purity.label, value: purity.purityUid }))}
              placeholder="Select purity"
            />
            <Input
              label="Rate Per Gram"
              type="number"
              value={updateState.ratePerGram}
              onChange={(event) => setUpdateState((current) => ({ ...current, ratePerGram: event.target.value }))}
            />
            <Input
              label="Effective From"
              type="datetime-local"
              value={updateState.effectiveDate}
              onChange={(event) => setUpdateState((current) => ({ ...current, effectiveDate: event.target.value }))}
            />
            <Select
              label="Status"
              value={updateState.status}
              onChange={(event) => setUpdateState((current) => ({ ...current, status: event.target.value as EntityStatus }))}
              options={[
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ]}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsUpdateOpen(false);
                setUpdateState(createEmptyUpdateState());
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSaveRate()} loading={isSaving}>
              Save Rate
            </Button>
          </DialogFooter>
        </Dialog>

        <Dialog
          open={isHistoryOpen}
          onClose={() => {
            setIsHistoryOpen(false);
            setHistoryState({ metalUid: "", purityUid: "" });
            setHistoryRows([]);
          }}
          title="Rate History"
          description="Review historical rates for a selected metal and purity."
          size="lg"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Metal"
              value={historyState.metalUid}
              onChange={(event) => setHistoryState({ metalUid: event.target.value, purityUid: "" })}
              options={activeMetals.map((metal) => ({ label: metal.name, value: metal.metalUid }))}
              placeholder="Select metal"
            />
            <Select
              label="Purity"
              value={historyState.purityUid}
              onChange={(event) => setHistoryState((current) => ({ ...current, purityUid: event.target.value }))}
              options={historyPurities.map((purity) => ({ label: purity.label, value: purity.purityUid }))}
              placeholder="Select purity"
            />
          </div>

          <div className="mt-4">
            {isHistoryLoading ? (
              <div className="text-sm text-[var(--color-text-secondary)]">Loading rate history...</div>
            ) : !historyState.metalUid || !historyState.purityUid ? (
              <EmptyState title="Select a metal and purity" description="Rate history will appear once both filters are chosen." />
            ) : historyRows.length === 0 ? (
              <EmptyState title="No rate history found" description="No saved rate history exists for this metal and purity combination." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_38%,white)]">
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Rate / Gram</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Effective From</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.rateUid} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-4 py-2 font-semibold tabular-nums text-[var(--color-text-primary)]">{formatCurrency(row.ratePerGram)}/g</td>
                        <td className="px-4 py-2 text-[var(--color-text-secondary)]">{formatDateTime(row.effectiveFrom || row.effectiveDate)}</td>
                        <td className="px-4 py-2"><Badge variant={getBadgeVariant(row.status || "ACTIVE")}>{row.status || "ACTIVE"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}

function createEmptyFormFromState(_: UpdateState): UpdateState {
  return createEmptyUpdateState();
}
