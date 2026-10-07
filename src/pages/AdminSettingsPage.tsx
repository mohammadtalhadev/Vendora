import React, { useState } from 'react';
import {
  ChevronRight,
  RotateCcw,
  Check,
  Store,
  CreditCard,
  Scale,
  Receipt,
  Code,
  Globe,
  DollarSign,
  Shield,
  Lock,
  Key,
  Copy,
  Eye,
  RotateCw,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

export const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'payouts' | 'policies' | 'tax' | 'api'
  >('general');

  // Form states
  const [platformName, setPlatformName] = useState('Vendora Multi-Vendor Marketplace');
  const [supportEmail, setSupportEmail] = useState('ops@vendora.market');
  const [currency, setCurrency] = useState('USD ($) - United States Dollar');
  const [multiCurrency, setMultiCurrency] = useState(true);
  const [payoutSchedule, setPayoutSchedule] = useState('Bi-weekly on Monday');
  const [minPayoutFloor, setMinPayoutFloor] = useState('50.00');
  const [reserveRetentionDays, setReserveRetentionDays] = useState('14');
  const [slaCeiling, setSlaCeiling] = useState('48');
  const [refundWindowDays, setRefundWindowDays] = useState('30');
  const [aiModerationMode, setAiModerationMode] = useState('Moderate (Standard)');
  const [autoRefundOnDispute, setAutoRefundOnDispute] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('60 minutes');
  const [ipWhitelisting, setIpWhitelisting] = useState(true);

  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedToken, setRevealedToken] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Marketplace</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">Settings</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Platform Settings
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Configure marketplace global parameters, settlement rules, payout gateways, dispute SLAs, and admin access controls.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setPlatformName('Vendora Multi-Vendor Marketplace');
                setSupportEmail('ops@vendora.market');
                setCurrency('USD ($) - United States Dollar');
                setMultiCurrency(true);
                setMinPayoutFloor('50.00');
                setReserveRetentionDays('14');
                setSlaCeiling('48');
                setRefundWindowDays('30');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Check className="h-4 w-4" />
              {saveSuccess ? 'Saved Successfully!' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-px text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('general')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors ${
              activeTab === 'general'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>General & Marketplace</span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors ${
              activeTab === 'payouts'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Payouts & Gateways</span>
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors ${
              activeTab === 'policies'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Vendor Policies & SLAs</span>
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors ${
              activeTab === 'tax'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Tax & Compliance</span>
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors ${
              activeTab === 'api'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>API & Webhooks</span>
          </button>
        </div>

        {/* Main Grid: Left Settings (8 cols) & Right Security/Audit (4 cols) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section 1: Marketplace Identity & Operations */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Marketplace Identity & Operations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Primary entity branding, support destinations, and operating status.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-100 self-start sm:self-auto">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live & Operational
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                {/* Platform Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">Platform Name</label>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>

                {/* Support Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Support Contact Email
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>

                {/* Default Currency */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Default Currency & Regional Settlement
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                    >
                      <option>USD ($) - United States Dollar</option>
                      <option>EUR (€) - Euro</option>
                      <option>GBP (£) - British Pound</option>
                      <option>CAD ($) - Canadian Dollar</option>
                      <option>AED (د.إ) - UAE Dirham</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Storefront Availability */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Storefront Availability
                  </label>
                  <div className="mt-1.5 flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-slate-800">Public Storefront Active</span>
                    </div>
                    <button className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline">
                      Pause Store
                    </button>
                  </div>
                </div>
              </div>

              {/* Multi-Currency Dynamic Conversion */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Multi-Currency Dynamic Conversion
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Automatically price items based on buyer geo-location using ECB mid-market spot rates.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMultiCurrency(!multiCurrency)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    multiCurrency ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      multiCurrency ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Section 2: Payout & Financial Settlement */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Payout & Financial Settlement
                  </h2>
                  <p className="text-xs text-slate-500">
                    Vendor disbursement frequencies, reserve buffers, and payment rail integration.
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                {/* Automated Payout Schedule */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Automated Payout Schedule
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={payoutSchedule}
                      onChange={(e) => setPayoutSchedule(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                    >
                      <option>Bi-weekly on Monday</option>
                      <option>Weekly on Friday</option>
                      <option>Monthly (1st of month)</option>
                      <option>Daily automatic sweep</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Minimum Payout Floor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Minimum Payout Floor
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="text"
                      value={minPayoutFloor}
                      onChange={(e) => setMinPayoutFloor(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs font-mono font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Reserve Retention Window */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Reserve Retention Window
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={reserveRetentionDays}
                      onChange={(e) => setReserveRetentionDays(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-12 text-xs font-mono font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      Days
                    </span>
                  </div>
                </div>
              </div>

              {/* Integrated Gateway Rails */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 pb-2">
                  Integrated Gateway Rails
                </label>
                <div className="space-y-3">
                  {/* Stripe Connect */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-black text-indigo-700 border border-indigo-100 text-sm">
                        S
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            Stripe Connect Custom Accounts
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Active • Primary
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Direct split payouts, automatic KYC verifications, and 1099-K tax reporting.
                        </p>
                      </div>
                    </div>
                    <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start sm:self-auto">
                      Configure
                    </button>
                  </div>

                  {/* PayPal */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-black text-blue-700 border border-blue-100 text-sm">
                        P
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            PayPal Marketplace &amp; Hyperwallet
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Cross-border batch payouts in 24 fiat currencies.
                        </p>
                      </div>
                    </div>
                    <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start sm:self-auto">
                      Configure
                    </button>
                  </div>

                  {/* Adyen */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 font-black text-emerald-700 border border-emerald-100 text-sm">
                        A
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            Adyen for Platforms
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Available
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Unified global acquiring and local payment schemes in APAC/EMEA.
                        </p>
                      </div>
                    </div>
                    <button className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs self-start sm:self-auto">
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Governance, SLAs & Moderation */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Governance, SLAs &amp; Moderation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Performance thresholds, merchant service agreements, and automated content guards.
                  </p>
                </div>
                <Shield className="h-4 w-4 text-slate-400" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                {/* Fulfillment SLA Ceiling */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Fulfillment SLA Ceiling
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={slaCeiling}
                      onChange={(e) => setSlaCeiling(e.target.value)}
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

                {/* Return & Refund Window */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Return &amp; Refund Window
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={refundWindowDays}
                      onChange={(e) => setRefundWindowDays(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-14 text-xs font-mono font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      Days
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Post-delivery dispute guarantee threshold.
                  </p>
                </div>

                {/* Catalog AI Moderation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Catalog AI Moderation
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={aiModerationMode}
                      onChange={(e) => setAiModerationMode(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                    >
                      <option>Moderate (Standard)</option>
                      <option>Strict (Manual Review)</option>
                      <option>Permissive (Post-Publish Scan)</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Analyzes listing copies, brand rights, &amp; images.
                  </p>
                </div>
              </div>

              {/* Dispute Escalation Auto-Refund */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Dispute Escalation Auto-Refund
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Automatically debit vendor ledger and credit customer if unresolved within 7 business days.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoRefundOnDispute(!autoRefundOnDispute)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoRefundOnDispute ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      autoRefundOnDispute ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Security & Auth */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Security &amp; Auth</h2>
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">
                Compliance baselines for console access.
              </p>

              <div className="space-y-4 divide-y divide-slate-100 text-xs">
                {/* Setting 1: Mandatory 2FA */}
                <div className="pt-1 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">Mandatory 2FA</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Require hardware key or TOTP
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Enforced
                  </span>
                </div>

                {/* Setting 2: Inactivity Session Timeout */}
                <div className="pt-3">
                  <label className="block font-bold text-slate-900">
                    Inactivity Session Timeout
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option>15 minutes</option>
                      <option>30 minutes</option>
                      <option>60 minutes</option>
                      <option>4 hours</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Setting 3: Admin IP Whitelisting */}
                <div className="pt-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">Admin IP Whitelisting</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Restrict access to corporate VPN CIDR
                    </div>
                  </div>
                  <button
                    onClick={() => setIpWhitelisting(!ipWhitelisting)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      ipWhitelisting ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        ipWhitelisting ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Production Keys & Webhooks */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Production Keys &amp; Webhooks</h2>
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">
                Active encryption credentials.
              </p>

              <div className="space-y-3.5 text-xs">
                {/* Webhook Secret */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      LIVE WEBHOOK SECRET
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      Valid (TLS 1.3)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-800 text-[11px]">
                      whsec_9b24...f01c
                    </span>
                    <button
                      onClick={() => copyToClipboard('whsec_9b24a7bc1d4e02f01c', 'whsec')}
                      className="text-slate-400 hover:text-slate-700 p-1"
                      title="Copy Secret"
                    >
                      {copiedKey === 'whsec' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Admin API Token */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      ADMIN API CORE TOKEN
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Rotated 4d ago
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-800 text-[11px]">
                      {revealedToken ? 'vdr_live_pk_9942a8b301c' : 'vdr_live_pk_••••••••'}
                    </span>
                    <button
                      onClick={() => setRevealedToken(!revealedToken)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                      title={revealedToken ? 'Hide Token' : 'Reveal Token'}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rotate Credentials Button */}
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors">
                  <RotateCw className="h-3.5 w-3.5 text-slate-500" />
                  Rotate Credentials
                </button>
              </div>
            </div>

            {/* Recent Audit Events */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Recent Audit Events</h2>
                <button className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  View All
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800">
                    ● Payout reserve changed to 14d
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    admin@demo.test • 2 hours ago
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-800">
                    ● Updated Stripe webhook endpoint
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    system-service • Yesterday at 18:42
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-800">
                    ● New admin account provisioned
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    admin@demo.test • 3 days ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
