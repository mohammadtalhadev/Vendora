import React, { useMemo, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { exportToCsv } from '../lib/export-csv';
import { useCategories } from '../features/catalog/hooks/useProducts';
import {
  useCreateVendorProduct,
  useVendorProducts,
} from '../features/vendor/hooks/useVendorProducts';
import type { Product } from '../types/domain';

/**
 * The columns this page understands. It is deliberately a short list: only the fields a
 * seller's insert policy accepts can be imported, and Vendora listings have no SKU column,
 * so the sheet's SKUs stay in the seller's own spreadsheet.
 */
const TEMPLATE_HEADERS = ['title', 'description', 'category', 'brand', 'price', 'stock', 'type', 'images'];

interface ImportRow {
  line: number;
  title: string;
  description: string;
  category: string;
  categoryId: string | null;
  brand: string;
  images: string[];
  price: number | null;
  stock: number;
  type: 'physical' | 'digital';
  /** Blocks the row from being imported. */
  problems: string[];
  /** Worth reading, but the row still imports. */
  notes: string[];
}

interface ImportReport {
  created: number;
  failed: { line: number; title: string; message: string }[];
  skipped: number;
}

/** Splits CSV text into cells, honouring quoted cells, doubled quotes and CRLF line ends. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = false;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') endCell();
    else if (char === '\n') endRow();
    else if (char !== '\r') cell += char;
  }
  if (cell !== '' || row.length > 0) endRow();

  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

const money = (value: string) => {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

function buildRows(text: string, categories: { id: string; name: string }[]): ImportRow[] {
  const lines = parseCsv(text);
  if (lines.length < 2) return [];

  const header = lines[0].map((name) => name.trim().toLowerCase());
  const column = (name: string) => header.indexOf(name);
  const cellOf = (line: string[], name: string) => {
    const index = column(name);
    return index === -1 ? '' : (line[index] ?? '').trim();
  };

  const byName = new Map(categories.map((entry) => [entry.name.toLowerCase(), entry.id]));

  return lines.slice(1).map((line, index) => {
    const title = cellOf(line, 'title');
    const price = money(cellOf(line, 'price'));
    const rawStock = cellOf(line, 'stock');
    const stock = rawStock === '' ? 0 : Number.parseInt(rawStock, 10);
    const rawType = cellOf(line, 'type').toLowerCase();
    const type = rawType === '' || rawType === 'physical' ? 'physical' : rawType === 'digital' ? 'digital' : null;

    const categoryName = cellOf(line, 'category');
    const categoryId = categoryName === '' ? null : byName.get(categoryName.toLowerCase()) ?? null;

    const imageCells = cellOf(line, 'images')
      .split('|')
      .map((value) => value.trim())
      .filter(Boolean);
    const images = imageCells.filter((value) => /^https?:\/\//i.test(value));

    const problems: string[] = [];
    const notes: string[] = [];

    if (title === '') problems.push('Title is required.');
    if (price === null) problems.push('Price must be a number, e.g. 49.99.');
    else if (price < 0) problems.push('Price cannot be negative.');
    if (type === null) problems.push(`Type must be "physical" or "digital" (found "${rawType}").`);
    if (Number.isNaN(stock)) problems.push(`Stock must be a whole number (found "${rawStock}").`);
    else if (stock < 0) problems.push('Stock cannot be negative.');
    if (type === 'digital' && rawStock !== '' && stock > 0) {
      notes.push('Digital listings are not stocked; this number is kept but never sold down.');
    }
    if (categoryName !== '' && categoryId === null) {
      notes.push(`No category named "${categoryName}". The listing is filed with no category.`);
    }
    if (imageCells.length !== images.length) {
      notes.push(`${imageCells.length - images.length} image value(s) dropped: only full http(s) URLs can be stored.`);
    }

    return {
      line: index + 2,
      title,
      description: cellOf(line, 'description'),
      category: categoryName,
      categoryId,
      brand: cellOf(line, 'brand'),
      images,
      price,
      stock: Number.isNaN(stock) ? 0 : stock,
      type: type ?? 'physical',
      problems,
      notes,
    };
  });
}

/** The export columns. They are the import columns plus the fields only the database sets. */
const EXPORT_COLUMNS: Record<string, string> = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  category: 'category',
  brand: 'brand',
  price: 'price',
  compare_at_price: 'compare_at_price',
  stock: 'stock',
  type: 'type',
  status: 'status',
  images: 'images',
};

