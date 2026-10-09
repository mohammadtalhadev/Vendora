import React, { useState } from 'react';
import {
  Boxes,
  Key,
  AlertTriangle,
  Search,
  CheckCircle2,
  Calendar,
  Save,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';

interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  expectedRestockDate?: string;
  price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface DigitalLicenseKey {
  id: string;
  productTitle: string;
  key: string;
  isUsed: boolean;
  addedAt: string;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'prod-1',
    sku: 'AUDIO-HP-01',
    title: 'Apex Pro Noise-Cancelling Wireless Headphones (Black)',
    category: 'electronics',
    stock: 3,
    lowStockThreshold: 5,
    expectedRestockDate: '2026-10-14',
    price: 189.99,
    status: 'low_stock',
  },
  {
    id: 'prod-2',
    sku: 'AUDIO-CASE-02',
    title: 'Hard Shell Protective Travel Case',
    category: 'accessories',
    stock: 0,
    lowStockThreshold: 10,
    expectedRestockDate: '2026-10-11',
    price: 24.50,
    status: 'out_of_stock',
  },
  {
    id: 'prod-3',
    sku: 'CABLE-USB-03',
    title: 'Braided Gold-Plated 3.5mm Audio Cable (1.5m)',
    category: 'accessories',
    stock: 45,
    lowStockThreshold: 10,
    price: 14.99,
    status: 'in_stock',
  },
  {
    id: 'prod-4',
    sku: 'AUDIO-MIC-04',
    title: 'Studio Condenser Podcast Microphone with Boom Arm',
    category: 'electronics',
    stock: 18,
    lowStockThreshold: 5,
    price: 99.00,
    status: 'in_stock',
  },
];

const INITIAL_KEYS: DigitalLicenseKey[] = [
  { id: 'k-1', productTitle: 'Vendora Audio Master Preset Pack', key: 'AUD-PRE-8841-XN19', isUsed: false, addedAt: '2026-10-01' },
  { id: 'k-2', productTitle: 'Vendora Audio Master Preset Pack', key: 'AUD-PRE-8842-XN20', isUsed: false, addedAt: '2026-10-01' },
  { id: 'k-3', productTitle: 'Vendora Audio Master Preset Pack', key: 'AUD-PRE-7123-PA88', isUsed: true, addedAt: '2026-09-28' },
  { id: 'k-4', productTitle: 'Acoustic Soundscapes Vol. 2', key: 'SFX-VOL2-4412-MK', isUsed: false, addedAt: '2026-10-04' },
];

