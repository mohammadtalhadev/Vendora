import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  Search,
  Download,
  Plus,
  X,
  ShieldAlert,
  DollarSign,
  Clock,
  Eye,
  Package,
  Truck,
  FileText,
  MapPin,
  User,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';
import { exportToCsv } from '../lib/export-csv';
import { useMarketplaceStore } from '../store/marketplace-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

interface DisputeItem {
  id: string;
  orderId: string;
  customer: string;
  vendor: string;
  reason: string;
  amount: number;
  status: 'open' | 'resolved' | 'escalated';
  createdAt: string;
  resolutionNote?: string;
  resolutionType?: 'full_refund' | 'partial_refund' | 'claim_denied';
}

interface DisputeOrderDossier {
  orderId: string;
  disputeId: string;
  orderPlacedAt: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  vendorName: string;
  vendorEmail: string;
  fulfillmentSla: string;
  trackingNumber: string;
  carrier: string;
  paymentMethod: string;
  escrowStatus: string;
  items: Array<{
    name: string;
    variant: string;
    sku: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  buyerClaim: {
    reason: string;
    details: string;
    requestedRemedy: string;
    filedAt: string;
  };
  vendorResponse?: {
    respondedAt: string;
    notes: string;
    carrierEvidenceId: string;
  };
  timeline: Array<{
    timestamp: string;
    title: string;
    description: string;
    actor: 'System' | 'Customer' | 'Vendor' | 'Carrier' | 'Admin';
    badge: string;
  }>;
}

const DISPUTE_DOSSIERS: Record<string, DisputeOrderDossier> = {
  'dsp-501': {
    orderId: 'ord-grp-2001',
    disputeId: 'dsp-501',
    orderPlacedAt: 'Oct 20, 2026, 10:14 UTC',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.jenkins@example.com',
    shippingAddress: '742 Evergreen Terrace, Springfield, OR 97477, US',
    vendorName: 'Vendora Soundwave',
    vendorEmail: 'support@soundwave.vendora.shop',
    fulfillmentSla: '4-Hour Dispatch SLA',
    trackingNumber: 'DHL-984210492',
    carrier: 'DHL Express International',
    paymentMethod: 'Stripe Escrow (Vault Hold)',
    escrowStatus: '7-Day Hold Active ($189.00 Locked)',
    items: [
      {
        name: 'Wireless ANC Studio Headphones Pro',
        variant: 'Matte Obsidian / Over-Ear',
        sku: 'VD-AUD-991',
        price: 189.0,
        quantity: 1,
      },
    ],
    subtotal: 189.0,
    shippingFee: 0.0,
    tax: 0.0,
    total: 189.0,
    buyerClaim: {
      reason: 'Package delayed beyond guaranteed SLA window',
      details: 'Customer paid for guaranteed 2-day delivery. Shipment remained stalled at regional sorting hub for over 72 hours without active scan updates.',
      requestedRemedy: 'Full Refund ($189.00) or Immediate Expedited Replacement',
      filedAt: 'Today, 09:20 UTC',
    },
    vendorResponse: {
      respondedAt: 'Today, 10:45 UTC',
      notes: 'Carrier reported customs routing reclassification at Frankfurt hub. Shipment is currently back in transit to destination.',
      carrierEvidenceId: 'DHL-INQ-8812-CUSTOMS',
    },
    timeline: [
      {
        timestamp: 'Oct 20, 10:14 UTC',
        title: 'Order Placed & Escrow Funded',
        description: 'Sarah Jenkins placed order #ord-grp-2001. $189.00 captured into 7-day platform safety escrow vault.',
        actor: 'System',
        badge: 'bg-slate-100 text-slate-700',
      },
      {
        timestamp: 'Oct 20, 13:40 UTC',
        title: 'Vendor Acknowledged & Packaged',
        description: 'Vendora Soundwave confirmed fulfillment within 4h SLA and generated dispatch label.',
        actor: 'Vendor',
        badge: 'bg-blue-50 text-blue-700',
      },
      {
        timestamp: 'Oct 21, 08:30 UTC',
        title: 'Carrier Picked Up & Departed',
        description: 'DHL Express scanned package at originating facility (Air Freight Manifest #DHL-984210492).',
        actor: 'Carrier',
        badge: 'bg-emerald-50 text-emerald-700',
      },
      {
        timestamp: 'Oct 23, 14:15 UTC',
        title: 'Carrier Delay Exception Occurred',
        description: 'Logistics exception: package delayed due to sorting hub customs reclassification backlog.',
        actor: 'Carrier',
        badge: 'bg-amber-50 text-amber-700',
      },
      {
        timestamp: 'Today, 09:20 UTC',
        title: 'Dispute Filed by Customer',
        description: 'Sarah Jenkins initiated arbitration claim citing delivery exceeded contractual SLA window by 3 business days.',
        actor: 'Customer',
        badge: 'bg-rose-50 text-rose-700',
      },
      {
        timestamp: 'Today, 10:45 UTC',
        title: 'Vendor Submitted Evidence',
        description: 'Vendora Soundwave uploaded carrier investigation ticket #DHL-INQ-8812-CUSTOMS and updated ETA.',
        actor: 'Vendor',
        badge: 'bg-blue-50 text-blue-700',
      },
      {
        timestamp: 'Today, 11:30 UTC',
        title: 'Escalated to Platform Arbitration',
        description: 'SLA automated monitor escalated case to Super Admin queue for binding decision.',
        actor: 'Admin',
        badge: 'bg-purple-50 text-purple-700',
      },
    ],
  },
  'dsp-502': {
    orderId: 'ord-grp-1988',
    disputeId: 'dsp-502',
    orderPlacedAt: 'Yesterday, 10:20 UTC',
    customerName: 'Alexander Pierce',
    customerEmail: 'a.pierce@techmail.com',
    shippingAddress: '1204 Pine Street, Apt 4B, Seattle, WA 98101, US',
    vendorName: 'Vendora Soundwave',
    vendorEmail: 'support@soundwave.vendora.shop',
    fulfillmentSla: 'Same-Day Dispatch SLA',
    trackingNumber: 'FDX-449102381',
    carrier: 'FedEx Home Delivery',
    paymentMethod: 'Credit Card via Stripe',
    escrowStatus: '7-Day Escrow Active ($159.00 Locked)',
    items: [
      {
        name: 'Mechanical Ergonomic Keyboard RGB',
        variant: 'Cherry MX Silent Brown / Aluminum Frame',
        sku: 'VD-KB-402',
        price: 159.0,
        quantity: 1,
      },
    ],
    subtotal: 159.0,
    shippingFee: 0.0,
    tax: 0.0,
    total: 159.0,
    buyerClaim: {
      reason: 'Item box had dent upon doorstep arrival',
      details: 'Outer retail packaging sustained visible crush impact during courier transit. Customer concerned about internal mechanical switch integrity.',
      requestedRemedy: 'Partial damage compensation refund or verified switch warranty extension',
      filedAt: 'Yesterday, 15:40 UTC',
    },
    timeline: [
      {
        timestamp: 'Yesterday, 10:20 UTC',
        title: 'Order Placed & Escrow Funded',
        description: 'Alexander Pierce completed checkout for $159.00.',
        actor: 'System',
        badge: 'bg-slate-100 text-slate-700',
      },
      {
        timestamp: 'Yesterday, 12:15 UTC',
        title: 'Vendor Packaged & Dispatched',
        description: 'Vendora Soundwave packed unit in standard corrugated parcel box with bubble protection.',
        actor: 'Vendor',
        badge: 'bg-blue-50 text-blue-700',
      },
      {
        timestamp: 'Yesterday, 14:50 UTC',
        title: 'Delivered to Doorstep',
        description: 'FedEx courier delivered to front porch.',
        actor: 'Carrier',
        badge: 'bg-emerald-50 text-emerald-700',
      },
      {
        timestamp: 'Yesterday, 15:40 UTC',
        title: 'Dispute Filed with Photos',
        description: 'Alexander Pierce submitted photos showing corner dent on outer packaging box.',
        actor: 'Customer',
        badge: 'bg-amber-50 text-amber-700',
      },
      {
        timestamp: 'Today, 08:00 UTC',
        title: 'Pending Platform Review',
        description: 'Admin arbitration evaluating whether customer requests partial refund or merchant replacement.',
        actor: 'Admin',
        badge: 'bg-blue-50 text-blue-700',
      },
    ],
  },
  'dsp-503': {
    orderId: 'ord-grp-1942',
    disputeId: 'dsp-503',
    orderPlacedAt: '3 days ago, 12:00 UTC',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@designco.fr',
    shippingAddress: '18 Rue de Rivoli, 75004 Paris, France',
    vendorName: 'StudioCraft Assets',
    vendorEmail: 'licensing@studiocraft.vendora.shop',
    fulfillmentSla: 'Instant Digital License Delivery',
    trackingNumber: 'DIGITAL-LIC-KEY-994',
    carrier: 'Instant Digital Key Delivery',
    paymentMethod: 'Stripe Multi-Vendor Checkout',
    escrowStatus: 'Released to Vendor ($59.00)',
    items: [
      {
        name: 'UI Design System Kit (Enterprise Multi-Seat)',
        variant: 'Team Tier / Figma Tokens Included',
        sku: 'VD-DIG-204',
        price: 59.0,
        quantity: 1,
      },
    ],
    subtotal: 59.0,
    shippingFee: 0.0,
    tax: 0.0,
    total: 59.0,
    buyerClaim: {
      reason: 'License key format mismatch in Figma import',
      details: 'Generated license token yielded checksum format error when parsed by the Figma design token import plugin.',
      requestedRemedy: 'Valid replacement license token or immediate refund',
      filedAt: '3 days ago, 14:30 UTC',
    },
    vendorResponse: {
      respondedAt: '3 days ago, 15:45 UTC',
      notes: 'StudioCraft Assets issued refreshed v2.4 license tokens with updated cryptographic signature format.',
      carrierEvidenceId: 'LIC-REGEN-OK-788',
    },
    timeline: [
      {
        timestamp: '3 days ago, 12:00 UTC',
        title: 'Digital Order Authorized',
        description: 'Elena Rostova purchased Enterprise license ($59.00).',
        actor: 'System',
        badge: 'bg-slate-100 text-slate-700',
      },
      {
        timestamp: '3 days ago, 12:01 UTC',
        title: 'Initial License Token Delivered',
        description: 'Automated digital fulfillment email dispatched with initial token.',
        actor: 'System',
        badge: 'bg-emerald-50 text-emerald-700',
      },
      {
        timestamp: '3 days ago, 14:30 UTC',
        title: 'Customer Opened Dispute',
        description: 'Customer reported schema mismatch in token string.',
        actor: 'Customer',
        badge: 'bg-amber-50 text-amber-700',
      },
      {
        timestamp: '3 days ago, 15:45 UTC',
        title: 'Vendor Provided Regenerated Tokens',
        description: 'StudioCraft Assets re-issued compliant v2.4 token string directly to customer.',
        actor: 'Vendor',
        badge: 'bg-blue-50 text-blue-700',
      },
      {
        timestamp: '3 days ago, 16:30 UTC',
        title: 'Customer Validated & Dispute Closed',
        description: 'Elena verified token works in Figma plugin. Super Admin closed case as satisfied.',
        actor: 'Admin',
        badge: 'bg-emerald-50 text-emerald-700',
      },
    ],
  },
};

const getDossier = (dispute: DisputeItem): DisputeOrderDossier => {
  if (DISPUTE_DOSSIERS[dispute.id]) {
    return DISPUTE_DOSSIERS[dispute.id];
  }
  return {
    orderId: dispute.orderId,
    disputeId: dispute.id,
    orderPlacedAt: dispute.createdAt,
    customerName: dispute.customer,
    customerEmail: `${dispute.customer.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    shippingAddress: '100 Market St, Suite 400, San Francisco, CA 94105, US',
    vendorName: dispute.vendor,
    vendorEmail: `support@${dispute.vendor.toLowerCase().replace(/\s+/g, '')}.vendora.shop`,
    fulfillmentSla: 'Standard Delivery SLA',
    trackingNumber: `TRK-${Math.floor(1000000 + Math.random() * 9000000)}`,
    carrier: 'Express Logistics Network',
    paymentMethod: 'Stripe Multi-Vendor Escrow',
    escrowStatus: `7-Day Escrow Active ($${dispute.amount.toFixed(2)} Held)`,
    items: [
      {
        name: `Marketplace Order Product (${dispute.vendor})`,
        variant: 'Standard Commercial Variant',
        sku: `VD-ORD-${dispute.id.slice(-3)}`,
        price: dispute.amount,
        quantity: 1,
      },
    ],
    subtotal: dispute.amount,
    shippingFee: 0,
    tax: 0,
    total: dispute.amount,
    buyerClaim: {
      reason: dispute.reason,
      details: dispute.reason,
      requestedRemedy: `Full or Partial Refund ($${dispute.amount.toFixed(2)})`,
      filedAt: dispute.createdAt,
    },
    timeline: [
      {
        timestamp: dispute.createdAt,
        title: 'Order Placed & Escrow Reserved',
        description: `Order #${dispute.orderId} checkout completed. Funds held in safety escrow.`,
        actor: 'System',
        badge: 'bg-slate-100 text-slate-700',
      },
      {
        timestamp: 'Follow-up',
        title: 'Dispute Filed',
        description: dispute.reason,
        actor: 'Customer',
        badge: 'bg-amber-50 text-amber-700',
      },
      {
        timestamp: 'Current',
        title: 'Arbitration Review Active',
        description: 'Awaiting platform administrative determination or vendor settlement.',
        actor: 'Admin',
        badge: 'bg-blue-50 text-blue-700',
      },
    ],
  };
};

