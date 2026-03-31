import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { buildCsvFromRows, downloadPdfDocument, downloadTextFile, flattenExportRows } from "@/lib/gold-erp-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    name: string;
    data: unknown;
  } | null;
}

type ExportFormat = "csv" | "json" | "pdf";

export function ReportExportModal({ open, onOpenChange, report }: Props) {
  const [format, setFormat] = useState<ExportFormat>("pdf");

  if (!report) {
    return null;
  }

  const rows = flattenExportRows(report.data);
  const fileBase = report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const handleExport = () => {
    try {
      if (format === "json") {
        downloadTextFile(JSON.stringify(report.data, null, 2), `${fileBase}.json`, "application/json");
      } else if (format === "csv") {
        downloadTextFile(buildCsvFromRows(rows), `${fileBase}.csv`, "text/csv;charset=utf-8");
      } else {
        downloadPdfDocument(report.name, rows);
      }

      toast.success(`${report.name} exported`, {
        description: `Downloaded in ${format.toUpperCase()} format.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Export failed", {
        description: err?.message || "The report could not be exported.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Export {report.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {rows.length} row{rows.length === 1 ? "" : "s"} will be exported from the current live dataset.
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose export format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)} className="space-y-2">
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="pdf" id="report-export-pdf" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">PDF</div>
                  <div className="text-xs text-muted-foreground">Printable report summary generated from the live rows.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="csv" id="report-export-csv" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">CSV</div>
                  <div className="text-xs text-muted-foreground">Spreadsheet-friendly export for Excel or Google Sheets.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="json" id="report-export-json" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">JSON</div>
                  <div className="text-xs text-muted-foreground">Raw structured export of the live API-backed data.</div>
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
