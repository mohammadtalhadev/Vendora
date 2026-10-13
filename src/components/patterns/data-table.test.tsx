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
});
