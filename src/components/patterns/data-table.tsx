import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
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
  /**
   * Opt-in sorting: when provided, the header becomes a sort
   * button and clicking it sorts the rendered rows by this value, toggling
   * ascending/descending. Sorting is client-side over the rows the page
   * handed in — a paginated page sorts the page it rendered, it does not
   * reach back for the full result set. Rows whose value is null/undefined
   * always sink to the end, in both directions. Columns without a
   * `sortValue` render exactly as before.
   */
  sortValue?: (row: T) => string | number | null | undefined;
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
   * Optional row selection. When `onSelectionChange` is provided, a checkbox
   * column is prepended: one checkbox per row plus a header checkbox that
   * selects/deselects the rows currently rendered (the page, when paginated;
   * indeterminate when only part of the page is selected). Rows carry
   * `aria-selected` while selection is on. Selection is fully controlled —
   * `selectedIds` holds the ids of the selected rows as produced by
   * `getRowId` (default: `getRowKey`); `selectionLabel` names each row's
   * checkbox. Pages that do not pass these props render exactly as before.
   */
  selectedIds?: readonly string[];
  /** Called with the full next selection whenever a checkbox changes. */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Row id used for selection bookkeeping. Defaults to `String(getRowKey(row))`. */
  getRowId?: (row: T) => string;
  /** Accessible name for a row's checkbox. Defaults to `Select row`. */
  selectionLabel?: (row: T) => string;
  /**
   * Optional per-row selectability. Rows it returns false for render a
   * disabled checkbox and are excluded from the header select-all toggle —
   * for rows an action must never target (e.g. the signed-in admin's own
   * account row in a bulk suspend list).
   */
  isRowSelectable?: (row: T) => boolean;
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
 * Sorting is opt-in per column via `sortValue`: the sort state
 * lives here, uncontrolled, because every current page wants the same
 * click-to-toggle behaviour over the rows it rendered. Pagination composes
 * the existing TablePagination rather than replacing it.
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
  selectedIds,
  onSelectionChange,
  getRowId,
  selectionLabel,
  isRowSelectable,
  pagination,
  caption,
  ariaLabel,
  className,
}: DataTableProps<T>) {
  const selectionEnabled = Boolean(onSelectionChange);
  const rowIdOf = React.useCallback(
    (row: T): string => (getRowId ? getRowId(row) : String(getRowKey(row))),
    [getRowId, getRowKey],
  );
  const selectedSet = React.useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  // Opt-in column sorting. State is a single (key, direction) pair; the
  // sorted array is a stable copy, so equal values keep the page's own
  // order and the caller's `rows` array is never mutated.
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sortValue) return rows;
    const { sortValue } = column;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aValue = sortValue(a);
      const bValue = sortValue(b);
      // Empty values sink to the end in both directions: "no date recorded"
      // is not the smallest date, it is the absence of one.
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      const compared =
        typeof aValue === 'number' && typeof bValue === 'number'
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      return compared * factor;
    });
  }, [rows, columns, sort]);

  const toggleSort = (column: DataTableColumn<T>) => {
    setSort((current) =>
      current?.key === column.key
        ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: 'asc' },
    );
  };

  // Only computed when selection is on: with it off, DataTable must not call
  // getRowKey any more often than it did before selection existed.
  // Select-all only ever covers rows that may be selected; a non-selectable
  // row (isRowSelectable false) is never swept into a bulk action.
  const selectableRenderedIds = React.useMemo(
    () =>
      selectionEnabled
        ? sortedRows
            .filter((row) => !isRowSelectable || isRowSelectable(row))
            .map(rowIdOf)
        : [],
    [selectionEnabled, sortedRows, rowIdOf, isRowSelectable],
  );
  const allRenderedSelected =
    selectableRenderedIds.length > 0 &&
    selectableRenderedIds.every((id) => selectedSet.has(id));
  const someRenderedSelected =
    !allRenderedSelected && selectableRenderedIds.some((id) => selectedSet.has(id));
  const columnCount = columns.length + (selectionEnabled ? 1 : 0);

  const toggleRowSelection = (row: T) => {
    if (!onSelectionChange) return;
    if (isRowSelectable && !isRowSelectable(row)) return;
    const id = rowIdOf(row);
    onSelectionChange(
      selectedSet.has(id)
        ? (selectedIds ?? []).filter((selected) => selected !== id)
        : [...(selectedIds ?? []), id],
    );
  };

  const toggleRenderedSelection = () => {
    if (!onSelectionChange) return;
    onSelectionChange(
      allRenderedSelected
        ? (selectedIds ?? []).filter((selected) => !selectableRenderedIds.includes(selected))
        : Array.from(new Set([...(selectedIds ?? []), ...selectableRenderedIds])),
    );
  };
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
      pageItems: sortedRows,
      from: totalItems === 0 ? 0 : (page - 1) * pageSize + 1,
      to: Math.min(page * pageSize, totalItems),
    };
  }, [pagination, sortedRows]);

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table aria-label={ariaLabel} aria-busy={isLoading || undefined} className="w-full text-left text-xs">
          {caption != null && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500">
            <tr>
              {selectionEnabled && (
                <th scope="col" className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allRenderedSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someRenderedSelected;
                    }}
                    onChange={toggleRenderedSelection}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                </th>
              )}
              {columns.map((column) => {
                const sortable = column.sortValue != null;
                const isSorted = sortable && sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn('py-3 px-4', alignClass(column.align), column.headerClassName)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        aria-label={`Sort by ${typeof column.header === 'string' ? column.header : column.key}`}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1 uppercase tracking-inherit transition-colors hover:text-slate-900',
                          column.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown
                            className="h-3 w-3 shrink-0 text-slate-300"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          {/* data-table-rows: body rows fade in on mount with
              the capped stagger defined in base.css; opacity-only, so
              row hover/selection rendering is untouched. */}
          <tbody className="divide-y divide-slate-100 data-table-rows">
            {isLoading ? (
              Array.from({ length: loadingRowCount }, (_, rowIndex) => (
                <tr key={`loading-${rowIndex}`} aria-hidden="true">
                  {selectionEnabled && (
                    <td className="py-3 px-4 w-10">
                      <div className="h-3.5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className={cn('py-3 px-4', alignClass(column.align))}>
                      <div className="h-3.5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-0">
                  {emptyState ?? (
                    <div className="px-4 py-10 text-center text-xs text-slate-500">
                      Nothing here yet.
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => {
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
                    aria-selected={
                      selectionEnabled ? selectedSet.has(rowIdOf(row)) : undefined
                    }
                    {...rowAttributes}
                    onClick={handleClick}
                    className={cn(
                      'hover:bg-slate-50/60 transition-colors',
                      (onRowClick || rowPropOnClick) && 'cursor-pointer',
                      rowPropClassName,
                      typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
                    )}
                  >
                    {selectionEnabled && (
                      <td className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          aria-label={selectionLabel ? selectionLabel(row) : 'Select row'}
                          checked={selectedSet.has(rowIdOf(row))}
                          disabled={isRowSelectable ? !isRowSelectable(row) : undefined}
                          onChange={() => toggleRowSelection(row)}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                    )}
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
