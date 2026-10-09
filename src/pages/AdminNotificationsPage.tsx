import React, { useState } from 'react';
import {
  ChevronRight,
  SlidersHorizontal,
  Plus,
  Bell,
  Megaphone,
  AlertCircle,
  Mail,
  Search,
  Check,
  AlertTriangle,
  Radio,
  Gavel,
  CheckCircle2,
  TrendingUp,
  Info,
  Zap,
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

interface NotificationAlert {
  id: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  teamBadge: string;
  statusBadge: string;
  statusBadgeStyle: string;
  timestamp: string;
  description: string;
  meta: string;
  primaryAction?: string;
  secondaryAction?: string;
}

const INITIAL_ALERTS: NotificationAlert[] = [
  {
    id: 'alt-1',
    borderColor: 'border-l-rose-500',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    icon: AlertCircle,
    title: 'High Dispute Rate Flag: Store #209',
    teamBadge: 'RISK TEAM',
    statusBadge: 'Critical',
    statusBadgeStyle: 'bg-rose-100 text-rose-800',
    timestamp: '5 mins ago',
    description:
      "Seller 'Apex Tech Logistics' breached the 3.5% rolling chargeback threshold. Order hold protocol has been automatically triggered on 14 open shipments pending fraud review.",
    meta: 'In-App + Email • Target: merchant-risk@vendora.internal',
    primaryAction: 'View Case',
    secondaryAction: 'Acknowledge',
  },
  {
    id: 'alt-2',
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    icon: AlertTriangle,
    title: 'Vendor KYC SLA Warning',
    teamBadge: 'MERCHANT OPS',
    statusBadge: 'Warning',
    statusBadgeStyle: 'bg-amber-100 text-amber-800',
    timestamp: '1 hour ago',
    description:
      'Verification backlog: 18 vendor applications are within 4 hours of breaching the 48-hour onboarding SLA. Tier-2 documentation validation required.',
    meta: 'Push + Slack Webhook • Channel: #ops-kyc-feed',
    primaryAction: 'Acknowledge',
    secondaryAction: 'Dismiss',
  },
  {
    id: 'alt-3',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    icon: Radio,
    title: 'Holiday Cutoff Schedule Broadcast',
    teamBadge: 'ALL SELLERS',
    statusBadge: 'Broadcast',
    statusBadgeStyle: 'bg-blue-100 text-blue-800',
    timestamp: 'Today, 09:30 AM',
    description:
      'Published official mandatory handling timelines for winter peak season. Sent via merchant banner notice and direct digest to 4,892 verified seller storefronts.',
    meta: 'In-App Modal + Email • Status: 99.4% Delivered (31 bounces)',
    primaryAction: 'View Delivery Stats',
    secondaryAction: 'Resend',
  },
  {
    id: 'alt-4',
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    icon: Gavel,
    title: 'Automated Counterfeit Scan Flag...',
    teamBadge: 'CATALOG MODERATION',
    statusBadge: 'Review Queued',
    statusBadgeStyle: 'bg-amber-100 text-amber-800',
    timestamp: 'Today, 08:14 AM',
    description:
      'Vision engine AI model detected unauthorized luxury brand iconography on SKU #SKU-9844, #SKU-9847, and #SKU-9901. Products unlisted pending vendor invoice verification.',
    meta: 'Automated Webhook • Target: compliance-team',
    primaryAction: 'Inspect SKUs',
    secondaryAction: 'Dismiss',
  },
  {
    id: 'alt-5',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    icon: CheckCircle2,
    title: 'Payout Sweep Completed: $48,200 disbursed',
    teamBadge: 'FINANCE',
    statusBadge: 'Settled',
    statusBadgeStyle: 'bg-emerald-100 text-emerald-800',
    timestamp: 'Yesterday',
    description:
      'Automated ACH batch batch_77492 processed via Stripe Connect across 342 domestic merchant bank accounts. Zero batch exceptions encountered.',
    meta: 'System Log + Email • Settlement ID: #ST-99482-TX',
    primaryAction: 'View Ledger',
  },
];

export const AdminNotificationsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<NotificationAlert[]>(INITIAL_ALERTS);
  const [activeTab, setActiveTab] = useState<
    'all' | 'broadcast' | 'compliance' | 'security' | 'automated'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL SELLERS');
  const [broadcastBody, setBroadcastBody] = useState('');

  // Trigger Toggles state
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [newTriggerTitle, setNewTriggerTitle] = useState('');
  const [newTriggerDesc, setNewTriggerDesc] = useState('');

  const [triggerList, setTriggerList] = useState([
    {
      id: 'kyc',
      title: 'Real-time KYC verification failures',
      description: 'Triggers priority email to compliance officer and SMS to merchant.',
      enabled: true,
    },
    {
      id: 'dispute',
      title: 'High dispute velocity threshold (>2%)',
      description: 'Places vendor payouts on provisional hold and notifies risk team.',
      enabled: true,
    },
    {
      id: 'stock',
      title: 'Low vendor stock alerts',
      description: 'Sends automated re-order push notifications when fast-moving inventory <5 units.',
      enabled: true,
    },
    {
      id: 'payout',
      title: 'Settlement payout failure alerts',
      description: 'Immediate webhook notification and admin escalation on banking transfer returns.',
      enabled: true,
    },
  ]);

  const toggleTrigger = (id: string) => {
    setTriggerList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerTitle.trim()) return;
    setTriggerList((prev) => [
      ...prev,
      {
        id: `trig-${Date.now()}`,
        title: newTriggerTitle.trim(),
        description: newTriggerDesc.trim() || 'Custom automated webhook and admin alert trigger.',
        enabled: true,
      },
    ]);
    setNewTriggerTitle('');
    setNewTriggerDesc('');
    setIsTriggerModalOpen(false);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAcknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          statusBadge: 'Acknowledged',
          statusBadgeStyle: 'bg-emerald-100 text-emerald-800',
          secondaryAction: undefined,
          primaryAction: undefined,
        };
      })
    );
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    const newBroadcast: NotificationAlert = {
      id: `alt-${Date.now()}`,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      icon: Radio,
      title: broadcastTitle.trim(),
      teamBadge: broadcastTarget,
      statusBadge: 'Broadcast',
      statusBadgeStyle: 'bg-blue-100 text-blue-800',
      timestamp: 'Just now',
      description: broadcastBody.trim(),
      meta: `In-App Modal + Email • Target: ${broadcastTarget}`,
      primaryAction: 'Acknowledge',
      secondaryAction: 'Dismiss',
    };
    setAlerts([newBroadcast, ...alerts]);
    setBroadcastTitle('');
    setBroadcastBody('');
    setIsBroadcastModalOpen(false);
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterSeverity === 'Critical' && alert.statusBadge !== 'Critical') return false;
    if (filterSeverity === 'Warning' && alert.statusBadge !== 'Warning') return false;

    if (activeTab === 'broadcast' && alert.statusBadge !== 'Broadcast') return false;
    if (activeTab === 'compliance' && alert.teamBadge !== 'MERCHANT OPS' && alert.teamBadge !== 'CATALOG MODERATION')
      return false;
    if (activeTab === 'security' && alert.teamBadge !== 'RISK TEAM') return false;

    return true;
  });

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Marketplace</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">Notifications</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Notification Center & Broadcasts
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Broadcast announcements to vendors and customers, monitor automated event triggers, and audit alert delivery logs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              Security Alerts
            </button>
            <button
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Send Broadcast Message
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Notifications Sent */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Total Notifications Sent (30d)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Bell className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">148,920</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                99.8% delivery rate
              </span>
            </div>
          </div>

          {/* Card 2: Active Merchant Broadcasts */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Active Merchant Broadcasts</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Megaphone className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">2</div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Maintenance & Holiday schedule
            </div>
          </div>

          {/* Card 3: Unread Critical Alerts */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Unread Critical Alerts</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">5</span>
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                Action Required
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Dispute escalations & KYC
            </div>
          </div>

          {/* Card 4: Email & SMS Open Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Email & SMS Open Rate</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Mail className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">68.4%</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +3.2%
              </span>
              <span className="text-xs text-slate-500 font-medium">above target SLA</span>
            </div>
          </div>
        </div>

        {/* 2 Columns: Alerts Feed (Left) & Controls/Health (Right) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (8 cols): Notifications Feed */}
          <div className="lg:col-span-8 space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All Notifications</span>
                <span className="text-[10px] font-normal opacity-80">148,920</span>
              </button>
              <button
                onClick={() => setActiveTab('broadcast')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                  activeTab === 'broadcast'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Broadcast Announcements</span>
                <span className="text-[10px] font-normal opacity-80">14</span>
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                  activeTab === 'compliance'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Vendor Compliance Alerts</span>
                <span className="text-[10px] font-normal opacity-80">42</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                  activeTab === 'security'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>System & Security</span>
                <span className="text-[10px] font-normal opacity-80">18</span>
              </button>
              <button
                onClick={() => setActiveTab('automated')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                  activeTab === 'automated'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Automated Triggers</span>
                <span className="text-[10px] font-normal opacity-80">148,846</span>
              </button>
            </div>

            {/* Sub-bar: Search & Severity filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAlerts((prev) =>
                    prev.map((a) => ({
                      ...a,
                      statusBadge: 'Acknowledged',
                      statusBadgeStyle: 'bg-emerald-100 text-emerald-800',
                    }))
                  );
                }}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold self-start sm:self-auto cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 text-slate-500" />
                <span>Mark all as read</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter alerts by keyword, merchant ID, ..."
                    className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                  <button
                    onClick={() => setFilterSeverity(filterSeverity === 'Critical' ? null : 'Critical')}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 border ${
                      filterSeverity === 'Critical'
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span>Critical (3)</span>
                  </button>
                  <button
                    onClick={() => setFilterSeverity(filterSeverity === 'Warning' ? null : 'Warning')}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 border ${
                      filterSeverity === 'Warning'
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>Warning (2)</span>
                  </button>
                  <button
                    onClick={() => setFilterSeverity(null)}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Informational</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List of Alerts */}
            <div className="space-y-3">
              {paginatedAlerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs border-l-4 ${alert.borderColor}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alert.iconBg} ${alert.iconColor}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{alert.title}</h3>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              {alert.teamBadge}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${alert.statusBadgeStyle}`}
                            >
                              {alert.statusBadge}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{alert.timestamp}</span>
                        </div>

                        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                          {alert.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <span>{alert.meta}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {alert.secondaryAction && (
                              <button
                                type="button"
                                onClick={() => handleDismissAlert(alert.id)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                {alert.secondaryAction}
                              </button>
                            )}
                            {alert.primaryAction && (
                              <button
                                type="button"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                className={`rounded-lg px-3.5 py-1 text-xs font-semibold cursor-pointer ${
                                  alert.primaryAction === 'View Case' ||
                                  alert.primaryAction === 'Acknowledge' ||
                                  alert.primaryAction === 'Inspect SKUs'
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {alert.primaryAction}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
              <span>
                Showing {filteredAlerts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} logged events
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-medium text-slate-600">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Triggers, Health, Protocol */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Automated Event Triggers */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-slate-700" />
                  <h2 className="font-bold text-slate-900 text-sm">Automated Event Triggers</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage active real-time platform alerting rules
              </p>

              <div className="space-y-3.5 divide-y divide-slate-100">
                {triggerList.map((t) => (
                  <div key={t.id} className="pt-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">
                        {t.title}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTrigger(t.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        t.enabled ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          t.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsTriggerModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Configure Custom Trigger
              </button>
            </div>

            {/* Card 2: Gateway Health */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-xs">Gateway Health</h2>
                <span className="text-[10px] text-slate-400">Updated 2m ago</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-slate-600 font-medium">SendGrid Transactional</span>
                    <span className="font-bold text-emerald-700">99.98% Operational</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.98%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-slate-600 font-medium">Twilio SMS Services</span>
                    <span className="font-bold text-emerald-700">99.4% Operational</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.4%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-slate-600 font-medium">Firebase Cloud Messaging (FCM)</span>
                    <span className="font-bold text-emerald-700">100% Operational</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Average Delivery Latency</span>
                <span className="font-extrabold text-slate-900">420 ms</span>
              </div>
            </div>

            {/* Card 3: Broadcast Protocol */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                <Info className="h-4 w-4 text-slate-500" />
                <span>Broadcast Protocol</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Global broadcasts to all sellers bypass individual email snooze settings. High-priority announcements undergo a mandatory 15-minute scheduled review queue.
              </p>
            </div>
          </div>
        </div>

        {/* Send Broadcast Modal */}
        <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Send Platform Broadcast
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dispatch platform announcements, emergency operational updates, or holiday notices across the marketplace.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSendBroadcast} className="space-y-3 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                >
                  <option value="ALL SELLERS">All Verified Sellers</option>
                  <option value="MERCHANT OPS">Merchant Operations</option>
                  <option value="RISK TEAM">Risk &amp; Trust Team</option>
                  <option value="ALL USERS">All Marketplace Users</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadcast Title</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Scheduled Gateway Maintenance Notice"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Enter detailed broadcast instructions and affected services..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Broadcast Now
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Custom Trigger Modal */}
        <Dialog open={isTriggerModalOpen} onOpenChange={setIsTriggerModalOpen}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Configure Event Trigger</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create a real-time event hook that triggers webhook notifications or alerts.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddTrigger} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Trigger Event Name</label>
                <input
                  type="text"
                  required
                  value={newTriggerTitle}
                  onChange={(e) => setNewTriggerTitle(e.target.value)}
                  placeholder="e.g. Chargeback rate &gt;1.5% in 24 hours"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Description</label>
                <textarea
                  rows={3}
                  value={newTriggerDesc}
                  onChange={(e) => setNewTriggerDesc(e.target.value)}
                  placeholder="Describe the automated action taken when this trigger fires..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTriggerModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Save Trigger
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
