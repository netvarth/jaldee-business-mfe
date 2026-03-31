import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { buildCsvFromRows, downloadExcelDocument, downloadPdfDocument, downloadWordDocument } from "@/lib/gold-erp-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: Record<string, unknown>[];
}

type ExportFormat = "pdf" | "word" | "excel" | "csv";

export function DataExportModal({ open, onOpenChange, title, rows }: Props) {
  const [format, setFormat] = useState<ExportFormat>("pdf");

  const handleExport = () => {
    try {
      if (format === "csv") {
        const csvContent = buildCsvFromRows(rows);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else if (format === "excel") {
        downloadExcelDocument(title, rows);
      } else if (format === "word") {
        downloadWordDocument(title, rows);
      } else {
        downloadPdfDocument(title, rows);
      }

      toast.success(`${title} exported`, {
        description: `Downloaded in ${format.toUpperCase()} format.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Export failed", {
        description: error?.message || "The export could not be generated.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Export {title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {rows.length} row{rows.length === 1 ? "" : "s"} will be exported from the current filtered sales dataset.
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose export format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)} className="space-y-2">
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="pdf" id="sales-export-pdf" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">PDF</div>
                  <div className="text-xs text-muted-foreground">Printable report generated from the current sales rows.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="word" id="sales-export-word" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">Word</div>
                  <div className="text-xs text-muted-foreground">Document export suitable for editing or sharing as a report.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="excel" id="sales-export-excel" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">Excel</div>
                  <div className="text-xs text-muted-foreground">Spreadsheet-style export that opens in Excel.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="csv" id="sales-export-csv" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">CSV</div>
                  <div className="text-xs text-muted-foreground">Comma-separated export for spreadsheet import and data processing.</div>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport}>
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
