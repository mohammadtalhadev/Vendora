import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Folder,
  FolderOpen,
  HardDrive,
  Layers,
  LayoutGrid,
  Library,
  List,
  Move,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { foldersOf, type VendorMediaItem } from '../vendor/api/media';
import {
  useDeleteMedia,
  useMediaLibrary,
  useMoveMedia,
  useRenameMedia,
  useUploadMedia,
} from '../vendor/hooks/useVendorMedia';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { buildPageWindow } from '../../hooks/usePagination';
import { useAdminMediaLibrary } from '../admin/hooks/useAdminQueries';
import { useAdminActions } from '../admin/hooks/useAdminActions';
import type { AdminMediaItem } from '../admin/api/media';
import {
  cleanFolderName,
  DATE_FILTERS,
  dimensionLabel,
  FILE_KIND_ICONS,
  folderLabel,
  formatDate,
  formatBytes,
  formatOf,
  isStoredObject,
  KIND_FILTERS,
  matchesQuery,
  MEDIA_PAGE_SIZE,
  mediaKindOf,
  STATUS_LABEL,
  STATUS_STYLE,
  withinDays,
  dateWindowOf,
  type DateFilter,
  type MediaKindFilter,
  type MediaLayout,
} from './mediaData';

export interface MediaManagementViewProps {
  mode: 'admin' | 'vendor';
  vendorId?: string;
  vendorName?: string;
}

const CARD =
  'rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between';
const TILE_HEAD =
  'flex items-center justify-between text-xs font-bold text-slate-500';
const TILE_ICON = 'flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700';
const GHOST_BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400';
const PRIMARY_BUTTON =
  'inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
const DANGER_BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:border-rose-100 disabled:bg-slate-50 disabled:text-rose-300';
const FIELD =
  'w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900';

/**
 * The asset library, in two scopes over the same `media_items` rows. Vendor mode is
 * the store the signed-in account owns: reads, uploads, renames, moves and deletes all
 * go through `src/features/vendor/api/media.ts`. Admin mode reads every store's rows
 * through `src/features/admin/api/media.ts` - the select policy admits staff - and the
 * only write it offers is the moderation verdict, because row deletion stays
 * owner-only in the table policy. Either way, a write the server refuses is reported
 * with the server's own words instead of a toast.
 */
