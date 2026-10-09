import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Upload,
  FolderPlus,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Folder,
  FolderOpen,
  Check,
  CheckCircle2,
  Download,
  Trash2,
  Move,
  Copy,
  RefreshCw,
  Maximize2,
  FileText,
  ChevronRight,
  Globe,
  HardDrive,
  Layers,
  Store,
  FileCode,
} from 'lucide-react';
import {
  type MediaItem,
  type FolderNode,
  ADMIN_SYSTEM_BINS,
  VENDOR_FOLDERS,
  INITIAL_MEDIA_ITEMS,
} from './mediaData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

export interface MediaManagementViewProps {
  mode: 'admin' | 'vendor';
  vendorId?: string;
  vendorName?: string;
}

export const MediaManagementView: React.FC<MediaManagementViewProps> = ({
  mode,
  vendorId = 'vendor-tech-1',
  vendorName = 'Nova Electronics',
}) => {
  // Folder tree states
  const [systemBins] = useState<FolderNode[]>(ADMIN_SYSTEM_BINS);
  const [vendorFolders, setVendorFolders] = useState<FolderNode[]>(VENDOR_FOLDERS);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>('vf-nova');
  const [activeFolderId, setActiveFolderId] = useState<string>(
    mode === 'admin' ? 'nova-products' : 'nova-products'
  );
  const [activeTab, setActiveTab] = useState<
    'all' | 'media-mgmt' | 'vendor-folders' | 'system-media' | 'trash'
  >('media-mgmt');

  // Directory segment toggle (Admin directories vs By Vendor Store)
  const [directoryViewMode, setDirectoryViewMode] = useState<'admin' | 'vendor'>(
    mode === 'admin' ? 'vendor' : 'vendor'
  );

  // File filter states
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'image' | 'document' | 'archive'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Media items state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [selectedIds, setSelectedIds] = useState<string[]>(['media-1']);
  const [inspectedMediaId, setInspectedMediaId] = useState<string>('media-1');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isCdnSettingsModalOpen, setIsCdnSettingsModalOpen] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Upload modal form state
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadTag, setUploadTag] = useState('Product');
  const [uploadTargetFolder, setUploadTargetFolder] = useState('nova-products');
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // New folder form state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState('Nova Electronics');

  // Move target folder state
  const [moveTargetFolder, setMoveTargetFolder] = useState('nova-banners');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Determine current active folder path and name
  const currentFolderInfo = useMemo(() => {
    if (activeFolderId === 'sys-root') return { name: 'Platform Root', path: 'Root / Platform Root' };
    if (activeFolderId === 'sys-brand') return { name: 'Brand & System UI', path: 'Root / Brand & System UI' };
    if (activeFolderId === 'sys-1p') return { name: 'First-Party Catalog', path: 'Root / First-Party Catalog' };
    if (activeFolderId === 'sys-marketing') return { name: 'Marketing Campaigns', path: 'Root / Marketing Campaigns' };
    if (activeFolderId === 'sys-kyc') return { name: 'KYC & Compliance Docs', path: 'Root / KYC & Compliance Docs' };

    // Find in vendor folders
    for (const vf of vendorFolders) {
      if (vf.id === activeFolderId) return { name: vf.name, path: vf.path };
      if (vf.children) {
        for (const child of vf.children) {
          if (child.id === activeFolderId) {
            return { name: child.name, path: child.path };
          }
        }
      }
    }
    return { name: 'Product Images', path: 'Root / Vendor Folders / Nova Electronics / Product Images' };
  }, [activeFolderId, vendorFolders]);

  // Filter media items
  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      // If vendor mode, strictly enforce vendor isolation
      if (mode === 'vendor') {
        if (item.vendorId !== vendorId && item.vendorName !== vendorName) {
          return false;
        }
      }

      // Filter by active folder (unless activeTab is 'all')
      if (activeTab === 'media-mgmt' && activeFolderId) {
        if (item.folderId !== activeFolderId) {
          return false;
        }
      } else if (activeTab === 'system-media') {
        if (!item.folderId.startsWith('sys-')) return false;
      } else if (activeTab === 'vendor-folders') {
        if (item.folderId.startsWith('sys-')) return false;
      }

      // Filter by file type
      if (fileTypeFilter !== 'all' && item.type !== fileTypeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesTag = item.tag?.toLowerCase().includes(q);
        const matchesVendor = item.vendorName?.toLowerCase().includes(q);
        const matchesFormat = item.format.toLowerCase().includes(q);
        if (!matchesName && !matchesTag && !matchesVendor && !matchesFormat) {
          return false;
        }
      }

      return true;
    });
  }, [mediaItems, mode, vendorId, vendorName, activeTab, activeFolderId, fileTypeFilter, searchQuery]);

  // Currently inspected item
  const inspectedItem = useMemo(() => {
    return (
      filteredItems.find((i) => i.id === inspectedMediaId) ||
      filteredItems[0] ||
      mediaItems[0]
    );
  }, [filteredItems, inspectedMediaId, mediaItems]);

  // Selection handlers
  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setInspectedMediaId(id);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  // Copy CDN link
  const handleCopyCdnLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('CDN URL copied to clipboard: ' + url.slice(0, 38) + '...');
  };

  // Upload handler
  const handleConfirmUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = uploadFileName.trim() || `asset-${Date.now().toString().slice(-4)}.webp`;
    const isDoc = finalName.endsWith('.pdf');
    const newItem: MediaItem = {
      id: `media-${Date.now()}`,
      name: finalName,
      folderPath: currentFolderInfo.path,
      folderId: uploadTargetFolder || activeFolderId,
      vendorId: mode === 'vendor' ? vendorId : 'vendor-tech-1',
      vendorName: mode === 'vendor' ? vendorName : 'Nova Electronics',
      vendorTier: 'Tier 1 Elite',
      type: isDoc ? 'document' : 'image',
      format: isDoc ? 'PDF' : 'WEBP',
      sizeFormatted: '1.24 MB',
      sizeBytes: 1300000,
      dimensions: isDoc ? 'A4 Document' : '2400 × 2400 px',
      encoding: isDoc ? 'PDF/A' : 'WebP Lossless',
      tag: uploadTag || 'Product',
      dateFormatted: 'Just now',
      createdAt: new Date().toISOString(),
      cdnUrl: `https://cdn.vendora.io/vendors/${(mode === 'vendor' ? vendorName : 'nova-electronics')
        .toLowerCase()
        .replace(/\s+/g, '-')}/products/${finalName}`,
      thumbnailUrl: isDoc
        ? ''
        : 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
      isSecurityVerified: true,
      status: 'approved',
    };

    setMediaItems((prev) => [newItem, ...prev]);
    setSelectedIds([newItem.id]);
    setInspectedMediaId(newItem.id);
    setIsUploadModalOpen(false);
    setUploadFileName('');
    showToast(`Asset "${finalName}" uploaded and distributed to edge CDN.`);
  };

  // New folder creation handler
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolderId = `folder-${Date.now()}`;
    const newChild: FolderNode = {
      id: newFolderId,
      name: newFolderName.trim(),
      path: `Root / Vendor Folders / ${newFolderParent} / ${newFolderName.trim()}`,
      countLabel: '0',
      vendorId: mode === 'vendor' ? vendorId : 'vendor-tech-1',
    };

    setVendorFolders((prev) =>
      prev.map((vf) => {
        if (vf.name === newFolderParent || vf.id === 'vf-nova') {
          return {
            ...vf,
            children: [...(vf.children || []), newChild],
          };
        }
        return vf;
      })
    );

    setActiveFolderId(newFolderId);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
    showToast(`Folder "${newFolderName}" created successfully.`);
  };

  // Replace file handler
  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && inspectedItem) {
      setMediaItems((prev) =>
        prev.map((item) =>
          item.id === inspectedItem.id
            ? {
                ...item,
                sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                dateFormatted: 'Just now',
                encoding: 'WebP (Updated Revision)',
              }
            : item
        )
      );
      setIsReplaceModalOpen(false);
      showToast(`Asset "${inspectedItem.name}" replaced. CDN cache purged and refreshed.`);
    }
  };

  // Move files handler
  const handleConfirmMove = () => {
    if (selectedIds.length === 0) return;
    setMediaItems((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              folderId: moveTargetFolder,
              folderPath: `Root / Vendor Folders / Nova Electronics / ${
                moveTargetFolder === 'nova-banners'
                  ? 'Store Banners'
                  : moveTargetFolder === 'nova-compliance'
                  ? 'Compliance & Docs'
                  : 'Product Images'
              }`,
            }
          : item
      )
    );
    setIsMoveModalOpen(false);
    showToast(`Moved ${selectedIds.length} item(s) to destination folder.`);
  };

  // Delete files handler
  const handleConfirmDelete = () => {
    if (selectedIds.length === 0) return;
    setMediaItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
    const deletedCount = selectedIds.length;
    setSelectedIds([]);
    setIsDeleteConfirmOpen(false);
    showToast(`Deleted ${deletedCount} file(s) from asset repository.`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900">
      {/* ── Breadcrumb & Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {mode === 'admin' ? 'Marketplace' : 'Store Workspace'}{' '}
            <span className="text-slate-300">/</span> Files &amp; Media
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            File &amp; Media Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
            {mode === 'admin'
              ? 'Centralized asset repository. Organize platform media, product imagery, vendor uploads, legal documents, and marketing assets.'
              : 'Direct media repository for your store. Organize your catalog product photography, high-resolution banners, and compliance certificates.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {mode === 'admin' && (
            <button
              type="button"
              onClick={() => setIsCdnSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FileCode className="h-3.5 w-3.5 text-slate-500" />
              <span>&lt;&gt; Storage Settings &amp; CDN</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-slate-600" />
            <span>Upload Files</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>+ New Folder {mode === 'admin' ? '/ Bucket' : ''}</span>
          </button>
        </div>
      </div>

      {/* ── 4 Top KPI Stat Cards (Matching Mockup) ───────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Storage Used */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>{mode === 'admin' ? 'Total Storage Used' : 'Vendor Storage Allocation'}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <HardDrive className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900">
                {mode === 'admin' ? '1.84 TB' : '320 GB'}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {mode === 'admin' ? '/ 5.0 TB' : '/ 1.0 TB'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-1">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full"
                style={{ width: mode === 'admin' ? '36.8%' : '32.0%' }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
              <span className="text-slate-500">
                {mode === 'admin' ? '36.8% capacity' : '32% tier capacity'}
              </span>
              <span className="text-emerald-700 font-bold">
                {mode === 'admin' ? '+124 GB this month' : 'Tier 1 Elite Quota'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Media Assets */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>{mode === 'admin' ? 'Total Media Assets' : 'Store Media Assets'}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {mode === 'admin' ? '84,290' : '14,210'}
              </span>
              <span className="text-xs text-slate-400 font-medium">assets indexed</span>
            </div>
          </div>
          <div className="mt-4 pt-1 flex items-center justify-between text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-2">
            <span>
              <strong className="text-slate-900 font-bold">
                {mode === 'admin' ? '68.1k' : '12.8k'}
              </strong>{' '}
              Img
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-900 font-bold">
                {mode === 'admin' ? '11.2k' : '1.3k'}
              </strong>{' '}
              Docs
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-900 font-bold">
                {mode === 'admin' ? '4.9k' : '110'}
              </strong>{' '}
              Other
            </span>
          </div>
        </div>

        {/* Card 3: Vendor Upload Volume */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>{mode === 'admin' ? 'Vendor Upload Volume' : 'Monthly Upload Activity'}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Store className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900">
                {mode === 'admin' ? '52,410' : '+342'}
              </span>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                +8.4% MoM
              </span>
            </div>
          </div>
          <div className="mt-4 pt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            {mode === 'admin'
              ? 'Across 1,280 active marketplace stores'
              : 'Indexed across active product catalog & banners'}
          </div>
        </div>

        {/* Card 4: Bandwidth & CDN Delivery */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Bandwidth &amp; CDN Delivery</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Globe className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900">
                {mode === 'admin' ? '14.2 TB' : '2.4 TB'}
              </span>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                Edge CDN
              </span>
            </div>
          </div>
          <div className="mt-4 pt-1 flex items-center justify-between text-[11px] font-medium text-slate-500 border-t border-slate-100 pt-2">
            <span>Cache Hit Rate:</span>
            <span className="font-bold text-slate-900">99.98% active</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold" data-lenis-prevent>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-lg px-3.5 py-2 whitespace-nowrap transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Assets ({mode === 'admin' ? '84,290' : '14,210'})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media-mgmt')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 whitespace-nowrap transition-all ${
            activeTab === 'media-mgmt'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Media Management</span>
        </button>

        {mode === 'admin' && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('vendor-folders')}
              className={`rounded-lg px-3.5 py-2 whitespace-nowrap transition-all ${
                activeTab === 'vendor-folders'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Vendor Folders (1,280)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('system-media')}
              className={`rounded-lg px-3.5 py-2 whitespace-nowrap transition-all ${
                activeTab === 'system-media'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              System &amp; Platform Media
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setActiveTab('trash');
            showToast('Trash bin is currently clean. Archived items purge after 30 days.');
          }}
          className={`rounded-lg px-3.5 py-2 whitespace-nowrap transition-all ${
            activeTab === 'trash'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Trash / Archive
        </button>
      </div>

      {/* ── Sub-Filter Bar (Matching Mockup) ─────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {mode === 'admin' && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setDirectoryViewMode('admin')}
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  directoryViewMode === 'admin'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Admin Directories
              </button>
              <button
                type="button"
                onClick={() => setDirectoryViewMode('vendor')}
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  directoryViewMode === 'vendor'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                By Vendor Store
              </button>
            </div>
          )}

          {/* File Types Dropdown */}
          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="all">All File Types</option>
            <option value="image">Images (WEBP, PNG, JPG)</option>
            <option value="document">Documents (PDF)</option>
            <option value="archive">Archives (ZIP)</option>
          </select>

          {/* Date Filter Dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="all">All Dates (Lifetime)</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Right side: Search & Layout Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search files, tags, SKU, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-10 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 font-mono">
              ⌘K
            </span>
          </div>

          {/* Layout Buttons */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`p-1 rounded ${
                viewLayout === 'grid' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('list')}
              className={`p-1 rounded ${
                viewLayout === 'list' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* ── Left Column (Folder Directory Tree: 3.5 cols) ─────────── */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              Folder Directory
            </h3>
            <button
              type="button"
              onClick={() => setIsNewFolderModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
            >
              <span>+ New</span>
            </button>
          </div>

          {/* Section 1: ADMIN SYSTEM BINS (Admin Only) */}
          {mode === 'admin' && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
                Admin System Bins
              </div>
              <div className="space-y-0.5 text-xs">
                {systemBins.map((bin) => {
                  const isActive = activeFolderId === bin.id;
                  return (
                    <button
                      key={bin.id}
                      type="button"
                      onClick={() => setActiveFolderId(bin.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{bin.name}</span>
                      </div>
                      <span className={`text-[10px] shrink-0 font-medium ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                        {bin.countLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: VENDOR FOLDERS */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
              <span>{mode === 'admin' ? 'Vendor Folders (1,280)' : 'Store Directories'}</span>
              {mode === 'admin' && <SlidersHorizontal className="h-3 w-3 text-slate-400" />}
            </div>

            <div className="space-y-1 text-xs">
              {/* If Vendor Mode: Only show the logged-in vendor's directory! */}
              {(mode === 'vendor' ? vendorFolders.filter((vf) => vf.id === 'vf-nova') : vendorFolders).map((vf) => {
                const isExpanded = expandedVendorId === vf.id;
                const isCurrentActive = activeFolderId === vf.id;

                return (
                  <div key={vf.id} className="space-y-0.5">
                    {/* Vendor parent header */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedVendorId(isExpanded ? null : vf.id);
                        if (!isExpanded && vf.children && vf.children.length > 0) {
                          setActiveFolderId(vf.children[0].id);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        isCurrentActive
                          ? 'bg-slate-100 font-bold text-slate-900'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Store className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span className="font-bold truncate">{vf.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {vf.sizeLabel && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                            {vf.sizeLabel}
                          </span>
                        )}
                        <ChevronRight
                          className={`h-3 w-3 text-slate-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Subfolders list */}
                    {isExpanded && vf.children && (
                      <div className="pl-4 pr-1 space-y-0.5 border-l-2 border-slate-100 ml-3">
                        {vf.children.map((sub) => {
                          const isSubActive = activeFolderId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setActiveFolderId(sub.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                                isSubActive
                                  ? 'bg-slate-900 text-white font-bold'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Folder className={`h-3 w-3 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-400'}`} />
                                <span className="truncate">{sub.name}</span>
                              </div>
                              <span
                                className={`text-[10px] shrink-0 font-medium ${
                                  isSubActive ? 'text-slate-300' : 'text-slate-400'
                                }`}
                              >
                                {sub.countLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {mode === 'admin' && (
                <button
                  type="button"
                  onClick={() => showToast('Displaying 1,280 active seller directory indexes.')}
                  className="w-full pt-2 text-left text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  View all 1,280 vendor folders →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column (File Grid & Inspector: 8.5 cols) ─────────── */}
        <div className="lg:col-span-9 space-y-5">
          {/* Top Folder Path Breadcrumb & Bulk Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
              <FolderOpen className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="truncate font-mono text-[11px] text-slate-600">
                {currentFolderInfo.path}
              </div>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => showToast(`Packaging ${selectedIds.length} item(s) into zip archive...`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Download ZIP</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMoveModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <Move className="h-3.5 w-3.5 text-slate-500" />
                <span>Move</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* ── Media Items View (Grid or List) ────────────────────── */}
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Folder className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">No media assets in this directory</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your first image, document, or promotional banner to publish to the global edge CDN.
              </p>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload First File</span>
              </button>
            </div>
          ) : viewLayout === 'grid' ? (
            /* Grid View (4 columns x 2 rows = 8 cards) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.slice(0, 8).map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isInspected = inspectedMediaId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setInspectedMediaId(item.id);
                      if (!selectedIds.includes(item.id)) {
                        setSelectedIds([item.id]);
                      }
                    }}
                    className={`group relative rounded-xl border bg-white p-2.5 transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
                      isSelected || isInspected
                        ? 'border-slate-900 ring-2 ring-slate-900/10'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Thumbnail box */}
                    <div className="relative aspect-square w-full rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-100">
                      {item.type === 'image' && item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <FileText className="h-10 w-10 text-rose-500 mx-auto" />
                          <div className="mt-1 text-[10px] font-extrabold text-rose-700">
                            Verified Doc
                          </div>
                          <div className="text-[9px] text-slate-400">PDF</div>
                        </div>
                      )}

                      {/* Selection checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectOne(item.id, e)}
                        className={`absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-white/80 bg-white/90 text-transparent hover:border-slate-400 shadow-2xs'
                        }`}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </button>

                      {/* Format Pill (Bottom-right) */}
                      <span className="absolute bottom-2 right-2 rounded bg-slate-900/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                        {item.format}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="mt-2.5 space-y-1">
                      <div className="font-bold text-slate-900 text-xs truncate" title={item.name}>
                        {item.name}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{item.sizeFormatted}</span>
                        <span>•</span>
                        <span className="truncate">{item.dimensions || item.dateFormatted}</span>
                        {item.tag && (
                          <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-bold text-slate-600">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3">Asset Name</th>
                    <th className="px-4 py-3">Dimensions / Format</th>
                    <th className="px-4 py-3">File Size</th>
                    <th className="px-4 py-3">Merchant / Folder</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setInspectedMediaId(item.id);
                          if (!selectedIds.includes(item.id)) setSelectedIds([item.id]);
                        }}
                        className={`hover:bg-slate-50/80 cursor-pointer ${
                          isSelected ? 'bg-slate-50/90 font-medium' : ''
                        }`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectOne(item.id, e as any)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.type === 'image' ? (
                                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <FileText className="h-4 w-4 text-rose-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-400">{item.tag || item.dateFormatted}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold mr-2">
                            {item.format}
                          </span>
                          <span className="text-slate-500">{item.dimensions}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">{item.sizeFormatted}</td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{item.vendorName}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCdnLink(item.cdnUrl);
                            }}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
                          >
                            Copy Link
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Selected Item Detailed Inspector (Matching Mockup Bottom Drawer) ─ */}
          {inspectedItem && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              {/* Top Row: File icon, name, status, merchant, actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-700 overflow-hidden">
                    {inspectedItem.type === 'image' && inspectedItem.thumbnailUrl ? (
                      <img src={inspectedItem.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="h-6 w-6 text-rose-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        {inspectedItem.name}
                      </h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Approved / Safe
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>Merchant: <strong>{inspectedItem.vendorName}</strong> [{inspectedItem.vendorTier || 'Tier 1'}]</span>
                      <span>•</span>
                      <a href="/vendors/vendor-tech-1" className="text-blue-600 hover:underline">
                        View Store Profile
                      </a>
                    </div>
                  </div>
                </div>

                {/* 4 Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopyCdnLink(inspectedItem.cdnUrl)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy CDN Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReplaceModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                    <span>Replace File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFullscreenModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Open Fullscreen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    <span>Delete Asset</span>
                  </button>
                </div>
              </div>

              {/* 4 Columns Spec Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Dimensions</div>
                  <div className="mt-0.5 font-bold text-slate-900">{inspectedItem.dimensions || '2400 x 2400 px'}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Format / Encoding</div>
                  <div className="mt-0.5 font-bold text-slate-900">{inspectedItem.encoding || 'WebP (Lossless 92%)'}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">File Size</div>
                  <div className="mt-0.5 font-bold text-slate-900">{inspectedItem.sizeFormatted}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Content Security Check</div>
                  <div className="mt-0.5 font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Passed automated scan</span>
                  </div>
                </div>
              </div>

              {/* Bottom CDN URL Input Bar */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 text-xs">
                <span className="text-slate-400 pl-1 font-mono">🔗</span>
                <input
                  type="text"
                  readOnly
                  value={inspectedItem.cdnUrl}
                  className="w-full bg-transparent font-mono text-[11px] text-slate-700 focus:outline-none select-all"
                />
                <span className="shrink-0 rounded bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-slate-600 font-mono">
                  GLOBAL EDGE CACHED
                </span>
              </div>
            </div>
          )}

          {/* ── Bottom Pagination Bar ───────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div>
              Showing <strong>1 - {Math.min(8, filteredItems.length)}</strong> of{' '}
              <strong>{mode === 'admin' ? '12,800' : '342'}</strong> files in this folder • Total Size: <strong>24.6 GB</strong>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                &lt; Previous
              </button>
              <button type="button" className="rounded bg-slate-900 text-white px-2.5 py-1 font-bold">
                1
              </button>
              <button type="button" className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50">
                2
              </button>
              <button type="button" className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50">
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button type="button" className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50">
                {mode === 'admin' ? '1600' : '43'}
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal 1: Upload Files ──────────────────────────────────── */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-slate-700" />
              Upload Files to Media Repository
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Drag-and-drop imagery or select from disk. Assets are converted to progressive WebP and cached globally.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmUpload} className="space-y-3.5 py-2 text-xs">
            {/* Dropzone */}
            <div
              onClick={() => uploadFileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer space-y-2"
            >
              <input
                type="file"
                ref={uploadFileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadFileName(file.name);
                }}
              />
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-2xs text-slate-600">
                <Upload className="h-5 w-5" />
              </div>
              <div className="font-bold text-slate-800">
                {uploadFileName ? uploadFileName : 'Click to select or drag files here'}
              </div>
              <div className="text-[10px] text-slate-400">
                Supports WebP, PNG, JPG, PDF up to 50 MB
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Asset Tag / Descriptor</label>
              <select
                value={uploadTag}
                onChange={(e) => setUploadTag(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
              >
                <option value="Product">Product Catalog Image</option>
                <option value="Promo">Storefront Cover Banner</option>
                <option value="High-Res">High-Res Studio Spec</option>
                <option value="Compliance">Compliance &amp; Legal PDF</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Destination Folder</label>
              <select
                value={uploadTargetFolder}
                onChange={(e) => setUploadTargetFolder(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900 font-mono"
              >
                <option value="nova-products">Nova Electronics / Product Images</option>
                <option value="nova-banners">Nova Electronics / Store Banners</option>
                <option value="nova-compliance">Nova Electronics / Compliance &amp; Docs</option>
                {mode === 'admin' && (
                  <>
                    <option value="sys-1p">Platform Root / First-Party Catalog</option>
                    <option value="sys-brand">Platform Root / Brand &amp; System UI</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
              >
                Start Upload &amp; CDN Sync
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 2: New Folder / Bucket ───────────────────────────── */}
      <Dialog open={isNewFolderModalOpen} onOpenChange={setIsNewFolderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-slate-700" />
              Create New Folder {mode === 'admin' ? '/ Storage Bucket' : ''}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Establish a categorized container to partition media assets.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFolder} className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Folder Name</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. 2026-Summer-Campaign or Schematics"
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Parent Hierarchy</label>
              <select
                value={newFolderParent}
                onChange={(e) => setNewFolderParent(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
              >
                <option value="Nova Electronics">Nova Electronics Root</option>
                {mode === 'admin' && (
                  <>
                    <option value="Platform Root">Admin System / Platform Root</option>
                    <option value="First-Party Catalog">Admin System / First-Party Catalog</option>
                    <option value="Aura Apparel">Aura Apparel Root</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Create Folder
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 3: Storage Settings & CDN (Admin Only) ─────────────── */}
      {mode === 'admin' && (
        <Dialog open={isCdnSettingsModalOpen} onOpenChange={setIsCdnSettingsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Cloudflare Edge CDN &amp; S3 Storage Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Manage global edge delivery caches, SSL origins, and automatic WebP transformation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900">Current Primary S3 Storage Bucket</div>
                <div className="font-mono text-slate-600 text-[11px]">s3://vendora-production-assets.us-east-1</div>
                <div className="text-[10px] text-emerald-700 font-semibold">Active &amp; Health 100% (Replica: eu-central-1)</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Edge Cache TTL Policy</label>
                <select className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none">
                  <option>30 Days Edge Browser Cache (Recommended for catalog images)</option>
                  <option>7 Days Standard Edge TTL</option>
                  <option>1 Year Immutable Assets (Hash fingerprinting)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" defaultChecked className="rounded text-slate-900" />
                  <span>Automatic On-the-Fly WebP / AVIF Lossless Compression</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" defaultChecked className="rounded text-slate-900" />
                  <span>Automated Content Security Antivirus &amp; Malware Deep Scan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" defaultChecked className="rounded text-slate-900" />
                  <span>CORS Allow Origin: *.vendora.io and secure checkout tunnels</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCdnSettingsModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Storage CDN edge settings updated.');
                  setIsCdnSettingsModalOpen(false);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Save CDN Settings
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal 4: Fullscreen Preview ────────────────────────────── */}
      <Dialog open={isFullscreenModalOpen} onOpenChange={setIsFullscreenModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>{inspectedItem?.name}</span>
              <span className="text-xs font-mono text-slate-400">{inspectedItem?.dimensions}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="aspect-video w-full rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden">
            {inspectedItem?.type === 'image' && inspectedItem.thumbnailUrl ? (
              <img
                src={inspectedItem.thumbnailUrl}
                alt={inspectedItem.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-white space-y-2 p-6">
                <FileText className="h-16 w-16 text-rose-400 mx-auto" />
                <div className="font-bold text-sm">{inspectedItem?.name}</div>
                <div className="text-xs text-slate-400">PDF Document Preview Ready</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-500 font-mono">{inspectedItem?.cdnUrl}</span>
            <button
              type="button"
              onClick={() => handleCopyCdnLink(inspectedItem.cdnUrl)}
              className="font-bold text-slate-900 hover:underline"
            >
              Copy URL
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal 5: Replace File ──────────────────────────────────── */}
      <Dialog open={isReplaceModalOpen} onOpenChange={setIsReplaceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-slate-700" />
              Replace File Revision
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Upload an updated version of "{inspectedItem?.name}". The permanent CDN URL will remain identical to avoid broken listings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <input
              type="file"
              ref={replaceFileInputRef}
              onChange={handleReplaceFile}
              className="hidden"
            />
            <div
              onClick={() => replaceFileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:bg-slate-100 cursor-pointer space-y-2"
            >
              <RefreshCw className="h-6 w-6 text-slate-500 mx-auto" />
              <div className="font-bold text-slate-800">Select replacement file from computer</div>
              <div className="text-[10px] text-slate-400">Instantly replaces asset and purges edge cache</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal 6: Move Asset ────────────────────────────────────── */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Move className="h-5 w-5 text-slate-700" />
              Move {selectedIds.length} Selected File(s)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select destination directory folder to relocate files.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Directory</label>
              <select
                value={moveTargetFolder}
                onChange={(e) => setMoveTargetFolder(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
              >
                <option value="nova-products">Nova Electronics / Product Images</option>
                <option value="nova-banners">Nova Electronics / Store Banners</option>
                <option value="nova-compliance">Nova Electronics / Compliance &amp; Docs</option>
                <option value="nova-marketing">Nova Electronics / Marketing Assets</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal 7: Delete Confirm ─────────────────────────────────── */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-700 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" />
              Confirm Asset Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete {selectedIds.length} file(s)? This will revoke CDN delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Delete Permanently
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Floating Toast Notification ───────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
