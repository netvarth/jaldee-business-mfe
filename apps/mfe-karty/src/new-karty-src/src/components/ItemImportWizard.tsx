import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle2, AlertCircle, PlayCircle, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useSubmitImport, useImportJob, ItemImportRequest } from '../../../services/useItems';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ItemImportWizard: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'create-only' | 'upsert'>('create-only');
  const [parsedPayload, setParsedPayload] = useState<ItemImportRequest | null>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const submitMutation = useSubmitImport();
  const { data: jobStatus, isFetching: isJobChecking } = useImportJob(jobId);

  // Template download — filled example: 2 items with units (per-unit pricing),
  // variants, and opening stock. Headers match the backend import DTO field names.
  // NOTE: `itemCode` is a file-local key that links the sheets; `storeName` must
  // already exist as a store. `uid`/`itemNo` are backend-assigned (not in the file).
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const itemsSheet = XLSX.utils.json_to_sheet([
      { itemCode: 'SUM-POLO-TEE', name: 'Summer Polo Tee', sku: 'SUM-POLO-TEE', kind: 'GOODS', verticalType: 'RETAIL', status: 'ACTIVE', categoryName: 'Shirt', baseUnitName: 'Piece', trackInventory: true, allowLooseSale: false, rxEnabled: false },
      { itemCode: 'CLA-DENIM-JACK', name: 'Classic Denim Canvas Jacket', sku: 'CLA-DENIM-JACK', kind: 'GOODS', verticalType: 'RETAIL', status: 'ACTIVE', categoryName: 'Jacket', baseUnitName: 'Piece', trackInventory: true, allowLooseSale: false, rxEnabled: false },
    ]);

    // Each item must have a base-unit row (conversionQty: 1, isDefault: true).
    const unitsSheet = XLSX.utils.json_to_sheet([
      { itemCode: 'SUM-POLO-TEE', unitName: 'Piece', conversionQty: 1, selling: true, purchase: true, isDefault: true, sellingPrice: 499, mrp: 599, minSaleQty: 1 },
      { itemCode: 'SUM-POLO-TEE', unitName: 'Pack of 3', conversionQty: 3, selling: true, purchase: false, isDefault: false, sellingPrice: 1399, mrp: 1599, minSaleQty: 1 },
      { itemCode: 'CLA-DENIM-JACK', unitName: 'Piece', conversionQty: 1, selling: true, purchase: true, isDefault: true, sellingPrice: 2999, mrp: 3499, minSaleQty: 1 },
    ]);

    const variantsSheet = XLSX.utils.json_to_sheet([
      { itemCode: 'SUM-POLO-TEE', variantName: 'Small', sku: 'SUM-POLO-TEE-S', sellingPrice: 499, mrp: 599 },
      { itemCode: 'SUM-POLO-TEE', variantName: 'Medium', sku: 'SUM-POLO-TEE-M', sellingPrice: 499, mrp: 599 },
      { itemCode: 'SUM-POLO-TEE', variantName: 'Large', sku: 'SUM-POLO-TEE-L', sellingPrice: 549, mrp: 649 },
      { itemCode: 'CLA-DENIM-JACK', variantName: 'Medium', sku: 'CLA-DENIM-JACK-M', sellingPrice: 2999, mrp: 3499 },
      { itemCode: 'CLA-DENIM-JACK', variantName: 'Large', sku: 'CLA-DENIM-JACK-L', sellingPrice: 2999, mrp: 3499 },
      { itemCode: 'CLA-DENIM-JACK', variantName: 'X-Large', sku: 'CLA-DENIM-JACK-XL', sellingPrice: 3099, mrp: 3599 },
    ]);

    // qty in base unit; variantSku optional; storeName must be an existing store.
    const stockSheet = XLSX.utils.json_to_sheet([
      { itemCode: 'SUM-POLO-TEE', variantSku: 'SUM-POLO-TEE-S', storeName: 'Main Store', qty: 40, unitName: 'Piece', batchNumber: '', costPrice: 250, openingDate: '2026-06-30' },
      { itemCode: 'SUM-POLO-TEE', variantSku: 'SUM-POLO-TEE-M', storeName: 'Main Store', qty: 60, unitName: 'Piece', batchNumber: '', costPrice: 250, openingDate: '2026-06-30' },
      { itemCode: 'CLA-DENIM-JACK', variantSku: 'CLA-DENIM-JACK-M', storeName: 'Main Store', qty: 25, unitName: 'Piece', batchNumber: '', costPrice: 1500, openingDate: '2026-06-30' },
    ]);

    XLSX.utils.book_append_sheet(wb, itemsSheet, "Items");
    XLSX.utils.book_append_sheet(wb, unitsSheet, "Units");
    XLSX.utils.book_append_sheet(wb, variantsSheet, "Variants");
    XLSX.utils.book_append_sheet(wb, stockSheet, "OpeningStock");
    XLSX.writeFile(wb, "ItemImportTemplate.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrors([]);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const items = XLSX.utils.sheet_to_json(workbook.Sheets['Items'] || workbook.Sheets[workbook.SheetNames[0]]) as any[];
      const units = workbook.Sheets['Units'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Units']) as any[] : [];
      const variants = workbook.Sheets['Variants'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Variants']) as any[] : [];
      const stock = workbook.Sheets['OpeningStock'] ? XLSX.utils.sheet_to_json(workbook.Sheets['OpeningStock']) as any[] : [];

      if (items.length === 0) {
        setErrors(['No items found in the spreadsheet.']);
        return;
      }
      if (items.length > 200) {
        setErrors([`Too many items: ${items.length}. Maximum allowed is 200 per batch.`]);
        return;
      }

      // Group nested records
      const payloadItems = items.map(item => ({
        ...item,
        units: units.filter(u => String(u.itemCode) === String(item.itemCode)),
        variants: variants.filter(v => String(v.itemCode) === String(item.itemCode)),
      }));

      setParsedPayload({
        mode,
        dryRun: false,
        items: payloadItems,
        openingStock: stock
      });
      setStep(2);
    } catch (err: any) {
      setErrors([`Error parsing file: ${err.message}`]);
    }
  };

  const handleDryRun = async () => {
    if (!parsedPayload) return;
    try {
      const res = await submitMutation.mutateAsync({ ...parsedPayload, dryRun: true });
      setDryRunResult(res.result);
      setStep(3);
    } catch (err: any) {
      setErrors([err.response?.data?.message || 'Dry run failed']);
    }
  };

  const handleExecute = async () => {
    if (!parsedPayload) return;
    try {
      const res = await submitMutation.mutateAsync({ ...parsedPayload, dryRun: false });
      setJobId(res.jobId);
      setStep(4);
    } catch (err: any) {
      setErrors([err.response?.data?.message || 'Execution failed']);
    }
  };

  const reset = () => {
    setStep(1);
    setParsedPayload(null);
    setDryRunResult(null);
    setJobId(null);
    setErrors([]);
  };

  const isJobDone = jobStatus?.status === 'DONE' || jobStatus?.status === 'ERROR';

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Import Items">
      <div className="p-6 space-y-6">
        {/* Progress Stepper */}
        <div className="flex justify-between border-b pb-4 mb-4 text-sm font-medium text-gray-500">
          <div className={step >= 1 ? "text-indigo-600" : ""}>1. Upload</div>
          <div className={step >= 2 ? "text-indigo-600" : ""}>2. Preview</div>
          <div className={step >= 3 ? "text-indigo-600" : ""}>3. Validate</div>
          <div className={step >= 4 ? "text-indigo-600" : ""}>4. Result</div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 p-4 rounded-md">
            <h4 className="text-red-800 flex items-center"><AlertCircle className="w-5 h-5 mr-2" /> Errors</h4>
            <ul className="list-disc pl-5 mt-2 text-sm text-red-700">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
              <div>
                <h3 className="font-semibold">Import Mode</h3>
                <p className="text-sm text-gray-500">Create new items or update existing ones</p>
              </div>
              <select
                className="border-gray-300 rounded-md shadow-sm"
                value={mode}
                onChange={e => setMode(e.target.value as any)}
              >
                <option value="create-only">Create Only (Skip existing)</option>
                <option value="upsert">Upsert (Create/Update)</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
              <UploadCloud className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <label className="cursor-pointer">
                <span className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-md font-medium hover:bg-indigo-100">
                  Select Excel File
                </span>
                <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <p className="mt-4 text-sm text-gray-500">Supports .xlsx and .csv formats (Max 200 items)</p>
            </div>

            <button onClick={downloadTemplate} className="text-indigo-600 text-sm flex items-center hover:underline">
              <Download className="w-4 h-4 mr-1" /> Download Multi-Sheet Template
            </button>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 2 && parsedPayload && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">File Parsed Successfully</h3>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>Items: {parsedPayload.items.length}</li>
                <li>Opening Stock Entries: {parsedPayload.openingStock.length}</li>
                <li>Mode: {parsedPayload.mode}</li>
              </ul>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleDryRun} isLoading={submitMutation.isPending}>
                <PlayCircle className="w-4 h-4 mr-2" /> Run Validation (Dry Run)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Dry Run Result */}
        {step === 3 && dryRunResult && (
          <div className="space-y-4">
            <h3 className="font-semibold">Validation Results</h3>
            <div className="grid grid-cols-4 gap-4 mb-4 text-center">
              <div className="bg-green-50 p-3 rounded"><div className="text-xl font-bold text-green-700">{dryRunResult.created}</div><div className="text-xs">Valid (New)</div></div>
              <div className="bg-blue-50 p-3 rounded"><div className="text-xl font-bold text-blue-700">{dryRunResult.updated}</div><div className="text-xs">Valid (Update)</div></div>
              <div className="bg-gray-100 p-3 rounded"><div className="text-xl font-bold text-gray-700">{dryRunResult.skipped}</div><div className="text-xs">Skipped</div></div>
              <div className="bg-red-50 p-3 rounded"><div className="text-xl font-bold text-red-700">{dryRunResult.errors}</div><div className="text-xs">Errors</div></div>
            </div>

            {dryRunResult.errors > 0 ? (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-800 font-medium">Please fix the errors in your spreadsheet and upload again.</p>
                <div className="mt-2 max-h-40 overflow-y-auto text-xs text-red-700 space-y-2">
                  {dryRunResult.rows.filter((r: any) => r.status === 'ERROR').map((row: any, i: number) => (
                    <div key={i}><strong>Row {row.rowIndex} ({row.itemCode}):</strong> {row.errors.join(', ')}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 p-4 rounded-md flex items-center text-green-800">
                <CheckCircle2 className="w-5 h-5 mr-2" /> All items passed validation!
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>Back to Upload</Button>
              {dryRunResult.errors === 0 && (
                <Button onClick={handleExecute} isLoading={submitMutation.isPending}>Execute Import</Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Live Result */}
        {step === 4 && (
          <div className="space-y-4 text-center py-8">
            {!isJobDone ? (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold">Importing...</h3>
                <p className="text-gray-500">Processing items in background ({jobStatus?.progress || 0}%)</p>
              </div>
            ) : (
              <div>
                {jobStatus?.status === 'ERROR' ? (
                  <>
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-700">Import Failed</h3>
                    <p className="text-gray-600 mt-2">{jobStatus.errorMessage}</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-700">Import Complete</h3>
                    <p className="text-gray-600 mt-2">
                      Successfully processed {jobStatus?.result?.totalRows} items.
                    </p>
                  </>
                )}
                <div className="mt-8 flex justify-center">
                  <Button onClick={() => { reset(); onClose(); onSuccess(); }}>Close</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
