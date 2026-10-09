import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Key,
  Copy,
  Check,
  FileCode,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';

interface DigitalDownload {
  id: string;
  orderId: string;
  subOrderId: string;
  title: string;
  thumbnail: string;
  version: string;
  fileSize: string;
  fileFormat: string;
  licenseKey: string;
  sellerName: string;
  purchasedAt: string;
}

const SEED_DOWNLOADS: DigitalDownload[] = [
  {
    id: 'dl-1',
    orderId: 'ORD-98214',
    subOrderId: 'SUB-98214-B',
    title: 'Vendora UI Design System & Component Library Pro',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    version: 'v2.4.0',
    fileSize: '142.5 MB',
    fileFormat: 'ZIP (.fig, .tokens, .json)',
    licenseKey: 'VEND-PRO-8942-XN91-2026',
    sellerName: 'Vendora Digital Studio',
    purchasedAt: 'October 4, 2026',
  },
  {
    id: 'dl-2',
    orderId: 'ORD-97551',
    subOrderId: 'SUB-97551-A',
    title: 'Mastering Modern React & High-Performance TypeScript (eBook)',
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    version: '1st Edition',
    fileSize: '24.8 MB',
    fileFormat: 'PDF + ePub',
    licenseKey: 'BOOK-REACT-TS-7712',
    sellerName: 'TechCraft Publishing',
    purchasedAt: 'September 28, 2026',
  },
  {
    id: 'dl-3',
    orderId: 'ORD-96102',
    subOrderId: 'SUB-96102-C',
    title: 'Cinematic Soundscapes & Acoustic Ambient Audio Pack',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
    version: 'Studio Master',
    fileSize: '480.2 MB',
    fileFormat: 'WAV 24-bit / 48kHz',
    licenseKey: 'AUDIO-COMM-3391-HQ',
    sellerName: 'AudioSphere Records',
    purchasedAt: 'September 15, 2026',
  },
];

export const DownloadsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulatedDownload = (id: string, title: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      // Trigger browser dummy download notification
      const element = document.createElement('a');
      const file = new Blob([`Simulated digital asset for: ${title}\nLicense Verified for ${user?.email || 'Customer'}`], {
        type: 'text/plain',
      });
      element.href = URL.createObjectURL(file);
      element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF7A1A] mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            Digital Fulfillment Library
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Downloads & License Keys
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Instant access to all digital goods, software licenses, eBooks, and media assets you've purchased.
          </p>
        </div>

        {/* Digital Downloads List */}
        <div className="space-y-4">
          {SEED_DOWNLOADS.map((item) => (
            <div
              key={item.id}
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/40 hover:border-slate-300 transition-all"
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl bg-slate-100 overflow-hidden border border-slate-100">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                      Digital Asset
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Purchased on {item.purchasedAt}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-1">
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <FileCode className="h-3.5 w-3.5 text-slate-400" />
                      {item.fileFormat}
                    </span>
                    <span>•</span>
                    <span>{item.fileSize}</span>
                    <span>•</span>
                    <span>Seller: <strong className="text-slate-700">{item.sellerName}</strong></span>
                  </div>

                  {/* License Key Box */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 border border-slate-200/60 px-3 py-1 font-mono text-xs text-slate-800">
                      <Key className="h-3 w-3 text-amber-500" />
                      <span>{item.licenseKey}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyKey(item.licenseKey)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Copy License Key"
                    >
                      {copiedKey === item.licenseKey ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-slate-400" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Download CTA & Invoice link */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSimulatedDownload(item.id, item.title)}
                  disabled={downloadingId === item.id}
                  className="flex items-center gap-2 rounded-2xl bg-[#FF7A1A] hover:bg-[#EA580C] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>{downloadingId === item.id ? 'Downloading...' : 'Download File'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs">
                  <Link
                    to={`/orders/${item.orderId}`}
                    className="text-slate-500 hover:text-[#FF7A1A] font-medium flex items-center gap-1"
                  >
                    Order #{item.orderId}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Protection / Help Note */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-slate-700 flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-[#2563EB] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-slate-900 text-sm">Lifetime Digital Ownership</h4>
            <p className="text-slate-600">
              All digital licenses purchased on Vendora are permanently attached to your account. You can re-download your files and view your license keys at any time without extra fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