const TEMPLATE_COLUMNS: Record<string, string> = Object.fromEntries(
  TEMPLATE_HEADERS.map((header) => [header, header])
);

const STATUS_LABEL: Record<Product['status'], string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  approved: 'Active',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const VendorImportExportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'blocked'>('all');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [running, setRunning] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [exportStatus, setExportStatus] = useState('all');

  const { data: categoryData } = useCategories();
  const createProduct = useCreateVendorProduct();
  const { data: catalog, isLoading: catalogLoading } = useVendorProducts();

  // Re-validated when the category list arrives, so category names resolve against real rows.
  const importRows = useMemo(
    () => buildRows(rawText, categoryData?.categories ?? []),
    [rawText, categoryData],
  );

  const readyRows = importRows.filter((row) => row.problems.length === 0);
  const blockedRows = importRows.filter((row) => row.problems.length > 0);
  const visibleRows =
    statusFilter === 'ready' ? readyRows : statusFilter === 'blocked' ? blockedRows : importRows;

  /**
   * Import-preview columns for DataTable. The Result cell is a validation
   * verdict, not a record status: the ready pill carries an icon and the
   * blocked state is an itemised problem list, neither of which StatusBadge
   * can render, so the cell markup stays as it was.
   */
  const previewColumns: DataTableColumn<(typeof visibleRows)[number]>[] = [
    {
      key: 'line',
      header: 'Line',
      sortValue: (row) => row.line,
      align: 'center',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      className: 'p-3 text-center font-mono text-slate-400',
      cell: (row) => row.line,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (row) => row.title,
      headerClassName: 'p-3 text-[11px] tracking-normal',
      className: 'p-3 font-bold text-slate-900',
      cell: (row) => (
        <>
          <div>{row.title || <span className="text-slate-400 italic">blank</span>}</div>
          {row.notes.map((note) => (
            <span key={note} className="text-[11px] font-normal text-amber-700 block mt-0.5">
              {note}
            </span>
          ))}
        </>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      className: 'p-3 text-slate-600',
      cell: (row) =>
        row.categoryId ? row.category : row.category ? `${row.category} (unmatched)` : '—',
    },
    {
      key: 'price',
      header: 'Price',
      sortValue: (row) => row.price,
      headerClassName: 'p-3 text-[11px] tracking-normal',
      className: 'p-3 font-bold text-slate-900',
      cell: (row) => (row.price === null ? '—' : `$${row.price.toFixed(2)}`),
    },
    {
      key: 'stock',
      header: 'Stock',
      sortValue: (row) => row.stock,
      headerClassName: 'p-3 text-[11px] tracking-normal',
      className: 'p-3 font-semibold text-slate-800',
      cell: (row) => row.stock,
    },
    {
      key: 'type',
      header: 'Type',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      className: 'p-3 text-slate-600',
      cell: (row) => row.type,
    },
    {
      key: 'result',
      header: 'Result',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      className: 'p-3',
      cell: (row) =>
        row.problems.length === 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Ready
          </span>
        ) : (
          <span className="inline-flex items-start gap-1 text-[10px] font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {row.problems.map((problem) => (
                <span key={problem} className="block">
                  {problem}
                </span>
              ))}
            </span>
          </span>
        ),
    },
  ];

  const handleFile = async (file: File | null) => {
    setReport(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setFileError(
        `${file.name} is not a .csv. Spreadsheets must be saved as CSV first - this page cannot read .xlsx.`
      );
      setRawText('');
      setFileName(file.name);
      return;
    }
    setFileError('');
    setFileName(file.name);
    const text = await file.text();
    const parsed = buildRows(text, categoryData?.categories ?? []);
    if (parsed.length === 0) {
      setFileError(
        `${file.name} has no data rows. The file needs a header line containing at least "title" and "price".`
      );
    }
    setRawText(text);
  };

  const handleImport = async () => {
    setRunning(true);
    let created = 0;
    const failed: ImportReport['failed'] = [];

    for (const row of readyRows) {
      try {
        await createProduct.mutateAsync({
          title: row.title,
          description: row.description,
          categoryId: row.categoryId,
          brand: row.brand,
          images: row.images,
          price: row.price ?? 0,
          stock: row.stock,
          type: row.type,
          status: 'pending_review',
        });
        created += 1;
      } catch (error) {
        failed.push({
          line: row.line,
          title: row.title,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    setReport({ created, failed, skipped: blockedRows.length });
    setRunning(false);
  };

  const handleTemplate = () => {
    exportToCsv(
      'catalog_template.csv',
      [
        {
          title: 'Wireless Earbuds Pro',
          description: 'Noise cancelling over-ear buds',
          category: 'Audio',
          brand: 'Apex Audio',
          price: '49.99',
          stock: '100',
          type: 'physical',
          images: 'https://example.com/earbuds-1.jpg|https://example.com/earbuds-2.jpg',
        },
        {
          title: 'Ambient Light Pack',
          description: 'Twelve scene presets, ready to drop in',
          category: '',
          brand: 'Apex Studio',
          price: '19.00',
          stock: '',
          type: 'digital',
          images: '',
        },
      ],
      TEMPLATE_COLUMNS
    );
  };

  const products = catalog ?? [];
  const exportCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const exportRows = products.filter((product) => {
    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;
    if (exportStatus !== 'all' && product.status !== exportStatus) return false;
    return true;
  });

  const handleExport = () => {
    exportToCsv(
      'catalog_export.csv',
      exportRows.map((product) => ({
        id: product.id,
        title: product.title,
        slug: product.slug,
        category: product.category,
        brand: product.brand,
        price: product.price,
        compare_at_price: product.compareAtPrice ?? '',
        stock: product.stock,
        type: product.type,
        status: product.status,
        images: product.images.join('|'),
      })),
      EXPORT_COLUMNS
    );
  };

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bulk Catalog Import &amp; Export
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Add many listings at once from a CSV, or download the catalog your store has on the marketplace.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-sun-orange text-sun-orange'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            CSV Import
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-sun-orange text-sun-orange'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Catalog Exporter
          </button>
        </div>

        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Upload & Template */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-sun-orange transition-colors relative">
                <input
                  id="catalog-file"
                  key={fileName || 'empty'}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-sun-orange mb-3">
                  <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{fileName || 'Choose a catalog CSV'}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  One row per listing. Nothing is written until you press Import.
                </p>
                <span className="inline-block mt-3 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">
                  Format: .csv only
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between text-xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Catalog Template</h4>
                  <p className="text-slate-500 leading-relaxed">
                    Columns: {TEMPLATE_HEADERS.join(', ')}. Only title and price are required.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTemplate}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download catalog_template.csv
                </button>
              </div>
            </div>

            {fileError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3 items-start text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <p>{fileError}</p>
              </div>
            )}

            {report && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {report.created} {report.created === 1 ? 'listing' : 'listings'} created
                    </h3>
                    <p className="text-slate-500">
                      They are in your Pending review queue now. Moderation - not this page - decides when they go live.
                    </p>
                  </div>
                </div>

                {report.failed.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2 text-rose-900">
                    <p className="font-bold">
                      {report.failed.length} row{report.failed.length === 1 ? '' : 's'} could not be imported:
                    </p>
                    <ul className="space-y-1">
                      {report.failed.map((entry) => (
                        <li key={entry.line}>
                          <span className="font-mono">Line {entry.line}</span> — {entry.title}: {entry.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.skipped > 0 && (
                  <p className="text-slate-500">
                    {report.skipped} row{report.skipped === 1 ? ' was' : 's were'} held back by validation errors.
                    Fix them in the sheet and import again - the created listings are not repeated, because this
                    page cannot tell your file from what you already uploaded.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setRawText('');
                    setFileName('');
                    setStatusFilter('all');
                  }}
                  className="rounded-xl bg-sun-orange px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sun-orange-600 cursor-pointer"
                >
                  Import another file
                </button>
              </div>
            )}

            {!report && importRows.length > 0 && (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Validation preview</h3>
                      <p className="text-slate-500 text-[11px]">
                        {readyRows.length} of {importRows.length} rows from {fileName} are ready.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                        {(['all', 'ready', 'blocked'] as const).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter(key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                              statusFilter === key
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {key} ({key === 'all' ? importRows.length : key === 'ready' ? readyRows.length : blockedRows.length})
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleImport()}
                        disabled={running || readyRows.length === 0}
                        className="flex items-center gap-2 rounded-full bg-sun-orange px-6 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-orange-glow hover:bg-sun-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {running ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Importing {readyRows.length} listings...
                          </>
                        ) : (
                          <>
                            <span>
                              Import {readyRows.length} {readyRows.length === 1 ? 'listing' : 'listings'}
                            </span>
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <DataTable
                    columns={previewColumns}
                    rows={visibleRows}
                    getRowKey={(row) => row.line}
                    rowClassName="align-top"
                    emptyState={
                      <div className="space-y-2 px-4 py-10 text-center">
                        <FileSpreadsheet
                          className="mx-auto h-8 w-8 text-slate-300"
                          aria-hidden="true"
                        />
                        <div className="text-sm font-bold text-slate-900">
                          No rows in this view
                        </div>
                        <p className="mx-auto max-w-md text-xs text-slate-500">
                          {statusFilter === 'ready'
                            ? 'No row in this file passes validation yet. Switch to Blocked to see what each row needs, or fix the sheet and upload it again.'
                            : statusFilter === 'blocked'
                              ? 'Nothing in this file is blocked — every row passes validation. Switch to Ready or All rows to see them.'
                              : 'This file produced no data rows to preview. Check that the sheet has a header row and at least one listing under it.'}
                        </p>
                      </div>
                    }
                  />
                </div>
              </>
            )}

            {!report && importRows.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-900">
                  <Info className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                  <h3 className="text-sm font-bold">What an import does here</h3>
                </div>
                <ul className="space-y-1.5 text-slate-500 list-disc pl-5">
                  <li>Each ready row becomes a real listing owned by your store, sent straight to the Pending review queue.</li>
                  <li>Rows are imported one at a time. If line 9 fails, lines 1-8 stay imported.</li>
                  <li>Slugs are generated from the title; two identical titles collide and the second one is refused.</li>
                  <li>Listings don&apos;t carry SKUs — keep your SKUs in your own sheet.</li>
                  <li>Images must already be hosted at a public https URL - a CSV cannot upload files.</li>
                  <li>Price, stock and category come from your sheet, so double-check them before importing.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 text-xs max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Export catalog inventory</h3>
              <p className="text-slate-500">
                {catalogLoading
                  ? 'Loading your listings...'
                  : `Your store has ${products.length} listing${products.length === 1 ? '' : 's'}. ${exportRows.length} match the filters below.`}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="filter-by-category" className="block font-bold text-slate-700 mb-1">
                  Filter by Category
                </label>
                <select
                  id="filter-by-category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="native-select w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50"
                >
                  <option value="all">All categories ({products.length})</option>
                  {exportCategories.map((name) => (
                    <option key={name} value={name}>
                      {name} ({products.filter((p) => p.category === name).length})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-by-status" className="block font-bold text-slate-700 mb-1">
                  Filter by Status
                </label>
                <select
                  id="filter-by-status"
                  value={exportStatus}
                  onChange={(event) => setExportStatus(event.target.value)}
                  className="native-select w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50"
                >
                  <option value="all">All statuses ({products.length})</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label} ({products.filter((p) => p.status === value).length})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={exportRows.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 font-bold cursor-pointer transition-colors"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export {exportRows.length} {exportRows.length === 1 ? 'listing' : 'listings'} (CSV)
              </button>

              <p className="text-slate-400">
                The CSV opens in Excel and Google Sheets. This page writes .csv only - it does not produce a
                native .xlsx, and an export never deletes or changes anything.
              </p>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
