import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Check,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';

interface ValidationRow {
  row: number;
  title: string;
  sku: string;
  category: string;
  price: string;
  stock: string;
  status: 'valid' | 'warning';
  message?: string;
}

const SAMPLE_ROWS: ValidationRow[] = [
  { row: 1, title: 'Apex Pro Magnetic Keyboard', sku: 'APX-KB-01', category: 'Keyboards', price: '$179.99', stock: '45', status: 'valid' },
  { row: 2, title: 'AudioPulse Studio Pro Headphones', sku: 'APX-HP-02', category: 'Audio', price: '$199.50', stock: '30', status: 'valid' },
  { row: 3, title: 'Minimalist Felt Desk Mat', sku: 'APX-DM-03', category: 'Accessories', price: '$29.00', stock: '85', status: 'valid' },
  { row: 4, title: 'Aura Linear Mechanical Switches (90x)', sku: 'APX-SW-04', category: 'Components', price: '$35.00', stock: '-2', status: 'warning', message: 'Row 4: Stock must be a positive integer' },
  { row: 5, title: 'ErgoPrecision Wireless Mouse', sku: 'APX-MS-05', category: 'Mice', price: '$79.99', stock: '60', status: 'valid' },
  { row: 6, title: 'Braided Coiled Aviator Cable', sku: 'APX-CB-06', category: 'Cables', price: '$24.99', stock: '120', status: 'valid' },
  { row: 7, title: 'Aluminum Dual Laptop Stand', sku: 'APX-ST-07', category: 'Stands', price: '$49.99', stock: '25', status: 'valid' },
  { row: 8, title: 'Studio USB Condenser Microphone', sku: 'APX-MC-08', category: 'Audio', price: '$89.00', stock: '40', status: 'valid' },
  { row: 9, title: 'ScreenBar Monitor Light Bar', sku: 'APX-LB-09', category: 'Lighting', price: '$59.99', stock: '35', status: 'valid' },
  { row: 10, title: '10-in-1 USB-C Docking Hub', sku: 'APX-DK-10', category: 'Hubs', price: '$69.99', stock: '50', status: 'valid' },
  { row: 11, title: '4K UltraHD Streaming Webcam', sku: 'APX-WC-11', category: 'Cameras', price: '$99.99', stock: '18', status: 'valid' },
  { row: 12, title: 'Custom Keycap Puller Tool', sku: 'APX-TL-12', category: 'Tools', price: '$9.99', stock: '0', status: 'warning', message: 'Row 12: Zero stock listed for physical item' },
  { row: 13, title: 'PBT Double-Shot Keycaps Set (130-keys)', sku: 'APX-KC-13', category: 'Keycaps', price: '$45.00', stock: '55', status: 'valid' },
  { row: 14, title: 'Wrist Rest Ergonomic Memory Foam', sku: 'APX-WR-14', category: 'Accessories', price: '$18.99', stock: '90', status: 'valid' },
  { row: 15, title: 'Cable Management Routing Clips (6-pk)', sku: 'APX-CM-15', category: 'Accessories', price: '$12.50', stock: '150', status: 'valid' },
  { row: 16, title: 'Noise Isolating Ear Tips (3 Pairs)', sku: 'APX-ET-16', category: 'Accessories', price: '$14.99', stock: '80', status: 'valid' },
  { row: 17, title: 'Microfiber Cleaning Cloth Multi-Pack', sku: 'APX-CL-17', category: 'Maintenance', price: '$8.99', stock: '200', status: 'valid' },
  { row: 18, title: 'Under-Desk Headphone Mount', sku: 'APX-HM-18', category: 'Mounts', price: '$16.50', stock: '65', status: 'valid' },
  { row: 19, title: 'Compact 65% Wooden Keyboard Case', sku: 'APX-CS-19', category: 'Cases', price: '$65.00', stock: '15', status: 'valid' },
  { row: 20, title: 'Braided Audio Extension Cable 2m', sku: 'APX-EX-20', category: 'Cables', price: '$11.99', stock: '110', status: 'valid' },
  { row: 21, title: 'RGB Desk Lamp with Qi Charger', sku: 'APX-DL-21', category: 'Lighting', price: '$42.00', stock: '28', status: 'valid' },
  { row: 22, title: 'Sound Dampening Silicone O-Rings', sku: 'APX-OR-22', category: 'Accessories', price: '$7.50', stock: '300', status: 'valid' },
  { row: 23, title: 'Mechanical Switch Lube Kit 205g0', sku: 'APX-LB-23', category: 'Maintenance', price: '$19.99', stock: '70', status: 'valid' },
  { row: 24, title: 'Precision Anti-Static Tweezers', sku: 'APX-TW-24', category: 'Tools', price: '$9.50', stock: '85', status: 'valid' },
];

