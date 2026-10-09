import { useMemo, useState } from 'react';

export interface UsePaginationResult<T> {
  /** Current page (1-based). */
  page: number;
  setPage: (page: number) => void;
  /** Rows per page. */
  pageSize: number;
  setPageSize: (size: number) => void;
  /** Total number of rows (unpaginated). */
  total: number;
  /** Total number of pages (>= 1). */
  totalPages: number;
  /** The slice of rows for the current page. */
  pageItems: T[];
  /** 1-based index of first row on this page (0 when empty). */
  from: number;
  /** 1-based index of last row on this page (0 when empty). */
  to: number;
}

/**
 * Client-side pagination for in-memory demo tables.
 * Pass the FULL filtered list; get back the current page slice + metadata.
 * Resets to page 1 automatically when the list identity changes (new filter).
 */
export function usePagination<T>(items: T[], initialPageSize = 8): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Reset to page 1 when the filtered result count changes (new filter/search).
  // Count-based (not reference-based) so inline-computed arrays are safe.
  const [lastTotal, setLastTotal] = useState(items.length);
  if (items.length !== lastTotal) {
    setLastTotal(items.length);
    if (page !== 1) setPage(1);
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize: (size) => {
      setPageSizeState(size);
      setPage(1);
    },
    total,
    totalPages,
    pageItems,
    from,
    to,
  };
}

/**
 * Builds a compact page-number window like [1, '…', 4, 5, 6, '…', 20].
 */
export function buildPageWindow(page: number, totalPages: number): Array<number | '…'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | '…'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}
