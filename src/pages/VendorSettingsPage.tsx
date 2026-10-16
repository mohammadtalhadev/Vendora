import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Loader2,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  useNotificationPrefs,
  useSaveNotificationPrefs,
  useUpdateVendorStore,
  useVendorStore,
} from '../features/vendor/hooks/useVendorStore';
import type { VendorNotificationPrefs } from '../features/vendor/api/shipping';
import type { VendorStore, VendorStoreUpdate } from '../features/vendor/api/store';

type Tab = 'general' | 'policies' | 'settlement' | 'alerts';

/** The tabs that write `vendor_profiles` columns; the alerts tab writes the preferences bag. */
type SettlementTab = Exclude<Tab, 'alerts'>;

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
/**
 * The ui Input is a storefront capsule (h-11, rounded-full, text-sm); the
 * settings grid is a dense panel surface, so the primitive is reined back
 * to the panel's own geometry — same control, same focus/error
 * treatment, panel density.
 */
const PANEL_INPUT = 'h-9 rounded-lg px-3 text-xs';
const PANEL_TEXTAREA = 'min-h-0 rounded-lg px-3 py-2 text-xs';

/** One percent is one hundredth of the stored fraction; the divisor is a constant, never a field. */
const PER_HUNDRED = 100;

/**
 * `vendor_profiles.payout_schedule check (payout_schedule in ('daily','weekly','biweekly'))` -
 * anything else is a constraint violation, so it is refused here instead of being sent.
 */
const PAYOUT_SCHEDULES = ['daily', 'weekly', 'biweekly'] as const;
type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

function payoutScheduleOf(input: string): { value: PayoutSchedule } | { error: string } {
  const matched = PAYOUT_SCHEDULES.find((entry) => entry === input);
  return matched
    ? { value: matched }
    : { error: `The payout schedule column only accepts ${PAYOUT_SCHEDULES.join(', ')}.` };
}

/**
 * `vendor_profiles.payout_reserve_pct` is `numeric(4,3) not null default 0
 * check (payout_reserve_pct between 0 and 1)` - a fraction, held to three decimal places.
 * A value outside it is refused here rather than sent, because Postgres would answer with a
 * constraint error after the seller already saw a form that looked right.
 */
function reserveFractionOf(input: string): { value: number } | { error: string } {
  const percent = Number.parseFloat(input);
  if (!Number.isFinite(percent)) {
    return { error: 'Reserve must be a number of percent - 0 to 100.' };
  }
  if (percent < 0 || percent > 100) {
    return { error: `The column rejects a reserve outside 0-100%. ${percent}% was not sent.` };
  }
  // Round to the column's own precision instead of letting Postgres quietly store something
  // other than what was typed.
  const value = Math.round((percent / PER_HUNDRED) * 1000) / 1000;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return { error: 'Reserve could not be turned into a fraction between 0 and 1.' };
  }
  return { value };
}

/** The columns each tab owns. Saving one tab writes only these, never the whole form. */
const TAB_FIELDS: Record<SettlementTab, (keyof StoreForm)[]> = {
  general: [
    'storeName',
    'slug',
    'tagline',
    'description',
    'logo',
    'banner',
    'supportEmail',
    'supportPhone',
    'vacationMode',
    'vacationMessage',
    'carriers',
  ],
  policies: [
    'returnWindowDays',
    'restockingFee',
    'returnShippingPayer',
    'warrantyPeriod',
    'autoApproveReturns',
  ],
  settlement: ['payoutSchedule', 'payoutReservePct'],
};

const TAB_SAVE_LABEL: Record<SettlementTab, string> = {
  general: 'Storefront & contact',
  policies: 'Return & warranty policy',
  settlement: 'Settlement preferences',
};

/**
 * Only the active tab's columns, validated against the column's own constraints.
 * A refusal names the field that caused it so the form can hang the
 * error on that field through FormField, not only in the tab-level notice.
 */
