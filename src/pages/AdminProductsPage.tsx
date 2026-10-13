import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Hourglass,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Download,
  Search,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useModerationQueue } from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';

export const AdminProductsPage: React.FC = () => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'pending_review' | 'approved' | 'rejected' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: queue, error: queueError, isLoading: queueLoading, refetch: refetchQueue } = useModerationQueue({
    status: activeStatusTab === 'all' ? undefined : activeStatusTab,
    search: searchQuery || undefined,
    page: currentPage,
    pageSize,
  });

  const { moderateProducts: mutateModerate, assignModerator: mutateAssignModerator } = useAdminActions();

  const isMutatingModerate = mutateModerate.isPending;
  const isMutatingAssign = mutateAssignModerator.isPending;

  const counts = queue?.counts ?? { pendingReview: 0, approved: 0, rejected: 0, draft: 0, archived: 0 };
  const rows = queue?.rows ?? [];
  const total = queue?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const result = await mutateModerate.mutateAsync({ productIds: ids, status: 'approved', reason: undefined });
      showToast(`${result.decided} listing(s) approved.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve listings.';
      showToast(msg);
    } finally {
      await refetchQueue();
      setSelectedIds([]);
    }
  };

  const handleReject = async (ids: string[], reason: string) => {
    if (ids.length === 0 || !reason) return;
    try {
      const result = await mutateModerate.mutateAsync({ productIds: ids, status: 'rejected', reason });
      showToast(`${result.decided} listing(s) rejected.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject listings.';
      showToast(msg);
    } finally {
      await refetchQueue();
      setSelectedIds([]);
    }
  };

  const handleArchive = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const result = await mutateModerate.mutateAsync({ productIds: ids, status: 'archived', reason: undefined });
      showToast(`${result.decided} listing(s) archived.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive listings.';
      showToast(msg);
    } finally {
      await refetchQueue();
      setSelectedIds([]);
    }
  };

  const handleReturnToReview = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const result = await mutateModerate.mutateAsync({ productIds: ids, status: 'pending_review', reason: undefined });
      showToast(`${result.decided} listing(s) returned to review.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to return listings to review.';
      showToast(msg);
    } finally {
      await refetchQueue();
      setSelectedIds([]);
    }
  };

  const handleAssignModerator = async (productId: string, moderatorId: string) => {
    try {
      await mutateAssignModerator.mutateAsync({ productId, moderatorId });
      showToast('Moderator assigned.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign moderator.';
      showToast(msg);
    } finally {
      await refetchQueue();
    }
  };

  const handleExportQueue = () => {
    exportToCsv({
      filename: `moderation-queue-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'SKU', key: 'slug' },
        { header: 'Listing Title', key: 'title' },
        { header: 'Brand', key: 'brand' },
        { header: 'Seller', key: 'storeName' },
        { header: 'Price', key: 'price' },
        { header: 'Stock', key: 'stock' },
        { header: 'Status', key: 'status' },
      ],
      data: rows,
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const renderKpiCards = () => {
    const totalSubmissions = total;
    const pendingCount = counts.pendingReview;
    const approvedCount = counts.approved;
    const rejectedCount = counts.rejected;
    const totalShown = total > 0 ? ((approvedCount + rejectedCount) / totalSubmissions) * 100 : 0;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL SUBMISSIONS</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{totalSubmissions.toLocaleString()}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className="flex items-center gap-0.5 font-bold text-emerald-600">
                <Clock className="h-3 w-3" />
                Live Queue
              </span>
              <span className="text-slate-400">{pendingCount} awaiting review</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">PENDING REVIEW</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600">
              <Hourglass className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{pendingCount}</div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Real-time sync</span>
              <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
                {pendingCount > 0 ? `${pendingCount} in queue` : 'Queue clear'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">APPROVAL RATE</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{totalShown.toFixed(1)}%</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">{approvedCount} approved</span>
              <span className="text-slate-400">of {totalSubmissions} items</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">POLICY VIOLATIONS</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{rejectedCount}</div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200">
                ⚠ {rejectedCount} rejected
              </span>
              <span className="text-slate-400">Catalog protection</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!rows || rows.length === 0) {
      return (
        <div className="text-center py-12 text-xs text-slate-500">
          No items found in the moderation queue.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs"
          aria-label="Product moderation queue"
        >
          <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="py-3 px-4 w-10 text-center">
                <label htmlFor="select-all-products" className="sr-only">Select all products on this page</label>
                <input
                  id="select-all-products"
                  type="checkbox"
                  checked={rows.length > 0 && selectedIds.length === rows.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
              </th>
              <th scope="col" className="py-3 px-4">PRODUCT / LISTING</th>
              <th scope="col" className="py-3 px-4">SELLER</th>
              <th scope="col" className="py-3 px-4">STATUS</th>
              <th scope="col" className="py-3 px-4">PRICE &amp; STOCK</th>
              <th scope="col" className="py-3 px-4">MODERATION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isSelected = selectedIds.includes(row.id);
              const displayStatus = row.flagged ? 'Re-submitted' : row.status === 'pending_review' ? 'Pending Review' : row.status;

              return (
                <tr key={row.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-slate-50/90' : ''}`}>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.title} for bulk moderation`}
                      checked={isSelected}
                      onChange={() => toggleSelectItem(row.id)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={row.images?.[0] ?? ''}
                        alt={row.title}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200 bg-slate-50"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-xs truncate leading-tight">{row.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">
                          {row.brand || '—'} • {row.slug || row.id.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div>
                      <p className="font-bold text-slate-900 text-xs leading-tight">{row.storeName || 'Unknown Seller'}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{row.sellerId === 'vendora-platform' ? 'Platform Direct' : row.sellerStatus}</p>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold ${
                      row.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : row.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : row.status === 'archived'
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {displayStatus}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900 text-xs leading-tight">${row.price.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{row.stock} units in stock</p>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col items-end gap-1.5">
                      {row.moderatedBy && (
                        <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {row.moderatedBy}
                        </span>
                      )}
                      {row.status === 'rejected' && row.rejectionReason && (
                        <span className="text-[9px] text-rose-600" title={row.rejectionReason}>
                          Reason: {row.rejectionReason.slice(0, 40)}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                        {row.status !== 'approved' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove([row.id])}
                              disabled={isMutatingModerate}
                              className="text-emerald-700 hover:underline disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal([row.id])}
                              disabled={isMutatingModerate}
                              className="text-rose-600 hover:underline disabled:opacity-40"
                            >
                              Reject
                            </button>
                            <span className="text-slate-300">•</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal([row.id])}
                          disabled={isMutatingAssign}
                          className="text-slate-600 hover:underline disabled:opacity-40"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const ModalWrapper: React.FC<{ open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode }> = ({ open, onClose, title, description, children }) => {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {title}
            </DialogTitle>
            {description && <DialogDescription className="text-xs text-slate-500">{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  };

  // Rejection state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
  const [rejectReasonCategory, setRejectReasonCategory] = useState('Violates Catalog Trademark & IP Policy');
  const [customRejectNote, setCustomRejectNote] = useState('');

  const handleOpenRejectModal = (ids: string[]) => {
    setRejectTargetIds(ids);
    setRejectReasonCategory('Violates Catalog Trademark & IP Policy');
    setCustomRejectNote('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    const fullReason = customRejectNote ? `${rejectReasonCategory}: ${customRejectNote}` : rejectReasonCategory;
    handleReject(rejectTargetIds, fullReason);
    setIsRejectModalOpen(false);
  };

  // Assign moderator state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetIds, setAssignTargetIds] = useState<string[]>([]);
  const [selectedModerator, setSelectedModerator] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const handleOpenAssignModal = (ids: string[]) => {
    setAssignTargetIds(ids);
    setSelectedModerator('');
    setAssignNote('');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!selectedModerator) return;
    assignTargetIds.forEach((id) => handleAssignModerator(id, selectedModerator));
    setIsAssignModalOpen(false);
  };

  const STATUS_TABS: Array<'all' | 'pending_review' | 'approved' | 'rejected' | 'archived'> = [
    'all',
    'pending_review',
    'approved',
    'rejected',
    'archived',
  ];

  const handleStatusTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = STATUS_TABS.indexOf(activeStatusTab);
    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % STATUS_TABS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + STATUS_TABS.length) % STATUS_TABS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = STATUS_TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = STATUS_TABS[nextIndex];
    setActiveStatusTab(nextTab);
    setCurrentPage(1);
    document.getElementById(`product-status-tab-${nextTab}`)?.focus();
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Product Moderation"
      subtitle="Review vendor catalog submissions, manage compliance approvals, and enforce marketplace listing guidelines."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit mt-1">Product Moderation</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Review vendor catalog submissions, manage compliance approvals, and enforce marketplace listing guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Link
              to="/admin/add-product"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              Add Product
            </Link>

            <button type="button" onClick={handleExportQueue} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer">
              <Download className="h-3.5 w-3.5 text-slate-400" />
              Export Queue
            </button>

            <button
              type="button"
              onClick={() => {
                if (counts.pendingReview === 0) {
                  showToast('No pending items in queue.');
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              Review Queue ({counts.pendingReview} Pending)
            </button>
          </div>
        </div>

        {renderKpiCards()}

        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 pb-3 text-xs" role="tablist" aria-label="Product moderation status filters" onKeyDown={handleStatusTabKeyDown}>
          <button type="button" role="tab" id="product-status-tab-all" aria-controls="product-queue-panel" aria-selected={activeStatusTab === 'all'} tabIndex={activeStatusTab === 'all' ? 0 : -1} onClick={() => { setActiveStatusTab('all'); setCurrentPage(1); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${activeStatusTab === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Layers className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
            All Products ({total})
          </button>
          <button type="button" role="tab" id="product-status-tab-pending_review" aria-controls="product-queue-panel" aria-selected={activeStatusTab === 'pending_review'} tabIndex={activeStatusTab === 'pending_review' ? 0 : -1} onClick={() => { setActiveStatusTab('pending_review'); setCurrentPage(1); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${activeStatusTab === 'pending_review' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}>
            Submissions Queue ({counts.pendingReview})
          </button>
          <button type="button" role="tab" id="product-status-tab-approved" aria-controls="product-queue-panel" aria-selected={activeStatusTab === 'approved'} tabIndex={activeStatusTab === 'approved' ? 0 : -1} onClick={() => { setActiveStatusTab('approved'); setCurrentPage(1); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${activeStatusTab === 'approved' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}>
            Approved Catalog ({counts.approved})
          </button>
          <button type="button" role="tab" id="product-status-tab-rejected" aria-controls="product-queue-panel" aria-selected={activeStatusTab === 'rejected'} tabIndex={activeStatusTab === 'rejected' ? 0 : -1} onClick={() => { setActiveStatusTab('rejected'); setCurrentPage(1); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${activeStatusTab === 'rejected' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}>
            Rejected ({counts.rejected})
          </button>
          <button type="button" role="tab" id="product-status-tab-archived" aria-controls="product-queue-panel" aria-selected={activeStatusTab === 'archived'} tabIndex={activeStatusTab === 'archived' ? 0 : -1} onClick={() => { setActiveStatusTab('archived'); setCurrentPage(1); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${activeStatusTab === 'archived' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}>
            Archived ({counts.archived})
          </button>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <label htmlFor="product-search" className="sr-only">Search listings</label>
            <input
              id="product-search"
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search listings..."
              className="w-full h-8.5 pl-8 pr-10 text-xs rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleApprove(selectedIds)}
              disabled={selectedIds.length === 0 || isMutatingModerate}
              className="text-emerald-700 hover:underline disabled:opacity-40"
            >
              Approve Selected ({selectedIds.length})
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => handleOpenRejectModal(selectedIds)}
              disabled={selectedIds.length === 0 || isMutatingModerate}
              className="text-rose-600 hover:underline disabled:opacity-40"
            >
              Reject Selected ({selectedIds.length})
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => handleArchive(selectedIds)}
              disabled={selectedIds.length === 0 || isMutatingModerate}
              className="text-slate-800 hover:underline disabled:opacity-40"
            >
              Archive Selected ({selectedIds.length})
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => handleReturnToReview(selectedIds)}
              disabled={selectedIds.length === 0 || isMutatingModerate}
              className="text-slate-800 hover:underline disabled:opacity-40"
            >
              Return to Review ({selectedIds.length})
            </button>
          </div>
        </div>

        <div
          className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden"
          role="tabpanel"
          id="product-queue-panel"
          aria-labelledby={`product-status-tab-${activeStatusTab}`}
        >
          {queueLoading ? (
            <div role="status" aria-live="polite" className="text-center py-12 text-xs text-slate-500">Reading the moderation queue…</div>
          ) : queueError ? (
            <div role="alert" aria-live="assertive" className="text-center py-12 text-xs text-slate-700">
              <div className="font-bold mb-2">Failed to load queue.</div>
              <button type="button" onClick={() => refetchQueue()} className="text-slate-900 underline">Retry</button>
            </div>
          ) : (
            <>
              {renderTable()}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
                <div>
                  Showing {total === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} items
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${currentPage === page ? 'bg-slate-900 text-white shadow-2xs' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {page}
                    </button>
                  ))}
                  <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rejection Modal */}
        <ModalWrapper
          open={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Catalog Submission"
          description="Specify compliance rejection reasons. The merchant will receive immediate notification with required remediation steps."
        >
          <div className="space-y-4 pt-2 text-xs">
            <div>
              <label htmlFor="reject-reason-category" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Primary Rejection Reason *</label>
              <select id="reject-reason-category" value={rejectReasonCategory} onChange={(e) => setRejectReasonCategory(e.target.value)} className="w-full admin-select h-10">
                <option value="Violates Catalog Trademark & IP Policy">Violates Catalog Trademark & IP Policy</option>
                <option value="Misleading Listing Title or Unsubstantiated Claims">Misleading Listing Title or Unsubstantiated Claims</option>
                <option value="Low Resolution or Watermarked Product Images">Low Resolution or Watermarked Product Images</option>
                <option value="Missing Compliance, Safety or Regulatory Documentation">Missing Compliance, Safety or Regulatory Documentation</option>
                <option value="Prohibited Goods or Hazardous Material Violation">Prohibited Goods or Hazardous Material Violation</option>
                <option value="Inaccurate Pricing or Suspicious Margin Discrepancy">Inaccurate Pricing or Suspicious Margin Discrepancy</option>
                <option value="Other Policy Violation">Other Policy Violation</option>
              </select>
            </div>
            <div>
              <label htmlFor="reject-custom-note" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Corrective Guidance &amp; Seller Notes</label>
              <textarea id="reject-custom-note" rows={3} value={customRejectNote} onChange={(e) => setCustomRejectNote(e.target.value)} placeholder="Explain exactly what the merchant must correct to obtain catalog approval..." className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none" />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsRejectModalOpen(false)} className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
              <button type="button" onClick={handleConfirmReject} className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer">Confirm Rejection & Notify Seller</button>
            </div>
          </div>
        </ModalWrapper>

        {/* Assign Moderator Modal */}
        <ModalWrapper
          open={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign Compliance Moderator"
          description={`Delegate ${assignTargetIds.length} catalog submission(s) to a dedicated compliance reviewer.`}
        >
          <div className="space-y-4 pt-2 text-xs">
            <div>
              <label htmlFor="assign-moderator" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Moderator Specialist</label>
              <select id="assign-moderator" value={selectedModerator} onChange={(e) => setSelectedModerator(e.target.value)} className="w-full admin-select h-10">
                <option value="">Choose moderator...</option>
                <option value="usr_sarah_jenkins">Sarah Jenkins (Senior Compliance Lead)</option>
                <option value="usr_alex_rivera">Alex Rivera (Catalog & Trademark Specialist)</option>
                <option value="usr_david_chen">David Chen (Safety & Hardware Compliance)</option>
                <option value="usr_elena_rostova">Elena Rostova (IP & Anti-Counterfeit Lead)</option>
              </select>
            </div>
            <div>
              <label htmlFor="assign-note" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Internal Instructions (Optional)</label>
              <input id="assign-note" type="text" value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="e.g. Check trademark documentation for audio gear..." className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
              <button type="button" onClick={handleConfirmAssign} disabled={!selectedModerator} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">Confirm Assignment</button>
            </div>
          </div>
        </ModalWrapper>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
