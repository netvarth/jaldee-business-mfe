import React from 'react';
import { 
  ArrowLeft, Pencil, MoreHorizontal, Search, 
  ChevronLeft, ChevronRight, LayoutGrid, List,
  Calendar, Store, Activity, FileText, ChevronDown, ChevronRight as ChevronRightIcon,
  Trash2, Package, ShoppingCart, X
} from '../icons';
import { cn } from '@jaldee/design-system';
import { CreatePurchase } from './CreatePurchase';

interface Batch {
  id: string;
  expiryDate: string;
  inHand: number;
  onHold: number;
  status: 'In Stock' | 'Expired';
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  variants: number;
  image: string;
  inHand: number;
  onHold: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  batches?: Batch[];
}

interface CatalogDetailsProps {
  title?: string;
  catalog: {
    id: string;
    name: string;
    store: string;
    status: 'Active' | 'Draft' | 'Archived';
    description?: string;
  };
  onBack: () => void;
  onEdit: () => void;
}

const MOCK_ITEMS: CatalogItem[] = [
  { 
    id: 'HF12338', 
    name: 'Lantern Shirt', 
    category: 'Shirt', 
    sku: 'LAN-SHIRT', 
    variants: 5, 
    inHand: 156,
    onHold: 12,
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=64&h=64&fit=crop',
    batches: [
      { id: 'B123-01', expiryDate: '2025-12-01', inHand: 100, onHold: 5, status: 'In Stock' },
      { id: 'B123-02', expiryDate: '2024-08-30', inHand: 56, onHold: 7, status: 'In Stock' },
    ]
  },
  { 
    id: 'HP32145', 
    name: 'Black Linen Pant', 
    category: 'Pant', 
    sku: 'B-LIN-PANT', 
    variants: 3, 
    inHand: 42,
    onHold: 5,
    status: 'Low Stock',
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=64&h=64&fit=crop' 
  },
  { 
    id: 'HF12345', 
    name: 'Lantern Shirt', 
    category: 'Shirt', 
    sku: 'LAN-SHIRT', 
    variants: 1, 
    inHand: 89,
    onHold: 2,
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=64&h=64&fit=crop',
    batches: [
      { id: 'B445-01', expiryDate: '2025-06-15', inHand: 89, onHold: 2, status: 'In Stock' },
    ]
  },
  { 
    id: 'HF12352', 
    name: 'Lantern Shirt', 
    category: 'Shirt', 
    sku: 'LAN-SHIRT', 
    variants: 3, 
    inHand: 0,
    onHold: 0,
    status: 'Out of Stock',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=64&h=64&fit=crop' 
  },
];