function updatesForTab(
  tab: SettlementTab,
  form: StoreForm,
): VendorStoreUpdate | { error: string; field?: keyof StoreForm } {
  if (tab === 'general') {
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
    // Both columns are `not null`, and `slug` is also `unique`: an empty one either moves the
    // storefront off its address or collides with another store's row.
    if (!form.storeName.trim()) {
      return { error: 'The store display name cannot be saved empty.', field: 'storeName' };
    }
    if (!slug) {
      return {
        error: 'The URL slug cannot be saved empty - it is the address buyers use.',
        field: 'slug',
      };
    }
    return {
      storeName: form.storeName.trim(),
      slug,
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
    };
  }

  if (tab === 'policies') {
    const days = Number.parseFloat(form.returnWindowDays);
    if (!Number.isFinite(days) || days < 0 || days > 365) {
      return {
        error: 'The return window has to be a whole number of days between 0 and 365.',
        field: 'returnWindowDays',
      };
    }
    const fee = Number.parseFloat(form.restockingFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
      return {
        error: 'Restocking fee must be a percentage between 0 and 100.',
        field: 'restockingFee',
      };
    }
    return {
      returnWindowDays: Math.round(days),
      // `restocking_fee` is numeric(12,2): rounded here so the column cannot store a
      // number of pennies the seller never typed.
      restockingFee: Math.round(fee * 100) / 100,
      returnShippingPayer: form.returnShippingPayer === 'seller' ? 'seller' : 'buyer',
      warrantyPeriod: form.warrantyPeriod,
      autoApproveReturns: form.autoApproveReturns,
    };
  }

  const schedule = payoutScheduleOf(form.payoutSchedule);
  if ('error' in schedule) return { error: schedule.error, field: 'payoutSchedule' };
  const reserve = reserveFractionOf(form.payoutReservePct);
  if ('error' in reserve) return { error: reserve.error, field: 'payoutReservePct' };
  return {
    payoutSchedule: schedule.value,
    payoutReservePct: reserve.value,
  };
}

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

/** Which tab made the last attempt, and what came back. A notice never travels between tabs. */
type Notice = { kind: 'success' | 'error'; tab: Tab; message: string };

