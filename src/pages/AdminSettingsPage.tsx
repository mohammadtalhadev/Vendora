import React, { useState } from 'react';
import {
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
  Webhook,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

export const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'payouts' | 'policies' | 'tax' | 'api'
  >('general');

  const SETTINGS_KEY = 'vd:v1:admin_settings';
  const savedSettings = (() => {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  // Form states
  const [platformName, setPlatformName] = useState(savedSettings?.platformName ?? 'Vendora Multi-Vendor Marketplace');
  const [supportEmail, setSupportEmail] = useState(savedSettings?.supportEmail ?? 'ops@vendora.market');
  const [currency, setCurrency] = useState(savedSettings?.currency ?? 'USD ($) - United States Dollar');
  const [multiCurrency, setMultiCurrency] = useState(savedSettings?.multiCurrency ?? true);
  const [isStorePaused, setIsStorePaused] = useState(savedSettings?.isStorePaused ?? false);

  const [payoutSchedule, setPayoutSchedule] = useState(savedSettings?.payoutSchedule ?? 'Bi-weekly on Monday');
  const [minPayoutFloor, setMinPayoutFloor] = useState(savedSettings?.minPayoutFloor ?? '50.00');
  const [reserveRetentionDays, setReserveRetentionDays] = useState(savedSettings?.reserveRetentionDays ?? '14');
  const [adyenConnected, setAdyenConnected] = useState(savedSettings?.adyenConnected ?? false);

  const [slaCeiling, setSlaCeiling] = useState(savedSettings?.slaCeiling ?? '48');
  const [refundWindowDays, setRefundWindowDays] = useState(savedSettings?.refundWindowDays ?? '30');
  const [aiModerationMode, setAiModerationMode] = useState(savedSettings?.aiModerationMode ?? 'Moderate (Standard)');
  const [autoRefundOnDispute, setAutoRefundOnDispute] = useState(savedSettings?.autoRefundOnDispute ?? true);
  const [sessionTimeout, setSessionTimeout] = useState(savedSettings?.sessionTimeout ?? '60 minutes');
  const [ipWhitelisting, setIpWhitelisting] = useState(savedSettings?.ipWhitelisting ?? true);

  // Tax States
  const [taxEngine, setTaxEngine] = useState(savedSettings?.taxEngine ?? 'Automatic (Avalara AvaTax)');
  const [taxNexusReporting, setTaxNexusReporting] = useState(savedSettings?.taxNexusReporting ?? true);
  const [irsThreshold, setIrsThreshold] = useState(savedSettings?.irsThreshold ?? '600.00');
  const [vatReverseCharge, setVatReverseCharge] = useState(savedSettings?.vatReverseCharge ?? true);

  // API States
  const [webhookEndpoint, setWebhookEndpoint] = useState(savedSettings?.webhookEndpoint ?? 'https://api.vendora.market/v1/webhooks/orders');
  const [apiRateLimit, setApiRateLimit] = useState(savedSettings?.apiRateLimit ?? '1000 req/min');
  const [webhookRetries, setWebhookRetries] = useState(savedSettings?.webhookRetries ?? '5 retries');

  // Security & Token States
  const [adminApiToken, setAdminApiToken] = useState('vdr_live_pk_9942a8b301c');
  const [webhookSecret, setWebhookSecret] = useState('whsec_9b24a7bc1d4e02f01c');

  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedToken, setRevealedToken] = useState(false);

  // Dialogs
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<'Stripe Connect' | 'PayPal Marketplace' | 'Adyen'>('Stripe Connect');
  const [gatewayMode, setGatewayMode] = useState<'live' | 'test'>('live');
  const [gatewayApiKey, setGatewayApiKey] = useState('sk_live_51Mxxxxxxxxxxxxxxxx');

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isRotateConfirmOpen, setIsRotateConfirmOpen] = useState(false);
  const [rotateMessage, setRotateMessage] = useState('');

  const auditLogs = [
    { id: 1, event: 'Payout reserve changed to 14d', author: 'admin@vendora.market', date: '2 hours ago', tag: 'Finance' },
    { id: 2, event: 'Updated Stripe webhook endpoint to TLS 1.3', author: 'system-service', date: 'Yesterday at 18:42', tag: 'Webhooks' },
    { id: 3, event: 'New admin account provisioned (ops_lead)', author: 'admin@vendora.market', date: '3 days ago', tag: 'Auth' },
    { id: 4, event: 'Catalog AI moderation threshold tightened to Strict', author: 'moderation@vendora.market', date: '5 days ago', tag: 'Policy' },
    { id: 5, event: 'Tax engine fallback to Avalara AvaTax synced', author: 'finance_auto', date: 'Last week', tag: 'Tax' },
  ];

  const handleSave = () => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          platformName,
          supportEmail,
          currency,
          multiCurrency,
          isStorePaused,
          payoutSchedule,
          minPayoutFloor,
          reserveRetentionDays,
          adyenConnected,
          slaCeiling,
          refundWindowDays,
          aiModerationMode,
          autoRefundOnDispute,
          sessionTimeout,
          ipWhitelisting,
          taxEngine,
          taxNexusReporting,
          irsThreshold,
          vatReverseCharge,
          webhookEndpoint,
          apiRateLimit,
          webhookRetries,
        })
      );
    } catch {
      // ignore localStorage quota errors
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRotateCredentials = () => {
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
    const newKey = `vdr_live_pk_${randomHex}`;
    const newWhsec = `whsec_${randomHex.substring(0, 8)}fd92`;
    setAdminApiToken(newKey);
    setWebhookSecret(newWhsec);
    setIsRotateConfirmOpen(false);
    setRotateMessage('API core token and webhook secret successfully rotated!');
    setTimeout(() => setRotateMessage(''), 3500);
  };

  const openGatewayConfig = (name: 'Stripe Connect' | 'PayPal Marketplace' | 'Adyen') => {
    setSelectedGateway(name);
    setIsGatewayModalOpen(true);
  };

  const SETTINGS_TABS: Array<'general' | 'payouts' | 'policies' | 'tax' | 'api'> = [
    'general',
    'payouts',
    'policies',
    'tax',
    'api',
  ];

  const handleSettingsTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = SETTINGS_TABS.indexOf(activeTab);
    let nextIndex = currentIndex;
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

  const GATEWAY_MODES: Array<'live' | 'test'> = ['live', 'test'];

  const handleGatewayModeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = GATEWAY_MODES.indexOf(gatewayMode);
    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % GATEWAY_MODES.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + GATEWAY_MODES.length) % GATEWAY_MODES.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = GATEWAY_MODES.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextMode = GATEWAY_MODES[nextIndex];
    setGatewayMode(nextMode);
    document.getElementById(`admin-gateway-mode-${nextMode}`)?.focus();
  };

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
              Configure marketplace global parameters, settlement rules, payout gateways, dispute SLAs, and admin access controls.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              <span aria-live="polite">{saveSuccess ? 'Saved Successfully!' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {/* Feedback message for rotated credentials */}
        {rotateMessage && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2"
          >
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>{rotateMessage}</span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div
          role="tablist"
          aria-label="Platform settings sections"
          onKeyDown={handleSettingsTabKeyDown}
          className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-px text-xs font-semibold text-slate-600"
        >
          <button
            type="button"
            role="tab"
            id="admin-settings-tab-general"
            aria-controls="admin-settings-panel-general"
            aria-selected={activeTab === 'general'}
            tabIndex={activeTab === 'general' ? 0 : -1}
            onClick={() => setActiveTab('general')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="h-4 w-4" aria-hidden="true" />
            <span>General &amp; Marketplace</span>
          </button>
          <button
            type="button"
            role="tab"
            id="admin-settings-tab-payouts"
            aria-controls="admin-settings-panel-payouts"
            aria-selected={activeTab === 'payouts'}
            tabIndex={activeTab === 'payouts' ? 0 : -1}
            onClick={() => setActiveTab('payouts')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'payouts'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            <span>Payouts &amp; Gateways</span>
          </button>
          <button
            type="button"
            role="tab"
            id="admin-settings-tab-policies"
            aria-controls="admin-settings-panel-policies"
            aria-selected={activeTab === 'policies'}
            tabIndex={activeTab === 'policies' ? 0 : -1}
            onClick={() => setActiveTab('policies')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'policies'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Scale className="h-4 w-4" aria-hidden="true" />
            <span>Vendor Policies &amp; SLAs</span>
          </button>
          <button
            type="button"
            role="tab"
            id="admin-settings-tab-tax"
            aria-controls="admin-settings-panel-tax"
            aria-selected={activeTab === 'tax'}
            tabIndex={activeTab === 'tax' ? 0 : -1}
            onClick={() => setActiveTab('tax')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'tax'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            <span>Tax &amp; Compliance</span>
          </button>
          <button
            type="button"
            role="tab"
            id="admin-settings-tab-api"
            aria-controls="admin-settings-panel-api"
            aria-selected={activeTab === 'api'}
            tabIndex={activeTab === 'api' ? 0 : -1}
            onClick={() => setActiveTab('api')}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 transition-colors cursor-pointer ${
              activeTab === 'api'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code className="h-4 w-4" aria-hidden="true" />
            <span>API &amp; Webhooks</span>
          </button>
        </div>

        {/* Main Grid: Left Settings (8 cols) & Right Security/Audit (4 cols) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
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
                      Primary entity branding, support destinations, and storefront availability.
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border self-start sm:self-auto ${
                      isStorePaused
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isStorePaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                      }`}
                    />
                    {isStorePaused ? 'Store Paused (Maintenance)' : 'Live & Operational'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  {/* Platform Name */}
                  <div>
                    <label htmlFor="admin-settings-platform-name" className="block text-xs font-bold text-slate-700">Platform Name</label>
                    <input
                      id="admin-settings-platform-name"
                      type="text"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
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
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* Default Currency */}
                  <div>
                    <label htmlFor="admin-settings-currency" className="block text-xs font-bold text-slate-700">
                      Default Currency &amp; Regional Settlement
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="admin-settings-currency"
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
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Storefront Availability */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Storefront Availability
                    </label>
                    <div className="mt-1.5 flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isStorePaused ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-800">
                          {isStorePaused ? 'Storefront Paused' : 'Public Storefront Active'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStorePaused(!isStorePaused)}
                        className={`text-[11px] font-bold underline cursor-pointer ${
                          isStorePaused ? 'text-emerald-700 hover:text-emerald-900' : 'text-amber-700 hover:text-amber-900'
                        }`}
                      >
                        {isStorePaused ? 'Resume Store' : 'Pause Store'}
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
                      <h3 id="admin-settings-multicurrency-label" className="font-bold text-slate-900 text-xs">
                        Multi-Currency Dynamic Conversion
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Automatically price items based on buyer geo-location using ECB mid-market spot rates.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={multiCurrency}
                    aria-labelledby="admin-settings-multicurrency-label"
                    onClick={() => setMultiCurrency(!multiCurrency)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      multiCurrency ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        multiCurrency ? 'translate-x-4' : 'translate-x-0'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
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
                      Vendor disbursement frequencies, reserve buffers, and payment rail integration.
                    </p>
                  </div>
                  <DollarSign className="h-4 w-4 text-slate-400" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                  {/* Automated Payout Schedule */}
                  <div>
                    <label htmlFor="admin-settings-payout-schedule" className="block text-xs font-bold text-slate-700">
                      Automated Payout Schedule
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="admin-settings-payout-schedule"
                        value={payoutSchedule}
                        onChange={(e) => setPayoutSchedule(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                      >
                        <option>Bi-weekly on Monday</option>
                        <option>Weekly on Friday</option>
                        <option>Monthly (1st of month)</option>
                        <option>Daily automatic sweep</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Minimum Payout Floor */}
                  <div>
                    <label htmlFor="admin-settings-min-payout" className="block text-xs font-bold text-slate-700">
                      Minimum Payout Floor
                    </label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400" aria-hidden="true">
                        $
                      </span>
                      <input
                        id="admin-settings-min-payout"
                        type="text"
                        value={minPayoutFloor}
                        onChange={(e) => setMinPayoutFloor(e.target.value)}
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
                      <button
                        type="button"
                        onClick={() => openGatewayConfig('Stripe Connect')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start sm:self-auto cursor-pointer"
                      >
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
                      <button
                        type="button"
                        onClick={() => openGatewayConfig('PayPal Marketplace')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start sm:self-auto cursor-pointer"
                      >
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
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                adyenConnected
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {adyenConnected ? 'Connected' : 'Available'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Unified global acquiring and local payment schemes in APAC/EMEA.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (adyenConnected) {
                            openGatewayConfig('Adyen');
                          } else {
                            setAdyenConnected(true);
                          }
                        }}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-2xs self-start sm:self-auto cursor-pointer ${
                          adyenConnected
                            ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {adyenConnected ? 'Configure' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>
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
                      Performance thresholds, merchant service agreements, and automated content guards.
                    </p>
                  </div>
                  <Shield className="h-4 w-4 text-slate-400" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                  {/* Fulfillment SLA Ceiling */}
                  <div>
                    <label htmlFor="admin-settings-sla-ceiling" className="block text-xs font-bold text-slate-700">
                      Fulfillment SLA Ceiling
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="admin-settings-sla-ceiling"
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
                    <label htmlFor="admin-settings-refund-window" className="block text-xs font-bold text-slate-700">
                      Return &amp; Refund Window
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="admin-settings-refund-window"
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
                    <label htmlFor="admin-settings-ai-moderation" className="block text-xs font-bold text-slate-700">
                      Catalog AI Moderation
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="admin-settings-ai-moderation"
                        value={aiModerationMode}
                        onChange={(e) => setAiModerationMode(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-hidden"
                      >
                        <option>Moderate (Standard)</option>
                        <option>Strict (Manual Review)</option>
                        <option>Permissive (Post-Publish Scan)</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                      <h3 id="admin-settings-autorefund-label" className="font-bold text-slate-900 text-xs">
                        Dispute Escalation Auto-Refund
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Automatically debit vendor ledger and credit customer if unresolved within 7 business days.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoRefundOnDispute}
                    aria-labelledby="admin-settings-autorefund-label"
                    onClick={() => setAutoRefundOnDispute(!autoRefundOnDispute)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      autoRefundOnDispute ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        autoRefundOnDispute ? 'translate-x-4' : 'translate-x-0'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: TAX & COMPLIANCE */}
            {activeTab === 'tax' && (
              <div
                role="tabpanel"
                id="admin-settings-panel-tax"
                aria-labelledby="admin-settings-tab-tax"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Tax Engine &amp; Marketplace Compliance
                    </h2>
                    <p className="text-xs text-slate-500">
                      Automated sales tax remittance, economic nexus calculation, and IRS 1099-K reporting rules.
                    </p>
                  </div>
                  <Receipt className="h-4 w-4 text-slate-400" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  <div>
                    <label htmlFor="admin-settings-tax-engine" className="block text-xs font-bold text-slate-700">Tax Calculation Service</label>
                    <div className="relative mt-1.5">
                      <select
                        id="admin-settings-tax-engine"
                        value={taxEngine}
                        onChange={(e) => setTaxEngine(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-medium text-slate-900 focus:outline-hidden"
                      >
                        <option>Automatic (Avalara AvaTax)</option>
                        <option>Stripe Tax Unified</option>
                        <option>TaxJar SmartCalcs</option>
                        <option>Manual Jurisdiction Rates</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-settings-irs-threshold" className="block text-xs font-bold text-slate-700">IRS 1099-K Filing Threshold</label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400" aria-hidden="true">$</span>
                      <input
                        id="admin-settings-irs-threshold"
                        type="text"
                        value={irsThreshold}
                        onChange={(e) => setIrsThreshold(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs font-mono font-medium text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 flex items-center justify-between gap-4">
                    <div>
                      <h3 id="admin-settings-nexus-label" className="font-bold text-slate-900 text-xs">Marketplace Facilitator Remittance</h3>
                      <p className="text-[11px] text-slate-500">Automatically collect and file state sales tax on behalf of sellers in all US facilitator states.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={taxNexusReporting}
                      aria-labelledby="admin-settings-nexus-label"
                      onClick={() => setTaxNexusReporting(!taxNexusReporting)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        taxNexusReporting ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition ${
                        taxNexusReporting ? 'translate-x-4' : 'translate-x-0'
                      }`} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 flex items-center justify-between gap-4">
                    <div>
                      <h3 id="admin-settings-vat-label" className="font-bold text-slate-900 text-xs">EU / UK VAT Reverse Charge Mechanism</h3>
                      <p className="text-[11px] text-slate-500">Enable zero-rating for verified B2B VIES cross-border sales across EU member states.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={vatReverseCharge}
                      aria-labelledby="admin-settings-vat-label"
                      onClick={() => setVatReverseCharge(!vatReverseCharge)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        vatReverseCharge ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition ${
                        vatReverseCharge ? 'translate-x-4' : 'translate-x-0'
                      }`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: API & WEBHOOKS */}
            {activeTab === 'api' && (
              <div
                role="tabpanel"
                id="admin-settings-panel-api"
                aria-labelledby="admin-settings-tab-api"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      API &amp; Webhook Configurations
                    </h2>
                    <p className="text-xs text-slate-500">
                      Production webhook listeners, rate throttle policies, and TLS encryption modes.
                    </p>
                  </div>
                  <Webhook className="h-4 w-4 text-slate-400" />
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label htmlFor="admin-settings-webhook-url" className="block text-xs font-bold text-slate-700">Primary Outbound Webhook URL</label>
                    <input
                      id="admin-settings-webhook-url"
                      type="text"
                      value={webhookEndpoint}
                      onChange={(e) => setWebhookEndpoint(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="admin-settings-rate-limit" className="block text-xs font-bold text-slate-700">Public API Rate Limit</label>
                      <select
                        id="admin-settings-rate-limit"
                        value={apiRateLimit}
                        onChange={(e) => setApiRateLimit(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                      >
                        <option>500 req/min</option>
                        <option>1000 req/min</option>
                        <option>2500 req/min</option>
                        <option>5000 req/min</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="admin-settings-retry-policy" className="block text-xs font-bold text-slate-700">Webhook Retry Policy</label>
                      <select
                        id="admin-settings-retry-policy"
                        value={webhookRetries}
                        onChange={(e) => setWebhookRetries(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                      >
                        <option>3 retries</option>
                        <option>5 retries with exponential backoff</option>
                        <option>10 retries with exponential backoff</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  <label htmlFor="admin-settings-session-timeout" className="block font-bold text-slate-900">
                    Inactivity Session Timeout
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id="admin-settings-session-timeout"
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option>15 minutes</option>
                      <option>30 minutes</option>
                      <option>60 minutes</option>
                      <option>4 hours</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  </div>
                </div>

                {/* Setting 3: Admin IP Whitelisting */}
                <div className="pt-3 flex items-start justify-between gap-3">
                  <div>
                    <div id="admin-settings-ip-allowlist-label" className="font-bold text-slate-900">Admin IP Whitelisting</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Restrict access to corporate VPN CIDR
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ipWhitelisting}
                    aria-labelledby="admin-settings-ip-allowlist-label"
                    onClick={() => setIpWhitelisting(!ipWhitelisting)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      ipWhitelisting ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        ipWhitelisting ? 'translate-x-4' : 'translate-x-0'
                      }`}
                      aria-hidden="true"
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
                      {webhookSecret.substring(0, 10)}...{webhookSecret.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookSecret, 'whsec')}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title="Copy Secret"
                      aria-label="Copy live webhook secret"
                    >
                      {copiedKey === 'whsec' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
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
                      Rotated recently
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span id="admin-api-token-value" className="font-mono text-slate-800 text-[11px]">
                      {revealedToken ? adminApiToken : `${adminApiToken.substring(0, 11)}••••••••`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRevealedToken(!revealedToken)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title={revealedToken ? 'Hide Token' : 'Reveal Token'}
                        aria-label={revealedToken ? 'Hide admin API core token' : 'Reveal admin API core token'}
                        aria-expanded={revealedToken}
                        aria-controls="admin-api-token-value"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(adminApiToken, 'apiToken')}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title="Copy Token"
                        aria-label="Copy admin API core token"
                      >
                        {copiedKey === 'apiToken' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rotate Credentials Button */}
                <button
                  type="button"
                  onClick={() => setIsRotateConfirmOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Rotate Credentials
                </button>
              </div>
            </div>

            {/* Recent Audit Events */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Recent Audit Events</h2>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(true)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {auditLogs.slice(0, 3).map((log) => (
                  <div key={log.id}>
                    <div className="font-bold text-slate-800">● {log.event}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {log.author} • {log.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Gateway Configuration */}
        <Dialog open={isGatewayModalOpen} onOpenChange={setIsGatewayModalOpen}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Configure {selectedGateway}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update API connection keys and payout routing rules for {selectedGateway}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div>
                <span id="admin-gateway-mode-label" className="block font-bold text-slate-700 mb-1">Environment Mode</span>
                <div
                  role="radiogroup"
                  aria-labelledby="admin-gateway-mode-label"
                  onKeyDown={handleGatewayModeKeyDown}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    id="admin-gateway-mode-live"
                    role="radio"
                    aria-checked={gatewayMode === 'live'}
                    tabIndex={gatewayMode === 'live' ? 0 : -1}
                    onClick={() => setGatewayMode('live')}
                    className={`flex-1 rounded-lg py-1.5 font-bold border ${
                      gatewayMode === 'live' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Live Production
                  </button>
                  <button
                    type="button"
                    id="admin-gateway-mode-test"
                    role="radio"
                    aria-checked={gatewayMode === 'test'}
                    tabIndex={gatewayMode === 'test' ? 0 : -1}
                    onClick={() => setGatewayMode('test')}
                    className={`flex-1 rounded-lg py-1.5 font-bold border ${
                      gatewayMode === 'test' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Sandbox / Test
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="admin-gateway-api-key" className="block font-bold text-slate-700 mb-1">Secret API Key</label>
                <input
                  id="admin-gateway-api-key"
                  type="password"
                  value={gatewayApiKey}
                  onChange={(e) => setGatewayApiKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label htmlFor="admin-gateway-webhook-secret" className="block font-bold text-slate-700 mb-1">Webhook Signing Secret</label>
                <input
                  id="admin-gateway-webhook-secret"
                  type="password"
                  defaultValue="whsec_prod_rail_998124b89"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Save Gateway
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Full Audit Logs */}
        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
          <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Security &amp; Configuration Audit Trail</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Immutable chronological log of platform configuration changes and access events.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-3 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{log.event}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{log.author} • {log.date}</div>
                  </div>
                  <span className="rounded bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {log.tag}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Rotate Credentials Confirmation */}
        <Dialog open={isRotateConfirmOpen} onOpenChange={setIsRotateConfirmOpen}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Rotate Production Credentials?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Rotating your Admin API token and Webhook secret will immediately invalidate existing credentials. Any integrations using old keys will fail until updated.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsRotateConfirmOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateCredentials}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
              >
                Confirm &amp; Rotate
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
