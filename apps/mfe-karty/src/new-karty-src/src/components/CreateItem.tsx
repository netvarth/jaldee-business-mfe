import React, { useState } from 'react';
import {
  ArrowLeft, Plus, ChevronDown, ChevronUp,
  Bold, Italic, Underline, Link,
  Image as ImageIcon, Video, Type,
  AlignLeft, MoreHorizontal, Code,
  Upload, Info, GripVertical, Trash2, Pencil,
  BookOpen, Droplet, Palette, Sun, Copy, MoreVertical, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ItemDetails } from './ItemDetails';
import { useUnits } from '../../../services/useUnits';
import { ItemUnitConfig, emptyUnitConfig, ItemUnitConfigValue } from './ItemUnitConfig';
import { useStores } from '../../../services/useStores';
import { useInventoryCatalogs } from '../../../services/useInventoryCatalogs';
import { useOrderCatalogs } from '../../../services/useOrderCatalogs';
import { useItems } from '../../../services/useItems';
import { useCapabilities } from '../../../services/useCapabilities';

// Human labels for the backend UnitType measurement families.
const UNIT_FAMILY_LABEL: Record<string, string> = {
  COUNT: 'Count',
  WEIGHT: 'Weight',
  VOLUME: 'Volume',
  LENGTH: 'Length',
  OTHER: 'Other',
};

interface SubSection {
  id: number;
  title: string;
  description: string;
  iconType: 'droplet' | 'palette' | 'sun' | 'other' | 'uploaded';
  iconUrl?: string;
}

interface InfoBlock {
  id: number;
  heading: string;
  description: string;
  isExpanded: boolean;
  subSections: SubSection[];
  iconUrl?: string;
}

interface CreateItemProps {
  onBack: () => void;
  onSave?: (updatedItem: any) => void;
  itemToEdit?: {
    id: string;
    name: string;
    code: string;
    category: string;
    sku: string;
    variants: number;
    trackInventory: boolean;
    status: 'Active' | 'Draft' | 'Archived';
    image?: string;
  };
}

