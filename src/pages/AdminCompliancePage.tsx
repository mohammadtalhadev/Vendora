import React, { useState } from 'react';
import {
  FileCheck,
  Download,
  CheckCircle2,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface TaxJurisdiction {
  code: string;
  name: string;
  rate: number;
  type: 'state_sales_tax' | 'vat';
  withholdingEnabled: boolean;
}

interface VendorTaxFiling {
  vendorId: string;
  vendorName: string;
  tinEin: string;
  grossSalesYtd: number;
  transactionsCount: number;
  exceeded1099Threshold: boolean;
  statementStatus: 'generated' | 'pending';
}

const SEED_JURISDICTIONS: TaxJurisdiction[] = [
  { code: 'US-CA', name: 'California (State + Local)', rate: 8.25, type: 'state_sales_tax', withholdingEnabled: true },
  { code: 'US-NY', name: 'New York (State + NYC)', rate: 8.875, type: 'state_sales_tax', withholdingEnabled: true },
  { code: 'US-TX', name: 'Texas (State + Local)', rate: 6.25, type: 'state_sales_tax', withholdingEnabled: true },
  { code: 'US-OR', name: 'Oregon', rate: 0.00, type: 'state_sales_tax', withholdingEnabled: false },
  { code: 'EU-DE', name: 'Germany (Standard VAT)', rate: 19.00, type: 'vat', withholdingEnabled: true },
  { code: 'GB-UK', name: 'United Kingdom (VAT)', rate: 20.00, type: 'vat', withholdingEnabled: true },
];

const SEED_FILINGS: VendorTaxFiling[] = [
  {
    vendorId: 'vendor-tech-1',
    vendorName: 'Apex Audio & Gear Inc.',
    tinEin: 'XX-XXX1049',
    grossSalesYtd: 124500.00,
    transactionsCount: 840,
    exceeded1099Threshold: true,
    statementStatus: 'generated',
  },
  {
    vendorId: 'vendor-apparel-2',
    vendorName: 'Matrix Apparel Hub LLC',
    tinEin: 'XX-XXX8812',
    grossSalesYtd: 42100.00,
    transactionsCount: 310,
    exceeded1099Threshold: true,
    statementStatus: 'generated',
  },
  {
    vendorId: 'vendor-home-3',
    vendorName: 'TerraCraft Ceramics',
    tinEin: 'XX-XXX4419',
    grossSalesYtd: 9400.00,
    transactionsCount: 65,
    exceeded1099Threshold: false,
    statementStatus: 'pending',
  },
];

export const AdminCompliancePage: React.FC = () => {
  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>(SEED_JURISDICTIONS);
  const [filings] = useState<VendorTaxFiling[]>(SEED_FILINGS);
  const [activeTab, setActiveTab] = useState<'tax' | '1099k'>('tax');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleToggleWithholding = (code: string) => {
    setJurisdictions((prev) =>
      prev.map((j) => (j.code === code ? { ...j, withholdingEnabled: !j.withholdingEnabled } : j)),
    );
  };

  const handleGenerateStatement = (vendorName: string) => {
    setToastMsg(`Generated 2026 IRS Form 1099-K & DAC7 tax statement for ${vendorName}`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Tax, VAT & 1099-K Regulatory Compliance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Marketplace facilitator sales tax collection rules, automated remittance tables, and IRS 1099-K merchant earnings statements.
          </p>
        </div>

        {toastMsg && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {toastMsg}
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tax'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Percent className="h-4 w-4" />
            Jurisdiction Tax Tables ({jurisdictions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('1099k')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === '1099k'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            IRS 1099-K & Merchant Statements
          </button>
        </div>

        {/* TAB 1: Tax Rates */}
        {activeTab === 'tax' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-700 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Marketplace Facilitator Legislation Active</span>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Vendora automatically calculates, collects from buyers, and remits sales taxes on behalf of third-party vendors for all enabled jurisdictions below.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="p-4">Jurisdiction Code</th>
                    <th className="p-4">Jurisdiction Name</th>
                    <th className="p-4">Tax Type</th>
                    <th className="p-4">Effective Rate</th>
                    <th className="p-4">Marketplace Withholding</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jurisdictions.map((j) => (
                    <tr key={j.code} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-slate-900">{j.code}</td>
                      <td className="p-4 font-bold text-slate-800">{j.name}</td>
                      <td className="p-4 text-slate-600 uppercase text-[10px] font-bold">
                        {j.type.replace(/_/g, ' ')}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900">{j.rate.toFixed(3)}%</td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            j.withholdingEnabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {j.withholdingEnabled ? 'Auto-Collected & Remitted' : 'Exempt / Zero Rate'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleWithholding(j.code)}
                          className="rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          {j.withholdingEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: 1099-K Statements */}
        {activeTab === '1099k' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Annual 1099-K Merchant Reporting Pool</h3>
                <p className="text-slate-500">
                  Merchants exceeding $20,000 gross volume and 200 transactions are required to receive Form 1099-K.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px]">
                    <tr>
                      <th className="p-3">Merchant Name</th>
                      <th className="p-3">Tax Identification (TIN)</th>
                      <th className="p-3">Gross Sales YTD</th>
                      <th className="p-3">Orders Count</th>
                      <th className="p-3">Filing Required</th>
                      <th className="p-3 text-right">Statement Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filings.map((f) => (
                      <tr key={f.vendorId} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{f.vendorName}</td>
                        <td className="p-3 font-mono text-slate-600">{f.tinEin}</td>
                        <td className="p-3 font-bold text-slate-900">${f.grossSalesYtd.toLocaleString()}</td>
                        <td className="p-3 text-slate-700">{f.transactionsCount}</td>
                        <td className="p-3">
                          {f.exceeded1099Threshold ? (
                            <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">
                              Threshold Met (&gt;$20K)
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5 text-[10px] font-bold">
                              Under Threshold
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleGenerateStatement(f.vendorName)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#FF7A1A] text-white px-3 py-1 font-bold hover:bg-[#EA580C] cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            Generate Form
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
