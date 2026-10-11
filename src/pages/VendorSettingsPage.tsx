import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Wallet,
  RotateCcw,
  BellRing,
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import {
  useNotificationPrefs,
  useSaveNotificationPrefs,
  useUpdateVendorStore,
  useVendorStore,
} from '../features/vendor/hooks/useVendorStore';
import type { VendorNotificationPrefs } from '../features/vendor/api/shipping';
import type { VendorStore, VendorStoreUpdate } from '../features/vendor/api/store';

type Tab = 'general' | 'policies' | 'settlement' | 'alerts';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'Storefront & Contact', icon: Store },
  { id: 'policies', label: 'Return & Warranty Policy', icon: RotateCcw },
  { id: 'settlement', label: 'Settlement', icon: Wallet },
  { id: 'alerts', label: 'Operational Alerts', icon: BellRing },
];

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-2xs space-y-4';
const FIELD =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-900 focus:outline-none';
const LABEL = 'mb-1 block font-bold text-slate-700';

const number = (value: string, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** The form holds numbers as strings so a half-typed value does not become NaN. */
type StoreForm = {
  storeName: string;
  slug: string;
  tagline: string;
  description: string;
  logo: string;
  banner: string;
  supportEmail: string;
  supportPhone: string;
  vacationMode: boolean;
  vacationMessage: string;
  carriers: string;
  returnWindowDays: string;
  restockingFee: string;
  returnShippingPayer: string;
  warrantyPeriod: string;
  autoApproveReturns: boolean;
  payoutSchedule: string;
  payoutReservePct: string;
};

const BLANK_FORM: StoreForm = {
  storeName: '',
  slug: '',
  tagline: '',
  description: '',
  logo: '',
  banner: '',
  supportEmail: '',
  supportPhone: '',
  vacationMode: false,
  vacationMessage: '',
  carriers: '',
  returnWindowDays: '30',
  restockingFee: '0',
  returnShippingPayer: 'buyer',
  warrantyPeriod: '',
  autoApproveReturns: false,
  payoutSchedule: 'weekly',
  payoutReservePct: '0',
};

function formOf(store: VendorStore): StoreForm {
  return {
    storeName: store.storeName,
    slug: store.slug,
    tagline: store.tagline,
    description: store.description,
    logo: store.logo,
    banner: store.banner ?? '',
    supportEmail: store.supportEmail ?? '',
    supportPhone: store.supportPhone ?? '',
    vacationMode: store.vacationMode,
    vacationMessage: store.vacationMessage,
    carriers: store.carriers.join(', '),
    returnWindowDays: String(store.returnWindowDays),
    restockingFee: String(store.restockingFee),
    returnShippingPayer: store.returnShippingPayer,
    warrantyPeriod: store.warrantyPeriod,
    autoApproveReturns: store.autoApproveReturns,
    payoutSchedule: store.payoutSchedule,
    payoutReservePct: (store.payoutReservePct * 100).toFixed(1).replace(/\.0$/, ''),
  };
}

export const VendorSettingsPage: React.FC = () => {
  const storeQuery = useVendorStore();
  const updateStore = useUpdateVendorStore();
  const prefsQuery = useNotificationPrefs();
  const savePrefs = useSaveNotificationPrefs();

  const [tab, setTab] = useState<Tab>('general');
  const [form, setForm] = useState<StoreForm>(BLANK_FORM);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const store = storeQuery.data;

  useEffect(() => {
    if (store) setForm(formOf(store));
  }, [store]);

  const set = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const showSaved = (message: string) => {
    setBanner(message);
    window.setTimeout(() => setBanner(null), 3500);
  };

  const saveStore = (updates: VendorStoreUpdate, message: string) => {
    setError(null);
    updateStore.mutate(updates, {
      onSuccess: (saved) => {
        setForm(formOf(saved));
        showSaved(message);
      },
      onError: (cause: Error) => setError(cause.message),
    });
  };

  const buildDraft = (): VendorStoreUpdate => ({
    storeName: form.storeName.trim(),
    slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
    tagline: form.tagline.trim(),
    description: form.description,
    logo: form.logo.trim(),
    banner: form.banner.trim(),
    supportEmail: form.supportEmail.trim(),
    supportPhone: form.supportPhone.trim(),
    vacationMode: form.vacationMode,
    vacationMessage: form.vacationMessage,
    carriers: form.carriers
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    returnWindowDays: Math.round(number(form.returnWindowDays, 30)),
    restockingFee: number(form.restockingFee),
    returnShippingPayer: form.returnShippingPayer === 'seller' ? 'seller' : 'buyer',
    warrantyPeriod: form.warrantyPeriod,
    autoApproveReturns: form.autoApproveReturns,
    payoutSchedule: form.payoutSchedule,
    payoutReservePct: number(form.payoutReservePct) / 100,
  });

  const prefs = prefsQuery.data;

  const setPref = (key: keyof VendorNotificationPrefs, value: boolean, title: string) => {
    const patch: Partial<VendorNotificationPrefs> = {};
    patch[key] = value;
    setError(null);
    savePrefs.mutate(patch, {
      onSuccess: () => showSaved(`${title} ${value ? 'on' : 'off'}`),
      onError: (cause: Error) => setError(cause.message),
    });
  };

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              SETTINGS <span className="text-slate-300">/</span> STORE
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Store Settings
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Every field here is a column on your own <code>vendor_profiles</code> row or your
              notification preferences, and saving re-reads the row so the form shows what the
              database kept.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {store && (
              <Link
                to={`/vendors/${store.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4 text-slate-500" />
                View public storefront
              </Link>
            )}
            <button
              type="button"
              onClick={() => store && setForm(formOf(store))}
              disabled={!store}
              className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Revert to saved
            </button>
            <button
              type="button"
              onClick={() => saveStore(buildDraft(), 'Store settings saved')}
              disabled={updateStore.isPending || !store}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {updateStore.isPending ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>

        {storeQuery.isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xs">
            Loading your store record…
          </div>
        )}
        {storeQuery.error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            {(storeQuery.error as Error).message}
          </div>
        )}
        {banner && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {banner}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-1 text-xs font-bold" data-lenis-prevent>
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 transition-all ${
                  tab === item.id ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {tab === 'general' && (
              <>
                <section className={CARD}>
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">Storefront identity</h2>
                    <p className="text-[11px] text-slate-500">
                      These columns are what a buyer sees on your public store page.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="store-name">
                        Store display name
                      </label>
                      <input
                        id="store-name"
                        value={form.storeName}
                        onChange={(event) => set('storeName', event.target.value)}
                        className={FIELD}
                      />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="store-slug">
                        URL slug
                      </label>
                      <input
                        id="store-slug"
                        value={form.slug}
                        onChange={(event) => set('slug', event.target.value)}
                        className={`${FIELD} font-mono`}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Spaces become hyphens when saved. A buyer reaching you by slug uses this
                        value, so changing it moves the link.
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL} htmlFor="store-tagline">
                        Tagline
                      </label>
                      <input
                        id="store-tagline"
                        value={form.tagline}
                        onChange={(event) => set('tagline', event.target.value)}
                        className={FIELD}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL} htmlFor="store-description">
                        About this store
                      </label>
                      <textarea
                        id="store-description"
                        rows={4}
                        value={form.description}
                        onChange={(event) => set('description', event.target.value)}
                        className={`${FIELD} leading-relaxed`}
                      />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="store-logo">
                        Logo URL
                      </label>
                      <input
                        id="store-logo"
                        value={form.logo}
                        onChange={(event) => set('logo', event.target.value)}
                        className={`${FIELD} font-mono`}
                        placeholder="https://…"
                      />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="store-banner">
                        Banner URL
                      </label>
                      <input
                        id="store-banner"
                        value={form.banner}
                        onChange={(event) => set('banner', event.target.value)}
                        className={`${FIELD} font-mono`}
                        placeholder="https://…"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Images are stored as a URL on your profile row. To host a file, upload it on
                    the Files &amp; Media page and paste the address it gives you - a pasted
                    base64 blob would be stored too, and it makes every read of your store heavy.
                  </p>
                </section>

                <section className={CARD}>
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">Contact &amp; carriers</h2>
                    <p className="text-[11px] text-slate-500">
                      Where buyers reach you, and the carriers you list on your storefront.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="support-email">
                        Support email
                      </label>
                      <input
                        id="support-email"
                        type="email"
                        value={form.supportEmail}
                        onChange={(event) => set('supportEmail', event.target.value)}
                        className={FIELD}
                      />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="support-phone">
                        Support phone
                      </label>
                      <input
                        id="support-phone"
                        value={form.supportPhone}
                        onChange={(event) => set('supportPhone', event.target.value)}
                        className={FIELD}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL} htmlFor="carriers">
                        Carriers (comma separated)
                      </label>
                      <input
                        id="carriers"
                        value={form.carriers}
                        onChange={(event) => set('carriers', event.target.value)}
                        className={FIELD}
                        placeholder="DHL Express, UPS, Local courier"
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        A description only. No carrier API is connected, and a rider is assigned by
                        the platform, not chosen from this list.
                      </span>
                    </div>
                  </div>
                </section>

                <section className={CARD}>
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">Vacation mode</h2>
                    <p className="text-[11px] text-slate-500">
                      A flag and a message on your store row.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={form.vacationMode}
                      onChange={(event) => set('vacationMode', event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded"
                    />
                    <span>
                      <span className="block font-bold text-slate-900">Paused for new orders</span>
                      <span className="text-[11px] text-slate-500">
                        Your dashboard banner reads this flag. Checkout does not: a buyer can still
                        complete an order while it is on, so keep listings honest separately.
                      </span>
                    </span>
                  </label>

                  {form.vacationMode && (
                    <div>
                      <label className={LABEL} htmlFor="vacation-message">
                        Notice shown on your dashboard
                      </label>
                      <input
                        id="vacation-message"
                        value={form.vacationMessage}
                        onChange={(event) => set('vacationMessage', event.target.value)}
                        className={FIELD}
                      />
                    </div>
                  )}
                </section>
              </>
            )}

            {tab === 'policies' && (
              <section className={CARD}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Return &amp; warranty policy</h2>
                  <p className="text-[11px] text-slate-500">
                    Stored on your store row so the terms you publish are the terms you can read
                    back.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={LABEL} htmlFor="return-window">
                      Return window (days after delivery)
                    </label>
                    <input
                      id="return-window"
                      type="number"
                      min="0"
                      max="365"
                      value={form.returnWindowDays}
                      onChange={(event) => set('returnWindowDays', event.target.value)}
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="restocking-fee">
                      Restocking fee (percent of goods, 0-100)
                    </label>
                    <input
                      id="restocking-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.restockingFee}
                      onChange={(event) => set('restockingFee', event.target.value)}
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <span className={LABEL}>Who pays return freight</span>
                    <div className="flex gap-4 pt-1">
                      {['buyer', 'seller'].map((value) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="return_payer"
                            checked={form.returnShippingPayer === value}
                            onChange={() => set('returnShippingPayer', value)}
                          />
                          <span className="font-medium text-slate-700">
                            {value === 'buyer' ? 'Deducted from the buyer refund' : 'Prepaid by the store'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="warranty-period">
                      Warranty statement
                    </label>
                    <input
                      id="warranty-period"
                      value={form.warrantyPeriod}
                      onChange={(event) => set('warrantyPeriod', event.target.value)}
                      className={FIELD}
                      placeholder="1 year, parts and labour"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 border-t border-slate-100 pt-3">
                  <input
                    type="checkbox"
                    checked={form.autoApproveReturns}
                    onChange={(event) => set('autoApproveReturns', event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded"
                  />
                  <span>
                    <span className="block font-bold text-slate-900">Auto-approve returns</span>
                    <span className="text-[11px] text-slate-500">
                      Saved and readable, but nothing acts on it. A return stays
                      &quot;requested&quot; until you decide it on the Returns page, and the refund
                      the database books is the goods total - it does not subtract the restocking
                      fee you set above.
                    </span>
                  </span>
                </label>

                <p className="text-[11px] leading-relaxed text-slate-500">
                  Publish these terms honestly: no page in the storefront currently displays them,
                  so a buyer&apos;s expectation comes from your listing copy and the platform
                  policy, not from this row.
                </p>
              </section>
            )}

            {tab === 'settlement' && (
              <section className={CARD}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Settlement preferences</h2>
                  <p className="text-[11px] text-slate-500">
                    One of these two fields changes real money; the other is a note.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={LABEL} htmlFor="payout-schedule">
                      Preferred cadence
                    </label>
                    <select
                      id="payout-schedule"
                      value={form.payoutSchedule}
                      onChange={(event) => set('payoutSchedule', event.target.value)}
                      className={FIELD}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every two weeks</option>
                    </select>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Stored on your row. No scheduler reads it - a payout happens when you
                      request one on the Payouts page.
                    </span>
                  </div>

                  <div>
                    <label className={LABEL} htmlFor="payout-reserve">
                      Held back as reserve (percent)
                    </label>
                    <input
                      id="payout-reserve"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.payoutReservePct}
                      onChange={(event) => set('payoutReservePct', event.target.value)}
                      className={FIELD}
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">
                      This one is live: your available balance is earned net payout minus this
                      percentage, so raising it immediately lowers what you can withdraw.
                    </span>
                  </div>
                </div>

                {store && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-600">
                    <div className="font-bold text-slate-800">Your store record</div>
                    <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
                      <span>
                        Seller type: <strong>{store.sellerType}</strong>
                      </span>
                      <span>
                        Status: <strong>{store.status}</strong>
                      </span>
                      <span>
                        Rating: <strong>{store.rating.toFixed(2)}</strong> from{' '}
                        <strong>{store.reviewCount}</strong> reviews
                      </span>
                      <span>
                        Opened: <strong>{new Date(store.createdAt).toLocaleDateString()}</strong>
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <Link
                    to="/vendor/payouts"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <Wallet className="h-4 w-4 text-slate-500" />
                    Bank accounts and payout requests live on the Payouts page
                  </Link>
                </div>
              </section>
            )}

            {tab === 'alerts' && (
              <section className={CARD}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Operational alerts</h2>
                  <p className="text-[11px] text-slate-500">
                    Saved as one jsonb bag keyed to your store, and re-read after each write.
                  </p>
                </div>

                {prefsQuery.isLoading && <p className="text-[11px] text-slate-500">Loading…</p>}
                {prefsQuery.error && (
                  <p className="text-[11px] font-bold text-rose-700">
                    {(prefsQuery.error as Error).message}
                  </p>
                )}

                {prefs && (
                  <div className="space-y-3">
                    {(
                      [
                        ['smsDispatch', 'Dispatch SMS to the store phone', 'Order handover events'],
                        ['lowInventoryAlert', 'Low inventory warning', 'When a listing runs short'],
                        ['rmaPushAlert', 'Return and dispute pings', 'A buyer opens a return'],
                        ['dailyDigest', 'Daily settlement digest', 'End-of-day earnings summary'],
                      ] as [keyof VendorNotificationPrefs, string, string][]
                    ).map(([key, title, note]) => (
                      <label key={key} className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block font-bold text-slate-900">{title}</span>
                          <span className="text-[11px] text-slate-500">{note}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={prefs[key]}
                          onChange={(event) => setPref(key, event.target.checked, title)}
                          disabled={savePrefs.isPending}
                          className="mt-0.5 h-4 w-4 rounded"
                        />
                      </label>
                    ))}
                  </div>
                )}

                <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
                  These switches are stored and will gate the notification fan-out once realtime is
                  wired. Nothing sends them today, so switching one off changes no delivery.
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className={CARD}>
              <h2 className="text-sm font-bold text-slate-900">Not editable by a seller</h2>
              <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600">
                <li>
                  · <strong>Store status</strong> (active or suspended) - the owner update policy
                  freezes the column, so only staff can change it.
                </li>
                <li>
                  · <strong>Rating and review count</strong> - written by the review triggers, never
                  by this form.
                </li>
                <li>
                  · <strong>Commission rate</strong> - a platform decision on your row; the override
                  column is admin-only.
                </li>
                <li>
                  · <strong>Account roles</strong> - frozen by the profile update policy, so a
                  seller cannot promote themselves.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-[11px] leading-relaxed text-slate-500 shadow-xs">
              <div className="mb-2 font-bold uppercase tracking-wider text-slate-400">
                Not in this build
              </div>
              <p>
                There is no team-member table, so this page cannot invite staff or set per-user
                permissions - one account owns one store. There is also no tax form, entity
                registry or offboarding request stored anywhere; ask the Support desk for those and
                it becomes a ticket a person can action.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 text-xs shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Closing the store
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">
                No seller-facing RPC deactivates a store row, so there is no button here that would
                only look like it worked. Open a ticket on the Help &amp; Support page and staff
                suspend the store from the admin side.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
