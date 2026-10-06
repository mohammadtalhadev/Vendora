import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Download,
  Plus,
  ChevronDown,
  CreditCard,
  ShoppingBag,
  DollarSign,
  Store,
  ClipboardList,
  Scale,
  TrendingUp,
  BarChart3,
  MoreHorizontal,
  ArrowRight,
  PieChart,
  Zap,
  CheckCircle2,
  Banknote,
  ShieldAlert,
  Megaphone,
  FileDown,
  Clock,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

export const AdminDashboardPage: React.FC = () => {
  const [velocityMetric, setVelocityMetric] = useState<'gross' | 'margin'>('gross');
  const [moderationTab, setModerationTab] = useState<'vendors' | 'items'>('vendors');
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  const triggerLiveSync = () => {
    setIsLiveSyncing(true);
    setTimeout(() => setIsLiveSyncing(false), 800);
  };

  // ── Top Vendor Partners Data ──────────────────────────────────────────────
  const topVendors = [
    {
      id: 'apex',
      initials: 'AG',
      name: 'Apex Gear Co.',
      category: 'Outdoor & Sporting',
      gmv: '$642,890',
      takeFee: '$64,289',
      rating: '4.96',
      status: 'Top Tier',
      statusType: 'dark' as const,
    },
    {
      id: 'lumina',
      initials: 'LT',
      name: 'Lumina Tech',
      category: 'Smart Electronics',
      gmv: '$518,220',
      takeFee: '$51,822',
      rating: '4.91',
      status: 'Top Tier',
      statusType: 'dark' as const,
    },
    {
      id: 'aura',
      initials: 'AL',
      name: 'Aura Living',
      category: 'Home & Lighting',
      gmv: '$389,450',
      takeFee: '$38,945',
      rating: '4.88',
      status: 'Verified',
      statusType: 'gray' as const,
    },
    {
      id: 'nordic',
      initials: 'NH',
      name: 'Nordic Haven',
      category: 'Minimal Furniture',
      gmv: '$312,180',
      takeFee: '$31,218',
      rating: '4.82',
      status: 'Verified',
      statusType: 'gray' as const,
    },
    {
      id: 'solace',
      initials: 'SA',
      name: 'Solace Apparel',
      category: 'Sustainable Wear',
      gmv: '$295,480',
      takeFee: '$29,548',
      rating: '4.79',
      status: 'Verified',
      statusType: 'gray' as const,
    },
  ];

  // ── Moderation Queue Items ───────────────────────────────────────────────
  const moderationVendors = [
    {
      id: 'm-1',
      name: 'Kroma Audio Ltd.',
      meta: 'Pro Audio & Microphones • Applied 2h ago',
      badge: 'KYC 100%',
      badgeType: 'gray' as const,
      actionLeft: 'Details',
      actionRight: 'Approve',
      primaryRight: true,
    },
    {
      id: 'm-2',
      name: 'Terra Botanics',
      meta: 'Organic Cosmetics • Applied 4h ago',
      badge: 'Docs Pending',
      badgeType: 'amber' as const,
      actionLeft: 'Request Info',
      actionRight: 'Inspect',
      primaryRight: false,
    },
    {
      id: 'm-3',
      name: 'Pro Drone 4K Ultra',
      meta: 'Flagged: "Restricted Frequency" • Vendor: DroneLab',
      badge: 'Flagged',
      badgeType: 'dark' as const,
      actionLeft: 'Reject',
      actionRight: 'Audit Item',
      dangerLeft: true,
      primaryRight: false,
    },
  ];

  // ── Open Disputes Data ───────────────────────────────────────────────────
  const disputeCases = [
    {
      caseId: 'CASE #VD-4092',
      badge: 'Escalated',
      badgeType: 'dark' as const,
      title: 'Alex M. vs. Lumina Tech',
      detail: 'Item Not Received • Order #88410 • $1,450.00',
      timer: '1h 45m left to mediate',
      actionText: 'Resolve',
      actionPrimary: true,
    },
    {
      caseId: 'CASE #VD-4089',
      badge: 'In Review',
      badgeType: 'gray' as const,
      title: 'Studio Beta vs. Nordic Haven',
      detail: 'Damaged Freight Delivery • Order #88312 • $2,190.00',
      timer: '6h left to mediate',
      actionText: 'Review Claims',
      actionPrimary: false,
    },
    {
      caseId: 'CASE #VD-4075',
      badge: 'Waiting Seller',
      badgeType: 'gray' as const,
      title: 'Rachel C. vs. Solace Wear',
      detail: 'Incorrect Sizing / Return Refusal • $480.00',
      timer: 'Seller deadline: 18h',
      actionText: 'View Thread',
      actionPrimary: false,
    },
  ];

  // ── Live Audit Log ───────────────────────────────────────────────────────
  const auditLogs = [
    {
      id: 'log-1',
      title: 'Vendor Payout Executed',
      time: '2m ago',
      description: '$24,500 transferred to Apex Gear Co. (Automated ACH).',
    },
    {
      id: 'log-2',
      title: 'Dispute Opened #VD-4092',
      time: '14m ago',
      description: 'Escalated by buyer Alex M. for non-delivery claim.',
    },
    {
      id: 'log-3',
      title: 'Tier-1 Onboarding Pass',
      time: '48m ago',
      description: 'Studio Z completed automated corporate registry checks.',
    },
    {
      id: 'log-4',
      title: 'Commission Policy Synced',
      time: '1h ago',
      description: 'Q4 seasonal fee tier applied to Consumer Tech vertical.',
    },
  ];

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Platform Governance & Control"
      subtitle="Google Stitch-aligned command center for high-scale multi-vendor marketplace governance."
      sidebar={<AdminNav />}
    >
      <div className="space-y-5 pb-10">
        {/* =====================================================================
            Top Command Center Sub-Header & Controls
            ===================================================================== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>VENDORA HQ</span>
              <span>&gt;</span>
              <span className="text-slate-600">COMMAND CENTER</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Marketplace Overview
              </h1>
              <button
                type="button"
                onClick={triggerLiveSync}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
                title="Click to refresh live feed"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${
                    isLiveSyncing ? 'animate-ping' : 'animate-pulse'
                  }`}
                />
                <span>Live Syncing ({isLiveSyncing ? 'just now' : '12s ago'})</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Last 30 Days (Oct 1 - Oct 31)</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export Report</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Action</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            Row 1: 6 Executive KPI Cards
            ===================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* 1. Total GMV */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total GMV</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold tracking-tight text-slate-900">
                $4,829,150
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-sm bg-emerald-50 px-1 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  ↑ +15.4%
                </span>
                <span className="text-[10px] text-slate-400">vs last month</span>
              </div>
            </div>
            {/* Sparkline curve */}
            <div className="mt-2 h-4 w-full">
              <svg viewBox="0 0 100 20" className="h-full w-full overflow-visible">
                <path
                  d="M0 16 Q 25 18, 50 10 T 100 4"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* 2. Total Orders */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Orders</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold tracking-tight text-slate-900">
                68,420
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-sm bg-emerald-50 px-1 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  ↑ +12.1%
                </span>
                <span className="text-[10px] text-slate-400">Target: 75,000</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                91.2% pacing • 6,580 to go
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '91.2%' }} />
            </div>
          </div>

          {/* 3. Platform Commission */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Platform Commission</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <DollarSign className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold tracking-tight text-slate-900">
                $482,915
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Take rate <span className="font-semibold text-slate-800">10.0%</span> •{' '}
                <span className="text-emerald-600 font-semibold">+15.8% MoM</span>
              </div>
            </div>
            {/* Wave sparkline */}
            <div className="mt-2 h-4 w-full">
              <svg viewBox="0 0 100 20" className="h-full w-full overflow-visible">
                <path
                  d="M0 14 Q 20 18, 45 12 T 70 8 T 100 3"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* 4. Active Vendors */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Vendors</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <Store className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold tracking-tight text-slate-900">
                1,248
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                <span className="font-semibold text-slate-800">+34 this mo</span> • 98.2% SLA
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>1,226 active today</span>
              </div>
            </div>
          </div>

          {/* 5. Pending Queues */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pending Queues</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <ClipboardList className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">28</span>
                <span className="rounded bg-slate-900 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                  Needs Review
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                16 Vendors • 12 Products
              </div>
            </div>
          </div>

          {/* 6. Open Disputes */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Open Disputes</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <Scale className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">5</span>
                <div className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-800">
                  <span>2 Escalated</span>{' '}
                  <span className="text-slate-400 font-normal">High Priority</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                $4,120 at stake • &lt; 4h SLA
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            Row 2: GMV Velocity & Trajectory (2/3) + Channel Volume (1/3)
            ===================================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* GMV Velocity & Trajectory Card */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    GMV Velocity &amp; Trajectory
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-600 border border-slate-200/60">
                    Q3 vs Q2
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Aggregated marketplace gross checkout run-rate with predictive smoothing
                </p>
              </div>

              {/* Toggles & Options */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setVelocityMetric('gross')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      velocityMetric === 'gross'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Gross GMV
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocityMetric('margin')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      velocityMetric === 'margin'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Net Margin
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="More chart options"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Area Chart SVG Visual */}
            <div className="relative mt-5 h-56 w-full">
              <svg
                viewBox="0 0 700 200"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
              >
                <defs>
                  <linearGradient id="q3AreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F172A" stopOpacity="0.14" />
                    <stop offset="85%" stopColor="#0F172A" stopOpacity="0.01" />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                <line x1="0" y1="40" x2="700" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="90" x2="700" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="140" x2="700" y2="140" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />

                {/* Q3 Filled Area */}
                <path
                  d="M 20 160 
                     C 100 145, 180 120, 260 105 
                     C 340 90, 420 70, 500 52 
                     C 550 42, 600 48, 680 44
                     L 680 180 L 20 180 Z"
                  fill="url(#q3AreaGrad)"
                />

                {/* Q2 Previous Line (Dashed Slate) */}
                <path
                  d="M 20 170 
                     C 110 160, 200 145, 300 135 
                     C 400 125, 500 115, 600 95 
                     L 680 92"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />

                {/* Q3 Active Curve Line (Solid Dark Slate) */}
                <path
                  d="M 20 160 
                     C 100 145, 180 120, 260 105 
                     C 340 90, 420 70, 500 52 
                     C 550 42, 600 48, 680 44"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="2.5"
                />

                {/* Tooltip Pin on Peak Day */}
                <line x1="500" y1="52" x2="500" y2="180" stroke="#0F172A" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx="500" cy="52" r="4.5" fill="#0F172A" />
                <circle cx="500" cy="52" r="2" fill="#FFFFFF" />
              </svg>

              {/* Peak Tooltip Pill Badge */}
              <div className="absolute top-2 left-[58%] -translate-x-1/2 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Peak Day Oct 28: $218.4k (+31%)</span>
              </div>
            </div>

            {/* Bottom Axis Labels & Legend */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-slate-900" />
                  <span className="font-semibold text-slate-800">Q3 Active ($4.82M)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-slate-400" />
                  <span>Q2 Previous ($3.95M)</span>
                </div>
              </div>

              {/* Week intervals */}
              <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
                <span>W1 (Oct 1)</span>
                <span>W2 (Oct 8)</span>
                <span>W3 (Oct 15)</span>
                <span>W4 (Oct 22)</span>
                <span>W5 (Oct 29)</span>
              </div>
            </div>
          </div>

          {/* Channel Volume Card */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Channel Volume</h2>
                  <p className="text-[11px] text-slate-400">3P Marketplace vs 1P Direct Catalog</p>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </div>

              {/* Volume Channel Progress Bars */}
              <div className="mt-4 space-y-3.5">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-800">3rd-Party Marketplace (1,248 Vendors)</span>
                    <span className="text-slate-900">54,071 (79%)</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '79%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">1st-Party Direct / Warehouse</span>
                    <span className="text-slate-700">14,349 (21%)</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: '21%' }} />
                  </div>
                </div>
              </div>

              {/* 12-Week Order Distribution Mini Bar Group */}
              <div className="mt-5 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-semibold text-slate-600">
                  12-Week Order Distribution
                </span>
                <div className="mt-3 flex h-14 items-end justify-between gap-1.5 px-1">
                  {[
                    { h: '38%', label: 'V1', bg: 'bg-slate-300' },
                    { h: '45%', label: 'V2', bg: 'bg-slate-400' },
                    { h: '52%', label: 'V3', bg: 'bg-slate-400' },
                    { h: '60%', label: 'V4', bg: 'bg-slate-500' },
                    { h: '75%', label: 'V5', bg: 'bg-slate-700' },
                    { h: '70%', label: 'V6', bg: 'bg-slate-600' },
                    { h: '88%', label: 'V7', bg: 'bg-slate-800' },
                    { h: '95%', label: 'V8', bg: 'bg-slate-900' },
                  ].map((bar, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1 h-full justify-end">
                      <div
                        className={`w-full rounded-t-xs transition-all ${bar.bg}`}
                        style={{ height: bar.h }}
                      />
                      <span className="text-[9px] font-medium text-slate-400">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Conversion Footer */}
            <div className="mt-4 rounded-lg bg-slate-50 p-2.5 flex items-center justify-between border border-slate-200/80 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <TrendingUp className="h-3.5 w-3.5 text-slate-900" />
                <span>Checkout Conversion: 3.84%</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600">+0.4% this week</span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            Row 3: Top Vendor Partners (5/12) + Category Share (3/12) + Quick Actions (4/12)
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Top Vendor Partners */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Top Vendor Partners</h2>
                <p className="text-[11px] text-slate-400">
                  Ranked by 30-day realized GMV &amp; fulfillment quality
                </p>
              </div>
              <Link
                to="/admin/vendors"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 hover:underline"
              >
                <span>View All (1,248)</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Vendor Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-2 font-bold">MERCHANT</th>
                    <th className="pb-2 font-bold text-right">GMV (30D)</th>
                    <th className="pb-2 font-bold text-right">TAKE FEE</th>
                    <th className="pb-2 font-bold text-center">RATING</th>
                    <th className="pb-2 font-bold text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topVendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-black text-white">
                            {v.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                              {v.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate leading-tight">
                              {v.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-900 text-xs">
                        {v.gmv}
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-500 text-xs">
                        {v.takeFee}
                      </td>
                      <td className="py-2.5 text-center text-xs font-semibold text-slate-700">
                        ★ {v.rating}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            v.statusType === 'dark'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Category Share */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Category Share</h2>
                  <p className="text-[11px] text-slate-400">GMV composition by vertical</p>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <PieChart className="h-4 w-4" />
                </div>
              </div>

              {/* Segmented Progress Bar */}
              <div className="mt-4">
                <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-0.5">
                  <div className="h-full bg-slate-900" style={{ width: '38%' }} title="Consumer Tech: 38%" />
                  <div className="h-full bg-slate-700" style={{ width: '26%' }} title="Home & Living: 26%" />
                  <div className="h-full bg-slate-500" style={{ width: '19%' }} title="Apparel & Gear: 19%" />
                  <div className="h-full bg-slate-400" style={{ width: '11%' }} title="Health & Beauty: 11%" />
                  <div className="h-full bg-slate-300" style={{ width: '6%' }} title="1P Catalog: 6%" />
                </div>
              </div>

              {/* Category Breakdown Rows */}
              <div className="mt-4 space-y-2 text-xs">
                {[
                  { name: 'Consumer Tech', val: '$1.83M', pct: '38%', color: 'bg-slate-900' },
                  { name: 'Home & Living', val: '$1.25M', pct: '26%', color: 'bg-slate-700' },
                  { name: 'Apparel & Gear', val: '$917K', pct: '19%', color: 'bg-slate-500' },
                  { name: 'Health & Beauty', val: '$531K', pct: '11%', color: 'bg-slate-400' },
                  { name: '1P Catalog Exclusives', val: '$289K', pct: '6%', color: 'bg-slate-300' },
                ].map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-xs ${cat.color}`} />
                      <span className="font-medium text-slate-700 text-[11px]">{cat.name}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-900">
                      <span>{cat.val}</span>{' '}
                      <span className="text-slate-400 font-normal">({cat.pct})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Highlight */}
            <div className="mt-4 rounded-lg bg-slate-50 p-2.5 flex items-center justify-between border border-slate-200/80 text-[11px]">
              <span className="font-semibold text-slate-600">Fastest Growing Vertical</span>
              <div className="flex items-center gap-1 font-bold text-slate-900">
                <Zap className="h-3.5 w-3.5 text-slate-900" />
                <span>Consumer Tech (+28.2%)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Quick Actions */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
                  <p className="text-[11px] text-slate-400">1-Click administrative operations</p>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <Zap className="h-4 w-4" />
                </div>
              </div>

              {/* Action List */}
              <div className="mt-3 space-y-2">
                <Link
                  to="/admin/vendors"
                  className="flex items-center justify-between rounded-lg border border-slate-200/90 bg-slate-50/60 p-2.5 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Approve Batch (6)
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Verified merchant KYC pass
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>

                <div className="flex items-center justify-between rounded-lg border border-slate-200/90 bg-slate-50/60 p-2.5 hover:bg-slate-100/80 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                      <Banknote className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Payout Run ($184k)
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Scheduled automated batch
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>

                <Link
                  to="/admin/disputes"
                  className="flex items-center justify-between rounded-lg border border-slate-200/90 bg-slate-50/60 p-2.5 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Audit Dispute #4092
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Counterfeit claim review
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>

                <div className="flex items-center justify-between rounded-lg border border-slate-200/90 bg-slate-50/60 p-2.5 hover:bg-slate-100/80 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                      <Megaphone className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Platform Notice
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Broadcast to 1,248 vendors
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Bottom Download Tax Summaries */}
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <FileDown className="h-3.5 w-3.5 text-slate-400" />
              <span>Download 1099-K Tax Summaries</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            Row 4: Operational Queues & Live Audit (3 Columns)
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Moderation Queue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Moderation Queue</h2>
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    28
                  </span>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setModerationTab('vendors')}
                    className={`rounded px-2 py-0.5 ${
                      moderationTab === 'vendors'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Vendors (16)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationTab('items')}
                    className={`rounded px-2 py-0.5 ${
                      moderationTab === 'items'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Items (12)
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-3 space-y-3">
                {moderationVendors.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                          {item.meta}
                        </p>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          item.badgeType === 'dark'
                            ? 'bg-slate-900 text-white'
                            : item.badgeType === 'amber'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                          item.dangerLeft
                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {item.actionLeft}
                      </button>
                      <button
                        type="button"
                        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                          item.primaryRight
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {item.actionRight}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom link */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link
                to="/admin/vendors"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 hover:underline"
              >
                <span>Go to Full Moderation Center</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Column 2: Open Disputes */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Open Disputes</h2>
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    5 Urgent
                  </span>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>

              {/* Dispute Cases */}
              <div className="mt-3 space-y-3">
                {disputeCases.map((d, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {d.caseId}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          d.badgeType === 'dark'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {d.badge}
                      </span>
                    </div>

                    <div className="mt-1">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {d.title}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {d.detail}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{d.timer}</span>
                      </div>
                      <button
                        type="button"
                        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                          d.actionPrimary
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {d.actionText}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom link */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link
                to="/admin/disputes"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 hover:underline"
              >
                <span>Access Dispute Escalation Desk</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Column 3: Live Audit Log */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Live Audit Log</h2>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
              </div>

              {/* Real-time Timeline Log */}
              <div className="mt-4 space-y-4 relative before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {auditLogs.map((log) => (
                  <div key={log.id} className="relative pl-5">
                    <span className="absolute left-0 top-1 h-3 w-3 rounded-full bg-slate-900 border-2 border-white shadow-2xs" />
                    <div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {log.title}
                        </p>
                        <span className="text-[10px] text-slate-400">{log.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        {log.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom link */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link
                to="/admin/reports"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 hover:underline"
              >
                <span>Open Full Audit Ledger</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
