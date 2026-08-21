import React, { useState, useRef } from 'react';
import {
  cn
} from '../lib/utils';
import {
  Folder, File, FileText, Image, Film, Plus, Search, Activity,
  ChevronRight, ChevronLeft, ArrowLeft, MoreVertical, UploadCloud, Grid, List as ListIcon,
  Trash2, Download, Eye, AlertCircle, RefreshCw, HardDrive,
  ChevronDown, FolderPlus, Info, FileSpreadsheet, ExternalLink,
  CheckCircle2, X, Users, Share2, Cloud, Filter, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// TS Interfaces for HIPAA Secure Drive
export interface DriveFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'sheet' | 'doc' | 'video' | 'other';
  size: string;
  sizeBytes: number;
  lastModified: string;
  owner: string;
  folderId: string | null;
  downloadUrl?: string;
  previewUrl?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  itemCount: number;
  color: string;
  lastModified: string;
  category: 'my_files' | 'shared';
}

const INITIAL_FOLDERS: DriveFolder[] = [];

const INITIAL_FILES: DriveFile[] = [];

export const DrivePage: React.FC = () => {
  // Drive States
  const [folders, setFolders] = useState<DriveFolder[]>(INITIAL_FOLDERS);
  const [files, setFiles] = useState<DriveFile[]>(INITIAL_FILES);

  // currentDirId handles navigation:
  // 'root' -> showing "My Files" and "Shared" primary root-level folders
  // 'my_files' -> showing primary user folders ("My Personal Records", "My Invoices & Billing")
  // 'shared' -> showing doctor-patient shared folders ("Patient Folder", "Doctor Folder")
  // [folder_id] -> leaf directory with actual files inside
  const [currentDirId, setCurrentDirId] = useState<string>('root');

  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // UI Dropdowns & Modals State
  const [activeFileActionDropdown, setActiveFileActionDropdown] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('text-indigo-600 bg-indigo-50 border-indigo-100');

  // Detail preview / Share modal states
  const [viewPreviewFile, setViewPreviewFile] = useState<DriveFile | null>(null);
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);

  // Upload Simulation States
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; progress: number } | null>(null);

  // Active Category helper to sync sidebar view
  const getActiveCategory = (): 'my_files' | 'shared' => {
    if (currentDirId === 'my_files') return 'my_files';
    if (currentDirId === 'shared') return 'shared';
    const currentFolder = folders.find(f => f.id === currentDirId);
    if (currentFolder) return currentFolder.category;
    return 'my_files';
  };
  const activeCategory = getActiveCategory();

  const handleBack = () => {
    if (currentDirId === 'root') {
      // already at root, do nothing
    } else if (currentDirId === 'my_files' || currentDirId === 'shared') {
      setCurrentDirId('root');
    } else {
      const currentFolder = folders.find(f => f.id === currentDirId);
      if (currentFolder) {
        setCurrentDirId(currentFolder.category);
      } else {
        setCurrentDirId('root');
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const simulateProgressValue = (fileName: string) => {
    setUploadProgress({ name: fileName, progress: 0 });
    let current = 0;
    const interval = setInterval(() => {
      current += 15;
      if (current >= 100) {
        clearInterval(interval);
        setUploadProgress(null);

        // Add new file item
        const randomSizeNum = Math.floor(Math.random() * 500000) + 50000;
        const randomSizeStr = randomSizeNum > 1000000
          ? `${(randomSizeNum / 1000000).toFixed(1)} MB`
          : `${Math.floor(randomSizeNum / 1024)} KB`;

        const ext = fileName.split('.').pop()?.toLowerCase();
        let derivedType: DriveFile['type'] = 'other';
        if (ext === 'pdf') derivedType = 'pdf';
        else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) derivedType = 'image';
        else if (['xlsx', 'xls', 'csv'].includes(ext || '')) derivedType = 'sheet';
        else if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) derivedType = 'doc';
        else if (['mp4', 'mov', 'avi'].includes(ext || '')) derivedType = 'video';

        // Bind folder ID if inside leaf, else put to appropriate root (or leave null if general root)
        let bindFolderId: string | null = null;
        if (!['root', 'my_files', 'shared'].includes(currentDirId)) {
          bindFolderId = currentDirId;
        } else if (currentDirId === 'my_files') {
          bindFolderId = 'f_personal';
        } else if (currentDirId === 'shared') {
          bindFolderId = 'f_patient';
        }

        const newFileItem: DriveFile = {
          id: `doc_${Date.now()}`,
          name: fileName,
          type: derivedType,
          size: randomSizeStr,
          sizeBytes: randomSizeNum,
          lastModified: 'Jun 11, 2026',
          owner: 'David Beckham',
          folderId: bindFolderId
        };

        setFiles(prev => [newFileItem, ...prev]);

        // If target folder exists, increment count
        if (bindFolderId) {
          setFolders(prev => prev.map(f => f.id === bindFolderId ? { ...f, itemCount: f.itemCount + 1 } : f));
        }
      } else {
        setUploadProgress({ name: fileName, progress: current });
      }
    }, 150);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      simulateProgressValue(droppedFile.name);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      simulateProgressValue(selectedFile.name);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Folder creation
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolderObj: DriveFolder = {
      id: `f_${Date.now()}`,
      name: newFolderName.trim(),
      itemCount: 0,
      color: newFolderColor,
      lastModified: 'Jun 11, 2026',
      category: activeCategory
    };

    setFolders(prev => [...prev, newFolderObj]);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
  };

  // Action methods on files
  const handleDeleteFile = (id: string, folderId: string | null) => {
    if (confirm("Are you sure you want to securely delete this certified medical document?")) {
      setFiles(prev => prev.filter(f => f.id !== id));
      if (folderId) {
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, itemCount: Math.max(0, f.itemCount - 1) } : f));
      }
    }
    setActiveFileActionDropdown(null);
  };

  // Calculate spaces/metrics
  const totalSizeBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const maxStorageLimit = 10 * 1024 * 1024 * 1024; // 10 GB limit for patient usage

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  // File Location string helper
  const getFileLocation = (file: DriveFile): string => {
    const parentFolder = folders.find(f => f.id === file.folderId);
    if (parentFolder) {
      return parentFolder.category === 'shared' ? 'Shared' : 'My Files';
    }
    return 'My Files';
  };

  // Type-specific icon
  const renderTypeIcon = (type: DriveFile['type'], fileName?: string) => {
    let resolvedType = type as string;
    if (fileName) {
      const lowerName = fileName.toLowerCase();
      if (
        lowerName.endsWith('.zip') ||
        lowerName.endsWith('.rar') ||
        lowerName.endsWith('.tar') ||
        lowerName.endsWith('.7z') ||
        lowerName.endsWith('.gz')
      ) {
        resolvedType = 'zip';
      }
    }

    // Determine config based on resolvedType
    let config = {
      bg: 'from-slate-450 to-slate-600',
      label: 'FILE',
      bandBg: 'bg-black/15',
      icon: <File className="h-4.5 w-4.5 text-white/95 drop-shadow-xs" />,
      id: 'file-original-icon'
    };

    if (resolvedType === 'pdf') {
      config = {
        bg: 'from-red-500 to-rose-600',
        label: 'PDF',
        bandBg: 'bg-black/15',
        icon: <FileText className="h-4.5 w-4.5 text-white/95 drop-shadow-xs" />,
        id: 'pdf-original-icon'
      };
    } else if (resolvedType === 'doc') {
      config = {
        bg: 'from-blue-500 to-indigo-600',
        label: 'DOC',
        bandBg: 'bg-black/15',
        icon: <FileText className="h-4.5 w-4.5 text-white/95 drop-shadow-xs" />,
        id: 'word-original-icon'
      };
    } else if (resolvedType === 'sheet') {
      config = {
        bg: 'from-emerald-500 to-green-600',
        label: 'EXCEL',
        bandBg: 'bg-black/15',
        icon: <FileSpreadsheet className="h-4.5 w-4.5 text-white/95 drop-shadow-xs" />,
        id: 'sheet-original-icon'
      };
    } else if (resolvedType === 'image') {
      config = {
        bg: 'from-purple-500 to-violet-650',
        label: 'IMG',
        bandBg: 'bg-black/15',
        icon: <Image className="h-4.5 w-4.5 text-white/95 drop-shadow-xs" />,
        id: 'image-original-icon'
      };
    } else if (resolvedType === 'video') {
      config = {
        bg: 'from-cyan-500 to-sky-600',
        label: 'VIDEO',
        bandBg: 'bg-black/15',
        icon: <Film className="h-4.5 w-4.5 text-white/95 drop-shadow-xs" />,
        id: 'video-original-icon'
      };
    } else if (resolvedType === 'zip') {
      config = {
        bg: 'from-amber-500 to-amber-600',
        label: 'ZIP',
        bandBg: 'bg-black/15',
        icon: <Archive className="h-4.5 w-4.5 text-white/95 drop-shadow-xs" />,
        id: 'zip-original-icon'
      };
    }

    return (
      <div
        className={cn(
          "h-11 w-9 shrink-0 relative flex flex-col items-center justify-between rounded-lg bg-gradient-to-br shadow-md text-white select-none overflow-hidden",
          config.bg
        )}
        style={{ clipPath: 'polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%)' }}
        id={config.id}
      >
        {/* The Folded Corner Ear */}
        <div
          className="absolute top-0 right-0 w-[9px] h-[9px] bg-black/25"
          style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}
        />

        {/* Content area */}
        <div className="flex-grow flex items-center justify-center pt-1.5 pb-0.5">
          {config.icon}
        </div>

        {/* Label Bar */}
        <div className={cn("w-full text-center py-0.5 text-[7px] font-black tracking-widest uppercase leading-none font-sans select-none", config.bandBg)}>
          {config.label}
        </div>
      </div>
    );
  };

  // Filtered files logic
  const filteredFiles = files.filter(file => {
    // 1. Search filter
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.owner.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Type filter
    let matchesType = true;
    if (fileTypeFilter !== 'all') {
      matchesType = file.type === fileTypeFilter;
    }

    // 3. Folder/Directory structure navigation
    let matchesFolderId = true;
    if (currentDirId === 'root') {
      // Show all files in Recent Files list on root screen
      matchesFolderId = true;
    } else if (currentDirId === 'my_files') {
      const parentFolder = folders.find(f => f.id === file.folderId);
      matchesFolderId = file.folderId === null || (parentFolder !== undefined && parentFolder.category === 'my_files');
    } else if (currentDirId === 'shared') {
      const parentFolder = folders.find(f => f.id === file.folderId);
      matchesFolderId = parentFolder !== undefined && parentFolder.category === 'shared';
    } else {
      // Selected specific folder inside
      matchesFolderId = file.folderId === currentDirId;
    }

    return matchesSearch && matchesType && matchesFolderId;
  });

  // Calculate virtual root folder list
  const virtualRootFolders = [
    {
      id: 'my_files',
      name: 'My Files',
      itemCount: folders.filter(f => f.category === 'my_files').length,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      description: 'Personal care records and logs',
      lastModified: 'Jun 10, 2026'
    },
    {
      id: 'shared',
      name: 'Shared',
      itemCount: folders.filter(f => f.category === 'shared').length,
      color: 'text-rose-600 bg-rose-205 bg-rose-50 border-rose-100',
      description: 'Prescriptions & Doctor folders',
      lastModified: 'Jun 11, 2026'
    }
  ];

  // Breadcrumbs renderer
  const renderBreadcrumbs = () => {
    if (currentDirId === 'root') {
      return (
        <span className="text-[#55349A] font-black uppercase tracking-wider text-[11px] bg-[#55349A]/5 px-3 py-1.5 rounded-lg border border-[#55349A]/10">Drive Root</span>
      );
    }
    if (currentDirId === 'my_files') {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setCurrentDirId('root')}
            className="hover:text-[#55349A] cursor-pointer transition-colors uppercase font-black tracking-wider text-slate-400 border-none bg-transparent"
          >
            Drive Root
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-350" />
          <span className="text-slate-800 font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">My Files</span>
        </div>
      );
    }
    if (currentDirId === 'shared') {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setCurrentDirId('root')}
            className="hover:text-[#55349A] cursor-pointer transition-colors uppercase font-black tracking-wider text-slate-400 border-none bg-transparent"
          >
            Drive Root
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-350" />
          <span className="text-slate-800 font-extrabold uppercase bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg">Shared</span>
        </div>
      );
    }

    // Specific folder view
    const currentFolder = folders.find(f => f.id === currentDirId);
    if (!currentFolder) return <span className="text-slate-800 font-extrabold text-[11px] uppercase">Unknown Locker</span>;
    const isShared = currentFolder.category === 'shared';

    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setCurrentDirId('root')}
          className="hover:text-[#55349A] cursor-pointer transition-colors uppercase font-black tracking-wider text-slate-400 border-none bg-transparent"
        >
          Drive Root
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <button
          type="button"
          onClick={() => setCurrentDirId(isShared ? 'shared' : 'my_files')}
          className="hover:text-[#55349A] cursor-pointer transition-colors uppercase font-black tracking-wider text-slate-400 border-none bg-transparent"
        >
          {isShared ? 'Shared' : 'My Files'}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="text-[#55349A] font-extrabold uppercase border border-[#55349A]/20 bg-[#55349A]/5 px-2.5 py-1 rounded-lg">
          {currentFolder.name}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col font-sans text-slate-800 bg-[#FAFAFA]" id="drive-layout-container">
      {/* 1. Compliant Header */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 shadow-3xs" id="drive-page-header">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentDirId === 'root'}
            className="p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center text-slate-900 mr-1.5"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Drive</h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleManualUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => { alert('Drive backend not available'); }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-not-allowed opacity-60 shadow-3xs border-none"
            id="create-folder-btn"
          >
            <FolderPlus className="h-4 w-4 text-slate-500" />
            New Folder
          </button>
          <button
            type="button"
            onClick={() => { alert('Drive backend not available'); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#55349A] hover:bg-[#432380] border border-[#55349A] rounded-xl text-xs font-black text-white transition-all transform cursor-not-allowed opacity-60 border-none shadow-3xs"
            id="upload-file-btn"
          >
            <UploadCloud className="h-4 w-4" />
            Upload File
          </button>
        </div>
      </div>

      {/* 2. Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" id="drive-workspace">

        {/* Workspace Main Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 sm:p-8 space-y-6" id="drive-workspace-main">

          {/* Availability Banner */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Drive Integration Not Available</h3>
              <p className="text-xs text-amber-700 mt-1">
                The HIPAA Secure Drive feature is currently not connected to the backend storage provider. Uploads and folder management are disabled in this environment.
              </p>
            </div>
          </div>

          {/* Breadcrumbs & Modern Popover Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-slate-100 shadow-3xs" id="drive-toolbar">

            {/* Dynamic Breadcrumbs */}
            <div className="flex items-center" id="drive-breadcrumbs">
              {renderBreadcrumbs()}
            </div>

            {/* Actions: Grid/List Toggle & Premium Dialog Filter */}
            <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto" id="drive-filters">

              {/* Interactive Popover Dropdown Selector requested */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs border-none"
                  id="filter-trigger"
                >
                  <Filter className="h-3.5 w-3.5 text-[#55349A]" />
                  <span>File Class: {fileTypeFilter === 'all' ? 'All Files' : fileTypeFilter.toUpperCase()}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                <AnimatePresence>
                  {isFilterDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsFilterDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left"
                      >
                        {[
                          { id: 'all', label: 'All Files' },
                          { id: 'pdf', label: 'PDF Documents' },
                          { id: 'image', label: 'Scans & Images' },
                          { id: 'sheet', label: 'Invoices & Sheets' },
                          { id: 'doc', label: 'Word Docs' },
                        ].map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setFileTypeFilter(item.id);
                              setIsFilterDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 flex items-center justify-between cursor-pointer border-none",
                              fileTypeFilter === item.id ? "text-[#55349A] font-black bg-[#55349A]/5" : "text-slate-600"
                            )}
                          >
                            <span>{item.label}</span>
                            {fileTypeFilter === item.id && <CheckCircle2 className="h-3.5 w-3.5 text-[#55349A]" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

              {/* View toggle (Grid / List) */}
              <div className="flex items-center border border-slate-100 rounded-lg overflow-hidden bg-[#FAFAFA]" id="view-toggle">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn("p-1.5 cursor-pointer border-none", viewMode === 'grid' ? "bg-white text-[#55349A] shadow-3xs" : "text-slate-400 hover:text-slate-700")}
                  title="Grid view"
                >
                  <Grid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn("p-1.5 cursor-pointer border-none", viewMode === 'list' ? "bg-white text-[#55349A] shadow-3xs" : "text-slate-400 hover:text-slate-700")}
                  title="List view"
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Secure drag Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-6 px-10 text-center transition-all duration-150",
              isDragging ? "border-[#55349A] bg-[#55349A]/5 scale-[0.99] shadow-3xs" : "border-slate-200 bg-white"
            )}
            id="drag-drop-zone"
          >
            {isDragging ? (
              <div className="animate-pulse space-y-2">
                <UploadCloud className="h-10 w-10 text-[#55349A] mx-auto" />
                <span className="text-xs font-black text-[#55349A] block">Drop files here to upload instantly...</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 text-left w-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#55349A] shrink-0">
                    <UploadCloud className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-slate-800 leading-tight">Drag and drop scanned health reports</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Files reside secure and compliant in your current folder location.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="px-3.5 py-1.8 bg-purple-50 hover:bg-purple-100 rounded-xl text-[11px] font-black text-[#55349A] transition-colors cursor-pointer border-none"
                >
                  Browse Files
                </button>
              </div>
            )}

            {/* Upload status tracker */}
            {uploadProgress && (
              <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-6 z-10" id="upload-progress-overlay">
                <div className="w-full max-w-xs space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-700 truncate max-w-[200px]">{uploadProgress.name}</span>
                    <span className="text-[#55349A] font-black">{uploadProgress.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-[#55349A] h-full rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadProgress.progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <span className="text-[9px] text-[#55349A] font-black tracking-wider uppercase block text-center animate-pulse">Running encryption cipher...</span>
                </div>
              </div>
            )}
          </div>

          {/* Directory Folder Tree Grid */}
          <div className="space-y-3" id="folders-cluster-section">
            <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase block text-left">
              {currentDirId === 'root' ? 'My Drive' : currentDirId === 'my_files' ? 'My Files Folders' : currentDirId === 'shared' ? 'Shared Folders' : 'Cabinet Folder'}
            </h3>

            {/* Folder representations */}
            {['root', 'my_files', 'shared'].includes(currentDirId) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="folders-grid">

                {/* 1. At Drive root, we only click My Files / Shared */}
                {currentDirId === 'root' && virtualRootFolders.map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentDirId(folder.id)}
                    className={cn(
                      "flex items-center gap-3.5 p-4 rounded-xl border border-slate-100 bg-white shadow-3xs cursor-pointer select-none",
                      "hover:shadow-xs hover:border-[#55349A]/30 transition-all text-left group"
                    )}
                  >
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border", folder.color)}>
                      {folder.id === 'shared' ? (
                        <Users className="h-6 w-6 stroke-[1.8] group-hover:scale-105 transition-transform" />
                      ) : (
                        <Folder className="h-6 w-6 stroke-[1.8] group-hover:scale-105 transition-transform" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-black text-slate-800 pr-1 group-hover:text-[#55349A] transition-colors truncate tracking-tight">{folder.name}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-0.5">
                        <span>{folder.itemCount} dynamic folders</span>
                        <span>&middot;</span>
                        <span className="truncate">{folder.lastModified}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. Inside My Files view */}
                {currentDirId === 'my_files' && folders.filter(f => f.category === 'my_files').map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentDirId(folder.id)}
                    className={cn(
                      "flex items-center gap-3.5 p-4 rounded-xl border border-slate-100 bg-white shadow-3xs cursor-pointer select-none",
                      "hover:shadow-xs hover:border-[#55349A]/30 transition-all text-left group"
                    )}
                  >
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border", folder.color)}>
                      <Folder className="h-6 w-6 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-black text-slate-800 group-hover:text-[#55349A] transition-colors truncate tracking-tight">{folder.name}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-extrabold mt-0.5">
                        <span>{files.filter(f => f.folderId === folder.id).length} files</span>
                        <span>&middot;</span>
                        <span className="truncate">{folder.lastModified}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3. Inside Shared Folder path view */}
                {currentDirId === 'shared' && folders.filter(f => f.category === 'shared').map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentDirId(folder.id)}
                    className={cn(
                      "flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 bg-white shadow-3xs cursor-pointer select-none",
                      "hover:shadow-xs hover:border-[#55349A]/30 transition-all text-left group"
                    )}
                  >
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border", folder.color)}>
                      <Users className="h-6 w-6 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-black text-slate-800 group-hover:text-[#55349A] transition-colors truncate tracking-tight">{folder.name}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-extrabold mt-0.5">
                        <span>{files.filter(f => f.folderId === folder.id).length} documents</span>
                        <span>&middot;</span>
                        <span className="truncate">{folder.lastModified}</span>
                      </div>
                    </div>
                  </div>
                ))}

              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-left text-xs text-slate-500 font-bold flex items-center justify-between">
                <span>Currently viewing files of: <strong className="text-slate-800 font-extrabold">"{folders.find(fd => fd.id === currentDirId)?.name}"</strong></span>
                <button
                  type="button"
                  onClick={() => setCurrentDirId(activeCategory)}
                  className="text-[#55349A] font-black hover:underline cursor-pointer bg-transparent border-none"
                >
                  Parent folder &larr;
                </button>
              </div>
            )}
          </div>

          {/* Recent / Categorized Documents Stream list */}
          <div className="space-y-3" id="files-list-section">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase block text-left">
                {currentDirId === 'root' ? 'Recent Files' : 'Files in this section'}
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">{filteredFiles.length} item(s) found</span>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-16 px-6 text-center text-slate-400 space-y-2 shadow-3xs" id="empty-files-container">
                <File className="h-10 w-10 mx-auto text-slate-300 stroke-[1.5]" />
                <h4 className="text-[13.5px] font-black text-slate-700">No HIPAA records found</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-bold text-center">
                  This segment doesn't contain files or matches no filter keywords. Choose "Upload File" above or drag files here.
                </p>
              </div>
            ) : viewMode === 'grid' ? (

              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="files-grid-container">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    className="bg-white rounded-xl border border-slate-100 p-4 relative group flex flex-col justify-between shadow-3xs hover:shadow-xs transition-shadow"
                  >
                    <div>
                      {/* File Icon & Context Actions */}
                      <div className="flex items-start justify-between">
                        {renderTypeIcon(file.type, file.name)}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFileActionDropdown(activeFileActionDropdown === file.id ? null : file.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                            aria-label="Actions dropdown menu"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {/* Action drop down options */}
                          {activeFileActionDropdown === file.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveFileActionDropdown(null)} />
                              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-25 py-1 text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewPreviewFile(file);
                                    setActiveFileActionDropdown(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none bg-white font-sans"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-450" />
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(`Downloading file directly: ${file.name}`);
                                    setActiveFileActionDropdown(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none bg-white font-sans"
                                >
                                  <Download className="h-3.5 w-3.5 text-slate-450" />
                                  Download
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShareFile(file);
                                    setActiveFileActionDropdown(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none bg-white font-sans"
                                >
                                  <Share2 className="h-3.5 w-3.5 text-slate-450 text-[#55349A]" />
                                  Share Link
                                </button>
                                <hr className="border-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(file.id, file.folderId)}
                                  className="w-full text-left px-3.5 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-none bg-white font-sans"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="mt-4 text-left">
                        <h4 className="text-[13px] font-black text-slate-800 truncate tracking-tight pr-1.5" title={file.name}>
                          {file.name}
                        </h4>

                        {/* Dynamic Location Badge for Root level navigation */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="inline-block text-[9px] font-black uppercase py-0.5 px-2 rounded-lg bg-slate-100 text-slate-500 tracking-wider">
                            {file.type.toUpperCase()}
                          </span>
                          {currentDirId === 'root' && (
                            <span className={cn(
                              "inline-block text-[9px] font-black uppercase py-0.5 px-2 rounded-lg tracking-wider border",
                              getFileLocation(file) === 'Shared' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-indigo-50 text-indigo-650 border-indigo-100"
                            )}>
                              {getFileLocation(file)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer data fields */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                      <span className="truncate max-w-[110px] text-slate-500 inline-flex items-center gap-1" title={file.owner}>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {file.owner}
                      </span>
                      <span className="text-[10px] tabular-nums">{file.lastModified}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (

              /* LIST VIEW */
              <div className="bg-white rounded-2xl border border-[#f1f1f1] shadow-3xs overflow-hidden" id="files-list-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Owner</th>
                        <th className="py-3 px-4">Last Modified</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[12px] font-bold text-slate-650">
                      {filteredFiles.map(file => (
                        <tr key={file.id} className="hover:bg-slate-50/45 transition-colors">
                          <td className="py-3.5 px-5 flex items-center gap-2.5 min-w-[245px]">
                            <div className="shrink-0">{renderTypeIcon(file.type, file.name)}</div>
                            <span className="text-slate-800 font-black tracking-tight truncate max-w-[195px]" title={file.name}>
                              {file.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 min-w-[110px]">
                            <span className={cn(
                              "inline-block text-[9.5px] font-black uppercase py-0.5 px-2 rounded-lg border",
                              getFileLocation(file) === 'Shared' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-indigo-50 text-indigo-650 border-indigo-100"
                            )}>
                              {getFileLocation(file)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 truncate max-w-[130px]" title={file.owner}>{file.owner}</td>
                          <td className="py-3.5 px-4 text-slate-400 tabular-nums">{file.lastModified}</td>
                          <td className="py-3.5 px-4 tabular-nums text-slate-500">{file.size}</td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewPreviewFile(file)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer transition-colors border-none"
                                title="Open File"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => alert(`Downloading document pipeline for ${file.name}...`)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer transition-colors border-none"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShareFile(file)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-[#55349A] rounded-lg cursor-pointer transition-colors border-none"
                                title="Share"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file.id, file.folderId)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer transition-colors border-none"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100/60" />

          {/* Bottom Info Grid: Storage & Support, Compliance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="drive-bottom-info-section">

            {/* Column 1: Storage Indicator & Support Request */}
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs space-y-4" id="drive-stats-storage-card-main">
              <div className="flex items-center gap-2 text-slate-400">
                <Cloud className="h-4.5 w-4.5 text-[#55349A] shrink-0 z-10" />
                <span className="text-[10px] font-black tracking-wider uppercase">Storage Status</span>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="bg-[#55349A] h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(2, (totalSizeBytes / maxStorageLimit) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>{formatBytes(totalSizeBytes)} used</span>
                  <span>10.0 GB limit</span>
                </div>
              </div>

              <div className="p-4 bg-[#55349A]/5 border border-[#55349A]/10 rounded-xl text-[10.5px] leading-relaxed text-slate-500 text-left">
                <div className="font-extrabold text-[#55349A] mb-1">ADD MORE STORAGE</div>
                To purchase additional cloud storage, please contact our support team at:
                <div className="mt-1.5 text-[11.5px] font-black text-[#55349A] underline">
                  <a href="tel:+918714766671" className="hover:text-[#432380] font-bold">+91 8714766671</a>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 block">They will be happy to assist you.</span>
              </div>
            </div>

            {/* Column 2: Compliance & Security details */}
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs flex flex-col justify-between space-y-4" id="hipaa-compliance-card">
              <div className="flex items-start gap-3 text-left">
                <div className="p-2 w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                </div>
                <div className="text-left">
                  <span className="text-[12px] font-black text-slate-800 block">HIPAA Transmission Security</span>
                  <p className="text-[11px] text-slate-450 leading-relaxed mt-1">
                    All patient scans, prescriptions, surgical consent forms, and medical records are transmitted via industry-grade TLS 1.3 streams with end-to-end encryption.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 font-semibold text-left">
                🔒 Security compliance audits are executed dynamically. Session status: <strong className="text-emerald-600 font-extrabold">Active & Certified</strong>.
              </div>
            </div>

          </div>

        </div>

        {/* Workspace Storage Stats Sidebar */}
        <div className="w-full lg:w-72 bg-white lg:border-l lg:border-slate-100 p-6 sm:p-7 flex flex-col shrink-0 gap-6.5" id="drive-stats-sidebar">

          {/* Allocation card */}
          <div className="bg-slate-50/55 rounded-2xl border border-slate-100/80 p-5 space-y-4 text-left shadow-5xs" id="drive-stats-storage-card">
            <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Cabinet Allocation</h4>

            <div className="space-y-2.5">
              <div className="flex items-end justify-between font-bold">
                <span className="text-slate-900 text-[16px] font-black tracking-tight">{formatBytes(totalSizeBytes)}</span>
                <span className="text-slate-400 text-[10px] font-semibold">of 10.0 GB limit</span>
              </div>

              <div className="h-2 bg-slate-200/70 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#55349A] to-[#6d44c4] h-full rounded-full transition-all duration-500 shadow-3xs"
                  style={{ width: `${Math.min(100, Math.max(1, (totalSizeBytes / maxStorageLimit) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Custom styled box for additional storage purchase instructions as requested */}
          <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2.5 text-left shadow-4xs" id="additional-purchase-banner">
            <div className="text-[10.5px] font-black text-[#55349A] uppercase tracking-wider flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-[#55349A]/5 text-[#55349A] inline-flex items-center">
                <Info className="h-3.5 w-3.5" />
              </span>
              <span>Buy Extra Storage</span>
            </div>
            <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
              To purchase additional cloud storage, please contact our support team at the following contact information:
            </p>
            <div className="bg-slate-50 border border-slate-150 hover:border-slate-200 transition-colors py-2 px-3 rounded-xl flex items-center gap-2">
              <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider shrink-0">Support Line</span>
              <a href="tel:+918714766671" className="text-[12px] font-extrabold text-[#55349A] hover:text-[#432380] hover:underline whitespace-nowrap transition-colors">+91 8714766671</a>
            </div>
            <p className="text-[9px] text-slate-400 font-medium leading-snug">
              They will be happy to assist you.
            </p>
          </div>

          {/* Quick search input */}
          <div className="relative group" id="drive-quick-search-container">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#55349A] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file name or owner..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/60 hover:bg-slate-100/60 focus:bg-white border border-slate-150 rounded-xl outline-none focus:border-[#55349A]/40 focus:ring-4 focus:ring-[#55349A]/5 text-slate-800 font-bold transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 text-slate-400 rounded-full transition-colors border-none cursor-pointer bg-transparent"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* File Space Breakdown metrics list */}
          <div className="space-y-3.5 text-left" id="drive-breakdown">
            <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Space Breakdown</h4>

            <div className="space-y-3">
              {/* Category-wide breakdown summary */}
              <div className="p-3.5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl space-y-2 border border-slate-100 text-left">
                <div className="flex justify-between items-center text-[10.5px] font-semibold text-slate-500">
                  <span>My Files Total:</span>
                  <span className="text-slate-800 font-extrabold">{formatBytes(files.filter(f => !f.folderId || folders.find(fd => fd.id === f.folderId)?.category === 'my_files').reduce((acc, f) => acc + f.sizeBytes, 0))}</span>
                </div>
                <div className="flex justify-between items-center text-[10.5px] font-semibold text-slate-500">
                  <span>Shared Files Total:</span>
                  <span className="text-slate-800 font-extrabold">{formatBytes(files.filter(f => {
                    const fd = folders.find(folder => folder.id === f.folderId);
                    return fd && fd.category === 'shared';
                  }).reduce((acc, f) => acc + f.sizeBytes, 0))}</span>
                </div>
              </div>

              <div className="space-y-2 font-medium">
                {folders.filter(f => currentDirId === 'root' ? true : f.category === activeCategory).slice(0, 4).map(folder => {
                  const folderFiles = files.filter(f => f.folderId === folder.id);
                  const bytes = folderFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentDirId(folder.id)}
                      className="group/item flex items-center justify-between text-xs font-semibold cursor-pointer py-1.5 px-2 hover:bg-slate-50/60 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-2 text-slate-600 group-hover/item:text-slate-900 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#55349A]/80 group-hover/item:scale-125 transition-transform" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <div className="text-slate-400 group-hover/item:text-slate-600 tabular-nums flex items-center gap-1.5 shrink-0 pl-1">
                        <span className="text-[10px] font-bold">({folderFiles.length})</span>
                        <span className="font-extrabold text-slate-700">{formatBytes(bytes)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. MODALS STACK */}

      {/* A. Create Folder Trigger Dialog */}
      <AnimatePresence>
        {isCreateFolderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4" id="create-folder-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsCreateFolderOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden z-25"
            >
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 text-left">
                <FolderPlus className="h-5 w-5 text-[#55349A]" />
                Create New Locker Folder
              </h3>

              <form onSubmit={handleCreateFolderSubmit} className="mt-4 space-y-4 text-left">
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Folder Label</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Scans David B..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#55349A] focus:bg-white text-xs font-bold text-slate-800 transition-all placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                {/* Color Scheme Tag Palette */}
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Palette Tag</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Purple', bgClass: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                      { label: 'Emerald', bgClass: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                      { label: 'Amber', bgClass: 'text-amber-600 bg-amber-50 border-amber-100' },
                      { label: 'Rose', bgClass: 'text-rose-600 bg-rose-50 border-rose-100' },
                      { label: 'Sky', bgClass: 'text-sky-600 bg-sky-50 border-sky-100' },
                      { label: 'Slate', bgClass: 'text-slate-600 bg-slate-100 border-slate-200' },
                    ].map(col => (
                      <button
                        key={col.label}
                        type="button"
                        onClick={() => setNewFolderColor(col.bgClass)}
                        className={cn(
                          "px-2.5 py-2 text-[10.5px] font-bold rounded-lg border text-center cursor-pointer transition-colors truncate",
                          newFolderColor === col.bgClass
                            ? "border-[#55349A] bg-purple-50 ring-2 ring-[#55349A]/15 text-[#55349A]"
                            : "border-slate-100 bg-white text-slate-500"
                        )}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateFolderOpen(false)}
                    className="px-4 py-2 bg-[#EEF2F6] hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-[#55349A] hover:bg-[#432380] text-white text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer border-none"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. Preview Modal Overlay (Quick View) */}
      <AnimatePresence>
        {viewPreviewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" id="file-preview-modal animate-scaleIn">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setViewPreviewFile(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 overflow-hidden z-25 flex flex-col justify-between h-[85vh] max-h-[600px]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3" id="preview-header">
                <div className="flex items-center gap-2 text-left min-w-0 pr-6">
                  {renderTypeIcon(viewPreviewFile.type, viewPreviewFile.name)}
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">{viewPreviewFile.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Uploaded by {viewPreviewFile.owner} &middot; Size: {viewPreviewFile.size}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewPreviewFile(null)}
                  className="p-1 h-9 w-9 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer border-none bg-transparent"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Secure Preview stage */}
              <div className="flex-grow bg-slate-50 border border-slate-150 rounded-xl my-4 flex flex-col items-center justify-center p-8 text-center" id="preview-stage">

                {viewPreviewFile.type === 'pdf' ? (
                  <div className="space-y-4 max-w-sm">
                    <div className="p-4.5 bg-rose-50 border border-rose-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-rose-500">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[13px] font-black text-slate-800">Secure HIPAA PDF Reader</span>
                      <p className="text-[10.5px] text-slate-400 font-bold leading-normal">
                        Direct inline document stream rendered under HIPAA active token verification parameters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Direct preview key verified for ${viewPreviewFile.name}`)}
                      className="px-4.5 py-2 bg-rose-500 hover:bg-rose-650 text-white text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer border-none inline-flex items-center gap-1.5 shadow-3xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Authenticate Reader
                    </button>
                  </div>
                ) : viewPreviewFile.type === 'image' ? (
                  <div className="max-w-[300px] space-y-3.5">
                    <div className="border border-slate-200 bg-white rounded-2xl p-4 shadow-sm">
                      <div className="aspect-square bg-slate-50/50 rounded-xl flex flex-col items-center justify-center relative overflow-hidden text-slate-700 p-6 border border-slate-200">
                        <div className="absolute inset-0 bg-[radial-gradient(#55349a_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-[0.12]" />
                        <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-[#55349A]/30 animate-[bounce_4s_infinite]" />
                        <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-[#55349A] border border-purple-100 mb-3 relative z-10 shrink-0">
                          <Activity className="h-6 w-6 stroke-[2]" />
                        </div>
                        <span className="text-[11px] font-black tracking-widest text-[#55349A] uppercase z-10">DICOM SCAN VIEW</span>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 z-10">Decoded Medical Specimen</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-850 block">Digitized Scan Matrix</span>
                      <p className="text-[10px] text-slate-400 mt-1">Diagnostic view generated on {viewPreviewFile.lastModified}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-sm">
                    <div className="p-4.5 bg-slate-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-slate-500 border border-slate-200">
                      <File className="h-7 w-7" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Preview Not Loaded</span>
                      <p className="text-[10.5px] text-slate-400 leading-normal mt-1 font-bold">
                        For file formats of zip/video types, copy to your local machine storage via the download option to verify contents.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Action layout bottom strip */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold" id="preview-footer">
                <span className="text-slate-400">Owner: {viewPreviewFile.owner}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Initiating secure direct download stream for: ${viewPreviewFile.name}`);
                      setViewPreviewFile(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg transition-colors cursor-pointer border-none"
                  >
                    Download File
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewPreviewFile(null)}
                    className="px-4.5 py-2 bg-[#55349A] hover:bg-[#432380] text-white font-extrabold rounded-lg transition-colors cursor-pointer border-none shadow-3xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. Share Modal Overlay */}
      <AnimatePresence>
        {shareFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4" id="share-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShareFile(null)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden z-25 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Share2 className="h-4.5 w-4.5 text-[#55349A]" />
                  Share Compliant Document
                </h3>
                <button
                  type="button"
                  onClick={() => setShareFile(null)}
                  className="p-1 text-slate-400 hover:text-slate-655 hover:bg-slate-100 rounded-xl bg-transparent border-none cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-left">
                <div className="p-3 bg-[#55349A]/5 rounded-xl border border-[#55349A]/10 flex items-center gap-3">
                  {renderTypeIcon(shareFile.type, shareFile.name)}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black text-slate-800 block truncate leading-tight">{shareFile.name}</span>
                    <span className="text-[10px] text-slate-450 font-bold block mt-0.5">HIPAA Access Protocol v2 active</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Access Control Security Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://secure.hospital-cabinet.org/share/verified_token_${shareFile.id}`}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px] font-mono text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://secure.hospital-cabinet.org/share/verified_token_${shareFile.id}`);
                        alert("Secured shared link copied to clipboard! Token requires active physician authorization.");
                      }}
                      className="px-3.5 py-1 text-[11px] font-black bg-[#55349A] hover:bg-[#432380] text-white rounded-xl cursor-pointer border-none"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10.5px] font-semibold leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>Only authorized consultant profiles mapped onto patient David Beckham's clinical history can decode this scan stream.</span>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShareFile(null)}
                    className="px-4 py-2 bg-[#EEF2F6] hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg border-none cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
