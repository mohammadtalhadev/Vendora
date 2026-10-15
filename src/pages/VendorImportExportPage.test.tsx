import { describe, it, expect, beforeEach, vi } from 'vitest';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
vi.mock('../lib/auth-context', async () => {
  const { useAuthStub } = await import('../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { VendorImportExportPage } from './VendorImportExportPage';
import { renderWorkspace, signInVendor } from '../test/vendor-render';
import { categoryRow, productRow, supabaseDouble } from '../test/supabase-double';

const HEADER = 'title,description,category,brand,price,stock,type,images';

/** jsdom has no Blob URLs, so the download is captured instead of navigated to. */
function captureDownloads() {
  const blobs: Blob[] = [];
  URL.createObjectURL = (blob: Blob) => {
    blobs.push(blob);
    return 'blob:captured';
  };
  URL.revokeObjectURL = () => {};
  return blobs;
}

function chooseFile(name: string, content: string) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File([content], name, { type: 'text/csv' })] } });
}

beforeEach(() => {
  supabaseDouble.reset();
  signInVendor();
  supabaseDouble.seedCategory(categoryRow({ id: 'cat-audio', name: 'Audio' }));
  supabaseDouble.seedCategory(categoryRow({ id: 'cat-keys', name: 'Keyboards' }));
});

describe('VendorImportExportPage import', () => {
  it('starts with no rows and explains what an import actually does', () => {
    renderWorkspace(<VendorImportExportPage />);

    expect(screen.getByText('Choose a catalog CSV')).toBeInTheDocument();
    expect(screen.getByText(/Each ready row becomes a real listing owned by your store/)).toBeInTheDocument();
    expect(screen.getByText(/Listings don.t carry SKUs/)).toBeInTheDocument();
    // Nothing is invented to fill the preview.
    expect(screen.queryByText('Apex Pro Magnetic Keyboard')).not.toBeInTheDocument();
    expect(screen.queryByText(/Auto-Matched 100%/)).not.toBeInTheDocument();
  });

  it('imports the ready rows as pending-review listings owned by this store', async () => {
    renderWorkspace(<VendorImportExportPage />);
    chooseFile(
      'catalog.csv',
      [
        HEADER,
        'Apex Keyboard,tactile switches,Audio,Apex,179.99,45,physical,https://cdn.test/kb.jpg',
        'Studio Mic,condenser capsule,Keyboards,Apex,"$1,299.50",20,physical,',
        'Ghost Item,,,Apex,,,digital,',
      ].join('\n')
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /ready \(2\)/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /blocked \(1\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Price must be a number/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Import 2 listings/i }));

    await waitFor(() => expect(screen.getByText(/2 listings created/i)).toBeInTheDocument());
    expect(screen.getByText(/1 row was held back by validation errors/i)).toBeInTheDocument();
    expect(supabaseDouble.tables.products).toHaveLength(2);
    expect(supabaseDouble.tables.products[0]).toMatchObject({
      title: 'Apex Keyboard',
      slug: 'apex-keyboard',
      seller_id: 'store-1',
      category_id: 'cat-audio',
      price: 179.99,
      stock: 45,
      status: 'pending_review',
    });
    expect(supabaseDouble.tables.products[1]).toMatchObject({
      title: 'Studio Mic',
      // The quoted cell kept its comma, and the currency symbols parsed out of the price.
      price: 1299.5,
      category_id: 'cat-keys',
      images: [],
    });
  });

  it('files an unmatched category with none and says so, rather than guessing', async () => {
    renderWorkspace(<VendorImportExportPage />);
    chooseFile(
      'catalog.csv',
      [HEADER, 'Desk Lamp,LED,Lighting,Apex,42.00,10,physical,relative/path.jpg'].join('\n')
    );

    await waitFor(() => expect(screen.getByText(/No category named "Lighting"/)).toBeInTheDocument());
    expect(screen.getByText(/1 image value\(s\) dropped/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Import 1 listing/i }));
    await waitFor(() => expect(screen.getByText(/1 listing created/i)).toBeInTheDocument());
    expect(supabaseDouble.tables.products[0]).toMatchObject({ category_id: null, images: [] });
  });

  it('refuses a spreadsheet that is not CSV instead of importing invented rows', async () => {
    renderWorkspace(<VendorImportExportPage />);
    chooseFile('catalog.xlsx', 'this is not really a sheet');

    await waitFor(() => expect(screen.getByText(/cannot read \.xlsx/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Import \d+ listings/i })).not.toBeInTheDocument();
    expect(supabaseDouble.tables.products).toHaveLength(0);
  });

  it('refuses a file with no data rows', async () => {
    renderWorkspace(<VendorImportExportPage />);
    chooseFile('empty.csv', HEADER);

    await waitFor(() => expect(screen.getByText(/has no data rows/i)).toBeInTheDocument());
    expect(supabaseDouble.tables.products).toHaveLength(0);
  });

  it('reports the rows the database refused instead of claiming a clean import', async () => {
    supabaseDouble.failures.products = 'new row violates row-level security policy';
    renderWorkspace(<VendorImportExportPage />);
    chooseFile('catalog.csv', [HEADER, 'Apex Keyboard,,Audio,Apex,179.99,45,physical,'].join('\n'));

    await waitFor(() => expect(screen.getByRole('button', { name: /Import 1 listing/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Import 1 listing/i }));

    await waitFor(() => expect(screen.getByText(/0 listings created/i)).toBeInTheDocument());
    expect(screen.getByText(/row-level security/i)).toBeInTheDocument();
    expect(supabaseDouble.tables.products).toHaveLength(0);
  });
});

describe('VendorImportExportPage export', () => {
  it('exports only this store’s listings, filtered by the real category and status', async () => {
    supabaseDouble.seedProduct(
      productRow({ id: 'p-1', seller_id: 'store-1', title: 'Reference Headphones', category_id: 'cat-audio', status: 'approved' }),
    );
    supabaseDouble.seedProduct(
      productRow({ id: 'p-2', seller_id: 'store-1', title: 'Apex Keyboard', category_id: 'cat-keys', status: 'draft', price: 179.99 }),
    );
    supabaseDouble.seedProduct(productRow({ id: 'p-3', seller_id: 'store-2', title: 'Another store item' }));
    const blobs = captureDownloads();

    renderWorkspace(<VendorImportExportPage />);
    fireEvent.click(screen.getByRole('button', { name: /Catalog Exporter/i }));

    await waitFor(() => expect(screen.getByText(/Your store has 2 listings/)).toBeInTheDocument());
    expect(screen.getByRole('option', { name: /Keyboards \(1\)/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by Status'), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: /Export 1 listing \(CSV\)/i }));

    const csv = await blobs[0].text();
    const [header, ...body] = csv.split('\r\n');
    expect(header).toBe('"id","title","slug","category","brand","price","compare_at_price","stock","type","status","images"');
    expect(body).toHaveLength(1);
    expect(body[0]).toContain('"Apex Keyboard"');
    expect(body[0]).toContain('"draft"');
    expect(csv).not.toContain('Reference Headphones');
    expect(csv).not.toContain('Another store item');
  });

  it('disables the export when the store has nothing to export', async () => {
    captureDownloads();
    renderWorkspace(<VendorImportExportPage />);
    fireEvent.click(screen.getByRole('button', { name: /Catalog Exporter/i }));

    await waitFor(() => expect(screen.getByText(/Your store has 0 listings/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Export 0 listings \(CSV\)/i })).toBeDisabled();
  });
});
