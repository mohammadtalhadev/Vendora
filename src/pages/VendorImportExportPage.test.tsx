import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorImportExportPage } from './VendorImportExportPage';

describe('VendorImportExportPage component', () => {
  it('renders importer, drag-and-drop zone, template download button, and column mapping wizard', () => {
    render(
      <MemoryRouter>
        <VendorImportExportPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Bulk Catalog Import & Export/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Download catalog_template\.csv/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop catalog spreadsheet here/i)).toBeInTheDocument();
    expect(screen.getByText(/Column Mapping Wizard Preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Matched 100% \(7\/7 Fields\)/i)).toBeInTheDocument();
  });

  it('renders validation preview table with sample simulated rows and warnings', () => {
    render(
      <MemoryRouter>
        <VendorImportExportPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Apex Pro Magnetic Keyboard')).toBeInTheDocument();
    expect(screen.getByText('AudioPulse Studio Pro Headphones')).toBeInTheDocument();
    expect(screen.getByText(/Row 4: Stock must be a positive integer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Process & Import 24 Products/i })).toBeInTheDocument();
  });

  it('filters validation rows by status', () => {
    render(
      <MemoryRouter>
        <VendorImportExportPage />
      </MemoryRouter>
    );

    const warningsFilterBtn = screen.getByRole('button', { name: /Warnings \(2\)/i });
    fireEvent.click(warningsFilterBtn);

    expect(screen.getByText('Aura Linear Mechanical Switches (90x)')).toBeInTheDocument();
    expect(screen.queryByText('Apex Pro Magnetic Keyboard')).not.toBeInTheDocument();

    const validFilterBtn = screen.getByRole('button', { name: /Valid \(22\)/i });
    fireEvent.click(validFilterBtn);

    expect(screen.getByText('Apex Pro Magnetic Keyboard')).toBeInTheDocument();
    expect(screen.queryByText('Aura Linear Mechanical Switches (90x)')).not.toBeInTheDocument();
  });

  it('triggers process and import progress and shows success completion banner', async () => {
    render(
      <MemoryRouter>
        <VendorImportExportPage />
      </MemoryRouter>
    );

    const importBtn = screen.getByRole('button', { name: /Process & Import 24 Products/i });
    fireEvent.click(importBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Catalog Import Finished!/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('switches to Catalog Exporter tab and displays category/status filters', () => {
    render(
      <MemoryRouter>
        <VendorImportExportPage />
      </MemoryRouter>
    );

    const exporterTab = screen.getByRole('button', { name: /Catalog Exporter/i });
    fireEvent.click(exporterTab);

    expect(screen.getByText(/Export Catalog Inventory/i)).toBeInTheDocument();
    expect(screen.getByText(/Filter by Category/i)).toBeInTheDocument();
    expect(screen.getByText(/Filter by Status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Catalog \(CSV\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Catalog \(Excel\)/i })).toBeInTheDocument();
  });
});