export const VendorSettingsPage: React.FC = () => {
  const storeQuery = useVendorStore();
  const updateStore = useUpdateVendorStore();
  const prefsQuery = useNotificationPrefs();
  const savePrefs = useSaveNotificationPrefs();

  const [tab, setTab] = useState<Tab>('general');
  const [form, setForm] = useState<StoreForm>(BLANK_FORM);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Per-field refusals from the last save attempt, keyed by the field that caused them. */
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof StoreForm, string>>>({});
  /** The tab whose write is in flight, so its button, switch and dot show it and no other's. */
  const [savingTab, setSavingTab] = useState<Tab | null>(null);
  const [savingPref, setSavingPref] = useState<keyof VendorNotificationPrefs | null>(null);
  const successTimer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (successTimer.current !== null) {
      window.clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }, []);

  // The success timer never sets state on a page that has already unmounted.
  useEffect(() => clearTimer, [clearTimer]);

  const store = storeQuery.data;
  /** The saved row, in the form's own shape: the baseline a tab is measured dirty against. */
  const savedForm = store ? formOf(store) : BLANK_FORM;

  useEffect(() => {
    if (store) setForm(formOf(store));
  }, [store]);

  const showNotice = useCallback((next: Notice) => {
    clearTimer();
    setNotice(next);
    // A success fades on its own; an error stays until the value behind it is edited,
    // another write runs, or the seller moves to a different tab.
    if (next.kind === 'success') {
      successTimer.current = window.setTimeout(() => {
        successTimer.current = null;
        setNotice((current) => (current === next ? null : current));
      }, 3500);
    }
  }, [clearTimer]);

  const set = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // The rejected value has just been changed, so the refusals that named it are spent.
    setNotice((current) =>
      current && current.kind === 'error' && current.tab === tab ? null : current,
    );
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const saveStore = (target: SettlementTab, updates: VendorStoreUpdate) => {
    setSavingTab(target);
    updateStore.mutate(updates, {
      onSuccess: (saved) => {
        // `updateVendorStore` re-reads the row after the write, so this is the database's own
        // copy: the tab re-baselines against it and stops being dirty.
        setForm(formOf(saved));
        showNotice({
          kind: 'success',
          tab: target,
          message: `${TAB_SAVE_LABEL[target]} saved - re-read from your store row`,
        });
      },
      // The write failed, so nothing is claimed and the form keeps the seller's text.
      onError: (cause: Error) =>
        showNotice({
          kind: 'error',
          tab: target,
          message: `${TAB_SAVE_LABEL[target]} was not saved: ${cause.message}`,
        }),
      onSettled: () => setSavingTab((current) => (current === target ? null : current)),
    });
  };

  const activeTab = tab === 'alerts' ? null : tab;
  const isTabDirty =
    activeTab !== null && TAB_FIELDS[activeTab].some((key) => form[key] !== savedForm[key]);
  /** This tab's own pending state: a write started from another tab never greys this one out. */
  const tabSaving = activeTab !== null && savingTab === activeTab && updateStore.isPending;

  const reserveInput = reserveFractionOf(form.payoutReservePct);

  /** Saves only the visible tab's columns, and refuses a value the column cannot hold. */
  const saveActiveTab = () => {
    if (!activeTab) return;
    const built = updatesForTab(activeTab, form);
    if ('error' in built) {
      // The refusal shows twice on purpose: on the field that caused it, and
      // in the tab notice, which is where a keyboard/AT user lands after the
      // save button. A refusal with no field keeps only the notice.
      setFieldErrors(built.field ? { [built.field]: built.error } : {});
      showNotice({ kind: 'error', tab: activeTab, message: built.error });
      return;
    }
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of TAB_FIELDS[activeTab]) delete next[key];
      return next;
    });
    saveStore(activeTab, built);
  };

  const prefs = prefsQuery.data;

  /** Roving focus for the tablist: the tabs are one stop in the tab order, arrows move it. */
  const tabListRef = useRef<HTMLDivElement>(null);
  const moveTabFocus = (index: number) => {
    const next = TABS[(index + TABS.length) % TABS.length];
    setTab(next.id);
    tabListRef.current
      ?.querySelector<HTMLButtonElement>(`#settings-tab-${next.id}`)
      ?.focus();
  };

  const onTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    if (index === -1) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTabFocus(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTabFocus(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTabFocus(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTabFocus(TABS.length - 1);
    }
  };

  const setPref = (key: keyof VendorNotificationPrefs, value: boolean, title: string) => {
    const patch: Partial<VendorNotificationPrefs> = {};
    patch[key] = value;
    setSavingTab('alerts');
    setSavingPref(key);
    savePrefs.mutate(patch, {
      // The bag is written and re-read, so the switch shows what the row holds either way.
      onSuccess: () =>
        showNotice({
          kind: 'success',
          tab: 'alerts',
          message: `${title} turned ${value ? 'on' : 'off'} and re-read from your store`,
        }),
      onError: (cause: Error) =>
        showNotice({ kind: 'error', tab: 'alerts', message: `${title} was not saved: ${cause.message}` }),
      onSettled: () => {
        setSavingTab((current) => (current === 'alerts' ? null : current));
        setSavingPref(null);
      },
    });
  };

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">
              SETTINGS <span className="text-slate-300">/</span> STORE
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Store Settings
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Your store&apos;s details and notification preferences. Saving applies to the tab
              you are looking at.
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
                <ExternalLink className="h-4 w-4 text-slate-500" aria-hidden="true" />
                View public storefront
              </Link>
            )}
            <button
              type="button"
              onClick={() => store && setForm(formOf(store))}
              disabled={!store || !isTabDirty || tabSaving}
              className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Revert this tab
            </button>
            {activeTab ? (
              <button
                type="button"
                onClick={saveActiveTab}
                disabled={updateStore.isPending || !store || !isTabDirty}
                aria-live="polite"
                title={
                  isTabDirty
                    ? `Writes only the ${TAB_SAVE_LABEL[activeTab]} columns`
                    : 'Nothing on this tab has changed to write'
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tabSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {tabSaving
                  ? `Saving ${TAB_SAVE_LABEL[activeTab]}…`
                  : isTabDirty
                    ? `Save ${TAB_SAVE_LABEL[activeTab]}`
                    : 'Nothing to save'}
              </button>
            ) : (
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500">
                Each switch saves itself
              </span>
            )}
          </div>
        </div>

        {storeQuery.isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xs"
          >
            Loading your store record…
          </div>
        )}
        {storeQuery.error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {(storeQuery.error as Error).message}
          </div>
        )}
        {notice && notice.tab === tab && notice.kind === 'success' && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {notice.message}
          </div>
        )}
        {notice && notice.tab === tab && notice.kind === 'error' && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {notice.message}
          </div>
        )}

        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Store settings sections"
          onKeyDown={onTabListKeyDown}
          className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-1 text-xs font-bold"
          data-lenis-prevent
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const isCurrent = tab === item.id;
            const isSaving = savingTab === item.id;
            const unsaved =
              item.id !== 'alerts' &&
              TAB_FIELDS[item.id].some((key) => form[key] !== savedForm[key]);
            return (
              <button
                key={item.id}
                id={`settings-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-controls="settings-panel"
                tabIndex={isCurrent ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 transition-all ${
                  isCurrent ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
                {isSaving ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    saving
                  </span>
                ) : unsaved ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    <span className="sr-only">unsaved changes on this tab</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div
            role="tabpanel"
            id="settings-panel"
            aria-labelledby={`settings-tab-${tab}`}
            tabIndex={-1}
            className="space-y-6 lg:col-span-8"
          >
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
                    <FormField
                      label="Store display name"
                      htmlFor="store-name"
                      error={fieldErrors.storeName}
                      required
                    >
                      <Input
                        id="store-name"
                        value={form.storeName}
                        onChange={(event) => set('storeName', event.target.value)}
                        className={PANEL_INPUT}
                        hasError={!!fieldErrors.storeName}
                        aria-invalid={!!fieldErrors.storeName}
                      />
                    </FormField>
                    <FormField
                      label="URL slug"
                      htmlFor="store-slug"
                      error={fieldErrors.slug}
                      hint="Spaces become hyphens when saved. A buyer reaching you by slug uses this value, so changing it moves the link."
                      required
                    >
                      <Input
                        id="store-slug"
                        value={form.slug}
                        onChange={(event) => set('slug', event.target.value)}
                        className={`${PANEL_INPUT} font-mono`}
                        hasError={!!fieldErrors.slug}
                        aria-invalid={!!fieldErrors.slug}
                      />
                    </FormField>
                    <FormField label="Tagline" htmlFor="store-tagline" className="sm:col-span-2">
                      <Input
                        id="store-tagline"
                        value={form.tagline}
                        onChange={(event) => set('tagline', event.target.value)}
                        className={PANEL_INPUT}
                      />
                    </FormField>
                    <FormField
                      label="About this store"
                      htmlFor="store-description"
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id="store-description"
                        rows={4}
                        value={form.description}
                        onChange={(event) => set('description', event.target.value)}
                        className={`${PANEL_TEXTAREA} leading-relaxed`}
                      />
                    </FormField>
                    <FormField label="Logo URL" htmlFor="store-logo">
                      <Input
                        id="store-logo"
                        value={form.logo}
                        onChange={(event) => set('logo', event.target.value)}
                        className={`${PANEL_INPUT} font-mono`}
                        placeholder="https://…"
                      />
                    </FormField>
                    <FormField label="Banner URL" htmlFor="store-banner">
                      <Input
                        id="store-banner"
                        value={form.banner}
                        onChange={(event) => set('banner', event.target.value)}
                        className={`${PANEL_INPUT} font-mono`}
                        placeholder="https://…"
                      />
                    </FormField>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500">
                    To host a file, upload it to the Storefront Banners folder on the
                    Files &amp; Media page and paste the address it gives you here.
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
                    <FormField label="Support email" htmlFor="support-email">
                      <Input
                        id="support-email"
                        type="email"
                        value={form.supportEmail}
                        onChange={(event) => set('supportEmail', event.target.value)}
                        className={PANEL_INPUT}
                      />
                    </FormField>
                    <FormField label="Support phone" htmlFor="support-phone">
                      <Input
                        id="support-phone"
                        value={form.supportPhone}
                        onChange={(event) => set('supportPhone', event.target.value)}
                        className={PANEL_INPUT}
                      />
                    </FormField>
                    <FormField
                      label="Carriers (comma separated)"
                      htmlFor="carriers"
                      hint="A description only. No carrier API is connected, and a rider is assigned by the platform, not chosen from this list."
                      className="sm:col-span-2"
                    >
                      <Input
                        id="carriers"
                        value={form.carriers}
                        onChange={(event) => set('carriers', event.target.value)}
                        className={PANEL_INPUT}
                        placeholder="DHL Express, UPS, Local courier"
                      />
                    </FormField>
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
                    <FormField label="Notice shown on your dashboard" htmlFor="vacation-message">
                      <Input
                        id="vacation-message"
                        value={form.vacationMessage}
                        onChange={(event) => set('vacationMessage', event.target.value)}
                        className={PANEL_INPUT}
                      />
                    </FormField>
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
                  <FormField
                    label="Return window (days after delivery)"
                    htmlFor="return-window"
                    error={fieldErrors.returnWindowDays}
                  >
                    <Input
                      id="return-window"
                      type="number"
                      min="0"
                      max="365"
                      value={form.returnWindowDays}
                      onChange={(event) => set('returnWindowDays', event.target.value)}
                      className={PANEL_INPUT}
                      hasError={!!fieldErrors.returnWindowDays}
                      aria-invalid={!!fieldErrors.returnWindowDays}
                    />
                  </FormField>
                  <FormField
                    label="Restocking fee (percent of goods, 0-100)"
                    htmlFor="restocking-fee"
                    error={fieldErrors.restockingFee}
                  >
                    <Input
                      id="restocking-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.restockingFee}
                      onChange={(event) => set('restockingFee', event.target.value)}
                      className={PANEL_INPUT}
                      hasError={!!fieldErrors.restockingFee}
                      aria-invalid={!!fieldErrors.restockingFee}
                    />
                  </FormField>
                  <div role="group" aria-labelledby="return-payer-label">
                    <span id="return-payer-label" className={LABEL}>
                      Who pays return freight
                    </span>
                    <div className="flex gap-4 pt-1">
                      {['buyer', 'seller'].map((value) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="return_payer"
                            value={value}
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
                  <FormField label="Warranty statement" htmlFor="warranty-period">
                    <Input
                      id="warranty-period"
                      value={form.warrantyPeriod}
                      onChange={(event) => set('warrantyPeriod', event.target.value)}
                      className={PANEL_INPUT}
                      placeholder="1 year, parts and labour"
                    />
                  </FormField>
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
                      Not active yet. A return stays &quot;requested&quot; until you decide it on
                      the Returns page, and the restocking fee above is not deducted
                      automatically.
                    </span>
                  </span>
                </label>

                <p className="text-[11px] leading-relaxed text-slate-500">
                  These terms are not shown on your storefront — buyers see the platform returns
                  policy and your listing copy.
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
                  <FormField
                    label="Preferred cadence"
                    htmlFor="payout-schedule"
                    error={fieldErrors.payoutSchedule}
                    hint="Stored on your row. No scheduler reads it - a payout happens when you request one on the Payouts page."
                  >
                    <select
                      id="payout-schedule"
                      value={form.payoutSchedule}
                      onChange={(event) => set('payoutSchedule', event.target.value)}
                      className={`${FIELD} native-select`}
                      aria-invalid={!!fieldErrors.payoutSchedule}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every two weeks</option>
                    </select>
                  </FormField>

                  <div>
                    <label className={LABEL} htmlFor="payout-reserve">
                      Held back as reserve (percent)
                    </label>
                    <Input
                      id="payout-reserve"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.payoutReservePct}
                      onChange={(event) => set('payoutReservePct', event.target.value)}
                      aria-invalid={'error' in reserveInput}
                      aria-describedby="payout-reserve-help"
                      hasError={'error' in reserveInput}
                      className={PANEL_INPUT}
                    />
                    <span
                      id="payout-reserve-help"
                      className={
                        'error' in reserveInput
                          ? 'mt-1 block text-[11px] font-bold text-rose-700'
                          : 'mt-1 block text-[11px] text-slate-400'
                      }
                    >
                      {'error' in reserveInput
                        ? reserveInput.error
                        : `Stores ${reserveInput.value.toFixed(3)} in the column. This one is live: your ` +
                          'available balance is earned net payout minus this percentage, so raising it ' +
                          'immediately lowers what you can withdraw.'}
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
                    <Wallet className="h-4 w-4 text-slate-500" aria-hidden="true" />
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

                {prefsQuery.isLoading && (
                  <p role="status" aria-live="polite" className="text-[11px] text-slate-500">
                    Loading…
                  </p>
                )}
                {prefsQuery.error && (
                  <p
                    role="alert"
                    aria-live="assertive"
                    className="text-[11px] font-bold text-rose-700"
                  >
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
                        <span className="flex items-center gap-1.5">
                          {savingPref === key && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              saving
                            </span>
                          )}
                          <input
                            type="checkbox"
                            checked={prefs[key]}
                            onChange={(event) => setPref(key, event.target.checked, title)}
                            disabled={savePrefs.isPending}
                            className="mt-0.5 h-4 w-4 rounded"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
                  Email alerts are not sent yet — these switches take effect once email
                  notifications go live.
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 text-xs shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden="true" />
                Closing the store
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">
                To close your store, open a ticket on the Help &amp; Support page and the Vendora
                team will suspend it for you.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
