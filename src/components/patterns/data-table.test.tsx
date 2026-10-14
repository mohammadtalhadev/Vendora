import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './data-table';

interface Row {
  id: string;
  name: string;
  total: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'total', header: 'Total', align: 'right', cell: (row) => `$${row.total}` },
];

const rows: Row[] = [
  { id: 'r1', name: 'Alpha', total: 10 },
  { id: 'r2', name: 'Beta', total: 20 },
];

describe('DataTable pattern', () => {
  it('renders headers and cells in a semantic table', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} ariaLabel="Things" />);
    expect(screen.getByRole('table', { name: 'Things' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveClass('text-right');
    expect(screen.getByRole('cell', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$20' })).toBeInTheDocument();
  });

  it('keys rows through getRowKey', () => {
    const getRowKey = vi.fn((r: Row) => r.id);
    render(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} />);
    expect(getRowKey).toHaveBeenCalledTimes(rows.length);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 body rows
  });

  it('renders the default empty state spanning all columns', () => {
    render(<DataTable columns={columns} rows={[]} getRowKey={(r) => r.id} />);
    const cell = screen.getByText('Nothing here yet.');
    expect(cell).toBeInTheDocument();
    expect(cell.closest('td')).toHaveAttribute('colspan', '2');
  });

  it('renders a custom empty state', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        emptyState={<div>No orders match these filters.</div>}
      />,
    );
    expect(screen.getByText('No orders match these filters.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet.')).not.toBeInTheDocument();
  });

  it('renders skeleton rows while loading instead of data', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} isLoading loadingRowCount={3} />,
    );
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    const skeletonBars = container.querySelectorAll('.animate-pulse');
    expect(skeletonBars).toHaveLength(3 * columns.length);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders TablePagination and forwards page changes', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        pagination={{ page: 1, pageSize: 10, totalItems: 25, onPageChange, noun: 'things' }}
      />,
    );
    expect(screen.getByText(/of 25 things/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('fires onRowClick with the row', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} onRowClick={onRowClick} />,
    );
    fireEvent.click(screen.getByRole('cell', { name: 'Beta' }));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it('applies getRowProps attributes and classes to the matching rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        getRowProps={(row, index) => ({
          'data-testid': `row-${row.id}`,
          'aria-selected': index === 0,
          className: index === 0 ? 'bg-slate-50' : undefined,
        })}
      />,
    );
    const first = screen.getByTestId('row-r1');
    expect(first.tagName).toBe('TR');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(first).toHaveClass('bg-slate-50');
    const second = screen.getByTestId('row-r2');
    expect(second).toHaveAttribute('aria-selected', 'false');
    expect(second).not.toHaveClass('bg-slate-50');
  });

  it('sorts by a column sortValue when its header is clicked, toggling direction', () => {
    const sortableColumns: DataTableColumn<Row>[] = [
      { key: 'name', header: 'Name', cell: (row) => row.name, sortValue: (row) => row.name },
      { key: 'total', header: 'Total', align: 'right', cell: (row) => `$${row.total}`, sortValue: (row) => row.total },
    ];
    const sortableRows: Row[] = [
      { id: 'r1', name: 'Charlie', total: 30 },
      { id: 'r2', name: 'Alpha', total: 10 },
      { id: 'r3', name: 'Beta', total: 20 },
    ];
    render(<DataTable columns={sortableColumns} rows={sortableRows} getRowKey={(r) => r.id} />);
    const bodyOrder = () =>
      screen.getAllByRole('row').slice(1).map((tr) => tr.querySelector('td')?.textContent);
    expect(bodyOrder()).toEqual(['Charlie', 'Alpha', 'Beta']);

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Total' }));
    expect(bodyOrder()).toEqual(['Alpha', 'Beta', 'Charlie']);
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Total' }));
    expect(bodyOrder()).toEqual(['Charlie', 'Beta', 'Alpha']);
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
    expect(bodyOrder()).toEqual(['Alpha', 'Beta', 'Charlie']);
  });

  it('sinks null sort values to the end in both directions', () => {
    const nullableColumns: DataTableColumn<Row & { due: number | null }>[] = [
      { key: 'name', header: 'Name', cell: (row) => row.name },
      {
        key: 'due',
        header: 'Due',
        cell: (row) => (row.due === null ? '—' : String(row.due)),
        sortValue: (row) => row.due,
      },
    ];
    const nullableRows = [
      { id: 'r1', name: 'Alpha', total: 10, due: null },
      { id: 'r2', name: 'Beta', total: 20, due: 5 },
      { id: 'r3', name: 'Charlie', total: 30, due: 1 },
    ];
    render(<DataTable columns={nullableColumns} rows={nullableRows} getRowKey={(r) => r.id} />);
    const bodyOrder = () =>
      screen.getAllByRole('row').slice(1).map((tr) => tr.querySelector('td')?.textContent);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Due' }));
    expect(bodyOrder()).toEqual(['Charlie', 'Beta', 'Alpha']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Due' }));
    expect(bodyOrder()).toEqual(['Beta', 'Charlie', 'Alpha']);
  });

  it('leaves columns without a sortValue as plain headers', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(screen.queryByRole('button', { name: /Sort by/ })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort');
  });

  it('composes a getRowProps onClick with onRowClick instead of replacing it', () => {
    const rowPropClick = vi.fn();
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        onRowClick={onRowClick}
        getRowProps={() => ({ onClick: rowPropClick })}
      />,
    );
    const row = screen.getByRole('cell', { name: 'Beta' }).closest('tr');
    expect(row).toHaveClass('cursor-pointer');
    fireEvent.click(screen.getByRole('cell', { name: 'Beta' }));
    expect(rowPropClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });
});
