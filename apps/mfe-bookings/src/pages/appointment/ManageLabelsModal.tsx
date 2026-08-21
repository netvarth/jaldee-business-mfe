import { useState, useEffect } from "react";
import { Button, Input, cn } from "@jaldee/design-system";
import { createPortal } from "react-dom";
import { useBookingApi } from "../../services/useBookingApi";
import { useCustomerLabels } from "../../services/useCustomerLabels";
import { useToast } from "../../contexts/ToastContext";
import { X } from "../../components/icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingUids: string[];
  initialLabels?: string[];
}

export default function ManageLabelsModal({ isOpen, onClose, bookingUids, initialLabels = [] }: Props) {
  const api = useBookingApi();
  const { showToast } = useToast();
  const { labels: availableLabels, loading: labelsLoading } = useCustomerLabels();
  const [submitting, setSubmitting] = useState(false);
  const [labels, setLabels] = useState<string[]>(initialLabels);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels, isOpen]);

  if (!isOpen) return null;

  const handleAddLabel = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (labels.includes(trimmed)) {
       showToast("Label already exists", "error");
       return;
    }
    setLabels([...labels, trimmed]);
    setNewLabel("");
  };

  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter(l => l !== label));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const addedLabels = labels.filter(l => !initialLabels.includes(l));
      const removedLabels = initialLabels.filter(l => !labels.includes(l));
      
      const addedLabelsMap = addedLabels.reduce((acc, l) => {
        acc[l] = "true";
        return acc;
      }, {} as Record<string, string>);

      const promises: Promise<any>[] = [];

      if (bookingUids.length === 1) {
        const uid = bookingUids[0];
        
        if (addedLabels.length > 0) {
          promises.push(api.post(`/bookings/${uid}/labels`, { labels: addedLabelsMap }));
        }
        
        for (const removed of removedLabels) {
          promises.push(api.del(`/bookings/${uid}/labels/${removed}`));
        }
      } else if (bookingUids.length > 1) {
        if (addedLabels.length > 0) {
          promises.push(api.post(`/bookings/labels/batch`, {
            bookingUids,
            labels: addedLabelsMap
          }));
        }
        
        if (removedLabels.length > 0) {
          promises.push(api.del(`/bookings/labels/batch`, {
            data: {
              bookingUids,
              labelKeys: removedLabels
            }
          }));
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      showToast(bookingUids.length > 1 ? "Bulk labels updated successfully" : "Labels updated successfully", "success");
      onClose();
    } catch (err) {
      showToast("Failed to update labels", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-800">Manage Labels</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Type a new label..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddLabel}>Add</Button>
            </div>
            
            {availableLabels && availableLabels.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-4">Available Labels</h3>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {availableLabels.map(label => {
                    const isSelected = labels.includes(label.name);
                    return (
                      <button
                        key={label.id || label.name}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveLabel(label.name);
                          } else {
                            setLabels([...labels, label.name]);
                          }
                        }}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border text-left",
                          isSelected 
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        )}
                        title={label.description}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-4">Selected Labels</h3>
              <div className="flex flex-wrap gap-2">
                {labels.map(label => (
                  <div key={label} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 border border-slate-200">
                    {label}
                    <button type="button" onClick={() => handleRemoveLabel(label)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {labels.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No labels assigned.</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Labels
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
