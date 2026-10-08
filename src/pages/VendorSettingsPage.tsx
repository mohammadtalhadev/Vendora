import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  Users,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

export const VendorSettingsPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isInviteTeamModalOpen, setIsInviteTeamModalOpen] = useState(false);
  const [isOffboardingModalOpen, setIsOffboardingModalOpen] = useState(false);
  const [showTaxId, setShowTaxId] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'profile' | 'shipping' | 'policies' | 'team' | 'payout'
  >('profile');

  // Form states
  const [storeName, setStoreName] = useState('Nova Electronics');
  const [storeSlug, setStoreSlug] = useState('nova-electronics');
  const [tagline, setTagline] = useState(
    'Curated high-performance consumer tech and workspace essentials'
  );
  const [sellerStory, setSellerStory] = useState(
    'Nova Electronics specializes in benchmark-tested mechanical keyboards, ergonomic workstation gear, and noise-cancelling audiophile equipment. All items are rigorously inspected, packed in climate-controlled facilities, and dispatched with tamper-evident authentication seals.'
  );

  // Carriers
  const [fedexActive, setFedexActive] = useState(true);
  const [upsActive, setUpsActive] = useState(true);
  const [dhlActive, setDhlActive] = useState(false);
  const [vendoraExpressActive, setVendoraExpressActive] = useState(true);
  const [freeShippingActive, setFreeShippingActive] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('75.00');

  // Vacation mode
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationMessage, setVacationMessage] = useState(
    'We are performing annual inventory counts from Dec 24 to Jan 2. Shipping resumes Jan 3.'
  );

  // Alerts
  const [smsDispatch, setSmsDispatch] = useState(true);
  const [lowInventoryAlert, setLowInventoryAlert] = useState(true);
  const [rmaPushAlert, setRmaPushAlert] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  const handleSave = () => {
    alert('Store configuration updated and saved successfully!');
  };

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="space-y-6">
        {/* ── Breadcrumb & Header ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              STORE CONFIGURATION <span className="text-slate-300">/</span> SETTINGS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Store Settings
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Configure public storefront details, warehouse fulfillment rules, shipping policies, team access, and notification alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/vendors/vendor-tech-1"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Eye className="h-4 w-4 text-slate-500" />
              View Public Storefront
            </Link>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Check className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>

        {/* ── Settings Tabs ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'profile', label: 'General Profile' },
            { id: 'shipping', label: 'Shipping & Fulfillment' },
            { id: 'policies', label: 'Policies & Returns' },
            { id: 'team', label: 'Team & Permissions' },
            { id: 'payout', label: 'Payout & Tax Info' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-lg px-3.5 py-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 2-Column Section (8 cols / 4 cols) ──────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* ── Left Column (8 cols): Setting Forms ───────────────── */}
          <div className="space-y-6 lg:col-span-8">
            {/* Card 1: Storefront Identity */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Storefront Identity</h2>
                  <p className="text-xs text-slate-500">
                    Visual appearance and public catalog metadata displayed to buyers on Vendora Marketplace.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Public Facing
                </span>
              </div>

              {/* Brand Assets row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
                {/* Logo Emblem */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Logo Emblem (Square, min 400x400)
                  </label>
                  <div className="h-28 w-28 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-inner border border-slate-800">
                    NE
                  </div>
                </div>

                {/* Banner Artwork */}
                <div className="sm:col-span-8 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Store Banner Artwork (Aspect 16:9)
                    </label>
                    <button
                      onClick={() => alert('Choose file dialog')}
                      className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      Change Cover
                    </button>
                  </div>
                  <div className="h-28 w-full rounded-xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 p-3.5 flex flex-col justify-end text-white border border-slate-700 shadow-inner">
                    <div className="text-[10px] text-slate-400 font-mono">
                      1920 × 600 px active cover
                    </div>
                    <div className="text-xs font-bold truncate">
                      Nova Electronics Ergonomic Setup Showcase
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Fields */}
              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Store Display Name
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Store Slug &amp; Web Link
                    </label>
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-slate-900">
                      <span className="px-2.5 py-2 text-xs text-slate-400 bg-slate-100 border-r border-slate-200 font-mono">
                        vendora.com/stores/
                      </span>
                      <input
                        type="text"
                        value={storeSlug}
                        onChange={(e) => setStoreSlug(e.target.value)}
                        className="w-full bg-white px-2.5 py-2 text-xs font-mono text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Storefront Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Store Overview &amp; Seller Story
                    </label>
                    <span className="text-[10px] text-slate-400">Markdown supported</span>
                  </div>
                  <textarea
                    rows={4}
                    value={sellerStory}
                    onChange={(e) => setSellerStory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Business Contact & Legal Entity */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Business Contact &amp; Legal Entity
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official entity registry used for invoices, commercial tax filings, and verified checkout manifests.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-1 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Registered Entity Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Nova Tech Solutions LLC"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">EIN / Tax ID</label>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700">
                        ✓ Verified
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showTaxId ? 'text' : 'password'}
                        defaultValue="84-9102918"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTaxId(!showTaxId)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showTaxId ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Customer Support Email
                    </label>
                    <input
                      type="email"
                      defaultValue="support@nova-electronics.demo"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Direct Merchant Telephone
                    </label>
                    <input
                      type="tel"
                      defaultValue="+1 (512) 883-4920"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Physical Warehouse &amp; Return Address
                  </label>
                  <input
                    type="text"
                    defaultValue="401 Congress Ave, Suite 1500"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <input
                      type="text"
                      defaultValue="Austin"
                      placeholder="City"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                    <input
                      type="text"
                      defaultValue="TX"
                      placeholder="State"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                    <input
                      type="text"
                      defaultValue="78701, USA"
                      placeholder="Postal Code"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Shipping & Warehouse Fulfillment */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Shipping &amp; Warehouse Fulfillment
                  </h2>
                  <p className="text-xs text-slate-500">
                    Default dispatch parameters, SLA commitments, carrier routing, and shipping incentive rules.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  SLAs Passing 99.4%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Primary Fulfillment Hub
                  </label>
                  <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900">
                    <option>Austin Central Facility Hub (Primary)</option>
                    <option>Dallas Regional Overflow Center</option>
                    <option>Phoenix West Coast Fulfillment Dock</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Handling Time Commitment
                  </label>
                  <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900">
                    <option>Same-day dispatch for orders before 2:00 PM</option>
                    <option>1 Business Day (Guaranteed 24hr packing)</option>
                    <option>2 Business Days (Custom assembled orders)</option>
                  </select>
                </div>
              </div>

              {/* Carrier Integrations */}
              <div className="pt-2 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Integrated Carrier Integrations
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* FedEx */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">FedEx Ground</div>
                      <div className="text-[11px] text-slate-500">Commercial rate active</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFedexActive(!fedexActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        fedexActive ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          fedexActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* UPS */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">UPS 2-Day Air</div>
                      <div className="text-[11px] text-slate-500">Expedited tracking sync</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUpsActive(!upsActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        upsActive ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          upsActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* DHL */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">DHL Express</div>
                      <div className="text-[11px] text-slate-500">Worldwide cross-border</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDhlActive(!dhlActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        dhlActive ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          dhlActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Vendora Express Fulfilled */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Vendora Express Fulfilled</div>
                      <div className="text-[11px] text-slate-500">Platform guaranteed 48hr</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendoraExpressActive(!vendoraExpressActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        vendoraExpressActive ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          vendoraExpressActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Free Shipping threshold */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900">Free-Shipping Order Threshold</div>
                  <div className="text-[11px] text-slate-500">
                    Encourage larger basket size by waiving ground delivery fees above minimum spend.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs">
                    <span className="text-slate-400 mr-1">$</span>
                    <input
                      type="text"
                      value={freeShippingThreshold}
                      onChange={(e) => setFreeShippingThreshold(e.target.value)}
                      className="w-14 font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFreeShippingActive(!freeShippingActive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      freeShippingActive ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        freeShippingActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Vacation & Store Status Mode */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Vacation &amp; Store Status Mode
                  </h2>
                  <p className="text-xs text-slate-500">
                    Temporarily pause customer checkouts during holiday downtime, physical inventory audits, or warehouse upgrades.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">Holiday / Vacation Mode</div>
                    <div className="text-[11px] text-slate-500">
                      {vacationMode ? 'Currently Active (Store Paused)' : 'Currently Disabled (Store Active)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVacationMode(!vacationMode)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      vacationMode ? 'bg-amber-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        vacationMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When activated, product listings remain browsable in read-only mode. Customers will see an informational banner and checkout buttons are held. Pending open orders must still be honored.
                </p>

                {vacationMode && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Storefront Notice Message
                    </label>
                    <input
                      type="text"
                      value={vacationMessage}
                      onChange={(e) => setVacationMessage(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column (4 cols): Health, Team, Alerts, Danger Zone ─ */}
          <div className="space-y-6 lg:col-span-4">
            {/* Card 1: Store Health & Trust */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Store Health &amp; Trust</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  ✓ Verified Merchant
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-slate-900">Identity Verification</div>
                      <div className="text-[10px] text-slate-400">KYC cleared March 2024</div>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">Marketplace Tier</div>
                    <div className="text-[10px] text-slate-400">Level 3 Platinum Seller</div>
                  </div>
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    -0.5% Fee
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-900 mb-1">
                    <span>Quarterly Seller Score</span>
                    <span>98.6 / 100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.6%' }} />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Eligible for Top Banner placement and algorithmic spotlight.
                </div>
              </div>
            </div>

            {/* Card 2: Team Members */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Team Members</h2>
                  <p className="text-[11px] text-slate-400">3 collaborators with console access</p>
                </div>
                <button
                  onClick={() => setIsInviteTeamModalOpen(true)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + Invite
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { name: 'Alex Vance', email: 'alex.vance@novatech.test', role: 'Owner', pill: 'bg-slate-900 text-white' },
                  { name: 'Elena Rostova', email: 'elena@novatech.test', role: 'Support', pill: 'bg-slate-100 text-slate-700' },
                  { name: 'David Miller', email: 'miller.warehouse@novatech.test', role: 'Warehouse Ops', pill: 'bg-slate-100 text-slate-700' },
                ].map((member) => (
                  <div
                    key={member.email}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {member.email}
                      </div>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${member.pill}`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Operational Alerts */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900">Operational Alerts</h2>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsDispatch}
                    onChange={(e) => setSmsDispatch(e.target.checked)}
                    className="rounded text-slate-900 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Instant Order SMS Dispatch</div>
                    <div className="text-[11px] text-slate-400">
                      Real-time mobile ping on high-priority express checkouts.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lowInventoryAlert}
                    onChange={(e) => setLowInventoryAlert(e.target.checked)}
                    className="rounded text-slate-900 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Low Inventory Warning Trigger</div>
                    <div className="text-[11px] text-slate-400">
                      Automated digest when SKU units drop beneath 10 units.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rmaPushAlert}
                    onChange={(e) => setRmaPushAlert(e.target.checked)}
                    className="rounded text-slate-900 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Disputes &amp; RMA Push Notifications</div>
                    <div className="text-[11px] text-slate-400">
                      Immediate notice to maintain &lt; 24hr response metrics.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                    className="rounded text-slate-900 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Daily Settlement Payout Digest</div>
                    <div className="text-[11px] text-slate-400">
                      End-of-day reconciliation PDF sent to finance inbox.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Card 4: Danger Zone */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Danger Zone</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Permanently close Nova Electronics, disconnect external sales channels, and archive order manifests.
              </p>
              <div className="text-[10px] text-slate-500">
                Pending payouts ($12,400.00) will be paid out following 30-day standard reserve clearance.
              </div>
              <button
                type="button"
                onClick={() => setIsOffboardingModalOpen(true)}
                className="w-full rounded-lg border border-rose-300 bg-white py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
              >
                Close Store / Request Offboarding
              </button>
            </div>
          </div>
        </div>

        {/* ── Invite Team Member Modal ────────────────────────────── */}
        <Dialog open={isInviteTeamModalOpen} onOpenChange={setIsInviteTeamModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-700" />
                Invite Team Member
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Grant staff or agency access with granular role-based permissions.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Invitation sent to team member!');
                setIsInviteTeamModalOpen(false);
              }}
              className="space-y-3 py-2 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@yourcompany.com"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Access Role</label>
                <select className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900">
                  <option>Warehouse &amp; Fulfillment Ops (Packing &amp; Labels)</option>
                  <option>Customer Support (Messages &amp; Returns)</option>
                  <option>Catalog Manager (Products &amp; Pricing)</option>
                  <option>Store Administrator (Full Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteTeamModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Offboarding / Close Store Modal ──────────────────────── */}
        <Dialog open={isOffboardingModalOpen} onOpenChange={setIsOffboardingModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                Confirm Store Offboarding
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Are you sure you want to deactivate Nova Electronics?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2 text-xs text-slate-700 leading-relaxed">
              <p>
                All active product listings will be removed from customer search results immediately.
              </p>
              <p>
                Any existing customer orders must be fulfilled or refunded prior to account closure.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOffboardingModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Offboarding request submitted to platform compliance.');
                  setIsOffboardingModalOpen(false);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Confirm Request
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Product Form Modal ───────────────────────────────────── */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
        />
      </div>
    </WorkspaceLayout>
  );
};
