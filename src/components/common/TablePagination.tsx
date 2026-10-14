import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { buildPageWindow, type UsePaginationResult } from '../../hooks/usePagination';

interface TablePaginationProps<T> {
  /** Result of usePagination(filteredItems). */
  pagination: UsePaginationResult<T>;
  /** Row label, e.g. "orders", "merchant records". */
  noun?: string;
  /** Rows-per-page choices. */
  pageSizeOptions?: number[];
  /** Compact icon style (h-7 w-7 buttons, |< < 1 2 > >|). Default: text style. */
  variant?: 'text' | 'compact';
}

/**
 * Shared, fully functional table pagination footer component.
 */
export function TablePagination<T>({
  pagination,
  noun = 'records',
  pageSizeOptions = [8, 16, 32],
  variant = 'text',
}: TablePaginationProps<T>) {
  const { page, setPage, pageSize, setPageSize, total, totalPages, from, to } = pagination;
  const window = buildPageWindow(page, totalPages);

  if (variant === 'compact') {
    const iconBtn =
      'flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
    const numBtn = (isActive: boolean) =>
      isActive
        ? 'flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white'
        : 'flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors';
    return (
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>
            Showing{' '}
            <strong>
              {from}-{to}
            </strong>{' '}
            of <strong>{total.toLocaleString()}</strong> {noun}
          </span>
          <label className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="native-select rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 focus:outline-hidden cursor-pointer"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1 self-end sm:self-auto" role="navigation" aria-label="Pagination">
          <button type="button" className={iconBtn} onClick={() => setPage(1)} disabled={page <= 1} aria-label="First page">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={iconBtn} onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {window.map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={numBtn(p === page)}
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" className={iconBtn} onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={iconBtn} onClick={() => setPage(totalPages)} disabled={page >= totalPages} aria-label="Last page">
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Text variant (Admin Orders / Products / Users style)
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 py-1 text-xs text-slate-700 shadow-2xs cursor-pointer"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
        </div>
        <span className="ml-2">
          Showing {from}-{to} of {total.toLocaleString()} {noun}
        </span>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto" role="navigation" aria-label="Pagination">
        <button
          type="button"
          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        {window.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={
                p === page
                  ? 'rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs'
                  : 'rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors'
              }
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
