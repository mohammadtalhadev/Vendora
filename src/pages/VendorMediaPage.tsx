import React, { useMemo, useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Film,
  FileArchive,
  Trash2,
  Pencil,
  Move,
  Check,
  X,
  HardDrive,
  ShieldAlert,
  Clock,
  Library,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { foldersOf, type VendorMediaItem } from '../features/vendor/api/media';
import {
  useDeleteMedia,
  useMediaLibrary,
  useMoveMedia,
  useRenameMedia,
  useUploadMedia,
} from '../features/vendor/hooks/useVendorMedia';

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-2xs space-y-3';

const STATUS_STYLE: Record<VendorMediaItem['status'], string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  flagged: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABEL: Record<VendorMediaItem['status'], string> = {
  approved: 'Approved',
  pending: 'Awaiting review',
  flagged: 'Flagged',
};

function bytesOf(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Film;
  if (mime === 'application/pdf' || mime.startsWith('text/')) return FileText;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) return FileArchive;
  return FileText;
}

/** A folder label a seller can type; anything stranger is rejected before the path is built. */
function cleanFolder(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const VendorMediaPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const library = useMediaLibrary();
  const upload = useUploadMedia();
  const rename = useRenameMedia();
  const move = useMoveMedia();
  const remove = useDeleteMedia();

  const inputRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<string>('all');
  const [target, setTarget] = useState('products');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  // Deletion is irreversible, so the clicked row waits here until the seller confirms in the dialog.
  const [deleteTarget, setDeleteTarget] = useState<VendorMediaItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const items = useMemo(() => library.data ?? [], [library.data]);
  const folders = useMemo(() => foldersOf(items), [items]);

  const visible = useMemo(
    () => (folder === 'all' ? items : items.filter((item) => item.folder === folder)),
    [items, folder],
  );

  const totals = useMemo(
    () => ({
      bytes: items.reduce((sum, item) => sum + item.sizeBytes, 0),
      pending: items.filter((item) => item.status === 'pending').length,
      flagged: items.filter((item) => item.status === 'flagged').length,
    }),
    [items],
  );

  const note = (message: string) => {
    setError(null);
    setBanner(message);
    window.setTimeout(() => setBanner(null), 4000);
  };

  const fail = (cause: unknown) => {
    setBanner(null);
    setError(cause instanceof Error ? cause.message : String(cause));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const folderName = cleanFolder(target);
    if (!folderName) {
      setError('Give the upload folder a name before choosing files.');
      return;
    }
    setError(null);
    const queue = Array.from(files);
    // One at a time: the bucket is billed per write, and a partial batch is reported as the
    // files that did land rather than a fake "all uploaded".
    let last: VendorMediaItem | undefined;
    try {
      for (const file of queue) last = await upload.mutateAsync({ file, folder: folderName });
      note(
        `Uploaded ${queue.length} file${queue.length === 1 ? '' : 's'}${last ? ` into ${last.folder}` : ''}. Each one waits for platform review before a buyer can see it.`,
      );
    } catch (cause) {
      fail(cause);
    }
  };

  const saveName = (item: VendorMediaItem) => {
    const next = draftName.trim();
    if (!next) return;
    rename.mutate(
      { itemId: item.id, name: next },
      { onSuccess: () => note('Renamed. The stored file keeps its path, so live links stay valid.'), onError: fail },
    );
    setEditingId(null);
  };

  const moveTo = (item: VendorMediaItem) => {
    const next = cleanFolder(target);
    if (!next) {
      setError('Folder names use letters, numbers, dashes and underscores.');
      return;
    }
    move.mutate(
      { itemId: item.id, folder: next },
      {
        onSuccess: (saved) => {
          note(`Moved to ${saved.folder}.`);
          setMovingId(null);
        },
        onError: fail,
      },
    );
  };

  /** Park the clicked row and open the confirm step; no write leaves the page yet. */
  const askDelete = (item: VendorMediaItem) => {
    setError(null);
    setBanner(null);
    setDeleteError(null);
    setDeleteTarget(item);
  };

  const closeDelete = () => {
    // Escape / outside-click cannot close the dialog mid-write.
    if (remove.isPending) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(deleteTarget.id);
      note(`Deleted “${deleteTarget.name}”. Its row and the file in your bucket are both gone.`);
      setDeleteTarget(null);
    } catch (cause) {
      // The library refetches only on success, so the asset stays visible and the server's own
      // reason is shown instead of a "Deleted" banner.
      setDeleteError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <WorkspaceLayout
      role="vendor"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Files &amp; Media
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Your store's own asset library. Every row here is a file in your bucket plus the
              moderation verdict the platform recorded for it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                void uploadFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-sun-orange-600 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {upload.isPending ? 'Uploading…' : 'Upload files'}
            </button>
          </div>
        </div>

        {banner && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800"
          >
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {banner}
          </div>
        )}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
          >
            <X className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={CARD}>
            <Library className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <p className="text-lg font-black text-slate-900">{items.length}</p>
            <p className="text-[11px] text-slate-500">Assets recorded</p>
          </div>
          <div className={CARD}>
            <HardDrive className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <p className="text-lg font-black text-slate-900">{bytesOf(totals.bytes)}</p>
            <p className="text-[11px] text-slate-500">Total stored</p>
          </div>
          <div className={CARD}>
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <p className="text-lg font-black text-slate-900">{totals.pending}</p>
            <p className="text-[11px] text-slate-500">Awaiting review</p>
          </div>
          <div className={CARD}>
            <ShieldAlert className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <p className="text-lg font-black text-slate-900">{totals.flagged}</p>
            <p className="text-[11px] text-slate-500">Flagged by staff</p>
          </div>
        </div>

        <nav aria-label="Folders in this library" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFolder('all')}
            aria-current={folder === 'all' ? 'true' : undefined}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
              folder === 'all'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            All folders
          </button>
          {folders.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFolder(name)}
              aria-current={folder === name ? 'true' : undefined}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                folder === name
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <label htmlFor="media-folder" className="text-[11px] font-bold text-slate-600">
              Working folder
            </label>
            <input
              id="media-folder"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="w-40 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900"
            />
          </div>
        </nav>

        {library.isPending ? (
          <p className="text-xs text-slate-500">Loading your library…</p>
        ) : library.isError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            <X className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            {(library.error as Error).message}
          </div>
        ) : visible.length === 0 ? (
          <div className={CARD}>
            <p className="font-bold text-slate-900">Nothing in this folder yet.</p>
            <p className="text-[11px] text-slate-500">
              Set the working folder above, then upload. Files land in{' '}
              <code>vendor-assets/&lt;your store slug&gt;/&lt;folder&gt;/</code>, which is the only
              prefix your account may write to.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => {
              const Icon = iconFor(item.mimeType);
              const isImage = item.mimeType.startsWith('image/');
              return (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex h-36 items-center justify-center bg-slate-50">
                    {isImage ? (
                      <img
                        src={item.cdnUrl}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon className="h-8 w-8 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-2 p-4 text-xs">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="rename-media" className="sr-only">
                          New file name for {item.name}
                        </label>
                        <input
                          id="rename-media"
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveName(item)}
                          disabled={rename.isPending}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50 cursor-pointer"
                        >
                          {rename.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="truncate font-bold text-slate-900" title={item.name}>
                        {item.name}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[item.status]}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {item.folder || 'root'}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500">
                      <dt>Size</dt>
                      <dd className="text-right font-bold text-slate-700">{bytesOf(item.sizeBytes)}</dd>
                      <dt>Dimensions</dt>
                      <dd className="text-right font-bold text-slate-700">
                        {item.width && item.height ? `${item.width}×${item.height}` : 'Not recorded'}
                      </dd>
                      <dt>Type</dt>
                      <dd className="truncate text-right font-bold text-slate-700" title={item.mimeType}>
                        {item.mimeType || 'unknown'}
                      </dd>
                      <dt>Added</dt>
                      <dd className="text-right font-bold text-slate-700">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </dd>
                    </dl>

                    {movingId === item.id && (
                      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <p className="flex-1 text-[10px] text-slate-500">
                          Move the file to the working folder
                          {folders.length > 0 && ` (“${target.trim()}” is not in the list below, so it will be created)`}.
                        </p>
                        <button
                          type="button"
                          onClick={() => moveTo(item)}
                          disabled={move.isPending}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50 cursor-pointer"
                        >
                          Move
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovingId(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setDraftName(item.name);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovingId(movingId === item.id ? null : item.id)}
                        aria-expanded={movingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Move className="h-3 w-3" aria-hidden="true" />
                        Move
                      </button>
                      <a
                        href={item.cdnUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${item.name} in a new tab`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => askDelete(item)}
                        aria-label={`Delete ${item.name}`}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <section className={CARD}>
          <h2 className="text-sm font-bold text-slate-900">What this library is</h2>
          <ul className="space-y-1.5 text-[11px] text-slate-500">
            <li>
              — Folders are derived from the assets themselves. There is no folder table, so an empty
              folder cannot exist and a move is a real file move plus a recorded path.
            </li>
            <li>
              — A new upload is stored as <em>pending</em>. The moderation verdict is written by
              platform staff; the policy on this table refuses a seller write of it, so no asset can
              approve itself.
            </li>
            <li>
              — Assets seeded for the demo point at an external CDN with no object in your bucket.
              They can be renamed but not moved, and the error says so instead of faking a move.
            </li>
            <li>
              — A listing references its images by URL on the product row. Deleting an asset here
              removes the file, not the reference - a live listing keeps showing the old link until
              you edit it on Products.
            </li>
            <li>
              — Dimensions are only shown when a row recorded them. Nothing here guesses a size.
            </li>
          </ul>
        </section>
      </div>

      {/* Confirm step: the row is removed from the library only after the server accepts the delete. */}
      <Dialog
        open={deleteTarget !== null}
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
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Trash2 className="h-5 w-5 text-rose-600" aria-hidden="true" />
              Delete this file permanently?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {deleteTarget ? (
                <>
                  1 asset will be removed: <strong className="text-slate-800">{deleteTarget.name}</strong>{' '}
                  (folder <code className="font-mono">{deleteTarget.folder || 'root'}</code>,{' '}
                  {bytesOf(deleteTarget.sizeBytes)}). This deletes its <code className="font-mono">media_items</code>{' '}
                  row and the object in your bucket — there is no trash bin, so it cannot be undone. A listing still
                  pointing at the old URL keeps showing that link until you edit it on Products.
                </>
              ) : (
                'Nothing has been deleted yet.'
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              {deleteError}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
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
              disabled={remove.isPending || !deleteTarget}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {remove.isPending ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ProductFormModal open={isProductModalOpen} onOpenChange={setIsProductModalOpen} />
    </WorkspaceLayout>
  );
};
