import React, { useState, useMemo } from 'react';
import { Button, Checkbox, Input } from '@jaldee/design-system';
import { X, Search } from 'lucide-react';
import { useCustomerLabels } from '../services/useCustomerLabels';

interface LabelSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLabels: string[];
    onSave: (labels: string[]) => void;
}

export default function LabelSelectorModal({
    isOpen,
    onClose,
    selectedLabels,
    onSave,
}: LabelSelectorModalProps) {
    const { labels, loading } = useCustomerLabels();
    const [searchTerm, setSearchTerm] = useState('');
    const [localSelection, setLocalSelection] = useState<string[]>(selectedLabels);

    // Sync selection when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setLocalSelection(selectedLabels);
            setSearchTerm('');
        }
    }, [isOpen, selectedLabels]);

    const filteredLabels = useMemo(() => {
        return labels.filter(label => 
            label.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [labels, searchTerm]);

    if (!isOpen) return null;

    const handleToggle = (labelId: string) => {
        setLocalSelection(prev => 
            prev.includes(labelId) 
                ? prev.filter(l => l !== labelId)
                : [...prev, labelId]
        );
    };

    const handleSave = () => {
        onSave(localSelection);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="flex h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:h-auto sm:max-h-[85vh]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">Select Labels</h2>
                    <Button variant="ghost" size="sm" iconOnly icon={<X size={20} />} onClick={onClose} aria-label="Close" />
                </div>
                
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search labels..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-8 text-center text-sm text-slate-500">Loading labels...</div>
                    ) : filteredLabels.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No labels found.</div>
                    ) : (
                        <div className="flex flex-col">
                            {filteredLabels.map(label => {
                                const id = label.id || label.name;
                                return (
                                <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                                    <Checkbox
                                        checked={localSelection.includes(id)}
                                        onChange={() => handleToggle(id)}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">{label.name}</span>
                                        {label.description && (
                                            <span className="text-xs text-slate-500">{label.description}</span>
                                        )}
                                    </div>
                                </label>
                            )})}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Apply Labels</Button>
                </div>
            </div>
        </div>
    );
}
