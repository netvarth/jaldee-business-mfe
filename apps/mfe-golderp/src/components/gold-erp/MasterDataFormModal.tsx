import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateMetal, useCreatePurity, useCreateStone, useMetals, useUpdateMetal, useUpdatePurity, useUpdateStone } from "@/hooks/useMasterData";
import { Metal, MetalPurity, Stone } from "@/lib/gold-erp-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  editMetal?: Metal | null;
  editPurity?: MetalPurity | null;
  editStone?: Stone | null;
}

function resolveDefaultForm(defaultTab?: string) {
  if (defaultTab === "stones") {
    return "stone";
  }

  if (defaultTab === "purities") {
    return "purity";
  }

  return "metal";
}

const STONE_TYPES = ["DIAMOND", "RUBY", "EMERALD", "SAPPHIRE", "PEARL", "TOPAZ", "AMETHYST", "OTHER"] as const;
const STONE_SHAPES = ["ROUND", "PRINCESS", "OVAL", "MARQUISE", "PEAR", "CUSHION", "HEART", "EMERALD_CUT", "OTHER"] as const;
const STONE_CLARITIES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "NOT_APPLICABLE"] as const;
const STONE_CUTS = ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "NOT_APPLICABLE"] as const;

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function MasterDataFormModal({ open, onOpenChange, defaultTab = "metals", editMetal, editPurity, editStone }: Props) {
  const isEditMetal = Boolean(editMetal);
  const isEditPurity = Boolean(editPurity);
  const isEditStone = Boolean(editStone);
  const isEditMode = isEditMetal || isEditPurity || isEditStone;

  const [activeForm, setActiveForm] = useState(resolveDefaultForm(defaultTab));
  const { data: metalsList = [] } = useMetals();
  const createMetal = useCreateMetal();
  const updateMetal = useUpdateMetal();
  const createPurity = useCreatePurity();
  const updatePurity = useUpdatePurity();
  const createStone = useCreateStone();
  const updateStone = useUpdateStone();

  const [metalCode, setMetalCode] = useState("");
  const [metalName, setMetalName] = useState("");
  const [metalStatus, setMetalStatus] = useState("ACTIVE");

  const [purityMetalUid, setPurityMetalUid] = useState("");
  const [purityCode, setPurityCode] = useState("");
  const [purityLabel, setPurityLabel] = useState("");
  const [purityRatio, setPurityRatio] = useState("");
  const [purityStatus, setPurityStatus] = useState("ACTIVE");

  const [stoneCode, setStoneCode] = useState("");
  const [stoneName, setStoneName] = useState("");
  const [stoneType, setStoneType] = useState("DIAMOND");
  const [stoneShape, setStoneShape] = useState("ROUND");
  const [stoneClarity, setStoneClarity] = useState("VVS1");
  const [stoneCut, setStoneCut] = useState("EXCELLENT");
  const [stonePrice, setStonePrice] = useState("");
  const [stoneStatus, setStoneStatus] = useState("ACTIVE");

  useEffect(() => {
    if (editMetal) {
      setActiveForm("metal");
      setMetalCode(editMetal.metalCode);
      setMetalName(editMetal.name);
      setMetalStatus(editMetal.status);
    } else if (editPurity) {
      setActiveForm("purity");
      setPurityMetalUid(editPurity.metalUid);
      setPurityCode(editPurity.purityCode);
      setPurityLabel(editPurity.label);
      setPurityRatio(String(editPurity.purityRatio));
      setPurityStatus(editPurity.status);
    } else if (editStone) {
      setActiveForm("stone");
      setStoneCode(editStone.stoneCode);
      setStoneName(editStone.name);
      setStoneType(editStone.stoneType);
      setStoneShape(editStone.shape);
      setStoneClarity(editStone.clarity);
      setStoneCut(editStone.cut);
      setStonePrice(String(editStone.pricePerPiece));
      setStoneStatus(editStone.status);
    } else {
      setActiveForm(resolveDefaultForm(defaultTab));
      setMetalCode(""); setMetalName(""); setMetalStatus("ACTIVE");
      setPurityMetalUid(""); setPurityCode(""); setPurityLabel(""); setPurityRatio(""); setPurityStatus("ACTIVE");
      setStoneCode(""); setStoneName(""); setStoneType("DIAMOND"); setStoneShape("ROUND"); setStoneClarity("VVS1"); setStoneCut("EXCELLENT"); setStonePrice(""); setStoneStatus("ACTIVE");
    }
  }, [editMetal, editPurity, editStone, defaultTab, open]);

  const handleSubmitMetal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMetal && editMetal) {
        await updateMetal.mutateAsync({ metalUid: editMetal.metalUid, data: { metalCode, name: metalName, status: metalStatus as "ACTIVE" | "INACTIVE" } });
        toast.success("Metal updated successfully");
      } else {
        await createMetal.mutateAsync({ metalCode, name: metalName, status: metalStatus as "ACTIVE" | "INACTIVE" });
        toast.success("Metal created successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(isEditMetal ? "Failed to update metal" : "Failed to create metal", { description: err.message });
    }
  };

  const handleSubmitPurity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditPurity && editPurity) {
        await updatePurity.mutateAsync({
          purityUid: editPurity.purityUid,
          data: { metalUid: purityMetalUid, purityCode, label: purityLabel, purityRatio: parseFloat(purityRatio), status: purityStatus as "ACTIVE" | "INACTIVE" },
        });
        toast.success("Purity updated successfully");
      } else {
        await createPurity.mutateAsync({ metalUid: purityMetalUid, purityCode, label: purityLabel, purityRatio: parseFloat(purityRatio), status: purityStatus as "ACTIVE" | "INACTIVE" });
        toast.success("Purity created successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(isEditPurity ? "Failed to update purity" : "Failed to create purity", { description: err.message });
    }
  };

  const handleSubmitStone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        stoneCode,
        name: stoneName,
        stoneType: stoneType as Stone["stoneType"],
        shape: stoneShape as Stone["shape"],
        clarity: stoneClarity as Stone["clarity"],
        cut: stoneCut as Stone["cut"],
        pricePerPiece: parseFloat(stonePrice),
        status: stoneStatus as "ACTIVE" | "INACTIVE",
      };

      if (isEditStone && editStone) {
        await updateStone.mutateAsync({ stoneUid: editStone.stoneUid, data: payload });
        toast.success("Stone updated successfully");
      } else {
        await createStone.mutateAsync(payload);
        toast.success("Stone created successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(isEditStone ? "Failed to update stone" : "Failed to create stone", { description: err.message });
    }
  };

  const dialogTitle = isEditMetal ? "Edit Metal" : isEditPurity ? "Edit Purity" : isEditStone ? "Edit Stone" : "Add Master Data";
  const dialogDesc = isEditMetal
    ? "Update the metal master record."
    : isEditPurity
    ? "Update the metal purity record."
    : isEditStone
    ? "Update the stone master record."
    : "Create metal, purity, or stone master records used across Gold ERP.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>

        {!isEditMode && (
          <div className="flex space-x-2 my-2 border-b border-border pb-2">
            <Button variant={activeForm === "metal" ? "default" : "outline"} size="sm" onClick={() => setActiveForm("metal")}>Metal</Button>
            <Button variant={activeForm === "purity" ? "default" : "outline"} size="sm" onClick={() => setActiveForm("purity")}>Purity</Button>
            <Button variant={activeForm === "stone" ? "default" : "outline"} size="sm" onClick={() => setActiveForm("stone")}>Stone</Button>
          </div>
        )}

        {activeForm === "metal" && (
          <form onSubmit={handleSubmitMetal} className="space-y-4">
            <div className="space-y-2"><Label>Metal Code</Label><Input required value={metalCode} onChange={(e) => setMetalCode(e.target.value)} /></div>
            <div className="space-y-2"><Label>Metal Name</Label><Input required value={metalName} onChange={(e) => setMetalName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={metalStatus} onValueChange={setMetalStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMetal.isPending || updateMetal.isPending}>
                {isEditMetal ? "Update Metal" : "Save Metal"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {activeForm === "purity" && (
          <form onSubmit={handleSubmitPurity} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Metal</Label>
              <Select value={purityMetalUid} onValueChange={setPurityMetalUid}>
                <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                <SelectContent>
                  {metalsList.map((metal: any) => (
                    <SelectItem key={metal.metalUid} value={metal.metalUid}>{metal.name} ({metal.metalCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Purity Code</Label><Input required value={purityCode} onChange={(e) => setPurityCode(e.target.value)} /></div>
              <div className="space-y-2"><Label>Display Label</Label><Input required value={purityLabel} onChange={(e) => setPurityLabel(e.target.value)} /></div>
              <div className="space-y-2"><Label>Purity Ratio</Label><Input type="number" step="0.0001" required value={purityRatio} onChange={(e) => setPurityRatio(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={purityStatus} onValueChange={setPurityStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createPurity.isPending || updatePurity.isPending}>
                {isEditPurity ? "Update Purity" : "Save Purity"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {activeForm === "stone" && (!isEditMode || isEditStone) && (
          <form onSubmit={handleSubmitStone} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Stone Code</Label><Input required value={stoneCode} onChange={(e) => setStoneCode(e.target.value)} /></div>
              <div className="space-y-2"><Label>Name</Label><Input required value={stoneName} onChange={(e) => setStoneName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={stoneType} onValueChange={setStoneType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STONE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{formatEnumLabel(type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shape</Label>
                <Select value={stoneShape} onValueChange={setStoneShape}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STONE_SHAPES.map((shape) => (
                      <SelectItem key={shape} value={shape}>{formatEnumLabel(shape)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Clarity</Label>
                <Select value={stoneClarity} onValueChange={setStoneClarity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STONE_CLARITIES.map((clarity) => (
                      <SelectItem key={clarity} value={clarity}>{formatEnumLabel(clarity)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cut</Label>
                <Select value={stoneCut} onValueChange={setStoneCut}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STONE_CUTS.map((cut) => (
                      <SelectItem key={cut} value={cut}>{formatEnumLabel(cut)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Price per Piece</Label><Input type="number" required value={stonePrice} onChange={(e) => setStonePrice(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={stoneStatus} onValueChange={setStoneStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createStone.isPending || updateStone.isPending}>
                {isEditStone ? "Update Stone" : "Save Stone"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