const INITIAL_DISPUTES: DisputeItem[] = [
  {
    id: 'dsp-501',
    orderId: 'ord-grp-2001',
    customer: 'Sarah Jenkins',
    vendor: 'Vendora Soundwave',
    reason: 'Package delayed beyond guaranteed SLA window',
    amount: 189.0,
    status: 'escalated',
    createdAt: 'Today, 09:20',
  },
  {
    id: 'dsp-502',
    orderId: 'ord-grp-1988',
    customer: 'Alexander Pierce',
    vendor: 'Vendora Soundwave',
    reason: 'Item box had dent upon doorstep arrival',
    amount: 159.0,
    status: 'open',
    createdAt: 'Yesterday, 15:40',
  },
  {
    id: 'dsp-503',
    orderId: 'ord-grp-1942',
    customer: 'Elena Rostova',
    vendor: 'StudioCraft Assets',
    reason: 'License key format mismatch in Figma import',
    amount: 59.0,
    status: 'resolved',
    createdAt: '3 days ago',
    resolutionNote: 'Merchant issued refreshed license tokens within 2h. Claim satisfied.',
    resolutionType: 'claim_denied',
  },
];

export const AdminDisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>(INITIAL_DISPUTES);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'escalated' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Resolution Modal State
  const [selectedDisputeForRuling, setSelectedDisputeForRuling] = useState<DisputeItem | null>(null);
  const [rulingType, setRulingType] = useState<'full_refund' | 'partial_refund' | 'claim_denied'>('full_refund');
  const [rulingAmount, setRulingAmount] = useState<number>(0);
  const [rulingNote, setRulingNote] = useState('');

  // Details Modal State
  const [selectedDisputeForDetails, setSelectedDisputeForDetails] = useState<DisputeItem | null>(null);

  // New Claim Modal State
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [newOrderId, setNewOrderId] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newVendor, setNewVendor] = useState('Vendora Soundwave');
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('89.50');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenRulingModal = (dispute: DisputeItem) => {
    setSelectedDisputeForRuling(dispute);
    setRulingType('full_refund');
    setRulingAmount(dispute.amount);
    setRulingNote(`Platform ruling on case ${dispute.id}: Order #${dispute.orderId}. Resolution applied.`);
  };

  const handleConfirmRuling = () => {
    if (!selectedDisputeForRuling) return;

    setDisputes((prev) =>
      prev.map((d) =>
        d.id === selectedDisputeForRuling.id
          ? {
              ...d,
              status: 'resolved',
              resolutionNote: rulingNote || 'Dispute resolved following super admin review.',
              resolutionType: rulingType,
            }
          : d
      )
    );

    // Sync with marketplaceStore if dispute exists
    try {
      useMarketplaceStore.getState().resolveDispute(selectedDisputeForRuling.id, rulingNote);
    } catch {
      // Ignore if unseeded
    }

    showToast(`Case ${selectedDisputeForRuling.id} ruled and resolved successfully.`);
    setSelectedDisputeForRuling(null);
  };

  const handleEscalate = (id: string) => {
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'escalated' } : d))
    );
    try {
      useMarketplaceStore.getState().escalateDispute(id);
    } catch {
      // Ignore
    }
    showToast(`Case ${id} escalated to Platform Senior Arbitration.`);
  };

  const handleCreateNewClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newReason.trim()) {
      showToast('Please specify customer name and claim rationale.');
      return;
    }

    const newDispute: DisputeItem = {
      id: `dsp-${Date.now().toString().slice(-4)}`,
      orderId: newOrderId.trim() || `ord-grp-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: newCustomer.trim(),
      vendor: newVendor.trim(),
      reason: newReason.trim(),
      amount: parseFloat(newAmount) || 50.0,
      status: 'open',
      createdAt: 'Just now',
    };

    setDisputes((prev) => [newDispute, ...prev]);
    setIsNewClaimOpen(false);
    setNewCustomer('');
    setNewReason('');
    showToast(`Arbitration claim ${newDispute.id} registered into active queue.`);
  };

  const handleExportCsv = () => {
    const rows = filteredDisputes.map((d) => ({
      dispute_id: d.id,
      order_id: d.orderId,
      customer: d.customer,
      vendor: d.vendor,
      amount: d.amount.toFixed(2),
      status: d.status,
      created_at: d.createdAt,
      reason: d.reason,
      resolution_note: d.resolutionNote || 'Pending resolution',
    }));

    exportToCsv({
      filename: `vendora_platform_disputes_${new Date().toISOString().slice(0, 10)}.csv`,
      data: rows,
      columns: [
        { header: 'Dispute ID', key: 'dispute_id' },
        { header: 'Order ID', key: 'order_id' },
        { header: 'Customer', key: 'customer' },
        { header: 'Vendor', key: 'vendor' },
        { header: 'Disputed Amount ($)', key: 'amount' },
        { header: 'Status', key: 'status' },
        { header: 'Created At', key: 'created_at' },
        { header: 'Reason', key: 'reason' },
        { header: 'Resolution Note', key: 'resolution_note' },
      ],
    });

    showToast('Platform disputes log exported to CSV.');
  };

  const filteredDisputes = disputes.filter((d) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'open'
        ? d.status === 'open'
        : statusFilter === 'escalated'
        ? d.status === 'escalated'
        : d.status === 'resolved';

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      d.id.toLowerCase().includes(q) ||
      d.orderId.toLowerCase().includes(q) ||
      d.customer.toLowerCase().includes(q) ||
      d.vendor.toLowerCase().includes(q) ||
      d.reason.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const openCasesCount = disputes.filter((d) => d.status === 'open').length;
  const escalatedCount = disputes.filter((d) => d.status === 'escalated').length;
  const resolvedCount = disputes.filter((d) => d.status === 'resolved').length;
  const totalDisputedAmount = disputes.reduce((sum, d) => sum + d.amount, 0);

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Dispute Resolution & Escalation Hub"
      subtitle="Arbitrate vendor-buyer disputes, issue simulated refunds, and enforce platform guarantee policies."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Scale className="h-3.5 w-3.5 text-slate-500" />
              <span>Platform Arbitration Court</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-2 text-xs rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Disputes CSV</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsNewClaimOpen(true)}
              className="gap-2 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log New Claim</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Open Cases</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">{openCasesCount}</div>
            <p className="mt-1 text-xs text-amber-600 font-medium">Under active review</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Escalated to Admin</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-rose-600">{escalatedCount}</div>
            <p className="mt-1 text-xs text-rose-600 font-medium">Requires immediate platform ruling</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolved Cases</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-emerald-600">{resolvedCount}</div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Closed with buyer satisfaction</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Escrow Disputed</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">${totalDisputedAmount.toFixed(2)}</div>
            <p className="mt-1 text-xs text-slate-500 font-medium">Across all filed cases</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto" data-lenis-prevent>
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Disputes ({disputes.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === 'open'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Open ({openCasesCount})
            </button>
            <button
              onClick={() => setStatusFilter('escalated')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === 'escalated'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Escalated ({escalatedCount})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, order, buyer, or vendor..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Active Disputes Queue Table / List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Disputes Queue</h3>
              <p className="text-xs text-slate-500">Customer protection guarantee claims requiring platform adjudication</p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Showing {filteredDisputes.length} of {disputes.length}
            </span>
          </div>

          {filteredDisputes.length === 0 ? (
            <div className="py-16 text-center">
              <Scale className="mx-auto h-10 w-10 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-800">No disputes found</h4>
              <p className="mt-1 text-xs text-slate-400">
                {searchQuery
                  ? 'No arbitration cases match your search filter.'
                  : 'All cases in this tab have been resolved.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDisputes.map((d) => (
                <div
                  key={d.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{d.id}</span>
                      <span className="text-slate-400">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDisputeForDetails(d)}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 hover:text-slate-950 underline decoration-slate-300 hover:decoration-slate-900 cursor-pointer"
                        title="View Order Details & Chronology"
                      >
                        <span>Order #{d.orderId}</span>
                        <Eye className="h-3 w-3 text-slate-400" />
                      </button>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-400">{d.createdAt}</span>

                      {d.status === 'escalated' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          Escalated
                        </span>
                      )}
                      {d.status === 'open' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          Open Under Review
                        </span>
                      )}
                      {d.status === 'resolved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved & Closed
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900">{d.reason}</h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Customer: <strong className="text-slate-800">{d.customer}</strong></span>
                      <span>•</span>
                      <span>Vendor: <strong className="text-slate-800">{d.vendor}</strong></span>
                      <span>•</span>
                      <span>
                        Disputed Amount: <strong className="text-slate-900 font-bold">${d.amount.toFixed(2)}</strong>
                      </span>
                    </div>

                    {d.resolutionNote && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs text-slate-600">
                        <span className="font-bold text-slate-800">Admin Ruling: </span>
                        <span>{d.resolutionNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDisputeForDetails(d)}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs rounded-xl gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span>Order &amp; Timeline</span>
                    </Button>

                    {d.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEscalate(d.id)}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-xs rounded-xl cursor-pointer"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                        <span>Escalate</span>
                      </Button>
                    )}

                    {d.status !== 'resolved' ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenRulingModal(d)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Issue Ruling & Resolve</span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Case Closed</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Issue Official Platform Ruling */}
        {selectedDisputeForRuling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Issue Platform Arbitration Ruling</h3>
                    <p className="text-xs text-slate-400">Case ID: {selectedDisputeForRuling.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDisputeForRuling(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Reference:</span>
                    <span className="font-mono font-bold text-slate-800">#{selectedDisputeForRuling.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Buyer:</span>
                    <span className="font-medium text-slate-800">{selectedDisputeForRuling.customer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vendor:</span>
                    <span className="font-medium text-slate-800">{selectedDisputeForRuling.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Disputed Amount:</span>
                    <span className="font-bold text-slate-900">${selectedDisputeForRuling.amount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 mt-1">
                    <span className="text-slate-500">Claim Reason: </span>
                    <span className="font-medium text-slate-800">{selectedDisputeForRuling.reason}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Arbitration Ruling Action
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRulingType('full_refund');
                        setRulingAmount(selectedDisputeForRuling.amount);
                      }}
                      className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
                        rulingType === 'full_refund'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Full Refund
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        ${selectedDisputeForRuling.amount.toFixed(2)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRulingType('partial_refund');
                        setRulingAmount(Math.round((selectedDisputeForRuling.amount / 2) * 100) / 100);
                      }}
                      className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
                        rulingType === 'partial_refund'
                          ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      50% Settlement
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        ${(selectedDisputeForRuling.amount / 2).toFixed(2)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRulingType('claim_denied');
                        setRulingAmount(0);
                      }}
                      className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
                        rulingType === 'claim_denied'
                          ? 'border-slate-800 bg-slate-50 text-slate-900 ring-2 ring-slate-800/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Deny Claim
                      <span className="block text-[10px] text-slate-400 mt-0.5">Release to Vendor</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Official Ruling Notes / Explanation
                  </label>
                  <textarea
                    rows={3}
                    value={rulingNote}
                    onChange={(e) => setRulingNote(e.target.value)}
                    placeholder="Provide clear rationale for the platform ruling..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDisputeForRuling(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmRuling}
                  className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Execute Ruling (${rulingAmount.toFixed(2)})</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Log New Claim */}
        {isNewClaimOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Log Platform Arbitration Claim</h3>
                    <p className="text-xs text-slate-400">Register new customer protection claim</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewClaimOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewClaim} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    placeholder="e.g. Liam Torres"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Vendor</label>
                  <select
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="Vendora Soundwave">Vendora Soundwave</option>
                    <option value="StudioCraft Assets">StudioCraft Assets</option>
                    <option value="Nexus Tech Hub">Nexus Tech Hub</option>
                    <option value="Urban Nomad Living">Urban Nomad Living</option>
                    <option value="Artisan Kitchen">Artisan Kitchen</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Order ID</label>
                    <input
                      type="text"
                      value={newOrderId}
                      onChange={(e) => setNewOrderId(e.target.value)}
                      placeholder="ord-grp-2041"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Claim Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dispute Reason / Claim Notes</label>
                  <textarea
                    rows={2}
                    required
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="Brief description of the issue..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNewClaimOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Register Dispute
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Full Dispute Order Dossier & Timeline */}
        <Dialog open={!!selectedDisputeForDetails} onOpenChange={(open) => !open && setSelectedDisputeForDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedDisputeForDetails && (() => {
              const dossier = getDossier(selectedDisputeForDetails);
              return (
                <div className="space-y-6 text-xs py-2">
                  {/* Header */}
                  <DialogHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-slate-900">
                            Case {selectedDisputeForDetails.id}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-sm font-semibold text-slate-600">
                            Order #{dossier.orderId}
                          </span>
                          {selectedDisputeForDetails.status === 'escalated' && (
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              Escalated to Super Admin
                            </span>
                          )}
                          {selectedDisputeForDetails.status === 'open' && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              Open Under Review
                            </span>
                          )}
                          {selectedDisputeForDetails.status === 'resolved' && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Resolved &amp; Closed
                            </span>
                          )}
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                          Dispute Dossier &amp; Order Audit Trail
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                          Complete tracking event log, customer claim statement, carrier evidence, and financial escrow reconciliation.
                        </DialogDescription>
                      </div>
                      <div className="text-right sm:self-center">
                        <div className="text-xs text-slate-500 font-medium">Disputed Amount</div>
                        <div className="text-2xl font-black text-slate-900">${dossier.total.toFixed(2)}</div>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* 2-Column Grid: Order Metadata & Parties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer & Delivery Card */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <User className="h-4 w-4 text-slate-600" />
                        <span>Customer &amp; Shipping Destination</span>
                      </div>
                      <div className="space-y-1 text-slate-600 pt-1">
                        <div><strong className="text-slate-800">{dossier.customerName}</strong> ({dossier.customerEmail})</div>
                        <div className="flex items-start gap-1.5 text-slate-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                          <span>{dossier.shippingAddress}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 pt-1">
                          Order placed on <strong className="text-slate-700">{dossier.orderPlacedAt}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Merchant & Logistics Card */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <Truck className="h-4 w-4 text-slate-600" />
                        <span>Merchant &amp; Logistics Tracking</span>
                      </div>
                      <div className="space-y-1 text-slate-600 pt-1">
                        <div>
                          Store: <strong className="text-slate-800">{dossier.vendorName}</strong>
                          <span className="ml-2 rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {dossier.fulfillmentSla}
                          </span>
                        </div>
                        <div className="text-[11px]">
                          Carrier: <strong className="text-slate-700">{dossier.carrier}</strong>
                        </div>
                        <div className="text-[11px] font-mono text-slate-700">
                          Tracking: <span className="font-bold">{dossier.trackingNumber}</span>
                        </div>
                        <div className="text-[11px] text-amber-700 font-semibold pt-1">
                          Escrow: {dossier.escrowStatus}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purchased Items Table */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <Package className="h-4 w-4 text-slate-600" />
                      <span>Purchased Items in Order #{dossier.orderId}</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2">PRODUCT</th>
                            <th className="px-3.5 py-2">VARIANT / SKU</th>
                            <th className="px-3.5 py-2 text-center">QTY</th>
                            <th className="px-3.5 py-2 text-right">UNIT PRICE</th>
                            <th className="px-3.5 py-2 text-right">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dossier.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                {item.name}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-500 font-mono text-[11px]">
                                {item.variant} ({item.sku})
                              </td>
                              <td className="px-3.5 py-2.5 text-center font-bold text-slate-800">
                                {item.quantity}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                                ${item.price.toFixed(2)}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                                ${(item.price * item.quantity).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Customer Dispute Claim & Vendor Response */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                          Customer Dispute Claim
                        </span>
                        <span className="text-[10px] text-rose-600 font-normal">{dossier.buyerClaim.filedAt}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">{dossier.buyerClaim.reason}</div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {dossier.buyerClaim.details}
                      </p>
                      <div className="pt-2 border-t border-rose-100 text-[11px] text-slate-700">
                        <span className="font-semibold text-rose-800">Requested Remedy: </span>
                        <span>{dossier.buyerClaim.requestedRemedy}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Merchant Response &amp; Evidence
                        </span>
                        <span className="text-[10px] text-blue-600 font-normal">
                          {dossier.vendorResponse?.respondedAt || 'Pending merchant rebuttal'}
                        </span>
                      </div>
                      {dossier.vendorResponse ? (
                        <>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {dossier.vendorResponse.notes}
                          </p>
                          <div className="pt-2 border-t border-blue-100 text-[11px] text-slate-700">
                            <span className="font-semibold text-blue-800">Logistics Reference: </span>
                            <span className="font-mono">{dossier.vendorResponse.carrierEvidenceId}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          No direct vendor rebuttal submitted. The platform arbitration SLA timer is running.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* "What Happened" Chronological Order & Dispute Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <Clock className="h-4 w-4 text-slate-600" />
                        <span>What Happened — Chronological Order &amp; Incident Event Log</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {dossier.timeline.length} Recorded Steps
                      </span>
                    </div>

                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {dossier.timeline.map((event, idx) => (
                        <div key={idx} className="relative group">
                          {/* Dot */}
                          <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-900 shadow-xs" />
                          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-slate-300 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">{event.title}</span>
                                <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${event.badge}`}>
                                  {event.actor}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-slate-400">{event.timestamp}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-slate-400 text-[11px]">
                      Case status: <strong className="text-slate-700 capitalize">{selectedDisputeForDetails.status}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDisputeForDetails(null)}
                        className="rounded-xl text-xs cursor-pointer"
                      >
                        Close Dossier
                      </Button>
                      {selectedDisputeForDetails.status === 'open' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleEscalate(selectedDisputeForDetails.id);
                            setSelectedDisputeForDetails(null);
                          }}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs rounded-xl cursor-pointer"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                          Escalate to Senior Arbitration
                        </Button>
                      )}
                      {selectedDisputeForDetails.status !== 'resolved' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const d = selectedDisputeForDetails;
                            setSelectedDisputeForDetails(null);
                            handleOpenRulingModal(d);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl cursor-pointer shadow-xs gap-1.5"
                        >
                          <Scale className="h-3.5 w-3.5" />
                          Rule &amp; Resolve Claim
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
