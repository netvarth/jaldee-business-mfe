import React, { useState } from 'react';
import { 
  ArrowLeft, Search, Plus, MoreHorizontal, 
  Store, MapPin, Phone, Users, ChevronDown,
  Filter, Grid, List as ListIcon, Check
} from '../icons';
import { cn } from '@jaldee/design-system';

interface StoreItem {
  id: string;
  name: string;
  location: string;
  contact: string;
  staff: number;
  status: 'Active' | 'Inactive';
}

const STORES_DATA: StoreItem[] = [
  { id: 'ST001', name: 'Downtown Main', location: 'Thrissur, Kerala', contact: '+91 98765 43210', staff: 12, status: 'Active' },
  { id: 'ST002', name: 'Valley View Mall', location: 'Kochi, Kerala', contact: '+91 98765 43211', staff: 8, status: 'Active' },
  { id: 'ST003', name: 'City Center Hub', location: 'Calicut, Kerala', contact: '+91 98765 43212', staff: 15, status: 'Active' },
  { id: 'ST004', name: 'North Station Annex', location: 'Palakkad, Kerala', contact: '+91 98765 43213', staff: 5, status: 'Inactive' },
  { id: 'ST005', name: 'South Park Plaza', location: 'Trivandrum, Kerala', contact: '+91 98765 43214', staff: 10, status: 'Active' },
  { id: 'ST006', name: 'East End Outlet', location: 'Kottayam, Kerala', contact: '+91 98765 43215', staff: 6, status: 'Active' },
];

export const StoresGrid = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredStores = STORES_DATA.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 h-full bg-[var(--color-surface-alt)]/20">
      {/* Page Header Bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
          </button>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">Stores</h1>
        </div>
        
        <button className="bg-[var(--color-primary)] text-[var(--color-primary-text)] px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-colors shadow-sm border-0 cursor-pointer">
          <Plus className="h-4 w-4" />
          Add New Store
        </button>
      </div>

      <div className="p-8 space-y-6 overflow-y-auto text-left">
        {/* Toolbar */}
        <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[300px] text-left">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stores..." 
                  className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all"
                />
              </div>
              
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors shadow-sm cursor-pointer">
                <Filter className="h-4 w-4 text-[var(--color-primary)]" />
                Filter
              </button>
            </div>

            <div className="flex items-center bg-[var(--color-surface-alt)] p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-md transition-all border-0 cursor-pointer",
                  viewMode === 'grid' ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)]/50 hover:text-[var(--color-text-secondary)] bg-transparent"
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-md transition-all border-0 cursor-pointer",
                  viewMode === 'list' ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)]/50 hover:text-[var(--color-text-secondary)] bg-transparent"
                )}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Store Grid */}
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {filteredStores.map((store) => (
            <div 
              key={store.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[var(--color-primary)] transition-all group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 bg-[var(--color-primary-subtle)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-primary-text)] transition-colors">
                  <Store className="h-6 w-6" />
                </div>
                <button className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent cursor-pointer">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">{store.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-[var(--color-text-secondary)]/60 font-medium">#{store.id}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]/40">•</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    store.status === 'Active' ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
                  )}>
                    {store.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                  <div className="p-1.5 bg-[var(--color-surface-alt)] rounded-lg shrink-0">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium truncate">{store.location}</span>
                </div>
                <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                  <div className="p-1.5 bg-[var(--color-surface-alt)] rounded-lg shrink-0">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">{store.contact}</span>
                </div>
                <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                  <div className="p-1.5 bg-[var(--color-surface-alt)] rounded-lg shrink-0">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">{store.staff} Staff Members</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--color-border)] flex items-center justify-between">
                <button className="text-sm font-bold text-[var(--color-primary)] hover:opacity-80 transition-colors flex items-center gap-1 border-0 bg-transparent cursor-pointer">
                  View Analytics
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-7 w-7 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-alt)] overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${store.id}${i}`} alt="" />
                    </div>
                  ))}
                  <div className="h-7 w-7 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-alt)] flex items-center justify-center text-[13px] font-bold text-[var(--color-text-secondary)]">
                    +{store.staff - 3}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
