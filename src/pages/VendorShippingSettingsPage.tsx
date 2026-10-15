import React, { useEffect, useState } from 'react';
import {
  Truck,
  Building,
  Clock,
  CheckCircle2,
  Save,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';

/** Panel-density geometry for the ui Input capsule, as on Vendor Settings (Batch 48). */
const PANEL_INPUT = 'h-9 rounded-lg px-3 text-xs';
import {
  useSaveShippingSettings,
  useShippingSettings,
} from '../features/vendor/hooks/useVendorStore';
import { useCurrency } from '../store/currency-store';
import type { VendorShippingSettings } from '../features/vendor/api/shipping';

const SLA_LABEL: Record<string, string> = {
  '24h': 'Dispatched within 24 hours',
  '48h': 'Dispatched within 48 hours',
  custom: 'Custom 3-5 business days',
};

type FormState = {
  freeShippingEnabled: boolean;
  freeShippingThreshold: string;
  standardRate: string;
  expressRate: string;
  warehouseName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  operatingHours: string;
  gateCode: string;
  slaWindow: string;
};

const BLANK_FORM: FormState = {
  freeShippingEnabled: false,
  freeShippingThreshold: '0',
  standardRate: '0',
  expressRate: '0',
  warehouseName: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  operatingHours: '',
  gateCode: '',
  slaWindow: '48h',
};

const amount = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

function formOf(settings: VendorShippingSettings): FormState {
  return {
    freeShippingEnabled: settings.freeShippingEnabled,
    freeShippingThreshold: String(settings.freeShippingThreshold),
    standardRate: String(settings.standardRate),
    expressRate: String(settings.expressRate),
    warehouseName: settings.warehouseName,
    street: settings.street,
    city: settings.city,
    state: settings.state,
    zipCode: settings.zipCode,
    phone: settings.phone,
    operatingHours: settings.operatingHours,
    gateCode: settings.gateCode,
    slaWindow: settings.slaWindow || '48h',
  };
}

export const VendorShippingSettingsPage: React.FC = () => {
  const settingsQuery = useShippingSettings();
  const saveSettings = useSaveShippingSettings();
  // Freight numbers are stored in USD on this row; the panel restates them through
  // formatPrice so the page never hand-writes a currency symbol.
  const { formatPrice, config } = useCurrency();

  const money = (value: number) => formatPrice(value);

  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The saved row is the form's starting point; a store that never saved gets blanks.
  useEffect(() => {
    if (settingsQuery.data) setForm(formOf(settingsQuery.data));
  }, [settingsQuery.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    saveSettings.mutate(
      {
        freeShippingEnabled: form.freeShippingEnabled,
        freeShippingThreshold: amount(form.freeShippingThreshold),
        standardRate: amount(form.standardRate),
        expressRate: amount(form.expressRate),
        warehouseName: form.warehouseName.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        phone: form.phone.trim(),
        operatingHours: form.operatingHours.trim(),
        gateCode: form.gateCode.trim(),
        slaWindow: form.slaWindow,
      },
      {
        onSuccess: (saved) => {
          setForm(formOf(saved));
          setBanner(
            `Saved: ${saved.warehouseName || 'no facility name'} · ${SLA_LABEL[saved.slaWindow] ?? saved.slaWindow}`,
          );
          window.setTimeout(() => setBanner(null), 4000);
        },
        onError: (cause: Error) => setError(cause.message),
      },
    );
  };

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">
              OPERATIONS <span className="text-slate-300">/</span> SHIPPING &amp; ORIGIN
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Shipping Settings &amp; Dispatch Origin
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Your store&apos;s own logistics facts: where riders collect, what freight costs you,
              and the handling window you aim for. Buyer-facing freight is priced from each
              product&apos;s shipping settings, so saving here does not reprice a live cart.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => settingsQuery.data && setForm(formOf(settingsQuery.data))}
              disabled={!settingsQuery.data}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Revert to saved
            </button>
            <button
              type="submit"
              form="shipping-settings-form"
              disabled={saveSettings.isPending || settingsQuery.isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {saveSettings.isPending ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>

        {settingsQuery.isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xs"
          >
            Loading your saved settings…
          </div>
        )}
        {settingsQuery.error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {(settingsQuery.error as Error).message}
          </div>
        )}
        {banner && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {banner}
          </div>
        )}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <form
            id="shipping-settings-form"
            onSubmit={handleSubmit}
            className="space-y-6 lg:col-span-8"
          >
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Truck className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">
                  Freight rates your store records
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Standard flat rate"
                  htmlFor="standard-shipping-rate"
                  hint="Stored per store. What a buyer is billed comes from the product's own shipping row."
                >
                  <Input
                    id="standard-shipping-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.standardRate}
                    onChange={(event) => set('standardRate', event.target.value)}
                    className={`${PANEL_INPUT} font-bold`}
                    required
                  />
                </FormField>

                <FormField
                  label="Express surcharge"
                  htmlFor="express-courier-rate"
                  hint="Recorded only - no express option is priced from this number."
                >
                  <Input
                    id="express-courier-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.expressRate}
                    onChange={(event) => set('expressRate', event.target.value)}
                    className={`${PANEL_INPUT} font-bold`}
                    required
                  />
                </FormField>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label
                    htmlFor="free-shipping-toggle"
                    className="block cursor-pointer text-xs font-bold text-slate-800"
                  >
                    Free-shipping threshold
                  </label>
                  <span className="text-[11px] text-slate-500">
                    The basket size at which you would waive standard freight.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="free-shipping-toggle"
                    type="checkbox"
                    checked={form.freeShippingEnabled}
                    onChange={(event) => set('freeShippingEnabled', event.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded"
                  />
                  {form.freeShippingEnabled && (
                    <span className="flex items-center gap-1 font-bold text-slate-900">
                      <span>{config.symbol}</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label="Free shipping threshold amount"
                        value={form.freeShippingThreshold}
                        onChange={(event) => set('freeShippingThreshold', event.target.value)}
                        className="h-8 w-24 rounded-lg px-2 text-center text-xs font-bold"
                      />
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Pickup origin</h2>
                  <span className="text-[11px] text-slate-400">
                    Where your stock is collected. Only this account and platform staff can read
                    this row.
                  </span>
                </div>
              </div>

              <FormField label="Facility name" htmlFor="facility-name">
                <Input
                  id="facility-name"
                  type="text"
                  value={form.warehouseName}
                  onChange={(event) => set('warehouseName', event.target.value)}
                  className={`${PANEL_INPUT} font-bold`}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label="Street and bay" htmlFor="street-address" className="sm:col-span-2">
                  <Input
                    id="street-address"
                    type="text"
                    value={form.street}
                    onChange={(event) => set('street', event.target.value)}
                    className={PANEL_INPUT}
                  />
                </FormField>
                <FormField label="City" htmlFor="city-input">
                  <Input
                    id="city-input"
                    type="text"
                    value={form.city}
                    onChange={(event) => set('city', event.target.value)}
                    className={PANEL_INPUT}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label="State / region" htmlFor="state-input">
                  <Input
                    id="state-input"
                    type="text"
                    value={form.state}
                    onChange={(event) => set('state', event.target.value)}
                    className={PANEL_INPUT}
                  />
                </FormField>
                <FormField label="Postal code" htmlFor="zip-code-input">
                  <Input
                    id="zip-code-input"
                    type="text"
                    value={form.zipCode}
                    onChange={(event) => set('zipCode', event.target.value)}
                    className={PANEL_INPUT}
                  />
                </FormField>
                <FormField label="Dispatch phone" htmlFor="hotline-input">
                  <Input
                    id="hotline-input"
                    type="text"
                    value={form.phone}
                    onChange={(event) => set('phone', event.target.value)}
                    className={PANEL_INPUT}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <FormField label="Pickup hours" htmlFor="hours-input">
                  <Input
                    id="hours-input"
                    type="text"
                    value={form.operatingHours}
                    onChange={(event) => set('operatingHours', event.target.value)}
                    className={PANEL_INPUT}
                  />
                </FormField>
                <FormField
                  label="Gate / access note"
                  htmlFor="gate-code"
                  hint="For your own records — couriers do not see this note."
                >
                  <Input
                    id="gate-code"
                    type="text"
                    value={form.gateCode}
                    onChange={(event) => set('gateCode', event.target.value)}
                    className={`${PANEL_INPUT} font-mono`}
                  />
                </FormField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">Handling window</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {['24h', '48h', 'custom'].map((value) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                      form.slaWindow === value
                        ? 'border-sun-orange bg-orange-50/40 text-orange-950 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="mb-1 flex items-center gap-2">
                      <input
                        type="radio"
                        name="sla"
                        value={value}
                        aria-label={SLA_LABEL[value]}
                        checked={form.slaWindow === value}
                        onChange={() => set('slaWindow', value)}
                      />
                      <span className="font-bold">{SLA_LABEL[value]}</span>
                    </span>
                    <span className="block pl-5 text-[11px] text-slate-500">
                      {value === '24h'
                        ? 'Pack and stage the same day where possible.'
                        : value === '48h'
                          ? 'Two business days from order to handover.'
                          : 'Built-to-order or heavy freight.'}
                    </span>
                  </label>
                ))}
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500">
                Nothing in the order pipeline enforces this choice. The database checks whether a
                package may move to the next status; it never compares the move against a target
                window, so no SLA score is computed from it.
              </p>
            </section>
          </form>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Currently stored</h2>
              {settingsQuery.data ? (
                <dl className="space-y-2 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Standard rate</dt>
                    <dd className="font-bold text-slate-900">
                      {money(settingsQuery.data.standardRate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Express rate</dt>
                    <dd className="font-bold text-slate-900">
                      {money(settingsQuery.data.expressRate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Free shipping</dt>
                    <dd className="font-bold text-slate-900">
                      {settingsQuery.data.freeShippingEnabled
                        ? `over ${money(settingsQuery.data.freeShippingThreshold)}`
                        : 'off'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Handling window</dt>
                    <dd className="font-bold text-slate-900">
                      {SLA_LABEL[settingsQuery.data.slaWindow] ?? settingsQuery.data.slaWindow}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                    <dt className="text-slate-500">Origin</dt>
                    <dd className="max-w-[60%] text-right font-bold text-slate-900">
                      {settingsQuery.data.warehouseName || 'not recorded'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-[11px] text-slate-500">
                  {settingsQuery.isLoading ? 'Loading…' : 'No settings row has been saved yet.'}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