export const VendorImportExportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'warning'>('all');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);

  const validCount = SAMPLE_ROWS.filter((r) => r.status === 'valid').length;
  const warningCount = SAMPLE_ROWS.filter((r) => r.status === 'warning').length;
  const totalCount = SAMPLE_ROWS.length;

  const filteredRows = SAMPLE_ROWS.filter((row) => {
    if (statusFilter === 'valid') return row.status === 'valid';
    if (statusFilter === 'warning') return row.status === 'warning';
    return true;
  });

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleProcessImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setImportCompleted(true);
    }, 400);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,title,sku,category,brand,price,stock,type\nWireless Earbuds,SKU-1001,electronics,Apex Tech,49.99,100,physical\nAudio Sample Pack,SKU-2001,digital,Apex Audio,29.99,999,digital';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'catalog_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCatalog = (format: 'csv' | 'xlsx') => {
    const content =
      'data:text/csv;charset=utf-8,id,title,sku,price,stock\nprod-1,Apex Pro Magnetic Keyboard,APX-KB-01,179.99,45\nprod-2,AudioPulse Studio Pro Headphones,APX-HP-02,199.50,30';
    const link = document.createElement('a');
    link.href = encodeURI(content);
    link.download = `catalog_export.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bulk Catalog Import &amp; Export
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Batch upload hundreds of products via CSV/Excel or export your active catalog with complete inventory and pricing data.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="h-4 w-4" />
            Bulk CSV Import Wizard
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="h-4 w-4" />
            Catalog Exporter
          </button>
        </div>

        {/* TAB 1: CSV Importer */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {importCompleted ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900">Catalog Import Finished!</h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  24 Products have been processed into your catalog inventory. Verified physical listings are now active.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setImportCompleted(false);
                    setUploadedFile(null);
                  }}
                  className="rounded-xl bg-[#FF7A1A] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] cursor-pointer"
                >
                  Import Another File
                </button>
              </div>
            ) : (
              <>
                {/* Upload & Template Downloader */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left 2 Cols: Drag & Drop Area */}
                  <div className="md:col-span-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-[#FF7A1A] transition-colors relative">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleSimulatedUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF7A1A] mb-3">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {uploadedFile ? uploadedFile.name : 'Upload Spreadsheet'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Drag & drop catalog spreadsheet here, or click to browse files
                    </p>
                    <span className="inline-block mt-3 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">
                      Supported: .CSV, .XLSX (Max 15MB)
                    </span>
                  </div>

                  {/* Right 1 Col: Download Sample Template */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-1">Standard Catalog Template</h4>
                      <p className="text-slate-500 leading-relaxed">
                        Use our official column headers to ensure zero validation errors during bulk import.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      Download catalog_template.csv
                    </button>
                  </div>
                </div>

                {/* Column Mapping Wizard Preview */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Column Mapping Wizard Preview</h3>
                      <p className="text-xs text-slate-500">
                        Spreadsheet headers mapped automatically against marketplace product listing schema.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold w-fit">
                      <Check className="h-3.5 w-3.5" />
                      Auto-Matched 100% (7/7 Fields)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Header 1</span>
                      <strong className="text-slate-800">Title</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Header 2</span>
                      <strong className="text-slate-800">SKU</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Header 3</span>
                      <strong className="text-slate-800">Category</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Header 4</span>
                      <strong className="text-slate-800">Brand</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Header 5</span>
                      <strong className="text-slate-800">Price</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Header 6</span>
                      <strong className="text-slate-800">Stock</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Header 7</span>
                      <strong className="text-slate-800">Type</strong>
                    </div>
                  </div>
                </div>

                {/* Validation Preview Table */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Validation Preview</h3>
                      <p className="text-slate-500 text-[11px]">
                        Review validation results before publishing to active marketplace catalog.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'all'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({totalCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('valid')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'valid'
                              ? 'bg-white text-emerald-800 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Valid ({validCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('warning')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'warning'
                              ? 'bg-white text-amber-800 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Warnings ({warningCount})
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleProcessImport}
                        disabled={isProcessing}
                        className="flex items-center gap-2 rounded-xl bg-[#FF7A1A] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#EA580C] cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Processing 24 Products...
                          </>
                        ) : (
                          <>
                            <span>Process &amp; Import 24 Products</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase">
                        <tr>
                          <th className="p-3 text-center">Row</th>
                          <th className="p-3">Title</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRows.map((r) => (
                          <tr key={r.row} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center font-mono text-slate-400">{r.row}</td>
                            <td className="p-3 font-bold text-slate-900">
                              <div>{r.title}</div>
                              {r.message && (
                                <span className="text-[11px] font-normal text-amber-700 block mt-0.5">
                                  {r.message}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-slate-700">{r.sku}</td>
                            <td className="p-3 text-slate-600">{r.category}</td>
                            <td className="p-3 font-bold text-slate-900">{r.price}</td>
                            <td className="p-3 font-semibold text-slate-800">{r.stock}</td>
                            <td className="p-3">
                              {r.status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">
                                  <AlertTriangle className="h-3 w-3" />
                                  Warning
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: Export */}
        {activeTab === 'export' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 text-xs max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Export Catalog Inventory</h3>
              <p className="text-slate-500">
                Download your listings including IDs, descriptions, pricing matrices, and real-time inventory counts.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="filter-by-category" className="block font-bold text-slate-700 mb-1">
                  Filter by Category
                </label>
                <select id="filter-by-category" className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50">
                  <option value="all">All Categories (24 Products)</option>
                  <option value="keyboards">Keyboards &amp; Switches (6 Products)</option>
                  <option value="audio">Audio &amp; Microphones (4 Products)</option>
                  <option value="accessories">Desk Accessories &amp; Mats (14 Products)</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-by-status" className="block font-bold text-slate-700 mb-1">
                  Filter by Status
                </label>
                <select id="filter-by-status" className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50">
                  <option value="all">All (Active &amp; Drafts)</option>
                  <option value="active">Active In Stock Listings</option>
                  <option value="draft">Drafts &amp; Queued</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => handleExportCatalog('csv')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 font-bold cursor-pointer transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export Catalog (CSV)
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCatalog('xlsx')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 py-2.5 font-bold cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Export Catalog (Excel)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