export const VendorInventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'physical' | 'digital'>('physical');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [digitalKeys, setDigitalKeys] = useState<DigitalLicenseKey[]>(INITIAL_KEYS);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Digital key adder
  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
  const [newKeyProduct, setNewKeyProduct] = useState('Vendora Audio Master Preset Pack');
  const [newKeysBatch, setNewKeysBatch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStockChange = (id: string, newStock: number) => {
    const val = Math.max(0, newStock);
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const status = val === 0 ? 'out_of_stock' : val <= item.lowStockThreshold ? 'low_stock' : 'in_stock';
          return { ...item, stock: val, status };
        }
        return item;
      }),
    );
  };

  const handleBulkSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleUpdateRow = (item: InventoryItem) => {
    showToast(`Updated stock for ${item.title}`);
  };

  const handleAddKeys = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lines = newKeysBatch.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const newEntries: DigitalLicenseKey[] = lines.map((k, i) => ({
      id: `k-${Date.now()}-${i}`,
      productTitle: newKeyProduct,
      key: k,
      isUsed: false,
      addedAt: new Date().toISOString().split('T')[0],
    }));

    setDigitalKeys([...newEntries, ...digitalKeys]);
    setNewKeysBatch('');
    setIsAddKeyOpen(false);
    showToast(`Added ${lines.length} new activation keys to vault pool.`);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const lowStockCount = inventory.filter((i) => i.status !== 'in_stock').length;

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Inventory &amp; Stock Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Rapid batch editor for stock quantities, replenishment alerts, and digital key token vaults.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4" />
                All Stock Levels Saved!
              </span>
            )}
            <button
              type="button"
              onClick={handleBulkSave}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071DC] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#005bb5] transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save All Changes
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {toastMessage}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Active SKUs</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{inventory.length} SKUs</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Low-Stock Alerts</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {inventory.filter((i) => i.status === 'low_stock').length} Items
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Digital Key Reserve</span>
            <div className="text-2xl font-black text-purple-600 mt-1">
              {digitalKeys.filter((k) => !k.isUsed).length} Keys
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('physical')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'physical'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            Physical Stock Management
            {lowStockCount > 0 && (
              <span className="rounded-full bg-amber-500 text-white px-2 py-0.2 text-[10px]">
                {lowStockCount} alerts
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('digital')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'digital'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="h-4 w-4" />
            Digital License Vault ({digitalKeys.filter((k) => !k.isUsed).length} Available)
          </button>
        </div>

        {/* TAB 1: Physical Inventory */}
        {activeTab === 'physical' && (
          <div className="space-y-4">
            {/* Low-Stock Alert Banner */}
            {lowStockCount > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Low-Stock Threshold Alert:</span> {lowStockCount} products are below safe stock thresholds or completely sold out.
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-700">Update quantities below to restock immediately</span>
              </div>
            )}

            {/* Quick Filter Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by SKU or Product Title..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0071DC]"
                />
              </div>
            </div>

            {/* Table of SKUs */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                    <th className="p-4">SKU Code</th>
                    <th className="p-4">Product &amp; Variant</th>
                    <th className="p-4">Unit Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Quick Stock Stepper</th>
                    <th className="p-4">Restock Backlog &amp; ETA</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">{item.sku}</td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">{item.title}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{item.category}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-900">${item.price.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        {item.status === 'out_of_stock' && (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-bold">
                            Sold Out
                          </span>
                        )}
                        {item.status === 'low_stock' && (
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">
                            Low Stock (&lt;{item.lowStockThreshold})
                          </span>
                        )}
                        {item.status === 'in_stock' && (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            title="Decrement stock"
                            onClick={() => handleStockChange(item.id, item.stock - 1)}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.stock}
                            onChange={(e) => handleStockChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-14 text-center py-1 font-bold text-slate-900 bg-white border-x border-slate-200 focus:outline-none"
                          />
                          <button
                            type="button"
                            title="Increment stock"
                            onClick={() => handleStockChange(item.id, item.stock + 1)}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500">
                        {item.expectedRestockDate ? (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {item.expectedRestockDate}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleUpdateRow(item)}
                          className="rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Digital License Key Vault */}
        {activeTab === 'digital' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-700 tracking-wider uppercase block">
                  ACTIVE VAULT: DIGITAL PRODUCTS &amp; LICENSES
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Digital Token &amp; Activation Keys</h3>
                <p className="text-xs text-slate-500">
                  {digitalKeys.filter((k) => !k.isUsed).length} Available Reserve keys ready for buyer assignment.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddKeyOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Upload License Keys
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                    <th className="p-4">Product Title</th>
                    <th className="p-4">ACTIVATION KEY / LICENSE TOKEN</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date Added</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {digitalKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">{k.productTitle}</td>
                      <td className="p-4 font-mono text-slate-800 bg-slate-50/80 rounded-md">
                        {k.key}
                      </td>
                      <td className="p-4">
                        {k.isUsed ? (
                          <span className="rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5 text-[10px] font-bold">
                            Claimed / Used
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                            Available in Vault
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500">{k.addedAt}</td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          title="Copy key"
                          onClick={() => handleCopyKey(k.key)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          {copiedKey === k.key ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedKey === k.key ? 'Copied' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal: Bulk Add Keys */}
            {isAddKeyOpen && (
              <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-base font-bold text-slate-900 mb-1">Bulk Upload Activation Keys</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Paste one license key per line to add them to your automated digital fulfillment pool.
                  </p>

                  <form onSubmit={handleAddKeys} className="space-y-3 text-xs">
                    <div>
                      <label htmlFor="target-product-select" className="block font-bold text-slate-700 mb-1">Target Product</label>
                      <select
                        id="target-product-select"
                        value={newKeyProduct}
                        onChange={(e) => setNewKeyProduct(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5"
                      >
                        <option value="Vendora Audio Master Preset Pack">Vendora Audio Master Preset Pack</option>
                        <option value="Acoustic Soundscapes Vol. 2">Acoustic Soundscapes Vol. 2</option>
                        <option value="Mastering React & TS (eBook)">Mastering React & TS (eBook)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="license-keys-input" className="block font-bold text-slate-700 mb-1">License Keys (One per line)</label>
                      <textarea
                        id="license-keys-input"
                        rows={5}
                        value={newKeysBatch}
                        onChange={(e) => setNewKeysBatch(e.target.value)}
                        placeholder="e.g. VEN-LIC-FIGMA-001&#10;VEN-LIC-FIGMA-002&#10;VEN-LIC-FIGMA-003"
                        className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddKeyOpen(false)}
                        className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddKeys();
                        }}
                        className="rounded-xl bg-purple-600 px-4 py-2 font-bold text-white shadow-md hover:bg-purple-700 cursor-pointer"
                      >
                        Deposit Keys to Vault
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
