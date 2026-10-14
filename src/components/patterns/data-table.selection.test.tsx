import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './data-table';

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [{ key: 'name', header: 'Name', cell: (row) => row.name }];

const rows: Row[] = [
  { id: 'r1', name: 'Alpha' },
  { id: 'r2', name: 'Beta' },
];

describe('DataTable selection (Batch 40)', () => {
  it('renders no checkbox column when selection props are absent', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />,
    );
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('toggles a single row through onSelectionChange', () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3); // header + 2 rows
    fireEvent.click(boxes[2]);
    expect(onSelectionChange).toHaveBeenCalledWith(['r2']);
  });

  it('header checkbox selects every rendered row, then deselects them', () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(onSelectionChange).toHaveBeenCalledWith(['r1', 'r2']);

    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        selectedIds={['r1', 'r2']}
        onSelectionChange={onSelectionChange}
      />,
    );
    const header = screen.getByRole('checkbox', { name: 'Select all rows on this page' });
    expect(header).toBeChecked();
    fireEvent.click(header);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it('uses getRowId for selection bookkeeping when provided', () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        getRowId={(r) => `id:${r.id}`}
        selectedIds={['id:r1']}
        onSelectionChange={onSelectionChange}
      />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes[1]).toBeChecked();
    expect(boxes[2]).not.toBeChecked();
    fireEvent.click(boxes[1]);
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('empty state still spans every column including the checkbox column', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        selectedIds={[]}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Nothing here yet.').closest('td')).toHaveAttribute('colspan', '2');
  });
});