export const MediaManagementView: React.FC<MediaManagementViewProps> = ({ mode }) => {
  const isAdmin = mode === 'admin';
  const vendorLibrary = useMediaLibrary(!isAdmin);
  const adminLibrary = useAdminMediaLibrary(isAdmin);
  const { setMediaStatus } = useAdminActions();
  const library = isAdmin ? adminLibrary : vendorLibrary;
  const upload = useUploadMedia();
  const rename = useRenameMedia();
  const move = useMoveMedia();
  const remove = useDeleteMedia();

  const items = useMemo(() => library.data ?? [], [library.data]);
  const folders = useMemo(() => foldersOf(items), [items]);

  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<MediaKindFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<MediaLayout>('grid');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedId, setInspectedId] = useState<string | null>(null);

  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadFolder, setUploadFolder] = useState('products');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveFolder, setMoveFolder] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);

  // The clicked rows wait here until the confirm dialog has been answered; nothing is
  // removed from the library before the server accepts the delete.
  const [deleteTargets, setDeleteTargets] = useState<VendorMediaItem[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);

  const note = (message: string) => {
    setError(null);
    setBanner(message);
    window.setTimeout(() => setBanner(null), 5000);
  };

  const fail = (cause: unknown) => {
    setBanner(null);
    setError(cause instanceof Error ? cause.message : String(cause));
  };

  // Nothing here mirrors the query into state: `inspected` and `selected` are derived from
  // the loaded rows, so a refetch that dropped a row also drops its inspector and its tick.
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const totals = useMemo(
    () => ({
      bytes: items.reduce((sum, item) => sum + item.sizeBytes, 0),
      pending: items.filter((item) => item.status === 'pending').length,
      flagged: items.filter((item) => item.status === 'flagged').length,
      images: items.filter((item) => mediaKindOf(item.mimeType) === 'image').length,
      documents: items.filter((item) => mediaKindOf(item.mimeType) === 'document').length,
      other: items.filter((item) => {
        const kind = mediaKindOf(item.mimeType);
        return kind !== 'image' && kind !== 'document';
      }).length,
    }),
    [items],
  );

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.folder, (counts.get(item.folder) ?? 0) + 1);
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const window = dateWindowOf(dateFilter);
    return items.filter((item) => {
      if (folderFilter !== 'all' && item.folder !== folderFilter) return false;
      if (kindFilter !== 'all' && mediaKindOf(item.mimeType) !== kindFilter) return false;
      if (window !== null && !withinDays(item.createdAt, window)) return false;
      if (!matchesQuery(item, searchQuery)) {
        // Staff search by the owning store as well as by the file itself.
        if (!isAdmin) return false;
        const owner = item as AdminMediaItem;
        const needle = searchQuery.trim().toLowerCase();
        if (
          !needle ||
          !(owner.storeName.toLowerCase().includes(needle) ||
            owner.storeSlug.toLowerCase().includes(needle))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, folderFilter, kindFilter, dateFilter, searchQuery, isAdmin]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / MEDIA_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * MEDIA_PAGE_SIZE;
  const visible = filtered.slice(firstIndex, firstIndex + MEDIA_PAGE_SIZE);
  const lastIndex = Math.min(firstIndex + MEDIA_PAGE_SIZE, filtered.length);

  // The library query waits for a signed-in account; `isPending` alone cannot tell a read
  // in flight from a read that never started, so the panel says which one it is.
  const awaitingSession = library.isPending && library.fetchStatus === 'idle';

  const inspected = useMemo(
    () => items.find((item) => item.id === inspectedId) ?? null,
    [items, inspectedId],
  );

  /** The owning store of the inspected row, present only in the admin listing. */
  const inspectedOwner: AdminMediaItem | null =
    isAdmin && inspected ? (inspected as AdminMediaItem) : null;

  const selected = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );

  /** What the Move dialog will act on: the current selection, named before any write. */
  const moveTargets = selected;

  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((current) => current !== id),
    );
  };

  const copyUrl = async (item: VendorMediaItem) => {
    try {
      await navigator.clipboard.writeText(item.cdnUrl);
      note(`Copied the public URL for “${item.name}”.`);
    } catch {
      setError('Your browser blocked the clipboard, so the URL was not copied. Select it in the field below the preview instead.');
    }
  };

  const pickedFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadQueue(Array.from(event.target.files ?? []));
    setUploadError(null);
  };

  const submitUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploadQueue.length === 0) {
      setUploadError('Choose at least one file to upload.');
      return;
    }
    const folder = cleanFolderName(uploadFolder);
    if (!folder) {
      setUploadError('Give the destination folder a name of letters, numbers, dashes or underscores.');
      return;
    }

    setUploadError(null);
    let stored = 0;
    let reason: string | null = null;
    // One file at a time, so a rejected write is reported as the file that actually failed
    // rather than as a batch that never happened.
    for (const file of uploadQueue) {
      try {
        await upload.mutateAsync({ file, folder });
        stored += 1;
      } catch (cause) {
        reason = cause instanceof Error ? cause.message : String(cause);
        break;
      }
    }

    if (reason) {
      setUploadError(
        stored > 0
          ? `Stored ${stored} of ${uploadQueue.length} before it failed: ${reason}`
          : `Nothing was uploaded: ${reason}`,
      );
      return;
    }

    setUploadOpen(false);
    setUploadQueue([]);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    note(
      `Uploaded ${stored} file${stored === 1 ? '' : 's'} into “${folder}”. Each one is recorded as pending until platform review.`,
    );
  };

  const startRename = (item: VendorMediaItem) => {
    setEditingId(item.id);
    setDraftName(item.name);
  };

  const saveRename = (item: VendorMediaItem) => {
    const next = draftName.trim();
    if (!next || next === item.name) {
      setEditingId(null);
      return;
    }
    rename.mutate(
      { itemId: item.id, name: next },
      {
        onSuccess: () => {
          note(`Renamed to “${next}”. The stored object keeps its path, so live links stay valid.`);
          setEditingId(null);
        },
        onError: fail,
      },
    );
  };

  const confirmMove = async () => {
    const folder = cleanFolderName(moveFolder);
    if (!folder) {
      setMoveError('Type a destination folder of letters, numbers, dashes or underscores.');
      return;
    }
    if (moveTargets.length === 0) {
      setMoveError('Select at least one file to move.');
      return;
    }

    setMoveError(null);
    const failed: VendorMediaItem[] = [];
    let reason = '';
    for (const item of moveTargets) {
      try {
        await move.mutateAsync({ itemId: item.id, folder });
      } catch (cause) {
        reason = cause instanceof Error ? cause.message : String(cause);
        failed.push(item);
      }
    }

    if (failed.length > 0) {
      // Failed rows stay in the library and stay selectable; only the moved ones leave.
      setSelectedIds(failed.map((item) => item.id));
      setMoveError(
        failed.length === moveTargets.length
          ? `Nothing was moved: ${reason}`
          : `Moved ${moveTargets.length - failed.length}, ${failed.length} still here: ${reason}`,
      );
      return;
    }

    setMoveOpen(false);
    setMoveFolder('');
    note(`Moved ${moveTargets.length} file${moveTargets.length === 1 ? '' : 's'} into “${folder}”. The object itself was moved, and the row now records the new path.`);
  };

  const askDelete = (targets: VendorMediaItem[]) => {
    if (targets.length === 0) return;
    setDeleteError(null);
    setDeleteTargets(targets);
  };

  const closeDelete = () => {
    // Escape, outside-click and the Cancel button cannot close the dialog mid-write.
    if (remove.isPending) return;
    setDeleteTargets([]);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    const remaining: VendorMediaItem[] = [];
    let reason = '';
    for (const item of deleteTargets) {
      try {
        await remove.mutateAsync(item.id);
      } catch (cause) {
        reason = cause instanceof Error ? cause.message : String(cause);
        remaining.push(item);
      }
    }

    const deleted = deleteTargets.length - remaining.length;
    if (remaining.length > 0) {
      setDeleteTargets(remaining);
      setDeleteError(
        deleted > 0
          ? `Deleted ${deleted} of ${deleteTargets.length}. These are still here: ${reason}`
          : `Nothing was deleted: ${reason}`,
      );
      return;
    }

    setDeleteTargets([]);
    setDeleteError(null);
    setSelectedIds([]);
    note(`Deleted ${deleted} file${deleted === 1 ? '' : 's'}. The row and the stored object are both gone.`);
  };

  // The standard ellipsis page window (Batch 49) — the same helper the
  // storefront catalogue uses, so every pager in the app reads identically.
  const pageNumbers = useMemo(
    () => buildPageWindow(currentPage, pageCount),
    [currentPage, pageCount],
  );

  const InspectedIcon = inspected
    ? FILE_KIND_ICONS[mediaKindOf(inspected.mimeType)]
    : FILE_KIND_ICONS.other;
  const deleteCountLabel = `${deleteTargets.length} file${deleteTargets.length === 1 ? '' : 's'}`;

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {mode !== 'admin' && (
            <div className="text-xs font-bold text-slate-500">
              Store Workspace <span className="text-slate-300">/</span> Files &amp; Media
            </div>
          )}
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 font-outfit">
            File &amp; Media Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
            {mode === 'admin'
              ? 'All stores’ media files and their moderation status.'
              : 'Your store’s media files.'}
          </p>
        </div>

        {!isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => setUploadOpen(true)} className={PRIMARY_BUTTON}>
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Files</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Real outcome banners ────────────────────────────────────── */}
      {banner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800"
        >
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          {banner}
        </div>
      )}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
        >
          <X className="h-4 w-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* ── KPI tiles: counts of the rows actually loaded ────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={CARD}>
          <div>
            <div className={TILE_HEAD}>
              <span>Total stored</span>
              <span className={TILE_ICON}>
                <HardDrive className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900">
                {library.isPending ? '—' : formatBytes(totals.bytes)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-2 text-xs font-medium text-slate-500 border-t border-slate-100">
            Summed from the <code className="font-mono">size_bytes</code> of{' '}
            {library.isPending ? '…' : items.length} loaded{' '}
            {items.length === 1 ? 'row' : 'rows'}. No quota column exists on this table, so no
            percentage is shown.
          </div>
        </div>

        <div className={CARD}>
          <div>
            <div className={TILE_HEAD}>
              <span>Assets recorded</span>
              <span className={TILE_ICON}>
                <Layers className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {library.isPending ? '—' : items.length}
              </span>
              <span className="text-xs text-slate-400 font-medium">rows in media_items</span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between text-xs font-semibold text-slate-600 border-t border-slate-100">
            <span>
              <strong className="text-slate-900 font-bold">{totals.images}</strong> Img
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-900 font-bold">{totals.documents}</strong> Docs
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-900 font-bold">{totals.other}</strong> Other
            </span>
          </div>
        </div>

        <div className={CARD}>
          <div>
            <div className={TILE_HEAD}>
              <span>Awaiting review</span>
              <span className={TILE_ICON}>
                <Clock className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {library.isPending ? '—' : totals.pending}
              </span>
              <span className="text-xs text-slate-400 font-medium">status = pending</span>
            </div>
          </div>
          <div className="mt-4 pt-2 text-xs text-slate-500 border-t border-slate-100">
            A fresh upload is written as <code className="font-mono">pending</code>; only platform staff
            can change that verdict.
          </div>
        </div>

        <div className={CARD}>
          <div>
            <div className={TILE_HEAD}>
              <span>Flagged by staff</span>
              <span className={TILE_ICON}>
                <ShieldAlert className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {library.isPending ? '—' : totals.flagged}
              </span>
              <span className="text-xs text-slate-400 font-medium">status = flagged</span>
            </div>
          </div>
          <div className="mt-4 pt-2 text-xs text-slate-500 border-t border-slate-100">
            {folders.length} folder label{folders.length === 1 ? '' : 's'} appear in these rows.
          </div>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div>
            <label htmlFor="media-kind-filter" className="sr-only">
              Filter by file type
            </label>
            <Select
              value={kindFilter}
              onValueChange={(value) =>
                changeFilter(() =>
                  setKindFilter(KIND_FILTERS.find((option) => option.value === value)?.value ?? 'all'),
                )
              }
            >
              <SelectTrigger
                id="media-kind-filter"
                aria-label="Filter by file type"
                className="h-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="media-date-filter" className="sr-only">
              Filter by upload date
            </label>
            <Select
              value={dateFilter}
              onValueChange={(value) =>
                changeFilter(() =>
                  setDateFilter(DATE_FILTERS.find((option) => option.value === value)?.value ?? 'all'),
                )
              }
            >
              <SelectTrigger
                id="media-date-filter"
                aria-label="Filter by upload date"
                className="h-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {library.isError && (
            <button
              type="button"
              onClick={() => void library.refetch()}
              disabled={library.isFetching}
              className={GHOST_BUTTON}
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>{library.isFetching ? 'Retrying…' : 'Retry read'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <label htmlFor="media-search" className="sr-only">
              Search files by name, folder, type or URL
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              id="media-search"
              type="search"
              placeholder="Search files, folders or types…"
              value={searchQuery}
              onChange={(event) => changeFilter(() => setSearchQuery(event.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          <div role="group" aria-label="Layout" className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setLayout('grid')}
              aria-pressed={layout === 'grid'}
              aria-label="Grid view"
              title="Grid view"
              className={`p-1 rounded cursor-pointer ${
                layout === 'grid' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout('list')}
              aria-pressed={layout === 'list'}
              aria-label="List view"
              title="List view"
              className={`p-1 rounded cursor-pointer ${
                layout === 'list' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main two-column layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Folder directory: labels taken from the rows themselves */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-xs">
              Folder labels
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {folders.length} in use
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => changeFilter(() => setFolderFilter('all'))}
              aria-current={folderFilter === 'all' ? 'true' : undefined}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                folderFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Library className="h-3.5 w-3.5 shrink-0" />
                All folders
              </span>
              <span className={folderFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}>
                {items.length}
              </span>
            </button>

            {folders.map((name) => {
              const isActive = folderFilter === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => changeFilter(() => setFolderFilter(name))}
                  aria-current={isActive ? 'true' : undefined}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-mono text-xs">{name}</span>
                  </span>
                  <span className={isActive ? 'text-slate-300' : 'text-slate-400'}>
                    {folderCounts.get(name) ?? 0}
                  </span>
                </button>
              );
            })}

            {folders.length === 0 && (
              <p className="px-1 text-xs text-slate-500">
                {library.isPending
                  ? isAdmin
                    ? 'Reading the platform library…'
                    : 'Reading your library…'
                  : library.isError
                    ? 'The library read failed, so there are no folder labels to list.'
                    : 'No folder labels yet. A folder only exists once a file carries its name, because the table stores a text label, not a folder row.'}
              </p>
            )}
          </div>
        </div>

        {/* File list + inspector */}
        <div className="lg:col-span-9 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
              <FolderOpen className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="truncate font-mono text-xs text-slate-600">
                {folderFilter === 'all' ? 'all folders' : folderFilter}
                <span className="ml-2 text-slate-400">
                  {filtered.length} of {items.length} rows
                </span>
              </div>
            </div>

            {!isAdmin && (
            <div
              role="group"
              aria-label="Bulk actions for selected files"
              className="flex items-center gap-2 shrink-0"
            >
              <div className="flex items-center gap-1.5">
                <input
                  id="media-select-all"
                  type="checkbox"
                  checked={allFilteredSelected}
                  aria-checked={allFilteredSelected}
                  onChange={(event) =>
                    setSelectedIds(event.target.checked ? filtered.map((item) => item.id) : [])
                  }
                  disabled={filtered.length === 0}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900 disabled:opacity-40"
                />
                <label htmlFor="media-select-all" className="text-xs font-bold text-slate-600">
                  Select {filtered.length === items.length ? 'all' : `${filtered.length}`}
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMoveError(null);
                  setMoveFolder('');
                  setMoveOpen(true);
                }}
                disabled={selected.length === 0 || move.isPending}
                className={GHOST_BUTTON}
              >
                <Move className="h-3.5 w-3.5 text-slate-500" />
                <span>{selected.length > 0 ? `Move (${selected.length})` : 'Move'}</span>
              </button>

              <button
                type="button"
                onClick={() => askDelete(selected)}
                disabled={selected.length === 0}
                className={DANGER_BUTTON}
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>{selected.length > 0 ? `Delete (${selected.length})` : 'Delete'}</span>
              </button>
            </div>
            )}
          </div>

          {awaitingSession ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-500">
              {isAdmin ? (
                <>
                  This library is read as the signed-in staff account; the select policy admits staff
                  to every store&apos;s rows. No session means no rows to show — sign in as an admin
                  and the same query returns the platform&apos;s assets.
                </>
              ) : (
                <>
                  This library is read as the signed-in store account, through{' '}
                  <code className="font-mono">current_vendor_id()</code>. No session means no rows to show —
                  sign in as a seller and the same query returns its assets.
                </>
              )}
            </div>
          ) : library.isPending ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-500">
              {isAdmin ? 'Loading the platform library…' : 'Loading your library…'}
            </div>
          ) : library.isError ? (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
            >
              <div className="flex items-start gap-2">
                <X className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{library.error?.message ?? 'The media library read did not return.'}</span>
              </div>
              <button
                type="button"
                onClick={() => void library.refetch()}
                disabled={library.isFetching}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
              >
                {library.isFetching ? 'Retrying…' : 'Try the read again'}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Folder className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {items.length === 0 ? 'No files stored yet' : 'No file matches these filters'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {items.length === 0
                  ? isAdmin
                    ? 'No store has uploaded a file yet. Rows appear here as sellers add assets to their libraries, each recorded as pending until staff review it.'
                    : 'Upload an image or document and it will be written to your bucket, then recorded here as pending review.'
                  : 'Widen the filters above, or pick “All folders” in the directory.'}
              </p>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload a file</span>
                </button>
              )}
            </div>
          ) : layout === 'grid' ? (
            <div role="group" aria-label="Media assets" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visible.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isInspected = inspected?.id === item.id;
                const kind = mediaKindOf(item.mimeType);
                const KindIcon = FILE_KIND_ICONS[kind];

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-xl border bg-white p-2.5 transition-all shadow-xs flex flex-col justify-between ${
                      isSelected || isInspected
                        ? 'border-slate-900 ring-2 ring-slate-900/10'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {!isAdmin && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-checked={isSelected}
                        aria-label={`Select ${item.name}`}
                        onChange={(event) => toggleSelect(item.id, event.target.checked)}
                        className="absolute top-3 left-3 z-10 h-4 w-4 cursor-pointer rounded accent-slate-900"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setInspectedId(item.id)}
                      aria-pressed={isSelected}
                      aria-label={`Inspect ${item.name}`}
                      className="group flex cursor-pointer flex-col justify-between text-left"
                    >
                      <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-100">
                        {kind === 'image' && item.cdnUrl ? (
                          <img
                            src={item.cdnUrl}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="p-4 text-center">
                            <KindIcon className="mx-auto h-10 w-10 text-slate-400" />
                            <span className="mt-1 block text-xs font-extrabold text-slate-600">
                              {formatOf(item.mimeType)}
                            </span>
                          </span>
                        )}
                        <span className="absolute bottom-2 right-2 rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                          {formatOf(item.mimeType)}
                        </span>
                      </span>

                      <span className="mt-2.5 block space-y-1">
                        <span className="block truncate font-bold text-slate-900 text-xs" title={item.name}>
                          {item.name}
                        </span>
                        <span className="flex items-center justify-between gap-1 text-xs text-slate-500">
                          <span>{formatBytes(item.sizeBytes)}</span>
                          <span>•</span>
                          <span className="truncate">{dimensionLabel(item)}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_STYLE[item.status]}`}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                          <span className="truncate text-[9px] font-mono text-slate-400">
                            {folderLabel(item.folder)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">
                  Media assets in {folderFilter === 'all' ? 'all folders' : folderFilter}, page{' '}
                  {currentPage} of {pageCount}
                </caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    {!isAdmin && (
                      <th className="px-4 py-3 w-8" scope="col">
                        <label htmlFor="media-select-all-head" className="sr-only">
                          Select all {filtered.length} listed files
                        </label>
                        <input
                          id="media-select-all-head"
                          type="checkbox"
                          checked={allFilteredSelected}
                          aria-checked={allFilteredSelected}
                          onChange={(event) =>
                            setSelectedIds(event.target.checked ? filtered.map((item) => item.id) : [])
                          }
                          className="rounded accent-slate-900"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3" scope="col">Asset name</th>
                    <th className="px-4 py-3" scope="col">Dimensions / format</th>
                    <th className="px-4 py-3" scope="col">File size</th>
                    <th className="px-4 py-3" scope="col">Folder</th>
                    <th className="px-4 py-3" scope="col">Status</th>
                    {!isAdmin && (
                      <th className="px-4 py-3 text-right" scope="col">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {visible.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const kind = mediaKindOf(item.mimeType);
                    const KindIcon = FILE_KIND_ICONS[kind];
                    return (
                      <tr key={item.id} aria-selected={isSelected} className={isSelected ? 'bg-slate-50/90' : 'hover:bg-slate-50/80'}>
                        {!isAdmin && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              id={`media-row-${item.id}`}
                              checked={isSelected}
                              aria-checked={isSelected}
                              onChange={(event) => toggleSelect(item.id, event.target.checked)}
                              className="rounded accent-slate-900"
                            />
                            <label htmlFor={`media-row-${item.id}`} className="sr-only">
                              Select {item.name}
                            </label>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setInspectedId(item.id)}
                            className="flex cursor-pointer items-center gap-2.5 text-left"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100">
                              {kind === 'image' && item.cdnUrl ? (
                                <img src={item.cdnUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <KindIcon className="h-4 w-4 text-slate-400" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-bold text-slate-900">{item.name}</span>
                              <span className="block text-xs text-slate-500">
                                {formatDate(item.createdAt)}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-bold">
                            {formatOf(item.mimeType)}
                          </span>
                          <span className="text-slate-500">{dimensionLabel(item)}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">{formatBytes(item.sizeBytes)}</td>
                        <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-500">
                          {folderLabel(item.folder)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[item.status]}`}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                        </td>
                        {!isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => askDelete([item])}
                              aria-label={`Delete ${item.name}`}
                              title={`Delete ${item.name}`}
                              className="ml-auto inline-flex items-center rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Inspector: the row's own columns, nothing else ──────── */}
          {inspected && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 overflow-hidden">
                    {mediaKindOf(inspected.mimeType) === 'image' && inspected.cdnUrl ? (
                      <img src={inspected.cdnUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <InspectedIcon className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    {editingId === inspected.id ? (
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="media-rename" className="sr-only">
                          New name for {inspected.name}
                        </label>
                        <input
                          id="media-rename"
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          className="w-48 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveRename(inspected)}
                          disabled={rename.isPending}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                        >
                          {rename.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm break-all">{inspected.name}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[inspected.status]}`}
                        >
                          {STATUS_LABEL[inspected.status]}
                        </span>
                      </div>
                    )}
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono">{folderLabel(inspected.folder)}</span>
                      <span>•</span>
                      <span>{formatDate(inspected.createdAt)}</span>
                      {inspectedOwner && (
                        <>
                          <span>•</span>
                          <span>
                            {inspectedOwner.storeName || 'Unnamed store'}
                            {inspectedOwner.storeSlug ? ` (${inspectedOwner.storeSlug})` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div role="group" aria-label="Actions for the inspected file" className="flex flex-wrap items-center gap-2 text-xs">
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => startRename(inspected)}
                      className={GHOST_BUTTON}
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      <span>Rename</span>
                    </button>
                  )}

                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds([inspected.id]);
                        setMoveError(null);
                        setMoveFolder(inspected.folder);
                        setMoveOpen(true);
                      }}
                      disabled={move.isPending}
                      className={GHOST_BUTTON}
                    >
                      <Move className="h-3.5 w-3.5 text-slate-500" />
                      <span>Move</span>
                    </button>
                  )}

                  <a
                    href={inspected.cdnUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${inspected.name} in a new tab`}
                    className={GHOST_BUTTON}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    <span>Open file</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => void copyUrl(inspected)}
                    className={GHOST_BUTTON}
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy URL</span>
                  </button>

                  {isAdmin ? (
                    <span role="group" aria-label="Moderation for the inspected file" className="flex items-center gap-2">
                      {(['approved', 'pending', 'flagged'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={inspected.status === status || setMediaStatus.isPending}
                          onClick={() =>
                            setMediaStatus.mutate(
                              { itemId: inspected.id, status },
                              {
                                onSuccess: (row) =>
                                  note(`Recorded the verdict for “${row.name}”: ${row.status}.`),
                                onError: fail,
                              },
                            )
                          }
                          className={GHOST_BUTTON}
                        >
                          {status === 'approved'
                            ? 'Approve'
                            : status === 'flagged'
                              ? 'Flag'
                              : 'Mark pending'}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => askDelete([inspected])}
                      className={DANGER_BUTTON}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      <span>Delete asset</span>
                    </button>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-xs pt-1 md:grid-cols-4">
                {inspectedOwner && (
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Owning store</dt>
                    <dd className="mt-0.5 font-bold text-slate-900">
                      {inspectedOwner.storeName || 'Unnamed store'}
                      {inspectedOwner.storeSlug && (
                        <span className="ml-1 font-mono text-xs font-medium text-slate-500">
                          {inspectedOwner.storeSlug}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">Dimensions</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">{dimensionLabel(inspected)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">MIME type</dt>
                  <dd className="mt-0.5 break-all font-bold text-slate-900">
                    {inspected.mimeType || 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">File size</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {formatBytes(inspected.sizeBytes)}
                    <span className="ml-1 text-xs font-medium text-slate-500">
                      ({inspected.sizeBytes} bytes)
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">Storage</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {isStoredObject(inspected.cdnUrl)
                      ? 'vendor-assets bucket'
                      : isAdmin
                        ? 'External URL, no stored object'
                        : 'External URL, no object in your bucket'}
                  </dd>
                </div>
              </dl>

              {inspected.objectPath && (
                <div>
                  <label htmlFor="media-object-path" className="text-xs font-bold uppercase text-slate-500">
                    Stored object path
                  </label>
                  <input
                    id="media-object-path"
                    type="text"
                    readOnly
                    value={inspected.objectPath}
                    className={`${FIELD} mt-1 select-all font-mono text-xs text-slate-700`}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Pagination over the rows actually loaded ────────────── */}
          {!library.isPending && !library.isError && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div>
                Showing <strong>{firstIndex + 1} - {lastIndex}</strong> of{' '}
                <strong>{filtered.length}</strong> files in this selection • Total size:{' '}
                <strong>
                  {formatBytes(filtered.reduce((sum, item) => sum + item.sizeBytes, 0))}
                </strong>
              </div>

              <nav aria-label="File pages" className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  &lt; Previous
                </button>
                {pageNumbers.map((number, index) =>
                  number === '…' ? (
                    <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={number}
                      type="button"
                      onClick={() => setPage(number)}
                      aria-current={number === currentPage ? 'page' : undefined}
                      aria-label={`Page ${number}`}
                      className={`rounded px-2.5 py-1 cursor-pointer ${
                        number === currentPage
                          ? 'bg-slate-900 text-white font-bold'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {number}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={currentPage >= pageCount}
                  aria-label="Next page"
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next &gt;
                </button>
              </nav>
            </div>
          )}

        </div>
      </div>

      {/* ── Upload dialog ───────────────────────────────────────────── */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!open && upload.isPending) return;
          setUploadOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => {
            if (upload.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (upload.isPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (upload.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-slate-700" />
              Upload files to your media library
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Each file is written to <code className="font-mono">vendor-assets/&lt;your slug&gt;/&lt;folder&gt;/</code>{' '}
              and recorded as pending until the platform reviews it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(event) => void submitUpload(event)} className="space-y-3.5 py-2 text-xs">
            <label htmlFor="upload-file-input" className="sr-only">
              Files to upload
            </label>
            <input
              id="upload-file-input"
              ref={uploadInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={pickedFiles}
              disabled={upload.isPending}
            />
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={upload.isPending}
              className="w-full cursor-pointer space-y-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center transition-all hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs">
                <Upload className="h-5 w-5" />
              </span>
              <span className="block font-bold text-slate-800">
                {uploadQueue.length === 0
                  ? 'Click to choose files'
                  : `${uploadQueue.length} file${uploadQueue.length === 1 ? '' : 's'} ready`}
              </span>
              <span className="block text-xs text-slate-500">
                {uploadQueue.length === 0
                  ? 'Any type the bucket accepts; the row records its real size and MIME type.'
                  : uploadQueue.map((file) => `${file.name} (${formatBytes(file.size)})`).join(', ')}
              </span>
            </button>

            <div>
              <label htmlFor="upload-folder" className="block font-bold text-slate-700 mb-1">
                Destination folder
              </label>
              <input
                id="upload-folder"
                list="media-folder-options"
                value={uploadFolder}
                onChange={(event) => setUploadFolder(event.target.value)}
                disabled={upload.isPending}
                placeholder="products"
                className={`${FIELD} font-mono`}
              />
              <p className="mt-1 text-xs text-slate-500">
                A label on the row, not a record: a new name here creates the folder for that file.
              </p>
            </div>

            <datalist id="media-folder-options">
              {folders.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            {uploadError && (
              <div role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 p-3 font-bold text-rose-800">
                {uploadError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                disabled={upload.isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={upload.isPending || uploadQueue.length === 0}
                className="rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {upload.isPending ? `Uploading… (${uploadQueue.length})` : `Upload ${uploadQueue.length || ''}`.trim()}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Move dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={moveOpen}
        onOpenChange={(open) => {
          if (!open && move.isPending) return;
          setMoveOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => {
            if (move.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (move.isPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (move.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Move className="h-5 w-5 text-slate-700" />
              Move {moveTargets.length} file{moveTargets.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {moveTargets.map((item) => item.name).join(', ')} — each file is physically moved in the
              bucket and its stored path is rewritten. One move per call, so a rejected one leaves the others
              alone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label htmlFor="move-folder" className="block font-bold text-slate-700 mb-1">
                Destination folder
              </label>
              <input
                id="move-folder"
                list="media-folder-options-move"
                value={moveFolder}
                onChange={(event) => setMoveFolder(event.target.value)}
                disabled={move.isPending}
                placeholder="banners"
                className={`${FIELD} font-mono`}
              />
            </div>

            <datalist id="media-folder-options-move">
              {folders.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            {moveError && (
              <div role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 p-3 font-bold text-rose-800">
                {moveError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMoveOpen(false)}
                disabled={move.isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmMove()}
                disabled={move.isPending}
                className="rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {move.isPending ? 'Moving…' : 'Confirm move'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ───────────────────────────────────── */}
      <Dialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => {
            if (remove.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (remove.isPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (remove.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-700 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" />
              Delete {deleteCountLabel} permanently?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {deleteTargets.length} file{deleteTargets.length === 1 ? '' : 's'} will be removed:
              <span className="mt-2 block space-y-1">
                {deleteTargets.map((item) => (
                  <span key={item.id} className="block">
                    <strong className="text-slate-800">{item.name}</strong>{' '}
                    <span className="font-mono text-xs text-slate-500">
                      ({folderLabel(item.folder)}, {formatBytes(item.sizeBytes)})
                    </span>
                  </span>
                ))}
              </span>
              <span className="mt-2 block">
                This deletes each <code className="font-mono">media_items</code> row and the object in your
                bucket. There is no trash bin, so it cannot be undone, and a listing still pointing at the old
                URL keeps showing that link until you edit it on Products.
              </span>
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              {deleteError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeDelete}
              disabled={remove.isPending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={remove.isPending || deleteTargets.length === 0}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {remove.isPending ? 'Deleting…' : `Delete ${deleteCountLabel}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
