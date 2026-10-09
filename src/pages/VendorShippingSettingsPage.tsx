import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building,
  Clock,
  CheckCircle2,
  Save,
  RotateCcw,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';

const STORAGE_KEY = 'vd:v1:vendor_shipping_settings';

const DEFAULT_SETTINGS = {
  freeShippingEnabled: true,
  freeShippingThreshold: '100.00',
  standardRate: '8.50',
  expressRate: '15.00',
  warehouseName: 'Apex Primary Fulfillment Center (WH-1)',
  street: '120 Industrial Parkway, Suite 400',
  city: 'San Leandro',
  state: 'CA',
  zipCode: '94577',
  phone: '+1 (510) 555-8921',
  operatingHours: 'Mon - Sat: 8:00 AM - 6:00 PM PST',
  gateCode: '#4921 (Bay 4)',
  slaWindow: '24h' as '24h' | '48h' | 'custom',
};

export const VendorShippingSettingsPage: React.FC = () => {
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(DEFAULT_SETTINGS.freeShippingEnabled);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(DEFAULT_SETTINGS.freeShippingThreshold);
  const [standardRate, setStandardRate] = useState(DEFAULT_SETTINGS.standardRate);
  const [expressRate, setExpressRate] = useState(DEFAULT_SETTINGS.expressRate);

  const [warehouseName, setWarehouseName] = useState(DEFAULT_SETTINGS.warehouseName);
  const [street, setStreet] = useState(DEFAULT_SETTINGS.street);
  const [city, setCity] = useState(DEFAULT_SETTINGS.city);
  const [state, setState] = useState(DEFAULT_SETTINGS.state);
  const [zipCode, setZipCode] = useState(DEFAULT_SETTINGS.zipCode);
  const [phone, setPhone] = useState(DEFAULT_SETTINGS.phone);
  const [operatingHours, setOperatingHours] = useState(DEFAULT_SETTINGS.operatingHours);
  const [gateCode, setGateCode] = useState(DEFAULT_SETTINGS.gateCode);

  const [slaWindow, setSlaWindow] = useState<'24h' | '48h' | 'custom'>(DEFAULT_SETTINGS.slaWindow);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetMessage, setResetMessage] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.standardRate !== undefined) setStandardRate(String(parsed.standardRate));
        if (parsed.expressRate !== undefined) setExpressRate(String(parsed.expressRate));
        if (parsed.freeShippingThreshold !== undefined) setFreeShippingThreshold(String(parsed.freeShippingThreshold));
        if (parsed.freeShippingEnabled !== undefined) setFreeShippingEnabled(Boolean(parsed.freeShippingEnabled));
        if (parsed.warehouseName) setWarehouseName(parsed.warehouseName);
        if (parsed.street) setStreet(parsed.street);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setState(parsed.state);
        if (parsed.zipCode) setZipCode(parsed.zipCode);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.operatingHours) setOperatingHours(parsed.operatingHours);
        if (parsed.gateCode) setGateCode(parsed.gateCode);
        if (parsed.slaWindow) setSlaWindow(parsed.slaWindow);
      }
    } catch {
      // ignore JSON errors
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      freeShippingEnabled,
      freeShippingThreshold: parseFloat(freeShippingThreshold) || 0,
      standardRate: parseFloat(standardRate) || 0,
      expressRate: parseFloat(expressRate) || 0,
      warehouseName,
      street,
      city,
      state,
      zipCode,
      phone,
      operatingHours,
      gateCode,
      slaWindow,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSavedSuccess(true);
    setResetMessage(false);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    setFreeShippingEnabled(DEFAULT_SETTINGS.freeShippingEnabled);
    setFreeShippingThreshold(DEFAULT_SETTINGS.freeShippingThreshold);
    setStandardRate(DEFAULT_SETTINGS.standardRate);
    setExpressRate(DEFAULT_SETTINGS.expressRate);
    setWarehouseName(DEFAULT_SETTINGS.warehouseName);
    setStreet(DEFAULT_SETTINGS.street);
    setCity(DEFAULT_SETTINGS.city);
    setState(DEFAULT_SETTINGS.state);
    setZipCode(DEFAULT_SETTINGS.zipCode);
    setPhone(DEFAULT_SETTINGS.phone);
    setOperatingHours(DEFAULT_SETTINGS.operatingHours);
    setGateCode(DEFAULT_SETTINGS.gateCode);
    setSlaWindow(DEFAULT_SETTINGS.slaWindow);
    localStorage.removeItem(STORAGE_KEY);
    setResetMessage(true);
    setSavedSuccess(false);
    setTimeout(() => setResetMessage(false), 3000);
  };

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Shipping Settings &amp; Dispatch Origin
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure courier rates, fulfillment speed SLAs, and the warehouse origin address where delivery riders collect packages.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
            <button
              type="submit"
              form="shipping-settings-form"
              className="flex items-center gap-2 rounded-xl bg-[#FF7A1A] hover:bg-[#EA580C] text-white px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              Save Settings
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Shipping rates, dispatch origin, and SLA rules successfully saved!
          </div>
        )}

        {resetMessage && (
          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-xs font-bold text-orange-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-[#FF7A1A]" />
            Reset to marketplace standard configurations
          </div>
        )}

        <form id="shipping-settings-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Rates & Thresholds */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Truck className="h-4 w-4 text-[#FF7A1A]" />
              <h3 className="text-sm font-bold text-slate-900">Buyer Shipping Rates &amp; Thresholds</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="standard-shipping-rate" className="block font-bold text-slate-700 mb-1">
                  Standard Shipping Flat Rate
                </label>
                <input
                  id="standard-shipping-rate"
                  type="number"
                  step="0.01"
                  value={standardRate}
                  onChange={(e) => setStandardRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Applied to buyer cart packages under threshold</span>
              </div>

              <div>
                <label htmlFor="express-courier-rate" className="block font-bold text-slate-700 mb-1">
                  Express Courier Surcharge
                </label>
                <input
                  id="express-courier-rate"
                  type="number"
                  step="0.01"
                  value={expressRate}
                  onChange={(e) => setExpressRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Optional 1-day expedited option at checkout</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <label htmlFor="free-shipping-toggle" className="text-xs font-bold text-slate-800 block cursor-pointer">
                  Free Shipping Threshold
                </label>
                <span className="text-slate-500 text-[11px]">
                  Automatically waive standard shipping when buyer spends over this amount
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="free-shipping-toggle"
                  type="checkbox"
                  checked={freeShippingEnabled}
                  onChange={(e) => setFreeShippingEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-[#FF7A1A] focus:ring-[#FF7A1A] cursor-pointer"
                />
                {freeShippingEnabled && (
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <span>$</span>
                    <input
                      type="number"
                      value={freeShippingThreshold}
                      onChange={(e) => setFreeShippingThreshold(e.target.value)}
                      className="w-20 rounded-xl border border-slate-200 p-1.5 text-center font-bold"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Warehouse Dispatch Origin */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="h-4 w-4 text-[#FF7A1A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Warehouse Dispatch Origin</h3>
                <span className="text-slate-400 text-[11px]">Where delivery riders and couriers arrive to collect packages</span>
              </div>
            </div>

            <div>
              <label htmlFor="facility-name" className="block font-bold text-slate-700 mb-1">Facility Name / Warehouse Tag</label>
              <input
                id="facility-name"
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="street-address" className="block font-bold text-slate-700 mb-1">
                  Street Address &amp; Bay / Suite
                </label>
                <input
                  id="street-address"
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>

              <div>
                <label htmlFor="city-input" className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  id="city-input"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="state-input" className="block font-bold text-slate-700 mb-1">State / Province</label>
                <input
                  id="state-input"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>

              <div>
                <label htmlFor="zip-code-input" className="block font-bold text-slate-700 mb-1">ZIP / Postal Code</label>
                <input
                  id="zip-code-input"
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>

              <div>
                <label htmlFor="hotline-input" className="block font-bold text-slate-700 mb-1">Dispatch Phone Hotline</label>
                <input
                  id="hotline-input"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="hours-input" className="block font-bold text-slate-700 mb-1">Operating Pickup Hours</label>
                <input
                  id="hours-input"
                  type="text"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-700"
                />
              </div>

              <div>
                <label htmlFor="gate-code" className="block font-bold text-slate-700 mb-1">
                  Security Gate Access Code
                </label>
                <input
                  id="gate-code"
                  type="text"
                  value={gateCode}
                  onChange={(e) => setGateCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dispatch Handling SLA */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Clock className="h-4 w-4 text-[#FF7A1A]" />
              <h3 className="text-sm font-bold text-slate-900">Fulfillment Handling Window (SLA)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                htmlFor="sla-24h"
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  slaWindow === '24h'
                    ? 'border-[#FF7A1A] bg-orange-50/40 text-orange-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    id="sla-24h"
                    type="radio"
                    name="sla"
                    aria-label="Dispatched within 24 hours (Prime SLA)"
                    checked={slaWindow === '24h'}
                    onChange={() => setSlaWindow('24h')}
                  />
                  <span className="font-bold">Dispatched within 24 hours (Prime SLA)</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5">
                  Pack and mark ready within 24 hours of buyer order placement.
                </p>
              </label>

              <label
                htmlFor="sla-48h"
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  slaWindow === '48h'
                    ? 'border-[#FF7A1A] bg-orange-50/40 text-orange-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    id="sla-48h"
                    type="radio"
                    name="sla"
                    aria-label="Dispatched within 48 hours"
                    checked={slaWindow === '48h'}
                    onChange={() => setSlaWindow('48h')}
                  />
                  <span className="font-bold">Dispatched within 48 hours</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5">
                  Orders dispatched within 2 business days.
                </p>
              </label>

              <label
                htmlFor="sla-custom"
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  slaWindow === 'custom'
                    ? 'border-[#FF7A1A] bg-orange-50/40 text-orange-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    id="sla-custom"
                    type="radio"
                    name="sla"
                    aria-label="Custom 3-5 business days"
                    checked={slaWindow === 'custom'}
                    onChange={() => setSlaWindow('custom')}
                  />
                  <span className="font-bold">Custom 3-5 business days</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5">
                  For custom manufactured or heavy freight products.
                </p>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-[#FF7A1A] hover:bg-[#EA580C] text-white px-6 py-3 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
};
