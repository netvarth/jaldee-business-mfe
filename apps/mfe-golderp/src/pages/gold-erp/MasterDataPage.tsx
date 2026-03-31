import { useState } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { FilterBar } from "@/components/gold-erp/FilterBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { MasterDataFormModal } from "@/components/gold-erp/MasterDataFormModal";
import { useMetals, usePurities, useStones } from "@/hooks/useMasterData";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { formatCurrency } from "@/lib/gold-erp-utils";
import { Metal, MetalPurity, Stone } from "@/lib/gold-erp-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState("metals");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMetal, setEditMetal] = useState<Metal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Metal | null>(null);
  const [editPurity, setEditPurity] = useState<MetalPurity | null>(null);
  const [deletePurityTarget, setDeletePurityTarget] = useState<MetalPurity | null>(null);
  const [editStone, setEditStone] = useState<Stone | null>(null);
  const [searchMetal, setSearchMetal] = useState("");
  const [searchStone, setSearchStone] = useState("");

  const { data: metals = [], isLoading: metalsLoading } = useMetals();
  const { data: purities = [], isLoading: puritiesLoading } = usePurities();
  const { data: stones = [], isLoading: stonesLoading } = useStones();

  const filteredPurities = purities.filter((purity: any) => {
    const query = searchMetal.toLowerCase();
    if (!query) return true;
    return (
      purity.purityCode?.toLowerCase().includes(query) ||
      purity.label?.toLowerCase().includes(query) ||
      purity.metalName?.toLowerCase().includes(query)
    );
  });

  const filteredStones = stones.filter((stone: any) => {
    const query = searchStone.toLowerCase();
    if (!query) return true;
    return (
      stone.name?.toLowerCase().includes(query) ||
      stone.stoneCode?.toLowerCase().includes(query) ||
      stone.stoneType?.toLowerCase().includes(query) ||
      stone.shape?.toLowerCase().includes(query) ||
      stone.clarity?.toLowerCase().includes(query) ||
      stone.cut?.toLowerCase().includes(query)
    );
  });

  const handleEditPurity = (purity: MetalPurity) => {
    setEditMetal(null);
    setEditStone(null);
    setEditPurity(purity);
    setIsModalOpen(true);
  };

  const handleEditMetal = (metal: Metal) => {
    setEditPurity(null);
    setEditStone(null);
    setEditMetal(metal);
    setIsModalOpen(true);
  };

  const handleEditStone = (stone: Stone) => {
    setEditMetal(null);
    setEditPurity(null);
    setEditStone(stone);
    setIsModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditMetal(null);
      setEditPurity(null);
      setEditStone(null);
    }
  };

  const handleDeleteConfirm = () => {
    // DELETE API endpoint is pending — placeholder for future integration
    setDeleteTarget(null);
  };

  const handleDeletePurityConfirm = () => {
    // DELETE API endpoint is pending
    setDeletePurityTarget(null);
  };

  return (
    <div className="erp-section-gap">
      <PageHeader title="Master Data" subtitle="Configure metals, purities, stones, and supported reference values">
        <Button size="sm" onClick={() => { setEditMetal(null); setEditPurity(null); setEditStone(null); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add New
        </Button>
      </PageHeader>

      <MasterDataFormModal open={isModalOpen} onOpenChange={handleModalClose} defaultTab={activeTab} editMetal={editMetal} editPurity={editPurity} editStone={editStone} />

      {/* Delete confirmation dialog - Metal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Metal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name} ({deleteTarget?.metalCode})</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog - Purity */}
      <AlertDialog open={!!deletePurityTarget} onOpenChange={(open) => !open && setDeletePurityTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletePurityTarget?.purityCode} ({deletePurityTarget?.label})</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePurityConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="metals">Metal Master</TabsTrigger>
          <TabsTrigger value="purities">Metal Purity Master</TabsTrigger>
          <TabsTrigger value="stones">Stone Master</TabsTrigger>
          {/* <TabsTrigger value="making">Making Charges</TabsTrigger> */}
        </TabsList>

        <TabsContent value="metals" className="mt-4">
          <SectionCard title="Metal Master" noPadding>
            {metalsLoading && <div className="p-4 text-sm text-muted-foreground">Loading metals...</div>}
            {metals.length === 0 && !metalsLoading ? (
              <EmptyStateBlock title="No metals available" description="Add a metal master to start configuring purities and rates." />
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Metal</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {metals.map((metal: any) => (
                    <tr key={metal.metalUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium text-foreground">{metal.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{metal.metalCode}</td>
                      <td className="px-4 py-2"><StatusBadge status={metal.status} /></td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditMetal(metal)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(metal)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="purities" className="mt-4">
          <SectionCard
            title="Metal Purity Master"
            noPadding
            headerAction={<FilterBar searchPlaceholder="Search purity..." searchValue={searchMetal} onSearchChange={setSearchMetal} className="w-auto" />}
          >
            {puritiesLoading && <div className="p-4 text-sm text-muted-foreground">Loading purities...</div>}
            {filteredPurities.length === 0 && !puritiesLoading ? (
              <EmptyStateBlock title="No purities available" description="Create a purity for one of the configured metals." />
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Metal</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Purity</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Label</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Ratio</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurities.map((purity: any) => (
                    <tr key={purity.purityUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 text-foreground">{purity.metalName || "-"}</td>
                      <td className="px-4 py-2 font-medium text-foreground">{purity.purityCode}</td>
                      <td className="px-4 py-2 text-muted-foreground">{purity.label}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-foreground">{Number(purity.purityRatio).toFixed(4)}</td>
                      <td className="px-4 py-2"><StatusBadge status={purity.status} /></td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPurity(purity)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletePurityTarget(purity)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="stones" className="mt-4">
          <SectionCard
            title="Stone Master"
            noPadding
            headerAction={<FilterBar searchPlaceholder="Search stone..." searchValue={searchStone} onSearchChange={setSearchStone} className="w-auto" />}
          >
            {stonesLoading && <div className="p-4 text-sm text-muted-foreground">Loading stones...</div>}
            {filteredStones.length === 0 && !stonesLoading ? (
              <EmptyStateBlock title="No stones available" description="Add a stone master to use it in item templates and GRN tag details." />
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Shape</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Clarity</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Cut</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Price / Piece</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStones.map((stone: Stone) => (
                    <tr key={stone.stoneUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium text-foreground font-mono text-xs">{stone.stoneCode}</td>
                      <td className="px-4 py-2 text-foreground">{stone.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{stone.stoneType}</td>
                      <td className="px-4 py-2 text-muted-foreground">{stone.shape}</td>
                      <td className="px-4 py-2 text-muted-foreground">{stone.clarity}</td>
                      <td className="px-4 py-2 text-muted-foreground">{stone.cut}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-foreground">{formatCurrency(stone.pricePerPiece)}</td>
                      <td className="px-4 py-2"><StatusBadge status={stone.status} /></td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditStone(stone)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* <TabsContent value="making" className="mt-4">
          <SectionCard title="Making Charge Configuration" subtitle="Read-only until a documented API is provided" noPadding>
            {chargesLoading && <div className="p-4 text-sm text-muted-foreground">Loading making charges...</div>}
            {makingCharges.length === 0 ? (
              <EmptyStateBlock title="No making charges available" description="No making charge records were returned by the configured endpoint." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item Type</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Metal</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Purity</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Charge Type</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Value</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {makingCharges.map((charge: any, index: number) => (
                      <tr key={charge.uid || index} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium text-foreground">{charge.itemType}</td>
                        <td className="px-4 py-2 text-foreground">{charge.metalName}</td>
                        <td className="px-4 py-2 text-foreground">{charge.purityName}</td>
                        <td className="px-4 py-2"><StatusBadge status={charge.chargeType?.replace(/_/g, " ")} variant="info" /></td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium text-foreground">{charge.chargeType === "PERCENTAGE" ? `${charge.chargeValue}%` : formatCurrency(charge.chargeValue)}</td>
                        <td className="px-4 py-2"><StatusBadge status={charge.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
