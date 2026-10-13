import * as React from 'react';
import { TablePagination } from '../common/TablePagination';
import type { UsePaginationResult } from '../../hooks/usePagination';
import { cn } from '../../lib/utils';

export interface DataTableColumn<T> {
  /** Stable column identity (React key + empty/loading colSpan bookkeeping). */
  key: string;
  /** Header content rendered inside the `<th>`. */
  header: React.ReactNode;
  /** Cell renderer for one row. */
  cell: (row: T) => React.ReactNode;
  /** Text alignment applied to both the header and the cells. Default `left`. */
  align?: 'left' | 'center' | 'right';
  /** Extra classes for body cells (merged over the standard `py-3 px-4`). */
  className?: string;
  /** Extra classes for the header cell (merged over the standard `py-3 px-4`). */
  headerClassName?: string;
}

export interface DataTablePagination {
  /** Current page (1-based). */
  page: number;
  /** Rows per page. */
  pageSize: number;
  /** Total number of rows across every page. */
  totalItems: number;
  onPageChange: (page: number) => void;
  /**
   * Optional: enables TablePagination's rows-per-page control. Changing the
   * page size also returns to page 1, matching the admin pages' behaviour.
   */
  onPageSizeChange?: (pageSize: number) => void;
  /** Rows-per-page choices forwarded to TablePagination. */
  pageSizeOptions?: number[];
  /** Row label forwarded to TablePagination, e.g. "orders", "users". */
  noun?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => React.Key;
  /** Renders skeleton rows in place of data (same column count). */
  isLoading?: boolean;
  /** Number of skeleton rows while loading. Default 5. */
  loadingRowCount?: number;
  /**
   * Content for the empty state — a single row spanning every column.
   * Defaults to a neutral "Nothing here yet." message.
   */
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Row classes: a static string or a per-row function (e.g. selection). */
  rowClassName?: string | ((row: T) => string);
  /**
   * Extra attributes for each body row, e.g. `data-testid` hooks a page's
   * tests read off the `<tr>`, or `aria-selected` on selectable rows.
   * Attributes land on the row element as given; `className` is merged with
   * the standard row classes (and `rowClassName`), and an `onClick` here
   * composes with `onRowClick` — both fire, neither replaces the other.
   */
  getRowProps?: (
    row: T,
    index: number,
  ) => React.HTMLAttributes<HTMLTableRowElement> & Record<`data-${string}`, string | undefined>;
  /**
   * When provided, the shared TablePagination footer renders below the table.
   * DataTable is presentational about paging: it forwards the flat
   * page/pageSize/total props through an adapter to TablePagination, which
   * speaks `UsePaginationResult`.
   */
  pagination?: DataTablePagination;
  /** Visually hidden `<caption>` for the table. */
  caption?: React.ReactNode;
  /** Accessible name for the table (the admin pages' existing convention). */
  ariaLabel?: string;
  className?: string;
}

const alignClass = (align: DataTableColumn<unknown>['align']): string =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

/**
 * DataTable — the shared semantic table for record lists.
 *
 * Styling reproduces the admin console's hand-rolled tables exactly
 * (slate header band, `py-3 px-4` cells, row hairlines, hover wash), so a
 * page can swap its local `<table>` for DataTable without a visual change.
 * Sorting is deliberately NOT built in: no current page offers header
 * sorting, and v1 stays a faithful render of what the pages already do.
 * Pagination composes the existing TablePagination rather than replacing it.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  loadingRowCount = 5,
  emptyState,
  onRowClick,
  rowClassName,
  getRowProps,
  pagination,
  caption,
  ariaLabel,
  className,
}: DataTableProps<T>) {
  const paginationModel = React.useMemo<UsePaginationResult<T> | null>(() => {
    if (!pagination) return null;
    const { page, pageSize, totalItems, onPageChange, onPageSizeChange } = pagination;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    return {
      page,
      setPage: onPageChange,
      pageSize,
      setPageSize: (size: number) => {
        onPageSizeChange?.(size);
        onPageChange(1);
      },
      total: totalItems,
      totalPages,
      pageItems: rows,
      from: totalItems === 0 ? 0 : (page - 1) * pageSize + 1,
      to: Math.min(page * pageSize, totalItems),
    };
  }, [pagination, rows]);

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table aria-label={ariaLabel} aria-busy={isLoading || undefined} className="w-full text-left text-xs">
          {caption != null && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn('py-3 px-4', alignClass(column.align), column.headerClassName)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: loadingRowCount }, (_, rowIndex) => (
                <tr key={`loading-${rowIndex}`} aria-hidden="true">
                  {columns.map((column) => (
                    <td key={column.key} className={cn('py-3 px-4', alignClass(column.align))}>
                      <div className="h-3.5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <div className="px-4 py-10 text-center text-xs text-slate-500">
                      Nothing here yet.
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const {
                  className: rowPropClassName,
                  onClick: rowPropOnClick,
                  ...rowAttributes
                } = getRowProps?.(row, index) ?? {};
                const handleClick =
                  onRowClick || rowPropOnClick
                    ? (event: React.MouseEvent<HTMLTableRowElement>) => {
                        rowPropOnClick?.(event);
                        onRowClick?.(row);
                      }
                    : undefined;
                return (
                  <tr
                    key={getRowKey(row)}
                    {...rowAttributes}
                    onClick={handleClick}
                    className={cn(
                      'hover:bg-slate-50/60 transition-colors',
                      (onRowClick || rowPropOnClick) && 'cursor-pointer',
                      rowPropClassName,
                      typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn('py-3 px-4', alignClass(column.align), column.className)}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {paginationModel && pagination && (
        <TablePagination
          pagination={paginationModel}
          noun={pagination.noun}
          pageSizeOptions={pagination.pageSizeOptions}
        />
      )}
    </div>
  );
}

DataTable.displayName = 'DataTable';