export const CatalogDetails = ({ title = 'Catalog Details', catalog, onBack, onEdit }: CatalogDetailsProps) => {
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [expandedRows, setExpandedRows] = React.useState<string[]>([]);
  const [activeActionMenu, setActiveActionMenu] = React.useState<string | null>(null);
  const [showCreatePurchase, setShowCreatePurchase] = React.useState(false);

  const toggleRow = (itemId: string) => {
    setExpandedRows(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setActiveActionMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (showCreatePurchase) {
    return (
      <CreatePurchase 
        onBack={() => setShowCreatePurchase(false)}
        onCreate={(data) => {
          console.log('New Purchase:', data);
          setShowCreatePurchase(false);
        }}
      />
    );
  }

  const ActionMenu = ({ itemId }: { itemId: string }) => (
    <div className="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] rounded-lg shadow-xl border border-[var(--color-border)] py-1 z-50 text-left">
      <button className="w-full px-4 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] flex items-center gap-2 transition-colors border-0 bg-transparent text-left cursor-pointer">
        <Activity className="h-3.5 w-3.5 text-[var(--color-primary)]" />
        Adjust stock
      </button>
      <button className="w-full px-4 py-2 text-xs font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] flex items-center gap-2 transition-colors border-0 bg-transparent text-left cursor-pointer">
        <Trash2 className="h-3.5 w-3.5" />
        Remove item
      </button>
      <button className="w-full px-4 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] flex items-center gap-2 transition-colors border-t border-[var(--color-border)] bg-transparent text-left cursor-pointer">
        <FileText className="h-3.5 w-3.5 text-[var(--color-text-disabled)]" />
        Archive item
      </button>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full bg-[var(--color-surface-alt)]/20">
      {/* Header Bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button 
          onClick={onBack}
          className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">{title}</h1>
      </div>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Consolidated Catalog Header */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/20">
            <div className="flex items-center gap-3 text-left">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight leading-tight">{catalog.name}</h2>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    catalog.status === 'Active' && "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
                    catalog.status === 'Draft' && "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
                    catalog.status === 'Archived' && "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
                  )}>
                    {catalog.status}
                  </span>
                </div>
                {title !== 'Order Catalog Details' && (
                  <span className="text-[11px] text-[var(--color-text-secondary)]/60 font-medium tracking-tight">Catalog ID: #{catalog.id}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={onEdit}
                  className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-colors shadow-sm bg-transparent cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button className="p-1.5 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shadow-sm bg-transparent cursor-pointer">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-5 text-left">
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-4 max-w-3xl">
              {catalog.description || "This inventory catalog contains all essential hardware and apparel items for domestic warehouses."}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
                  <Store className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Store</div>
                  <div className="text-[12px] font-bold text-[var(--color-text-primary)]">{catalog.store}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-success-subtle)] flex items-center justify-center shrink-0">
                  <Activity className="h-3.5 w-3.5 text-[var(--color-success)]" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Status</div>
                  <div className="text-[10px] font-bold text-[var(--color-success)] bg-[var(--color-success-subtle)] px-1.5 py-0.5 rounded leading-none inline-block uppercase">
                    {catalog.status}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-warning-subtle)] flex items-center justify-center shrink-0">
                  <LayoutGrid className="h-3.5 w-3.5 text-[var(--color-warning)]" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Items</div>
                  <div className="text-[12px] font-bold text-[var(--color-text-primary)]">24 Total</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-success-subtle)]/30 flex items-center justify-center shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-[var(--color-success)]" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Modified</div>
                  <div className="text-[12px] font-bold text-[var(--color-text-primary)]">Aug 12, 2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table Section */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          {/* Items Toolbar */}
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
              <input 
                type="text" 
                placeholder="Search items..." 
                className="pl-9 pr-4 py-1.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-primary)] w-64 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[var(--color-border)] rounded-lg p-0.5 bg-[var(--color-surface)] shadow-sm">
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-all border-0 bg-transparent cursor-pointer",
                    viewMode === 'list' ? "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-secondary)]/50 hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-md transition-all border-0 bg-transparent cursor-pointer",
                    viewMode === 'grid' ? "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-secondary)]/50 hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              <button 
                onClick={() => setShowCreatePurchase(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg text-[13px] font-bold hover:bg-[var(--color-surface-alt)] transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4 text-[var(--color-text-secondary)]" />
                Create Purchase
              </button>

              <button 
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-lg text-[13px] font-bold hover:opacity-90 transition-all shadow-md active:scale-95 border-0 cursor-pointer"
              >
                + Add Item
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                    <th className="py-3 px-5 w-10"></th>
                    <th className="py-3 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Item Details</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Category</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-center">Inhand</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {MOCK_ITEMS.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={cn(
                          "hover:bg-[var(--color-surface-alt)]/20 transition-colors cursor-pointer",
                          expandedRows.includes(item.id) && "bg-[var(--color-surface-alt)]/10"
                        )}
                        onClick={() => item.batches && toggleRow(item.id)}
                      >
                        <td className="py-3 px-5">
                          {item.batches && (
                            <div className="text-[var(--color-text-secondary)]">
                              {expandedRows.includes(item.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3 text-left">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)] shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-[var(--color-text-primary)] leading-tight">{item.name}</span>
                              <span className="text-[10px] text-[var(--color-text-secondary)]/60 font-medium">#{item.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">{item.category}</span>
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span className="text-[12px] font-bold text-[var(--color-text-primary)]">{item.inHand}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            item.status === 'In Stock' && "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
                            item.status === 'Low Stock' && "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
                            item.status === 'Out of Stock' && "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
                          )}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right relative">
                          <button 
                            className="p-1 px-2 hover:bg-[var(--color-surface-alt)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenu(activeActionMenu === item.id ? null : item.id);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {activeActionMenu === item.id && <ActionMenu itemId={item.id} />}
                        </td>
                      </tr>
                      {expandedRows.includes(item.id) && item.batches && (
                        <tr className="bg-[var(--color-surface-alt)]/30">
                          <td colSpan={6} className="p-0">
                            <div className="px-10 py-3">
                              <table className="w-full text-left border-collapse bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm">
                                <thead>
                                  <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                    <th className="py-2 px-4 text-[10px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-wider">Batch Number</th>
                                    <th className="py-2 px-4 text-[10px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-wider">Expiry</th>
                                    <th className="py-2 px-4 text-[10px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-wider text-center">Inhand</th>
                                    <th className="py-2 px-4 text-[10px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-wider text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                  {item.batches.map((batch) => (
                                    <tr key={batch.id} className="hover:bg-[var(--color-surface-alt)]/50">
                                      <td className="py-2 px-4">
                                        <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">{batch.id}</span>
                                      </td>
                                      <td className="py-2 px-4">
                                        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]/80">{batch.expiryDate}</span>
                                      </td>
                                      <td className="py-2 px-4 text-center">
                                        <span className="text-[11px] font-bold text-[var(--color-text-primary)]">{batch.inHand}</span>
                                      </td>
                                      <td className="py-2 px-4 text-right">
                                        <button 
                                          className="p-1 px-2.5 hover:bg-[var(--color-primary-subtle)] rounded text-[var(--color-primary)] border border-transparent hover:border-[var(--color-primary)]/10 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ml-auto cursor-pointer bg-transparent"
                                          onClick={(e) => { e.stopPropagation(); }}
                                        >
                                          <Activity className="h-3 w-3" />
                                          <span className="text-[10px] font-bold">Adjust</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MOCK_ITEMS.map((item) => (
                <div key={item.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm hover:shadow-md transition-shadow group flex flex-col relative">
                  {/* Top: Image Section */}
                  <div className="p-1.5">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Body: Compact info sections */}
                  <div className="px-3 pb-3 flex-1 flex flex-col text-left">
                    <div className="mb-2">
                      <h3 className="text-[13px] font-bold text-[var(--color-text-primary)] truncate leading-tight">{item.name}</h3>
                      <p className="text-[10px] text-[var(--color-text-secondary)]/50 font-mono tracking-tight">#{item.id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-[var(--color-border)]">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-[var(--color-text-secondary)]/50 uppercase font-bold tracking-widest leading-none mb-1">Inhand</span>
                        <span className="text-[11px] font-bold text-[var(--color-text-primary)]">{item.inHand}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] text-[var(--color-text-secondary)]/50 uppercase font-bold tracking-widest leading-none mb-1">Status</span>
                        <span className={cn(
                          "text-[9px] font-bold uppercase",
                          item.status === 'In Stock' && "text-[var(--color-success)]",
                          item.status === 'Low Stock' && "text-[var(--color-warning)]",
                          item.status === 'Out of Stock' && "text-[var(--color-danger)]",
                        )}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between relative">
                      {item.batches && item.batches.length > 0 ? (
                        <button 
                          className="flex items-center gap-1.5 px-2 py-1 hover:bg-[var(--color-primary-subtle)] rounded-md text-[var(--color-primary)] transition-all font-bold text-[10px] border-0 bg-transparent cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(item.id);
                          }}
                        >
                          <Package className="h-3.5 w-3.5" />
                          Batch Details
                        </button>
                      ) : (
                        <div />
                      )}
                      <button 
                        className="p-1 hover:bg-[var(--color-surface-alt)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenu(activeActionMenu === item.id ? null : item.id);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeActionMenu === item.id && <ActionMenu itemId={item.id} />}
                    </div>

                    {/* Floating Batch Details Popover */}
                    {expandedRows.includes(item.id) && item.batches && (
                      <div 
                        className="absolute -top-4 -left-4 -right-4 z-40 bg-[var(--color-surface)] shadow-2xl border border-[var(--color-border)] rounded-2xl flex flex-col min-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/50">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                            <span className="text-[12px] font-bold text-[var(--color-text-primary)] tracking-tight">Batch Details</span>
                          </div>
                          <button 
                            onClick={() => toggleRow(item.id)}
                            className="p-1 hover:bg-[var(--color-surface-alt)] rounded-md transition-colors border-0 bg-transparent cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                          </button>
                        </div>
                        <div className="divide-y divide-[var(--color-border)] p-1.5">
                          {item.batches.map((batch) => (
                            <div key={batch.id} className="p-2.5 transition-colors hover:bg-[var(--color-surface-alt)] rounded-lg group/batch">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-[var(--color-text-primary)]">{batch.id}</span>
                                <span className="text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-1.5 py-0.5 rounded">{batch.inHand}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Expires: {batch.expiryDate}</span>
                                <button className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-primary)] shadow-sm hover:bg-[var(--color-primary-subtle)] active:scale-90 transition-all cursor-pointer">
                                  <Activity className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20">
                          <button 
                            onClick={() => toggleRow(item.id)}
                            className="w-full py-2 text-[10px] font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors uppercase tracking-widest border-0 bg-transparent cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table Footer */}
          <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]/60">
              Showing <span className="text-[var(--color-text-primary)] font-bold">4</span> items
            </span>
            <div className="flex items-center gap-1.5">
              <button className="p-1 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)]/40 opacity-50 cursor-not-allowed bg-transparent">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border-0 cursor-pointer">1</button>
              <button className="p-1 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)]/40 opacity-50 cursor-not-allowed bg-transparent">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
