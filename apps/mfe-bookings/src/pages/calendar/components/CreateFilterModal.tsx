import React, { useState } from 'react';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../../contexts/ModalContext';

interface CreateFilterModalProps {
    onSave: (name: string) => void;
    onSaveAndApply: (name: string) => void;
}

export default function CreateFilterModal({ onSave, onSaveAndApply }: CreateFilterModalProps) {
    const { closeModal } = useModal();
    const [filterName, setFilterName] = useState('');

    const handleSave = () => {
        if (!filterName.trim()) return;
        onSave(filterName.trim());
        closeModal();
    };

    const handleSaveAndApply = () => {
        if (!filterName.trim()) return;
        onSaveAndApply(filterName.trim());
        closeModal();
    };

    return (
        <div className="w-[420px] max-w-full bg-white rounded-xl p-6 shadow-xl relative">
            <button 
                onClick={closeModal}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <h3 className="font-bold text-lg text-slate-800 mb-6">Create Filter</h3>

            <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Filter Name</label>
                <input 
                    type="text" 
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Enter Filter Name" 
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    autoFocus
                />
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="secondary"
                    className="font-bold border-0 px-6"
                    style={{ backgroundColor: '#334155', color: 'white', borderRadius: '8px' }}
                    onClick={handleSave}
                    disabled={!filterName.trim()}
                >
                    Save
                </Button>
                <Button 
                    className="font-bold border-0 px-6"
                    style={{ backgroundColor: '#4C1D95', color: 'white', borderRadius: '8px' }}
                    onClick={handleSaveAndApply}
                    disabled={!filterName.trim()}
                >
                    Save & Apply
                </Button>
            </div>
        </div>
    );
}
