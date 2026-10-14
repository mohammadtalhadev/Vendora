import React, { useState } from 'react';
import {
  RotateCcw,
  Check,
  Store,
  CreditCard,
  Scale,
  Banknote,
  Shield,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { usePlatformSettings } from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import type {
  PlatformSettings,
  PlatformSettingsPatch,
} from '../features/admin/api/settings';

/**
 * The platform settings console, wired to the one row of `platform_settings`.
 * Every field here is a column that row actually has; each section saves only
 * its own columns through `admin_save_platform_settings`, which stamps the
 * editor and records the before/after images in the audit trail.
 *
 * What the old page edited beyond that row — tax providers, gateway rails,
 * API rate limits, webhook endpoints, session policy — has no storage
 * anywhere in the schema, so it is gone rather than decorative: a form that
 * cannot save is a lie with better styling. The same goes for the "production
 * keys" it displayed: those values were invented in this file, and the
 * settings API holds no secrets at all, so there is nothing to mask or rotate.
 *
 * Currency is PKR only by the owner's decision: the control stays, with the
 * single option settlement actually runs on, and saving General settles the
 * stored row on PKR.
 */

type SettingsTab = 'general' | 'payouts' | 'policies';

/** The form edits text; the API's numbers are converted at the save boundary. */
interface SettingsDraft {
  platformName: string;
  supportEmail: string;
  payoutSchedule: string;
  minPayoutFloor: string;
  reserveRetentionDays: string;
  newListingReview: string;
  slaCeilingHours: string;
}

const toDraft = (settings: PlatformSettings): SettingsDraft => ({
  platformName: settings.platformName,
  supportEmail: settings.supportEmail,
  payoutSchedule: settings.payoutSchedule,
  minPayoutFloor: String(settings.minPayoutFloor),
  reserveRetentionDays: String(settings.reserveRetentionDays),
  newListingReview: settings.newListingReview,
  slaCeilingHours: String(settings.slaCeilingHours),
});

/** A blank or unparseable number is omitted from the patch, so it cannot erase the stored value. */
const numberOrOmit = (value: string): number | undefined => {
  const parsed = Number(value);
  return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed;
};

const SETTINGS_TABS: SettingsTab[] = ['general', 'payouts', 'policies'];

const PAYOUT_SCHEDULES = [
  'Bi-weekly on Monday',
  'Weekly on Friday',
  'Monthly (1st of month)',
  'Daily automatic sweep',
];

const LISTING_REVIEW_MODES = [
  'Moderate (Standard)',
  'Strict (Manual Review)',
  'Permissive (Post-Publish Scan)',
];

const FIELD =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden';
const SECTION_SAVE =
  'inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

export const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const settingsQuery = usePlatformSettings();
  const { savePlatformSettings } = useAdminActions();

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [savedSection, setSavedSection] = useState<SettingsTab | 'all' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSettingsTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = SETTINGS_TABS.indexOf(activeTab);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % SETTINGS_TABS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = SETTINGS_TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = SETTINGS_TABS[nextIndex];
    setActiveTab(nextTab);
    document.getElementById(`admin-settings-tab-${nextTab}`)?.focus();
  };

  if (settingsQuery.isPending) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Platform Settings" sidebar={<AdminNav />}>
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <Store className="h-4 w-4" />
          Reading the platform settings…
        </div>
      </WorkspaceLayout>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Platform Settings" sidebar={<AdminNav />}>
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold mb-1">Failed to load the platform settings</div>
          <div className="mb-3 text-xs">
            {settingsQuery.error instanceof Error
              ? settingsQuery.error.message
              : 'The settings row could not be read.'}
          </div>
          <button
            type="button"
            onClick={() => void settingsQuery.refetch()}
            className="inline-flex items-center rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  const stored = settingsQuery.data;
  const form = draft ?? toDraft(stored);
  const storedDraft = toDraft(stored);

  const edit = (patch: Partial<SettingsDraft>) => {
    setDraft({ ...form, ...patch });
    setSavedSection(null);
  };

  const sectionDirty = (fields: Array<keyof SettingsDraft>): boolean =>
    fields.some((field) => form[field] !== storedDraft[field]);

  const generalDirty =
    sectionDirty(['platformName', 'supportEmail']) || stored.defaultCurrency !== 'PKR';
  const payoutsDirty = sectionDirty(['payoutSchedule', 'minPayoutFloor', 'reserveRetentionDays']);
  const policiesDirty = sectionDirty(['newListingReview', 'slaCeilingHours']);
  const anyDirty = generalDirty || payoutsDirty || policiesDirty;

  const save = (section: SettingsTab | 'all', patch: PlatformSettingsPatch) => {
    setSaveError(null);
    savePlatformSettings.mutate(patch, {
      onSuccess: (saved) => {
        setDraft(toDraft(saved));
        setSavedSection(section);
        window.setTimeout(() => setSavedSection(null), 2500);
      },
      onError: (cause) => {
        setSaveError(cause instanceof Error ? cause.message : String(cause));
      },
    });
  };

  const saveGeneral = () =>
    save('general', {
      platformName: form.platformName,
      supportEmail: form.supportEmail,
      currency: 'PKR',
    });

  const savePayouts = () =>
    save('payouts', {
      payoutSchedule: form.payoutSchedule,
      minPayoutFloor: numberOrOmit(form.minPayoutFloor),
      reserveRetentionDays: numberOrOmit(form.reserveRetentionDays),
    });

  const savePolicies = () =>
    save('policies', {
      newListingReview: form.newListingReview,
      slaCeilingHours: numberOrOmit(form.slaCeilingHours),
    });

  const saveAll = () =>
    save('all', {
      platformName: form.platformName,
      supportEmail: form.supportEmail,
      currency: 'PKR',
      payoutSchedule: form.payoutSchedule,
      minPayoutFloor: numberOrOmit(form.minPayoutFloor),
      reserveRetentionDays: numberOrOmit(form.reserveRetentionDays),
      newListingReview: form.newListingReview,
      slaCeilingHours: numberOrOmit(form.slaCeilingHours),
    });

  const saving = savePlatformSettings.isPending;

  const sectionSaveButton = (
    section: SettingsTab,
    dirty: boolean,
    onSave: () => void,
  ) => (
    <button
      type="button"
      onClick={onSave}
      disabled={saving || !dirty}
      className={SECTION_SAVE}
    >
      <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
      <span aria-live="polite">
        {savedSection === section ? 'Saved' : `Save ${section === 'general' ? 'General' : section === 'payouts' ? 'Payouts' : 'Policies'}`}
      </span>
    </button>
  );

  const tabButton = (tab: SettingsTab, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      role="tab"
      id={`admin-settings-tab-${tab}`}
      aria-controls={`admin-settings-panel-${tab}`}
      aria-selected={activeTab === tab}
      tabIndex={activeTab === tab ? 0 : -1}
      onClick={() => setActiveTab(tab)}
      className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors cursor-pointer ${
        activeTab === tab
          ? 'border-slate-900 text-slate-900 bg-white'
          : 'border-transparent text-slate-500 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Platform Settings" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
              Platform Settings
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Marketplace identity, settlement rules and listing policy.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setSaveError(null);
              }}
              disabled={saving || !anyDirty}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Discard Changes
            </button>
            <Button type="button" variant="default" size="sm" onClick={saveAll} disabled={saving || !anyDirty}>
              <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              <span aria-live="polite">{savedSection === 'all' ? 'Saved Successfully!' : 'Save Configuration'}</span>
            </Button>
          </div>
        </div>

        {saveError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
          >
            <X className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div
          role="tablist"
          aria-label="Platform settings sections"
          onKeyDown={handleSettingsTabKeyDown}
          className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-px text-xs font-semibold text-slate-600"
        >
          {tabButton('general', 'General & Marketplace', Store)}
          {tabButton('payouts', 'Payouts & Settlement', CreditCard)}
          {tabButton('policies', 'Vendor Policies & SLAs', Scale)}
        </div>

        {/* Settings form — full width of the content column. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Settings sections */}
          <div className="lg:col-span-12 space-y-6">
            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div
                role="tabpanel"
                id="admin-settings-panel-general"
                aria-labelledby="admin-settings-tab-general"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Marketplace Identity &amp; Operations
                    </h2>
                    <p className="text-xs text-slate-500">
                      Primary entity branding, support destinations, and settlement currency.
                    </p>
                  </div>
                  {sectionSaveButton('general', generalDirty, saveGeneral)}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  {/* Platform Name */}
                  <div>
                    <label htmlFor="admin-settings-platform-name" className="block text-xs font-bold text-slate-700">Platform Name</label>
                    <input
                      id="admin-settings-platform-name"
                      type="text"
                      value={form.platformName}
                      onChange={(e) => edit({ platformName: e.target.value })}
                      className={FIELD}
                    />
                  </div>

                  {/* Support Email */}
                  <div>
                    <label htmlFor="admin-settings-support-email" className="block text-xs font-bold text-slate-700">
                      Support Contact Email
                    </label>
                    <input
                      id="admin-settings-support-email"
                      type="email"
                      value={form.supportEmail}
                      onChange={(e) => edit({ supportEmail: e.target.value })}
                      className={FIELD}
                    />
                  </div>

                  {/* Default Currency — PKR only, by the owner's decision. */}
                  <div>
                    <label htmlFor="admin-settings-currency" className="block text-xs font-bold text-slate-700">
                      Default Currency &amp; Regional Settlement
                    </label>
                    <Select value="PKR" onValueChange={() => undefined}>
                      <SelectTrigger id="admin-settings-currency" className={"mt-1.5 h-9 w-full rounded-lg px-3 text-xs font-medium"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PKR" className="text-xs">PKR (₨) - Pakistani Rupee</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {stored.defaultCurrency === 'PKR'
                        ? 'Settlement runs in PKR only; currency conversion is retired for now.'
                        : `Stored today as ${stored.defaultCurrency}. Saving this section settles the platform on PKR, the only currency conversion supports right now.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PAYOUTS */}
            {activeTab === 'payouts' && (
              <div
                role="tabpanel"
                id="admin-settings-panel-payouts"
                aria-labelledby="admin-settings-tab-payouts"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Payout &amp; Financial Settlement
                    </h2>
                    <p className="text-xs text-slate-500">
                      Vendor disbursement frequency, minimum floor, and reserve buffer.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Banknote className="h-4 w-4 text-slate-400" />
                    {sectionSaveButton('payouts', payoutsDirty, savePayouts)}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                  {/* Automated Payout Schedule */}
                  <div>
                    <label htmlFor="admin-settings-payout-schedule" className="block text-xs font-bold text-slate-700">
                      Automated Payout Schedule
                    </label>
                    <Select
                      value={form.payoutSchedule || undefined}
                      onValueChange={(value) => edit({ payoutSchedule: value })}
                    >
                      <SelectTrigger id="admin-settings-payout-schedule" className={"mt-1.5 h-9 w-full rounded-lg px-3 text-xs font-medium"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYOUT_SCHEDULES.map((option) => (
                          <SelectItem key={option} value={option} className="text-xs">
                            {option}
                          </SelectItem>
                        ))}
                        {!PAYOUT_SCHEDULES.includes(form.payoutSchedule) && form.payoutSchedule && (
                          <SelectItem value={form.payoutSchedule} className="text-xs">
                            {form.payoutSchedule}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Minimum Payout Floor */}
                  <div>
                    <label htmlFor="admin-settings-min-payout" className="block text-xs font-bold text-slate-700">
                      Minimum Payout Floor
                    </label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400" aria-hidden="true">
                        ₨
                      </span>
                      <input
                        id="admin-settings-min-payout"
                        type="text"
                        inputMode="decimal"
                        value={form.minPayoutFloor}
                        onChange={(e) => edit({ minPayoutFloor: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs font-mono font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Reserve Retention Window */}
                  <div>
                    <label htmlFor="admin-settings-reserve-days" className="block text-xs font-bold text-slate-700">
                      Reserve Retention Window
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="admin-settings-reserve-days"
                        type="text"
                        inputMode="numeric"
                        value={form.reserveRetentionDays}
                        onChange={(e) => edit({ reserveRetentionDays: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-12 text-xs font-mono font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        Days
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Payouts are disbursed from the vendor ledger on this cadence; no external gateway
                  configuration is stored in the platform settings, so none is offered here.
                </p>
              </div>
            )}

            {/* TAB: POLICIES */}
            {activeTab === 'policies' && (
              <div
                role="tabpanel"
                id="admin-settings-panel-policies"
                aria-labelledby="admin-settings-tab-policies"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Governance, SLAs &amp; Moderation
                    </h2>
                    <p className="text-xs text-slate-500">
                      Performance thresholds and how a new listing reaches the storefront.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-slate-400" />
                    {sectionSaveButton('policies', policiesDirty, savePolicies)}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  {/* Fulfillment SLA Ceiling */}
                  <div>
                    <label htmlFor="admin-settings-sla-ceiling" className="block text-xs font-bold text-slate-700">
                      Fulfillment SLA Ceiling
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="admin-settings-sla-ceiling"
                        type="text"
                        inputMode="numeric"
                        value={form.slaCeilingHours}
                        onChange={(e) => edit({ slaCeilingHours: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-14 text-xs font-mono font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        Hours
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Escalates ticket to operations desk if unfulfilled.
                    </p>
                  </div>

                  {/* New Listing Review */}
                  <div>
                    <label htmlFor="admin-settings-ai-moderation" className="block text-xs font-bold text-slate-700">
                      New Listing Review
                    </label>
                    <Select
                      value={form.newListingReview || undefined}
                      onValueChange={(value) => edit({ newListingReview: value })}
                    >
                      <SelectTrigger id="admin-settings-ai-moderation" className={"mt-1.5 h-9 w-full rounded-lg px-3 text-xs font-medium"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LISTING_REVIEW_MODES.map((option) => (
                          <SelectItem key={option} value={option} className="text-xs">
                            {option}
                          </SelectItem>
                        ))}
                        {!LISTING_REVIEW_MODES.includes(form.newListingReview) && form.newListingReview && (
                          <SelectItem value={form.newListingReview} className="text-xs">
                            {form.newListingReview}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      The review a listing passes before it can sell.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </WorkspaceLayout>
  );
};