export const CreateItem: React.FC<CreateItemProps> = ({ onBack, onSave, itemToEdit }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [itemName, setItemName] = useState(itemToEdit ? itemToEdit.name : '');
  // UX-1: block advancing past step 1 until required fields (Item Name, Category)
  // are set, instead of silently letting an item be created without them.
  const [formErrors, setFormErrors] = useState<{ name?: string; category?: string }>({});
  const [itemDescription, setItemDescription] = useState(itemToEdit ? ((itemToEdit as any).description || '') : '');
  const [sku, setSku] = useState(itemToEdit ? itemToEdit.sku : '');

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Auto trim and preserve scanned barcode
      const scanned = (e.currentTarget.value || '').trim();
      if (scanned) {
        setBarcode(scanned);
      }
    }
  };

  const [barcode, setBarcode] = useState(itemToEdit ? ((itemToEdit as any).barcode || (itemToEdit as any).barCode || '') : '');
  const [hsnCode, setHsnCode] = useState(itemToEdit ? ((itemToEdit as any).hsnCode || '') : '');
  const [weight, setWeight] = useState(itemToEdit ? ((itemToEdit as any).weight || '') : '');

  const { data: backendUnits } = useUnits();
  const { data: stores = [] } = useStores();
  const { data: catalogs = [] } = useInventoryCatalogs();
  const { data: orderCatalogs = [] } = useOrderCatalogs();
  const { data: items = [] } = useItems();
  // Capability gating: batch tracking + the pharma/AYUSH section only show when the
  // tenant has the matching capability enabled (retail tenants never see drug schedule).
  const { isEnabled: isCapabilityEnabled } = useCapabilities();
  const batchTrackingEnabled = isCapabilityEnabled('batchTrackingEnabled');
  const pharmaModeEnabled = isCapabilityEnabled('pharmaModeEnabled');
  const [baseUnitOpen, setBaseUnitOpen] = useState(false);
  const [baseUnitUid, setBaseUnitUid] = useState(itemToEdit?.baseUnitUid || '');
  const [unitConfig, setUnitConfig] = useState<ItemUnitConfigValue>(emptyUnitConfig(itemToEdit));

  const [trackStock, setTrackStock] = useState(itemToEdit ? itemToEdit.trackInventory : false);
  const [batchTracking, setBatchTracking] = useState(false);
  const [taxPreferenceOpen, setTaxPreferenceOpen] = useState(false);
  // ITM-011: taxPreference/taxGroup live in the item's jsonb attributes map. Read
  // attributes.* first (raw DTO), falling back to the flattened top-level scalar.
  const [selectedTaxPreference, setSelectedTaxPreference] = useState(itemToEdit ? ((itemToEdit as any).attributes?.taxPreference || (itemToEdit as any).taxPreference || '') : '');

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(itemToEdit ? itemToEdit.category : '');

  const [brandOpen, setBrandOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(itemToEdit ? ((itemToEdit as any).brandName || '') : '');

  const [itemTypeOpen, setItemTypeOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState(itemToEdit ? ((itemToEdit as any).itemType || '') : '');

  const [taxGroupOpen, setTaxGroupOpen] = useState(false);
  const [selectedTaxGroup, setSelectedTaxGroup] = useState(itemToEdit ? ((itemToEdit as any).attributes?.taxGroup || (itemToEdit as any).taxGroup || '') : '');

  const [drugSchedule, setDrugSchedule] = useState<string>(itemToEdit?.drugSchedule || 'NONE');
  const [ayushType, setAyushType] = useState<string>(itemToEdit?.ayushType || '');
  // Two-level item classification. Column 1: is this a medicine (Pharmacy item) vs a
  // general item. Column 2: the system of medicine — shown only when Pharmacy — which
  // drives the schedule / AYUSH fields below.
  const [isPharmacyItem, setIsPharmacyItem] = useState<boolean>(
    itemToEdit
      ? ((itemToEdit as any).verticalType === 'PHARMACY'
          || (!!(itemToEdit as any).medicineSystem && (itemToEdit as any).medicineSystem !== 'NONE'))
      : false,
  );
  const [medicineSystem, setMedicineSystem] = useState<string>(
    (itemToEdit as any)?.medicineSystem && (itemToEdit as any).medicineSystem !== 'NONE'
      ? (itemToEdit as any).medicineSystem
      : 'ALLOPATHY',
  );
  const isAyushSystem = ['AYURVEDA', 'UNANI', 'SIDDHA'].includes(medicineSystem);
  const [shelfLifeMonths, setShelfLifeMonths] = useState<string>(itemToEdit?.shelfLifeMonths ? String(itemToEdit.shelfLifeMonths) : '');
  const [noExpiry, setNoExpiry] = useState<boolean>(itemToEdit?.noExpiry || false);
  const [composition, setComposition] = useState<string>(itemToEdit?.composition || '');

  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  React.useEffect(() => {
    if (items.length > 0) {
      setCategories(Array.from(new Set(items.map((i: any) => i.category || 'General'))));
      // Populate the brand dropdown from brands already used on existing items (like categories).
      setBrands(Array.from(new Set(items.map((i: any) => i.brandName).filter(Boolean))));
    }
  }, [items]);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const itemTypes = ['Physical Item', 'Digital Service', 'Software License', 'Gift Card'];
  const taxGroups = ['Exempt', 'GST 0%', 'GST 5%', 'GST 12%', 'GST 18%', 'GST 28%'];

  const [isAddingAttribute, setIsAddingAttribute] = useState(false);
  const [editingAttributeIdx, setEditingAttributeIdx] = useState<number | null>(null);
  // On edit, rebuild the variant OPTION definitions ([{name:'Color', values:['Red','Blue']}])
  // from the item's persisted variants so they show again (previously always started empty).
  const initialVariantOptions = React.useMemo(() => {
    const list = (itemToEdit as any)?.variantList || [];
    const map = new Map<string, string[]>();
    list.forEach((v: any) => {
      Object.entries(v?.attributes || {}).forEach(([k, val]) => {
        const cur = map.get(k) || [];
        const s = String(val);
        if (!cur.includes(s)) cur.push(s);
        map.set(k, cur);
      });
    });
    return Array.from(map.entries()).map(([name, values]) => ({ name, values }));
  }, [itemToEdit]);
  const [attributes, setAttributes] = useState<{ name: string; values: string[] }[]>(initialVariantOptions);
  const [hasVariants, setHasVariants] = useState(initialVariantOptions.length > 0);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState(['']);
  const [currentStep, setCurrentStep] = useState<'form' | 'catalog'>('form');

  const SUGGESTION_ITEMS: string[] = [];

  // Stored as referenced item UIDs.
  const [upsells, setUpsells] = useState<string[]>(itemToEdit ? ((itemToEdit as any).upsellItemUids || []) : []);
  const [crossSells, setCrossSells] = useState<string[]>(itemToEdit ? ((itemToEdit as any).crossSellItemUids || []) : []);

  const [upsellInput, setUpsellInput] = useState('');
  const [crossSellInput, setCrossSellInput] = useState('');

  const [tags, setTags] = useState<string[]>(itemToEdit ? ((itemToEdit as any).tags || []) : []);
  const [tagsInput, setTagsInput] = useState('');

  const [badges, setBadges] = useState<string[]>(itemToEdit ? ((itemToEdit as any).badges || []) : []);
  const [badgesInput, setBadgesInput] = useState('');

  const [galleryImages, setGalleryImages] = useState<string[]>(itemToEdit?.image ? [itemToEdit.image] : []);

  const [showShortDescription, setShowShortDescription] = useState(false);
  const [shortDescription, setShortDescription] = useState('');

  const [assignments, setAssignments] = useState<any[]>((itemToEdit as any)?.assignments || []);

  const [openDropdown, setOpenDropdown] = useState<{ rowId: number; type: 'store' | 'catalog' | 'inventoryCatalog' | 'showMrp' | 'batch' } | null>(null);

  // Base units grouped by measurement family (COUNT/WEIGHT/VOLUME/LENGTH/OTHER), so the
  // dropdown guides the right choice per product type and stays consistent with selling-unit
  // scope (a kg base unit → weight-compatible selling units).
  //
  // The unit master carries per-warehouse duplicates of the same logical unit (e.g. four
  // "Piece" rows: PCS-D, PCS-85652, …). Showing them all made the picker unusable, so units
  // are collapsed to one entry per name. The representative uid prefers, in order: the one
  // already selected on this item (so an edit keeps its exact unit), then the tenant default
  // (code ending "-D"), then the first seen.
  const unitFamilyOrder = ['COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'OTHER'];
  const groupedBaseUnits = React.useMemo(() => {
    const list = Array.isArray(backendUnits) ? backendUnits : [];
    const isDefault = (u: any) => typeof u?.code === 'string' && /-D$/i.test(u.code);
    const better = (candidate: any, current: any) => {
      if (candidate.uid === baseUnitUid) return true;      // keep the item's own unit
      if (current.uid === baseUnitUid) return false;
      if (isDefault(candidate) && !isDefault(current)) return true;
      return false;
    };
    const byFamily = new Map<string, Map<string, any>>();
    for (const u of list) {
      if (!u) continue;
      const fam = (u.unitType || 'OTHER').toUpperCase();
      const key = String(u.name || '').trim().toLowerCase();
      const famMap = byFamily.get(fam) || new Map<string, any>();
      const existing = famMap.get(key);
      if (!existing || better(u, existing)) famMap.set(key, u);
      byFamily.set(fam, famMap);
    }
    return [...byFamily.entries()]
      .map(([fam, m]) => [fam, [...m.values()]] as [string, any[]])
      .sort((a, b) => unitFamilyOrder.indexOf(a[0]) - unitFamilyOrder.indexOf(b[0]));
  }, [backendUnits, baseUnitUid]);

  const storeOptions = React.useMemo(() => {
    const opts = stores.map((s: any) => {
      const invCat = (catalogs || []).find((c: any) => (c.storeUid && (c.storeUid === s.id || c.storeUid === s.uid)));
      const ordCat = (orderCatalogs || []).find((oc: any) => (oc.storeUid && (oc.storeUid === s.id || oc.storeUid === s.uid)));
      const invUid = s.inventoryCatalogUid || invCat?.id || invCat?.uid;
      const ordUid = s.orderCatalogUid || ordCat?.id || ordCat?.uid;
      return {
        id: s.id || s.uid,
        name: s.name,
        location: s.location && s.location !== 'Unknown Location' ? s.location : '',
        inventoryCatalogUid: invUid,
        orderCatalogUid: ordUid,
        trackInventory: s.trackInventory,
      };
    });
    // Several stores can share a name (distinct branches). Add a disambiguator so the picker
    // isn't two identical-looking rows: prefer the store type/code, and when even that collides
    // fall back to a short id suffix that is guaranteed unique.
    const nameCounts = opts.reduce((m: Record<string, number>, o) => ((m[o.name] = (m[o.name] || 0) + 1), m), {});
    const nameTypeCounts = opts.reduce((m: Record<string, number>, o) => {
      const k = `${o.name}|${o.location}`;
      return (m[k] = (m[k] || 0) + 1), m;
    }, {} as Record<string, number>);
    return opts.map((o) => {
      const short = `#${String(o.id).slice(-4)}`;
      let subLabel = o.location;
      if (nameCounts[o.name] > 1) {
        subLabel = nameTypeCounts[`${o.name}|${o.location}`] > 1
          ? (o.location ? `${o.location} · ${short}` : short)
          : (o.location || short);
      }
      return { ...o, subLabel, assignable: !!o.inventoryCatalogUid };
    });
  }, [stores, catalogs, orderCatalogs]);
  const catalogOptions = catalogs.map((c: any) => ({ id: c.id || c.uid, name: c.name }));
  const orderCatalogOptions = orderCatalogs.map((c: any) => ({ id: c.id || c.uid, name: c.name }));

  React.useEffect(() => {
    if (itemToEdit && Array.isArray((itemToEdit as any).assignments) && (itemToEdit as any).assignments.length > 0) {
      setAssignments((itemToEdit as any).assignments);
    }
  }, [(itemToEdit as any)?.assignments]);

  // The item's selling units and their price ratio relative to the default selling unit.
  // Drives the auto-derived per-unit prices on the catalog assignment step: the row's base
  // price is the default unit's, and every other unit = base × ratio.
  const unitNameOf = (uid: string) =>
    (Array.isArray(backendUnits) ? backendUnits : []).find((u: any) => u?.uid === uid)?.name || 'Unit';
  const sellingUnitsForPricing = React.useMemo(() => {
    const configured = (unitConfig.units || []).filter((u) => u.selling && u.unitUid);
    // The base unit is always implicitly sellable (conversion 1). Include it so its price is
    // mappable on the catalog step without forcing the user to re-add it as a duplicate unit row.
    const selling = [...configured];
    if (baseUnitUid && !selling.some((u) => u.unitUid === baseUnitUid)) {
      selling.unshift({ unitUid: baseUnitUid, conversionQty: 1, selling: true } as any);
    }
    if (selling.length === 0) return [];
    const def =
      selling.find((u) => u.sellingDefault) ||
      selling.find((u) => Number(u.conversionQty) === 1) ||
      selling[0];
    const defConv = Number(def.conversionQty) || 1;
    return selling.map((u) => ({
      unitUid: u.unitUid,
      name: unitNameOf(u.unitUid),
      ratio: (Number(u.conversionQty) || 1) / defConv,
      isDefault: u.unitUid === def.unitUid,
    }));
  }, [unitConfig.units, backendUnits, baseUnitUid]);

  const handleUpdateAssignment = (id: number, field: string, value: any) => {
    setAssignments(assignments.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteAssignment = (id: number) => {
    setAssignments(assignments.filter(item => item.id !== id));
  };

  const handleAddAssignment = () => {
    const nextId = assignments.length > 0 ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
    setAssignments([
      ...assignments,
      { id: nextId, store: '', storeInventoryCatalogUid: '', catalog: '', inventoryCatalog: '', mrp: '', salesPrice: '', showMrp: 'Yes', rateEditable: true, openingStock: '0', batch: '' }
    ]);
  };

  // Start the assignment step with one empty row so the fields are visible immediately —
  // an empty table with only "Add Another" left users unsure the step did anything.
  React.useEffect(() => {
    if (currentStep === 'catalog' && assignments.length === 0) {
      setAssignments([{ id: 1, store: '', storeInventoryCatalogUid: '', catalog: '', inventoryCatalog: '', mrp: '', salesPrice: '', showMrp: 'Yes', rateEditable: true, openingStock: '0', batch: '' }]);
    }
  }, [currentStep]);

  const showStockColumns = trackStock && !batchTracking;
  const showStockColumnsWithBatch = trackStock && batchTracking;

  const [isAdditionalInfoExpanded, setIsAdditionalInfoExpanded] = useState(false);
  const [infoBlocks, setInfoBlocks] = useState<InfoBlock[]>((itemToEdit as any)?.infoBlocks || []);

  const toggleBlockExpand = (blockId: number) => {
    setInfoBlocks(prev => prev.map(block => block.id === blockId ? { ...block, isExpanded: !block.isExpanded } : block));
  };

  const updateBlockHeading = (blockId: number, heading: string) => {
    setInfoBlocks(prev => prev.map(block => block.id === blockId ? { ...block, heading } : block));
  };

  const updateBlockDescription = (blockId: number, description: string) => {
    setInfoBlocks(prev => prev.map(block => block.id === blockId ? { ...block, description } : block));
  };

  const deleteBlock = (blockId: number) => {
    setInfoBlocks(prev => prev.filter(block => block.id !== blockId));
  };

  const copyBlock = (blockId: number) => {
    const blockToCopy = infoBlocks.find(block => block.id === blockId);
    if (!blockToCopy) return;
    const nextId = infoBlocks.length > 0 ? Math.max(...infoBlocks.map(b => b.id)) + 1 : 1;
    const copiedBlock: InfoBlock = {
      ...blockToCopy,
      id: nextId,
      heading: `${blockToCopy.heading} (Copy)`,
      subSections: blockToCopy.subSections.map((sub, i) => ({
        ...sub,
        id: nextId * 100 + i
      }))
    };
    setInfoBlocks(prev => [...prev, copiedBlock]);
  };

  const updateSubSectionTitle = (blockId: number, subId: number, title: string) => {
    setInfoBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        subSections: block.subSections.map(sub => sub.id === subId ? { ...sub, title } : sub)
      };
    }));
  };

  const updateSubSectionDesc = (blockId: number, subId: number, description: string) => {
    setInfoBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        subSections: block.subSections.map(sub => sub.id === subId ? { ...sub, description } : sub)
      };
    }));
  };

  const deleteSubSection = (blockId: number, subId: number) => {
    setInfoBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        subSections: block.subSections.filter(sub => sub.id !== subId)
      };
    }));
  };

  const addSubSection = (blockId: number) => {
    setInfoBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      const nextSubId = block.subSections.length > 0 ? Math.max(...block.subSections.map(s => s.id)) + 1 : block.id * 100 + 1;
      const types: ('droplet' | 'palette' | 'sun')[] = ['droplet', 'palette', 'sun'];
      const chosenType = types[block.subSections.length % 3];
      const nextStepNum = block.subSections.length + 1;
      return {
        ...block,
        subSections: [
          ...block.subSections,
          { id: nextSubId, title: `Step ${nextStepNum} — New Section`, description: '', iconType: chosenType }
        ]
      };
    }));
  };

  const addNewBlock = () => {
    const nextId = infoBlocks.length > 0 ? Math.max(...infoBlocks.map(b => b.id)) + 1 : 1;
    setInfoBlocks(prev => [
      ...prev,
      {
        id: nextId,
        heading: 'New block heading',
        description: '',
        isExpanded: true,
        subSections: [
          { id: nextId * 100 + 1, title: 'Step 1 — Edit title', description: '', iconType: 'droplet' }
        ]
      }
    ]);
  };

  const handleBlockIconUpload = (blockId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInfoBlocks(prev => prev.map(b => b.id === blockId ? { ...b, iconUrl: event.target!.result as string } : b));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubIconUpload = (blockId: number, subId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInfoBlocks(prev => prev.map(block => {
            if (block.id !== blockId) return block;
            return {
              ...block,
              subSections: block.subSections.map(sub => sub.id === subId ? { ...sub, iconUrl: event.target!.result as string, iconType: 'uploaded' } : sub)
            };
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const newUrls = filesArray.map(file => URL.createObjectURL(file));
      setGalleryImages(prev => [...prev, ...newUrls]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const imgFiles = filesArray.filter(file => file.type.startsWith('image/'));
      const newUrls = imgFiles.map(file => URL.createObjectURL(file));
      setGalleryImages(prev => [...prev, ...newUrls]);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const [showUpsellSuggestions, setShowUpsellSuggestions] = useState(false);
  const [showCrossSellSuggestions, setShowCrossSellSuggestions] = useState(false);

  const handleValueChange = (index: number, value: string) => {
    const updatedValues = [...newOptionValues];
    updatedValues[index] = value;

    // Auto-generate next field if the last one is being typed in
    if (index === updatedValues.length - 1 && value.trim() !== '') {
      updatedValues.push('');
    }

    setNewOptionValues(updatedValues);
  };

  const removeValueField = (index: number) => {
    if (newOptionValues.length > 1) {
      setNewOptionValues(newOptionValues.filter((_, i) => i !== index));
    } else {
      setNewOptionValues(['']);
    }
  };

  const handleEditAttributeInit = (idx: number) => {
    const attr = attributes[idx];
    setNewOptionName(attr.name);
    setNewOptionValues(attr.values.length > 0 ? [...attr.values] : ['']);
    setEditingAttributeIdx(idx);
    setIsAddingAttribute(true);
  };

  const saveAttribute = () => {
    if (newOptionName.trim()) {
      const finalValues = newOptionValues.filter(v => v.trim() !== '');
      if (finalValues.length > 0) {
        if (editingAttributeIdx !== null) {
          setAttributes(attributes.map((attr, i) => i === editingAttributeIdx ? { name: newOptionName, values: finalValues } : attr));
        } else {
          setAttributes([...attributes, { name: newOptionName, values: finalValues }]);
        }
        resetAttributeForm();
      }
    }
  };

  const resetAttributeForm = () => {
    setIsAddingAttribute(false);
    setEditingAttributeIdx(null);
    setNewOptionName('');
    setNewOptionValues(['']);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      if (!categories.includes(trimmed)) {
        setCategories([...categories, trimmed]);
      }
      setSelectedCategory(trimmed);
      setFormErrors((p) => ({ ...p, category: undefined }));
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleAddBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBrandName.trim();
    if (trimmed) {
      if (!brands.includes(trimmed)) {
        setBrands([...brands, trimmed]);
      }
      setSelectedBrand(trimmed);
      setNewBrandName('');
      setIsAddingBrand(false);
    }
  };

  // Upsells / cross-sells reference real items (stored as item UIDs).
  const itemOptions = (Array.isArray(items) ? items : []).filter((it: any) => it.uid !== itemToEdit?.id);
  const nameOfItem = (uid: string) => (itemOptions.find((it: any) => it.uid === uid)?.name) || uid;
  const filteredUpsellSuggestions = itemOptions.filter(
    (it: any) => (it.name || '').toLowerCase().includes(upsellInput.toLowerCase()) &&
    !upsells.includes(it.uid)
  );
  const filteredCrossSellSuggestions = itemOptions.filter(
    (it: any) => (it.name || '').toLowerCase().includes(crossSellInput.toLowerCase()) &&
    !crossSells.includes(it.uid)
  );

  if (showDetails) {
    return (
      <ItemDetails
        onBack={() => setShowDetails(false)}
        onEdit={() => setShowDetails(false)}
        itemData={{
          itemName,
          itemDescription,
          selectedCategory,
          selectedBrand,
          sku,
          barcode,
          hsnCode,
          selectedItemType,
          weight,
          selectedTaxGroup,
          selectedTaxPreference,
          trackStock,
          batchTracking,
          assignments,
          attributes,
          galleryImages,
          infoBlocks,
          upsells,
          crossSells,
          tags,
          badges
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FAFAFB]">
      {/* Page Header Bar */}
      <div className="bg-white border-b border-surface-100 py-4 px-8 flex items-center gap-4 shrink-0">
        <button
          onClick={currentStep === 'catalog' ? () => setCurrentStep('form') : onBack}
          className="flex items-center gap-2 hover:opacity-85 text-surface-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
          <h1 className="text-base font-bold text-surface-900 tracking-tight">
            {currentStep === 'catalog' ? 'Catalog & Pricing' : (itemToEdit ? 'Edit Item' : 'Create New Item')}
          </h1>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 pb-32">
          {currentStep === 'form' ? (
            <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
              {/* Left Content Area (Col Span 8) */}
              <div className="lg:col-span-8 space-y-6">
            {/* clip-fix: no overflow-hidden — it clips the Base Unit / Category / Brand / Item Type dropdowns (top-full). rounded+border keep corners. */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
              <div className="p-6 border-b border-surface-100">
                <h2 className="text-[17px] font-bold text-surface-900">Item Details</h2>
              </div>

              <div className="p-5 md:p-6 space-y-5">
                {/* Item Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                    Item Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Item name"
                    value={itemName}
                    onChange={(e) => { setItemName(e.target.value); if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined })); }}
                    className={cn(
                      "w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold text-surface-900",
                      formErrors.name ? "border-red-400" : "border-surface-200"
                    )}
                  />
                  {formErrors.name && (
                    <p className="text-xs font-semibold text-red-500">{formErrors.name}</p>
                  )}
                </div>

                {/* Category & Brand */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                      Category <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <button
                          onClick={() => setCategoryOpen(!categoryOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl text-sm font-semibold hover:border-surface-300 transition-colors focus:ring-2 focus:ring-primary-500/10 outline-none",
                            formErrors.category ? "border-red-400" : "border-surface-200",
                            selectedCategory ? "text-surface-900" : "text-surface-400"
                          )}
                        >
                          {selectedCategory || 'Select category'}
                          <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", categoryOpen && "rotate-180")} />
                        </button>

                        {categoryOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top max-h-60 overflow-y-auto">
                            {categories.map(option => (
                              <button
                                key={option}
                                onClick={() => { setSelectedCategory(option); setCategoryOpen(false); if (formErrors.category) setFormErrors((p) => ({ ...p, category: undefined })); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="p-2.5 bg-primary-50 border border-primary-100 rounded-xl text-primary-600 hover:bg-primary-100 transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    {formErrors.category && (
                      <p className="text-xs font-semibold text-red-500">{formErrors.category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Brand</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <button
                          onClick={() => setBrandOpen(!brandOpen)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 hover:border-surface-300 transition-colors focus:ring-2 focus:ring-primary-500/10 outline-none"
                        >
                          <span className={selectedBrand ? '' : 'text-surface-400'}>{selectedBrand || 'Select Brand'}</span>
                          <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", brandOpen && "rotate-180")} />
                        </button>

                        {brandOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top max-h-60 overflow-y-auto">
                            {brands.map(option => (
                              <button
                                key={option}
                                onClick={() => { setSelectedBrand(option); setBrandOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingBrand(true)}
                        className="p-2.5 bg-primary-50 border border-primary-100 rounded-xl text-primary-600 hover:bg-primary-100 transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Description</label>
                  <div className="border border-surface-200 rounded-2xl overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all">
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 p-2 bg-surface-50/50 border-b border-surface-100 flex-wrap">
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <Type className="h-4 w-4" />
                      </button>
                      <div className="w-px h-4 bg-surface-200 mx-1" />
                      <button className="flex items-center gap-1 px-2 py-1.5 hover:bg-white hover:shadow-sm rounded-lg text-xs font-bold text-surface-700 transition-all">
                        Paragraph
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="w-px h-4 bg-surface-200 mx-1" />
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-700 transition-all">
                        <Bold className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <Italic className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <Underline className="h-4 w-4" />
                      </button>
                      <button className="flex items-center gap-1 p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <span className="text-xs font-bold font-serif">A</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="w-px h-4 bg-surface-200 mx-1" />
                      <button className="flex items-center gap-1 px-2 py-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <AlignLeft className="h-4 w-4" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="w-px h-4 bg-surface-200 mx-1" />
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <Link className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <ImageIcon className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <Video className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      <div className="w-px h-4 bg-surface-200 mx-1" />
                      <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-surface-500 transition-all">
                        <Code className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Content area */}
                    <textarea
                      rows={4}
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className="w-full p-4 text-sm text-surface-700 font-medium bg-white outline-none resize-none"
                    />
                  </div>

                  {!showShortDescription ? (
                    <button
                      type="button"
                      onClick={() => setShowShortDescription(true)}
                      className="text-[13px] font-bold text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 decoration-dotted mt-1 transition-all"
                    >
                      Add Short Description
                    </button>
                  ) : (
                    <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Short Description</label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowShortDescription(false);
                            setShortDescription('');
                          }}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Add a brief summary or custom excerpt..."
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* SKU, Barcode, & HSN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">SKU</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Barcode</label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={handleBarcodeKeyDown}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">HSN Code</label>
                    <input
                      type="text"
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                    />
                  </div>
                </div>

                {/* Item Type & Weight */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Item Type</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setItemTypeOpen(!itemTypeOpen);
                          setTaxGroupOpen(false);
                          setTaxPreferenceOpen(false);
                          setCategoryOpen(false);
                          setBrandOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 hover:border-surface-300 transition-colors focus:ring-2 focus:ring-primary-500/10 outline-none"
                      >
                        {selectedItemType}
                        <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", itemTypeOpen && "rotate-180")} />
                      </button>

                      {itemTypeOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top">
                          {itemTypes.map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => { setSelectedItemType(option); setItemTypeOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedItemType === 'Physical Item' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Weight (kg)</label>
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Base Unit</label>
                    <button
                      type="button"
                      onClick={() => setBaseUnitOpen(!baseUnitOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 hover:border-surface-300 transition-colors focus:ring-2 focus:ring-primary-500/10 outline-none"
                    >
                      {(() => {
                        const u = (Array.isArray(backendUnits) ? backendUnits : []).find((x: any) => x?.uid === baseUnitUid);
                        if (!u) return 'Select Unit';
                        return (
                          <span className="flex items-center gap-2">
                            {u.name}
                            {u.unitType && (
                              <span className="text-[10px] font-bold text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded normal-case tracking-normal">
                                {UNIT_FAMILY_LABEL[u.unitType] || u.unitType}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                      <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", baseUnitOpen && "rotate-180")} />
                    </button>

                    {baseUnitOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 max-h-[280px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 origin-top">
                        {/* Grouped by measurement family so a weight product lands on kg/g,
                            a countable one on Piece, etc. — the base unit drives which selling
                            units are valid below. */}
                        {groupedBaseUnits.length === 0 && (
                          <div className="px-4 py-3 text-xs font-semibold text-surface-400">No units configured.</div>
                        )}
                        {groupedBaseUnits.map(([family, units]) => (
                          <div key={family}>
                            <div className="px-4 pt-2 pb-1 text-[10px] font-bold text-surface-400 uppercase tracking-widest">
                              {UNIT_FAMILY_LABEL[family] || family}
                            </div>
                            {units.map((unit: any) => (
                              <button
                                key={unit.uid}
                                type="button"
                                onClick={() => { setBaseUnitUid(unit.uid); setBaseUnitOpen(false); }}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors flex justify-between",
                                  unit.uid === baseUnitUid && "bg-violet-50/60 text-[#55349A]"
                                )}
                              >
                                <span>{unit.name}</span>
                                <span className="text-surface-400">{unit.symbol}</span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selling-unit configuration */}
                <div className="pt-2">
                  <ItemUnitConfig baseUnitUid={baseUnitUid} value={unitConfig} onChange={setUnitConfig} />
                </div>

                {/* Tax Group & Preference — Tax Group (GST slab) only shown when the item is Taxable (I-8) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedTaxPreference === 'Taxable' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Tax Group</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setTaxGroupOpen(!taxGroupOpen);
                          setItemTypeOpen(false);
                          setTaxPreferenceOpen(false);
                          setCategoryOpen(false);
                          setBrandOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 hover:border-surface-300 transition-colors focus:ring-2 focus:ring-primary-500/10 outline-none"
                      >
                        {selectedTaxGroup}
                        <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", taxGroupOpen && "rotate-180")} />
                      </button>

                      {taxGroupOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top max-h-48 overflow-y-auto">
                          {taxGroups.map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => { setSelectedTaxGroup(option); setTaxGroupOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Tax Preference</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setTaxPreferenceOpen(!taxPreferenceOpen);
                          setItemTypeOpen(false);
                          setTaxGroupOpen(false);
                          setCategoryOpen(false);
                          setBrandOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 hover:border-surface-300 transition-colors focus:ring-2 focus:ring-primary-500/10 outline-none"
                      >
                        {selectedTaxPreference}
                        <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", taxPreferenceOpen && "rotate-180")} />
                      </button>

                      {taxPreferenceOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top">
                          {['Taxable', 'Non-Taxable'].map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => { setSelectedTaxPreference(option); if (option === 'Non-Taxable') setSelectedTaxGroup(''); setTaxPreferenceOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors" onClick={() => setTrackStock(!trackStock)}>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-surface-900">Track stock quantity</span>
                      <span className="text-[11px] text-surface-400">Auto-decrement on sale across all stores</span>
                    </div>
                    <button
                      className={cn(
                        "w-[45px] h-[26px] rounded-full relative transition-colors shrink-0",
                        trackStock ? "bg-primary-600" : "bg-surface-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                        trackStock ? "translate-x-[19px]" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                  {trackStock && batchTrackingEnabled && (
                    <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors" onClick={() => setBatchTracking(!batchTracking)}>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-surface-900">Batch Tracking</span>
                        <span className="text-[11px] text-surface-400">Enable this to track inventory by batch</span>
                      </div>
                      <button
                        className={cn(
                          "w-[45px] h-[26px] rounded-full relative transition-colors shrink-0",
                          batchTracking ? "bg-primary-600" : "bg-surface-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                          batchTracking ? "translate-x-[19px]" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Statutory Drug Classification & AYUSH Section — pharmacy tenants only */}
                {(true) && (
                <div className="p-5 bg-gradient-to-br from-surface-50 to-surface-100/40 rounded-2xl border border-surface-200/80 space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                        Healthcare & Statutory Drug Classification
                      </h4>
                      <p className="text-[11px] text-surface-500 mt-0.5">
                        Specify statutory drug schedules (H/H1/Narcotic/X) or Ayurvedic formulation type.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Column 1 — is this a medicine (Pharmacy) or a general item */}
                    <div>
                      <label className="block text-[11px] font-bold text-surface-600 mb-1">Item Classification</label>
                      <select
                        value={isPharmacyItem ? 'PHARMACY' : 'GENERAL'}
                        onChange={(e) => setIsPharmacyItem(e.target.value === 'PHARMACY')}
                        disabled={!!itemToEdit}
                        className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        <option value="GENERAL">General / Retail Item</option>
                        <option value="PHARMACY">Pharmacy / Medicine</option>
                      </select>
                      {!!itemToEdit && (
                        <p className="text-[11px] text-surface-500 mt-0.5">
                          Classification is fixed after creation. Create a new item to change it.
                        </p>
                      )}
                    </div>

                    {/* Column 2 — system of medicine, only for Pharmacy items */}
                    {isPharmacyItem && (
                    <div>
                      <label className="block text-[11px] font-bold text-surface-600 mb-1">System of Medicine</label>
                      <select
                        value={medicineSystem}
                        onChange={(e) => setMedicineSystem(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
                      >
                        <option value="ALLOPATHY">Allopathy</option>
                        <option value="AYURVEDA">Ayurveda</option>
                        <option value="HOMEOPATHY">Homeopathy</option>
                        <option value="UNANI">Unani</option>
                        <option value="SIDDHA">Siddha</option>
                      </select>
                    </div>
                    )}

                    {/* Column 2 downstream cascade fields */}
                    {isPharmacyItem && medicineSystem === 'ALLOPATHY' && (
                    <div>
                      <label className="block text-[11px] font-bold text-surface-600 mb-1">Drug Schedule</label>
                      <select
                        value={drugSchedule}
                        onChange={(e) => setDrugSchedule(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
                      >
                        <option value="NONE">None / General Over-the-Counter (OTC)</option>
                        <option value="H">Schedule H (Prescription Required)</option>
                        <option value="H1">Schedule H1 (Statutory Register Required)</option>
                        <option value="H2">Schedule H2</option>
                        <option value="X">Schedule X (Special Controlled / Psychotropic)</option>
                        <option value="NARCOTIC">Narcotic / NDPS Drug</option>
                      </select>
                    </div>
                    )}

                    {isPharmacyItem && isAyushSystem && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-surface-600 mb-1">AYUSH Formulation Type</label>
                        <select
                          value={ayushType}
                          onChange={(e) => setAyushType(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
                        >
                          <option value="">Not Applicable</option>
                          <option value="CLASSICAL">Classical (Samhita / Pharmacopoeial Formula)</option>
                          <option value="PROPRIETARY">Patent & Proprietary Medicine</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-surface-600 mb-1">Statutory Schedule</label>
                        <select
                          value={drugSchedule}
                          onChange={(e) => setDrugSchedule(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
                        >
                          <option value="NONE">None / Standard Formulation</option>
                          <option value="SCHEDULE_E1">AYUSH Schedule E1 (Poisonous Herbs / Heavy Metals)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="itemNoExpiryToggle"
                          checked={noExpiry}
                          onChange={(e) => setNoExpiry(e.target.checked)}
                          className="rounded text-primary-600 cursor-pointer"
                        />
                        <label htmlFor="itemNoExpiryToggle" className="text-xs font-bold text-surface-700 cursor-pointer">
                          Matured Formulation (No Expiry, e.g. Asavas/Arishtas)
                        </label>
                      </div>
                    </>
                    )}

                    {isPharmacyItem && (
                    <div>
                      <label className="block text-[11px] font-bold text-surface-600 mb-1">Shelf Life (Months)</label>
                      <input
                        type="number"
                        placeholder={noExpiry ? "Indefinite (No Expiry)" : "e.g. 24 or 36 months"}
                        disabled={noExpiry}
                        value={noExpiry ? "" : shelfLifeMonths}
                        onChange={(e) => setShelfLifeMonths(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-medium outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                    )}

                    {isPharmacyItem && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-surface-600 mb-1">
                        {medicineSystem === 'ALLOPATHY'
                          ? 'Salt / Chemical Active Ingredients'
                          : isAyushSystem
                            ? 'Classical / Herbal Formulation Active Ingredients'
                            : 'Homeopathic Dilution / Potency & Composition'}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          medicineSystem === 'ALLOPATHY'
                            ? 'e.g. Paracetamol 500mg, Caffeine 30mg'
                            : isAyushSystem
                              ? 'e.g. Dashamoola, Ashwagandha, Triphala, Guggulu'
                              : 'e.g. Arnica Montana 30C, Nux Vomica 200CH'
                        }
                        value={composition}
                        onChange={(e) => setComposition(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-medium outline-none"
                      />
                    </div>
                    )}
                  </div>
                </div>
                )}
              </div>
            </div>

            {/* Store + Catalog Assignment Section has been moved to the second step Catalog & Pricing page */}

            {/* Joined Variants Section */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden font-sans">
              {/* Variants Toggle Card Part */}
              <div
                className="p-6 select-none cursor-pointer hover:bg-surface-50/10 transition-all"
                onClick={() => setHasVariants(!hasVariants)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-surface-900">This item has variants</span>
                    <span className="text-[11px] text-surface-400">Enable this to add variants like different sizes, colors, material, etc.</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {hasVariants && (
                      <span className="text-xs text-[#7A9ABF] font-semibold tracking-tight whitespace-nowrap animate-in fade-in duration-200">
                        {(() => {
                          const activeAttrs = attributes.filter(a => a.name && a.values.filter(v => v.trim() !== '').length > 0);
                          if (activeAttrs.length === 0) return null;
                          const counts = activeAttrs.map(a => a.values.filter(v => v.trim() !== '').length);
                          const totalVariants = counts.reduce((acc, c) => acc * c, 1);
                          const text = activeAttrs.map(a => `${a.values.filter(v => v.trim() !== '').length} ${a.name.toLowerCase()}${a.values.filter(v => v.trim() !== '').length > 1 ? (a.name.toLowerCase().endsWith('s') ? '' : 's') : ''}`).join(' × ');
                          return `${totalVariants} variant${totalVariants > 1 ? 's' : ''} (${text})`;
                        })()}
                      </span>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "w-[45px] h-[26px] rounded-full relative transition-colors shrink-0",
                        hasVariants ? "bg-[#55349A]" : "bg-surface-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                        hasVariants ? "translate-x-[19px]" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Variants Section Part */}
              {hasVariants && (
                <div className="border-t border-surface-100">
                  <div className="p-6 space-y-4">
                    {/* Saved Attributes List */}
                    {attributes.length > 0 && (
                      <div className="border border-surface-100 rounded-[24px] shadow-sm overflow-hidden bg-white mb-4">
                        <div className="p-2 space-y-1">
                          {attributes.map((attr, idx) => (
                            <div key={idx} className="group p-4 flex items-start gap-4 hover:bg-surface-50 transition-colors rounded-2xl">
                              <div className="mt-1 flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab">
                                <GripVertical className="h-4 w-4 text-surface-400" />
                                <GripVertical className="h-4 w-4 text-surface-400 -mt-2" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <span className="text-sm font-bold text-surface-900 leading-none">{attr.name}</span>
                                <div className="flex flex-wrap gap-2">
                                  {attr.values.map((val, vIdx) => (
                                    <span key={vIdx} className="px-3 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold ring-1 ring-primary-100 shadow-sm">
                                      {val}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditAttributeInit(idx)}
                                  className="opacity-0 group-hover:opacity-100 p-2 text-surface-400 hover:text-[#55349A] hover:bg-[#E9E4F5]/30 rounded-lg transition-all cursor-pointer"
                                  title="Edit Attribute"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))}
                                  className="opacity-0 group-hover:opacity-100 p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Attribute"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Form for new attribute (as per image) */}
                    {isAddingAttribute ? (
                      <div className="p-6 bg-[#F8FAFC] border border-surface-200 rounded-[24px] space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Option name */}
                        <div className="space-y-2">
                           <div className="flex items-start gap-4">
                             <div className="mt-8 opacity-40">
                               <GripVertical className="h-5 w-5 text-surface-400" />
                             </div>
                             <div className="flex-1 space-y-2">
                               <label className="text-sm font-semibold text-surface-500">Option name</label>
                               <input
                                 type="text"
                                 placeholder="e.g. Color or Size"
                                 value={newOptionName}
                                 onChange={(e) => setNewOptionName(e.target.value)}
                                 className="w-full px-4 py-3.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 shadow-sm transition-all"
                               />
                             </div>
                           </div>
                        </div>

                        {/* Option values */}
                        <div className="space-y-4">
                          <div className="flex-1 space-y-3 pl-9">
                            <label className="text-sm font-semibold text-surface-500">Option values</label>

                            <div className="space-y-3">
                              {newOptionValues.map((val, idx) => (
                                <div key={idx} className="flex items-center gap-4 group/row">
                                  <div className="opacity-40">
                                    <GripVertical className="h-5 w-5 text-surface-400" />
                                  </div>
                                  <div className="flex-1 relative">
                                    <input
                                      type="text"
                                      placeholder="Add value"
                                      value={val}
                                      onChange={(e) => handleValueChange(idx, e.target.value)}
                                      className="w-full px-4 py-3.5 bg-[#FFFFFF] border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 shadow-sm transition-all pr-12"
                                    />
                                    {val && (
                                       <button
                                          onClick={() => removeValueField(idx)}
                                          type="button"
                                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-surface-400 hover:text-red-500 transition-colors"
                                       >
                                         <Trash2 className="h-4 w-4" />
                                       </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pl-9">
                          <button
                            type="button"
                            onClick={resetAttributeForm}
                            className="px-6 py-2.5 border border-surface-200 bg-white rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all shadow-sm"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={saveAttribute}
                            className="px-8 py-2.5 bg-surface-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-black/10"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingAttribute(true)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[#55349A] hover:bg-primary-50 rounded-xl text-sm font-bold transition-all w-fit"
                      >
                        <Plus className="h-5 w-5" />
                        Add Attribute
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Information Section (Collapsed / Expanded) */}
            {!isAdditionalInfoExpanded ? (
              <div id="additional-info-collapsed" className="bg-white rounded-2xl border border-surface-200 p-5 flex items-center justify-start shadow-3xs">
                <button
                  type="button"
                  onClick={() => setIsAdditionalInfoExpanded(true)}
                  className="flex items-center gap-1.5 border border-[#55349A]/20 bg-white hover:bg-[#55349A]/5 text-sm font-bold text-[#55349A] px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-3xs select-none hover:border-[#55349A]/40 active:scale-98"
                >
                  <Plus className="h-4 w-4 stroke-[2.5px] text-[#55349A]" />
                  Additional Informations
                </button>
              </div>
            ) : (
              <div id="additional-info-expanded" className="bg-white rounded-[24px] border border-surface-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                {/* Header */}
                <div className="p-6 border-b border-surface-100 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-surface-900 tracking-tight">Additional Information</h2>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setInfoBlocks(prev => prev.map(b => ({ ...b, isExpanded: true })));
                      }}
                      className="text-xs font-bold text-surface-500 hover:text-surface-800 transition-colors cursor-pointer select-none"
                    >
                      Expand all
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoBlocks(prev => prev.map(b => ({ ...b, isExpanded: false })));
                      }}
                      className="text-xs font-bold text-surface-500 hover:text-surface-800 transition-colors cursor-pointer select-none"
                    >
                      Collapse all
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdditionalInfoExpanded(false)}
                      className="text-surface-400 hover:text-surface-600 p-1.5 hover:bg-surface-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <ChevronUp className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-6">
                  {infoBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="border border-surface-200 rounded-[20px] shadow-[0_1px_5px_rgba(0,0,0,0.02)] overflow-hidden bg-white"
                    >
                      {/* Block Header */}
                      <div className="p-5 flex items-center justify-between border-b border-surface-100/60 bg-surface-50/5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleBlockExpand(block.id)}
                            className="p-1 hover:bg-surface-100 rounded text-surface-400 hover:text-surface-600 transition-colors"
                          >
                            <ChevronDown className={cn("h-4.5 w-4.5 transition-transform duration-200", block.isExpanded && "rotate-180")} />
                          </button>

                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4.5 w-4.5 text-surface-800" />
                            <span className="text-[14px] font-bold text-surface-800">{block.heading || "Untitled Block"}</span>
                          </div>

                          {/* Soft badge showing subsection count */}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-100 text-[10px] font-bold text-surface-600 tracking-wide uppercase">
                            {block.subSections.length} Sub Section{block.subSections.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Block Action Icons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyBlock(block.id)}
                            className="p-2 text-surface-400 hover:text-[#55349A] hover:bg-[#E9E4F5]/30 rounded-xl transition-all cursor-pointer"
                            title="Duplicate block"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBlock(block.id)}
                            className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            title="Delete block"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Block Body */}
                      {block.isExpanded && (
                        <div className="p-6 space-y-6">
                          {/* Inner Section Heading Fields */}
                          <div className="flex gap-4 items-start">
                            {/* Left Dashed icon holder */}
                            <input
                              type="file"
                              id={`additional-info-block-file-${block.id}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleBlockIconUpload(block.id, e)}
                            />
                            <div
                              onClick={() => document.getElementById(`additional-info-block-file-${block.id}`)?.click()}
                              className="w-14 h-14 bg-surface-50 border border-dashed border-surface-300 rounded-xl flex items-center justify-center text-surface-400 shrink-0 cursor-pointer hover:bg-[#E9E4F5]/30 hover:border-[#55349A]/50 transition-all select-none group relative"
                              title="Click to upload custom icon or image"
                            >
                              {block.iconUrl ? (
                                <img src={block.iconUrl} alt="Block Icon" className="w-[85%] h-[85%] object-cover rounded-lg" />
                              ) : (
                                <>
                                  <BookOpen className="h-6 w-6 group-hover:hidden text-surface-400" />
                                  <Upload className="h-6 w-6 hidden group-hover:block text-[#55349A]" />
                                </>
                              )}

                              {/* Small upload corner badge */}
                              {!block.iconUrl && (
                                <div className="absolute -bottom-1 -right-1 bg-[#55349A] text-white p-1 rounded-full shadow-sm border border-white flex items-center justify-center">
                                  <Upload className="h-2.5 w-2.5" />
                                </div>
                              )}
                            </div>

                            {/* Right text inputs */}
                            <div className="flex-1 space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Section heading</label>
                                <input
                                  type="text"
                                  value={block.heading}
                                  onChange={(e) => updateBlockHeading(block.id, e.target.value)}
                                  className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                                  placeholder="e.g. How to use"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={block.description}
                                  onChange={(e) => updateBlockDescription(block.id, e.target.value)}
                                  className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                                  placeholder="Description"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Sub Sections Label */}
                          <div className="pt-2">
                            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Sub Sections</h3>
                                               {/* List of Subsections */}
                            <div className="space-y-4">
                              {block.subSections.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex gap-4 items-start bg-[#F8FAFC]/50 border border-[#EAEBF0] rounded-2xl p-5 hover:bg-[#F8FAFC]/80 transition-all group/sub"
                                >
                                  {/* Left Dashed Icon Holder based on type */}
                                  <input
                                    type="file"
                                    id={`additional-info-sub-file-${block.id}-${sub.id}`}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleSubIconUpload(block.id, sub.id, e)}
                                  />
                                  <div
                                    onClick={() => document.getElementById(`additional-info-sub-file-${block.id}-${sub.id}`)?.click()}
                                    className="w-14 h-14 bg-white border border-dashed border-[#EAEBF0] rounded-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:bg-[#E9E4F5]/30 hover:border-[#55349A]/50 transition-all select-none group relative"
                                    title="Click to upload custom icon or image"
                                  >
                                    {sub.iconUrl ? (
                                      <img src={sub.iconUrl} alt="Sub Icon" className="w-[85%] h-[85%] object-cover rounded-lg" />
                                    ) : (
                                      <>
                                        <div className="group-hover:hidden flex items-center justify-center">
                                          {sub.iconType === 'droplet' && <Droplet className="h-5.5 w-5.5 text-blue-500" />}
                                          {sub.iconType === 'palette' && <Palette className="h-5.5 w-5.5 text-[#55349A]" />}
                                          {sub.iconType === 'sun' && <Sun className="h-5.5 w-5.5 text-amber-500" />}
                                          {(sub.iconType === 'other' || sub.iconType === 'uploaded') && <BookOpen className="h-5.5 w-5.5 text-surface-400" />}
                                        </div>
                                        <Upload className="h-5.5 w-5.5 hidden group-hover:block text-[#55349A]" />
                                      </>
                                    )}

                                    {/* Small upload corner badge */}
                                    {!sub.iconUrl && (
                                      <div className="absolute -bottom-1 -right-1 bg-[#55349A] text-white p-1 rounded-full shadow-sm border border-white flex items-center justify-center">
                                        <Upload className="h-2.5 w-2.5" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Right Side Inputs */}
                                  <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <input
                                        type="text"
                                        value={sub.title}
                                        onChange={(e) => updateSubSectionTitle(block.id, sub.id, e.target.value)}
                                        className="w-full px-4 py-2 bg-white border border-[#EAEBF0] rounded-lg text-xs font-bold text-surface-850 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                                        placeholder="e.g. Step 1 — Prep"
                                      />

                                      {/* Move & Delete Handles */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          className="p-1.5 text-surface-400 hover:text-surface-605 hover:bg-surface-100 rounded transition-colors cursor-grab"
                                          title="Drag to reorder"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deleteSubSection(block.id, sub.id)}
                                          className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                          title="Delete sub section"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <textarea
                                      rows={2}
                                      value={sub.description}
                                      onChange={(e) => updateSubSectionDesc(block.id, sub.id, e.target.value)}
                                      className="w-full px-4 py-3 bg-white border border-[#EAEBF0] rounded-xl text-sm font-semibold text-surface-700 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all resize-none"
                                      placeholder="Start with clean, dry lips..."
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* + Add More Sub section button */}
                            <div className="pt-4">
                              <button
                                type="button"
                                onClick={() => addSubSection(block.id)}
                                className="flex items-center gap-2 border border-dashed border-indigo-200 text-[#55349A] font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#E9E4F5]/40 transition-all cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add More
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* + New block Button at bottom of list */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={addNewBlock}
                      className="flex items-center gap-2 border border-surface-200 bg-white text-surface-800 hover:bg-surface-50 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-surface-500" />
                      New block
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Right Widget Sidebar Area (Col Span 4) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Item Gallery */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-surface-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Item Gallery</h2>
              </div>
              <div className="p-6 space-y-6">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('gallery-file-input')?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-[#F8FAFC] hover:border-violet-300 hover:bg-violet-50/20 transition-all cursor-pointer group"
                >
                  <input
                    type="file"
                    id="gallery-file-input"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <div className="text-surface-400 group-hover:text-[#55349A] transition-colors">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <polyline points="9 15 12 12 15 15" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold text-surface-900">
                    Drag & Drop or <span className="text-[#55349A] font-bold">Choose file</span> to upload
                  </p>
                  <p className="text-xs text-surface-400 font-medium">jpg, png, jpeg</p>
                </div>

                {/* Display uploaded images */}
                {galleryImages.length > 0 && (
                  <div className="flex flex-wrap gap-4 pt-2">
                    {galleryImages.map((imgUrl, index) => (
                      <div
                        key={index}
                        className="relative w-[90px] h-[105px] rounded-xl border border-surface-200/60 shadow-sm overflow-visible bg-white group/thumb"
                      >
                        <img
                          src={imgUrl}
                          alt={`Uploaded item ${index + 1}`}
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGalleryImage(index);
                          }}
                          className="absolute -top-1.5 -right-1.5 w-6.5 h-6.5 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors shadow-md ring-2 ring-white cursor-pointer z-10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Linked Products */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-surface-100">
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Linked Products</h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Upsells */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Upsells</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Add item and press enter"
                      value={upsellInput}
                      onChange={(e) => {
                        setUpsellInput(e.target.value);
                        setShowUpsellSuggestions(true);
                      }}
                      onFocus={() => setShowUpsellSuggestions(true)}
                      onBlur={() => {
                        // Delay hide suggestions slightly so clicks register
                        setTimeout(() => setShowUpsellSuggestions(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Only real items can be upsells — take the top matching suggestion.
                          const matched = filteredUpsellSuggestions[0];
                          if (matched && !upsells.includes(matched.uid)) {
                            setUpsells([...upsells, matched.uid]);
                          }
                          setUpsellInput('');
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                    />

                    {/* Suggestions list */}
                    {showUpsellSuggestions && upsellInput.trim() && filteredUpsellSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto py-1">
                        {filteredUpsellSuggestions.map((it: any) => (
                          <button
                            key={it.uid}
                            type="button"
                            onMouseDown={() => {
                              if (!upsells.includes(it.uid)) {
                                setUpsells([...upsells, it.uid]);
                              }
                              setUpsellInput('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-surface-50 text-xs font-bold text-[#55349A] tracking-wider transition-colors"
                          >
                            {it.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected upsell items */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {upsells.map((uid) => (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E9E4F5] text-[#55349A] text-[11px] font-bold rounded-lg tracking-wider transition-all"
                      >
                        {nameOfItem(uid)}
                        <button
                          type="button"
                          onClick={() => setUpsells(upsells.filter(t => t !== uid))}
                          className="text-[#55349A] hover:text-[#372166] text-xs font-semibold leading-none ml-1 select-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cross-sells */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Cross-sells</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search an item to link"
                      value={crossSellInput}
                      onChange={(e) => {
                        setCrossSellInput(e.target.value);
                        setShowCrossSellSuggestions(true);
                      }}
                      onFocus={() => setShowCrossSellSuggestions(true)}
                      onBlur={() => {
                        // Delay hide suggestions so clicks register
                        setTimeout(() => setShowCrossSellSuggestions(false), 200);
                      }}
                      onKeyDown={(e) => {
                        // Enter picks the top suggestion — a real item — never free text.
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const top = filteredCrossSellSuggestions[0];
                          if (top && !crossSells.includes(top.uid)) {
                            setCrossSells([...crossSells, top.uid]);
                          }
                          setCrossSellInput('');
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                    />

                    {/* Suggestions list — real items only, keyed and stored by uid */}
                    {showCrossSellSuggestions && crossSellInput.trim() && filteredCrossSellSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto py-1">
                        {filteredCrossSellSuggestions.map((it: any) => (
                          <button
                            key={it.uid}
                            type="button"
                            onMouseDown={() => {
                              if (!crossSells.includes(it.uid)) {
                                setCrossSells([...crossSells, it.uid]);
                              }
                              setCrossSellInput('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-surface-50 text-xs font-bold text-[#55349A] tracking-wider transition-colors"
                          >
                            {it.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected cross-sell items — resolved back to names via nameOfItem */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {crossSells.map((uid) => (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E9E4F5] text-[#55349A] text-[11px] font-bold rounded-lg tracking-wider transition-all"
                      >
                        {nameOfItem(uid)}
                        <button
                          type="button"
                          onClick={() => setCrossSells(crossSells.filter(t => t !== uid))}
                          className="text-[#55349A] hover:text-[#372166] text-xs font-semibold leading-none ml-1 select-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-surface-100">
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Tags</h2>
              </div>
              <div className="p-6 space-y-3">
                <input
                  type="text"
                  placeholder="Add tag and press enter"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = tagsInput.trim().toUpperCase();
                      if (val && !tags.includes(val)) {
                        setTags([...tags, val]);
                        setTagsInput('');
                      }
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E9E4F5] text-[#55349A] text-[10px] font-bold rounded-lg tracking-wider uppercase transition-all"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter(t => t !== tag))}
                        className="text-[#55349A] hover:text-[#372166] text-xs font-semibold leading-none ml-0.5 select-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-surface-100">
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Badges</h2>
              </div>
              <div className="p-6 space-y-3">
                <input
                  type="text"
                  placeholder="Add badge and press enter"
                  value={badgesInput}
                  onChange={(e) => setBadgesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = badgesInput.trim().toUpperCase();
                      if (val && !badges.includes(val)) {
                        setBadges([...badges, val]);
                        setBadgesInput('');
                      }
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E2F5E9] text-emerald-700 text-[10px] font-bold rounded-lg tracking-wider uppercase transition-all"
                    >
                      {badge}
                      <button
                        type="button"
                        onClick={() => setBadges(badges.filter(b => b !== badge))}
                        className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold leading-none ml-0.5 select-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            </div>
            </div>
          ) : (
            <div className="max-w-[1440px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Store & Catalog Assignment Section */}
              <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden font-sans">
                <div className="p-6 border-b border-surface-100 bg-white">
                  <h2 className="text-[17px] font-bold text-surface-900 tracking-tight">Store + Catalog Assignment &amp; Pricing</h2>
                  <p className="text-xs text-surface-400 mt-1">
                    Assign the item to stores and catalogs. Enter the price for the default selling unit —
                    other selling units are priced automatically from their conversion{sellingUnitsForPricing.length > 1 ? ' (edit any below to override)' : ''}.
                  </p>
                </div>

                {/* `overflow-x-auto` computes `overflow-y: auto` too, so an open row dropdown is
                    clipped at this wrapper's bottom edge (and again by the card's overflow-hidden).
                    Reserve room while a dropdown is open so its options stay reachable. */}
                <div className={cn(
                  "overflow-x-auto border-t border-surface-100",
                  openDropdown && "pb-56"
                )}>
                  <table className="w-full text-left border-collapse min-w-[1040px]">
                    <thead>
                      <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                        <th className={cn(
                          "px-[22px] py-2.5 font-bold tracking-wider",
                          showStockColumnsWithBatch ? "w-[11%]" : (showStockColumns ? "w-[15%]" : (trackStock ? "w-[31%]" : "w-[23%]"))
                        )}>Store</th>
                        <th className={cn(
                          "px-[22px] py-2.5 font-bold tracking-wider",
                          showStockColumnsWithBatch ? "w-[11%]" : (showStockColumns ? "w-[15%]" : (trackStock ? "w-[31%]" : "w-[23%]"))
                        )}>Order Catalog</th>
                        {trackStock && (
                          <th className={cn(
                            "px-[22px] py-2.5 font-bold tracking-wider",
                            showStockColumnsWithBatch ? "w-[11%]" : (showStockColumns ? "w-[15%]" : "w-[31%]")
                          )}>Inventory Catalog</th>
                        )}
                        {showStockColumnsWithBatch && (
                          <th className="px-[22px] py-2.5 font-bold tracking-wider w-[11%]">Batch</th>
                        )}
                        {(showStockColumns || showStockColumnsWithBatch) && (
                          <th className="px-[22px] py-2.5 font-bold tracking-wider w-[11%]">Opening Stock</th>
                        )}
                        <th className={cn(
                          "px-[22px] py-2.5 font-bold tracking-wider",
                          showStockColumnsWithBatch ? "w-[11%]" : (showStockColumns ? "w-[13%]" : "w-[15%]")
                        )}>MRP</th>
                        <th className={cn(
                          "px-[22px] py-2.5 font-bold tracking-wider",
                          showStockColumnsWithBatch ? "w-[11%]" : (showStockColumns ? "w-[13%]" : "w-[15%]")
                        )}>Selling Price</th>
                        <th className={cn(
                          "px-[22px] py-2.5 font-bold tracking-wider text-center",
                          showStockColumnsWithBatch ? "w-[11%]" : (showStockColumns ? "w-[12%]" : "w-[15%]")
                        )}>Rate Editable</th>
                        <th className="px-[22px] py-2.5 w-12 bg-surface-50"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 bg-white">
                      {assignments.map((item) => (
                        <React.Fragment key={item.id}>
                        <tr className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                          {/* Store selection dropdown */}
                          <td className="px-[22px] py-2.5">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (openDropdown?.rowId === item.id && openDropdown?.type === 'store') {
                                    setOpenDropdown(null);
                                  } else {
                                    setOpenDropdown({ rowId: item.id, type: 'store' });
                                  }
                                }}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-800 hover:border-surface-300 transition-colors outline-none cursor-pointer"
                              >
                                <span className="truncate text-left" title={storeOptions.find(o => o.id === item.store)?.name || ''}>
                                  {storeOptions.find(o => o.id === item.store)?.name || item.store || '-'}
                                </span>
                                <ChevronDown className="h-4 w-4 text-surface-400 shrink-0 ml-1" />
                              </button>

                              {openDropdown?.rowId === item.id && openDropdown?.type === 'store' && (
                                <div className="absolute top-full left-0 mt-1.5 w-full min-w-[240px] max-h-64 overflow-y-auto bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top">
                                  {storeOptions.map(option => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      disabled={!option.assignable}
                                      title={!option.assignable ? 'Enable inventory on this store to assign items' : option.name}
                                      onClick={() => {
                                        // Record the store AND its inventory catalog, so the
                                        // save step has a concrete catalog to place the item in
                                        // even when the inventory-catalog column is hidden.
                                        setAssignments(prev => prev.map(a => a.id === item.id ? {
                                          ...a,
                                          store: option.id,
                                          storeInventoryCatalogUid: (option as any).inventoryCatalogUid || '',
                                          inventoryCatalog: (option as any).inventoryCatalogUid || a.inventoryCatalog,
                                          catalog: (option as any).orderCatalogUid || a.catalog,
                                        } : a));
                                        setOpenDropdown(null);
                                      }}
                                      className={cn(
                                        "w-full text-left px-4 py-2 transition-colors flex items-center justify-between gap-2",
                                        option.assignable ? "hover:bg-surface-50 cursor-pointer" : "opacity-45 cursor-not-allowed"
                                      )}
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-surface-700">{option.name}</span>
                                        {option.subLabel && (
                                          <span className="block truncate text-[11px] font-medium text-surface-400">{option.subLabel}</span>
                                        )}
                                      </span>
                                      {item.store === option.id && <Check className="h-4 w-4 text-[#55349A] shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Order Catalog selection dropdown */}
                          <td className="px-[22px] py-2.5">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (openDropdown?.rowId === item.id && openDropdown?.type === 'catalog') {
                                    setOpenDropdown(null);
                                  } else {
                                    setOpenDropdown({ rowId: item.id, type: 'catalog' });
                                  }
                                }}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-800 hover:border-surface-300 transition-colors outline-none cursor-pointer"
                              >
                                <span className="truncate">
                                  {orderCatalogOptions.find(o => o.id === item.catalog)?.name || item.catalog || '-'}
                                </span>
                                <ChevronDown className="h-4 w-4 text-surface-400 shrink-0 ml-1" />
                              </button>

                              {openDropdown?.rowId === item.id && openDropdown?.type === 'catalog' && (
                                <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top">
                                  {orderCatalogOptions.map(option => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateAssignment(item.id, 'catalog', option.id);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-[#F8FAFC] font-semibold text-surface-700 transition-colors cursor-pointer"
                                    >
                                      {option.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Inventory Catalog selection dropdown */}
                          {trackStock && (
                            <td className="px-[22px] py-2.5">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (openDropdown?.rowId === item.id && openDropdown?.type === 'inventoryCatalog') {
                                      setOpenDropdown(null);
                                    } else {
                                      setOpenDropdown({ rowId: item.id, type: 'inventoryCatalog' });
                                    }
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-800 hover:border-surface-300 transition-colors outline-none cursor-pointer"
                                >
                                  <span className="truncate">
                                    {catalogOptions.find(o => o.id === item.inventoryCatalog)?.name || item.inventoryCatalog || '-'}
                                  </span>
                                  <ChevronDown className="h-4 w-4 text-surface-400 shrink-0 ml-1" />
                                </button>

                                {openDropdown?.rowId === item.id && openDropdown?.type === 'inventoryCatalog' && (
                                  <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top">
                                    {catalogOptions.map(option => (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                          handleUpdateAssignment(item.id, 'inventoryCatalog', option.id);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-[#F8FAFC] font-semibold text-surface-700 transition-colors cursor-pointer"
                                      >
                                        {option.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Batch — free entry: type a new batch number directly */}
                          {showStockColumnsWithBatch && (
                            <td className="px-[22px] py-2.5 animate-in fade-in duration-200">
                              <input
                                type="text"
                                value={item.batch || ''}
                                onChange={(e) => handleUpdateAssignment(item.id, 'batch', e.target.value)}
                                className="w-full min-w-[90px] px-4 py-2 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                                placeholder="Batch no."
                              />
                            </td>
                          )}

                          {/* Opening Stock Input */}
                          {(showStockColumns || showStockColumnsWithBatch) && (
                            <td className="px-[22px] py-2.5">
                              <input
                                type="text"
                                value={item.openingStock || ''}
                                onChange={(e) => handleUpdateAssignment(item.id, 'openingStock', e.target.value)}
                                className="w-full min-w-[90px] px-4 py-2 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                                placeholder="Opening Stock"
                              />
                            </td>
                          )}

                          {/* MRP Input */}
                          <td className="px-[22px] py-2.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.mrp || ''}
                              onChange={(e) => handleUpdateAssignment(item.id, 'mrp', e.target.value)}
                              className="w-full min-w-[90px] px-4 py-2 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                              placeholder="MRP"
                            />
                          </td>
                          {/* Selling Price Input */}
                          <td className="px-[22px] py-2.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.salesPrice || ''}
                              onChange={(e) => handleUpdateAssignment(item.id, 'salesPrice', e.target.value)}
                              className="w-full min-w-[100px] px-4 py-2 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                              placeholder="Selling Price"
                            />
                          </td>
                          {/* Rate Editable Toggle Button */}
                          <td className="px-[22px] py-2.5">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleUpdateAssignment(item.id, 'rateEditable', !(item.rateEditable ?? true))}
                                className={cn(
                                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer",
                                  (item.rateEditable ?? true) ? "bg-[#55349A]" : "bg-surface-200"
                                )}
                              >
                                <span
                                  className={cn(
                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                    (item.rateEditable ?? true) ? "translate-x-4" : "translate-x-0"
                                  )}
                                />
                              </button>
                            </div>
                          </td>

                          {/* Action buttons (Delete) */}
                          <td className="px-[22px] py-2.5 text-center">
                            {assignments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(item.id)}
                                className="text-surface-400 hover:text-red-500 p-2 hover:bg-red-55/10 rounded-xl transition-all cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Auto-derived per-selling-unit prices for this catalog row. Only shown
                            when the item sells in more than one unit; each price is base × the
                            unit's conversion ratio, editable to override. */}
                        {sellingUnitsForPricing.length > 1 && (
                          <tr className="bg-[#FaF9FE]/60">
                            <td colSpan={12} className="px-6 py-3 border-b border-surface-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mr-1">Unit Prices</span>
                                {sellingUnitsForPricing.map((su) => {
                                  const base = parseFloat(item.salesPrice) || 0;
                                  const derived = Math.round(base * su.ratio * 100) / 100;
                                  const override = item.unitPrices?.[su.unitUid]?.sellingPrice;
                                  const shown = override != null && override !== '' ? override : (base ? String(derived) : '');
                                  return (
                                    <div key={su.unitUid} className="flex items-center gap-1.5 bg-white border border-surface-200 rounded-lg pl-2.5 pr-1.5 py-1">
                                      <span className="text-[11px] font-bold text-surface-600">
                                        {su.name}{su.isDefault ? ' ·base' : ` ×${su.ratio}`}
                                      </span>
                                      <span className="text-[11px] text-surface-300">₹</span>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={shown}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setAssignments(prev => prev.map(a => a.id === item.id ? {
                                            ...a,
                                            unitPrices: { ...(a.unitPrices || {}), [su.unitUid]: { ...(a.unitPrices?.[su.unitUid] || {}), sellingPrice: v } },
                                          } : a));
                                        }}
                                        className="w-16 text-[12px] font-bold text-surface-900 text-right outline-none bg-transparent"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add row button at the bottom */}
                <div className="px-6 py-5 border-t border-surface-100 bg-[#F8FAFC] select-none">
                  <button
                    type="button"
                    onClick={handleAddAssignment}
                    className="flex items-center gap-1.5 text-sm font-bold text-[#55349A] hover:text-[#452a7d] transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    {/* Sticky / Fixed Bottom Bar */}
    <div className={cn(
      "bg-white border-t border-surface-100 py-4 px-8 flex items-center justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]",
      currentStep === 'catalog' ? "fixed-catalog-bottom-bar" : "sticky bottom-0 left-0 right-0 z-10"
    )}>
      <button
        onClick={currentStep === 'catalog' ? () => setCurrentStep('form') : onBack}
        className="px-8 py-2.5 border border-surface-200 rounded-xl text-sm font-bold text-surface-500 hover:bg-surface-50 transition-all min-w-[120px]"
      >
        {currentStep === 'catalog' ? 'Back' : 'Cancel'}
      </button>
      <button
        onClick={() => {
          if (currentStep === 'form') {
            // UX-1: enforce required fields before leaving step 1.
            const errors: { name?: string; category?: string } = {};
            if (!itemName.trim()) errors.name = 'Item name is required';
            if (!selectedCategory.trim()) errors.category = 'Category is required';
            setFormErrors(errors);
            if (Object.keys(errors).length > 0) {
              return; // stay on the form; show the field errors
            }
            setCurrentStep('catalog');
          } else {
            if (onSave) {
              onSave({
                id: itemToEdit?.id,
                name: itemName,
                description: itemDescription,
                sku: sku,
                // Barcode is its own field now (persisted in the item's attributes map), no
                // longer overloaded into `code`.
                barcode: barcode,
                category: selectedCategory,
                brand: selectedBrand,
                brandName: selectedBrand,
                verticalType: isPharmacyItem ? 'PHARMACY' : 'RETAIL',
                medicineSystem: isPharmacyItem ? medicineSystem : 'NONE',
                isPharmacyItem: isPharmacyItem,
                itemType: selectedItemType,
                weight: weight,
                hsnCode: hsnCode,
                taxGroup: selectedTaxGroup,
                taxPreference: selectedTaxPreference,
                baseUnitUid: baseUnitUid,
                variants: itemToEdit?.variants || 1,
                trackInventory: trackStock,
                batchTracking: batchTracking,
                // Selling-unit configuration (commerce-service contract)
                allowLooseSale: unitConfig.allowLooseSale,
                rxEnabled: unitConfig.rxEnabled,
                drugSchedule: drugSchedule !== 'NONE' ? drugSchedule : undefined,
                ayushType: ayushType || undefined,
                shelfLifeMonths: shelfLifeMonths ? Number(shelfLifeMonths) : undefined,
                noExpiry: noExpiry,
                composition: composition || undefined,
                productSpecification: unitConfig.productSpecification,
                productContains: unitConfig.productContains,
                productContainsUnitUid: unitConfig.productContainsUnitUid || null,
                // Item units define the UOM structure only — conversion + roles. Price/MRP/
                // min/max/increment are NOT sent from here; they belong to the order-catalog
                // item (set on the catalog assignment step), per selling unit per catalog.
                units: unitConfig.units.map((u) => ({
                  unitUid: u.unitUid,
                  conversionQty: u.conversionQty,
                  selling: u.selling,
                  purchase: u.purchase,
                  rx: u.rx,
                  isDefault: u.isDefault,
                  sellingDefault: u.sellingDefault,
                  purchaseDefault: u.purchaseDefault,
                  rxDefault: u.rxDefault,
                })),
                status: itemToEdit?.status || 'Active',
                image: galleryImages[0] || itemToEdit?.image,
                assignments: assignments,
                attributes: attributes,
                // Merchandising fields — captured in state but previously never sent, so tags,
                // badges and related-item links silently vanished on save. Backend ItemDto
                // supports all four (tags, badges, upsellItemUids, crossSellItemUids).
                tags: tags,
                badges: badges,
                upsellItemUids: upsells,
                crossSellItemUids: crossSells,
                // Additional Information blocks — captured in state but never sent before, so the
                // whole section was discarded on save. Persisted in the item's attributes map.
                infoBlocks: infoBlocks,
              });
            } else {
              setShowDetails(true);
            }
          }
        }}
        className="px-10 py-2.5 bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-[#452a7d] transition-all shadow-lg shadow-primary-600/20 min-w-[140px]"
      >
        {currentStep === 'form' ? 'Next' : (itemToEdit ? 'Save Item' : 'Create Item')}
      </button>
    </div>

    {/* Custom Category Modal Popup - Fully Matching the design of uploaded image.png */}
    {isAddingCategory && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
        <form onSubmit={handleAddCategorySubmit} className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-left space-y-6">
          {/* Close Circular Button */}
          <button
            type="button"
            onClick={() => setIsAddingCategory(false)}
            className="absolute top-6 right-6 p-2 bg-[#F1EFF7] hover:bg-[#E9E4F5] text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Add Brand New Category
            </h3>
            <p className="text-sm font-semibold text-slate-400 leading-normal mt-2">
              Create a top-level category to organize your retail catalog items instantly.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-[#8FA3C7] uppercase tracking-wider block">
              CATEGORY NAME
            </label>
            <input
              type="text"
              placeholder="e.g., Knitwear, Accessories"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-5 py-4 bg-white border-2 border-violet-100/80 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-4 focus:ring-[#55349A]/5 transition-all outline-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="px-6 py-3 bg-[#EEF2F6] hover:bg-[#E3E8F0] text-slate-600 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[#55349A] hover:bg-[#452a7d] text-white font-bold text-sm rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer"
            >
              Add Category
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Custom Brand Modal Popup - Fully Matching the design of uploaded image.png */}
    {isAddingBrand && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
        <form onSubmit={handleAddBrandSubmit} className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-left space-y-6">
          {/* Close Circular Button */}
          <button
            type="button"
            onClick={() => setIsAddingBrand(false)}
            className="absolute top-6 right-6 p-2 bg-[#F1EFF7] hover:bg-[#E9E4F5] text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Add Brand New Brand
            </h3>
            <p className="text-sm font-semibold text-slate-400 leading-normal mt-2">
              Create a brand to organize your retail catalog items instantly.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-[#8FA3C7] uppercase tracking-wider block">
              BRAND NAME
            </label>
            <input
              type="text"
              placeholder="Brand name"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              className="w-full px-5 py-4 bg-white border-2 border-violet-100/80 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-4 focus:ring-[#55349A]/5 transition-all outline-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingBrand(false)}
              className="px-6 py-3 bg-[#EEF2F6] hover:bg-[#E3E8F0] text-slate-600 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[#55349A] hover:bg-[#452a7d] text-white font-bold text-sm rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer"
            >
              Add Brand
            </button>
          </div>
        </form>
      </div>
    )}
  </div>
);
};
