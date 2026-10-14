import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Key,
  Copy,
  FileCode,
  ShieldCheck,
  ExternalLink,
  Search,
  Layers,
  ArrowRight,
  HardDrive,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useDigitalDownloads } from '../features/orders/hooks/useOrders';
import type { DigitalDownload } from '../features/orders/api/orders';
import { QueryState } from '../components/common/QueryState';
import { Button } from '../components/ui/button';

const formatPurchased = (iso: string) => {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-US', { dateStyle: 'long' });
};

/** Only what the booking actually recorded. No checksums, versions or escrow claims. */
function licenceProof(item: DigitalDownload, holder: string, email: string): string {
  return [
    '======================================================',
    'VENDORA DIGITAL LICENCE RECORD',
    '======================================================',
    `Asset Title: ${item.title}`,
    `Format: ${item.fileFormat ?? 'Not recorded'}`,
    `Size: ${item.fileSizeMb === undefined ? 'Not recorded' : `${item.fileSizeMb} MB`}`,
    `Licence Type: ${item.licenseType ?? 'Not recorded'}`,
    `Licence Key: ${item.licenseKey}`,
    `Licensed To: ${holder} (${email})`,
    `Order Reference: ${item.orderGroupId}`,
    `Seller: ${item.sellerName}`,
    `Purchased: ${formatPurchased(item.purchasedAt)}`,
    '======================================================',
  ].join('\n');
}

export const DownloadsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isLoading, isError, error, refetch } = useDigitalDownloads();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');

  const downloads = useMemo(() => data ?? [], [data]);

  // Sellers record a file type, not a marketing category, so the chips list what exists.
  const formats = useMemo(
    () => Array.from(new Set(downloads.map((item) => item.fileFormat).filter((f): f is string => Boolean(f)))),
    [downloads],
  );

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLicenceProof = (item: DigitalDownload) => {
    const payload = licenceProof(item, user?.name || 'Vendora customer', user?.email || 'Not recorded');
    const file = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_licence.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const filteredDownloads = useMemo(() => {
    const needle = searchQuery.toLowerCase();
    return downloads.filter((item) => {
      const matchesSearch =
        needle === '' ||
        item.title.toLowerCase().includes(needle) ||
        item.sellerName.toLowerCase().includes(needle) ||
        item.licenseKey.toLowerCase().includes(needle);
      const matchesFormat = selectedFormat === 'all' || item.fileFormat === selectedFormat;
      return matchesSearch && matchesFormat;
    });
  }, [downloads, searchQuery, selectedFormat]);

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
      active
        ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/30'
        : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800'
    }`;

  return (
    <div>
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="font-outfit text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            My Downloads & Licenses
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            The digital orders on your account, with the licence key each purchase was booked against.
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-white/70 dark:border-white/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-sun-orange mb-4 shadow-sm">
              <Key className="h-8 w-8" />
            </div>
            <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
              Sign in to see your licences
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Digital orders and their licence keys are read from your account, so a guest vault would be empty either way.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="orange-cta" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/register">Create an account</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Filter and Search Bar */}
            <div className="glass-panel rounded-3xl p-4 sm:p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button type="button" onClick={() => setSelectedFormat('all')} className={chipClass(selectedFormat === 'all')}>
                  <Layers className="h-3.5 w-3.5" />
                  <span>All Assets ({downloads.length})</span>
                </button>

                {formats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setSelectedFormat(format)}
                    className={chipClass(selectedFormat === format)}
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>{format}</span>
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, key, or seller..."
                  aria-label="Search downloads"
                  className="w-full rounded-full border border-slate-200/90 dark:border-white/15 bg-white/90 dark:bg-slate-800/90 py-2 pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sun-orange focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <QueryState
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={refetch}
              isEmpty={filteredDownloads.length === 0}
              emptyTitle={downloads.length === 0 ? 'No digital orders yet' : 'No downloads matched'}
              emptyMessage={
                downloads.length === 0
                  ? 'Licences appear here as soon as a digital order is booked. Physical orders are tracked in your orders list instead.'
                  : 'Try adjusting your search terms or pick another file format.'
              }
              emptyAction={
                downloads.length === 0 ? (
                  <Button asChild variant="orange-cta" size="sm">
                    <Link to="/products?type=digital">Browse digital goods</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFormat('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                )
              }
              skeletonType="list"
              skeletonCount={3}
            >
              <div className="space-y-5" data-testid="downloads-list">
                {filteredDownloads.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel group rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 border border-white/70 dark:border-white/10"
                    data-testid={`download-card-${item.id}`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-start gap-5 flex-1 min-w-0">
                        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl overflow-hidden border border-white/80 dark:border-white/10 shadow-md bg-slate-100 dark:bg-slate-800">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>

                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.fileFormat && (
                              <span className="rounded-full bg-cyan-100 dark:bg-cyan-950/60 px-3 py-0.5 text-[10px] font-extrabold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">
                                {item.fileFormat}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              <Clock className="h-3 w-3" />
                              Purchased {formatPurchased(item.purchasedAt)}
                            </span>
                          </div>

                          <h3 className="font-outfit font-extrabold text-slate-900 dark:text-white text-base sm:text-lg leading-snug line-clamp-1">
                            {item.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {item.fileSizeMb !== undefined && (
                              <>
                                <span className="flex items-center gap-1">
                                  <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                                  {item.fileSizeMb} MB
                                </span>
                                <span>•</span>
                              </>
                            )}
                            {item.licenseType && (
                              <>
                                <span>{item.licenseType}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>
                              Seller: <strong className="text-slate-800 dark:text-slate-200">{item.sellerName}</strong>
                            </span>
                          </div>

                          {/* License Key Box */}
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-white/10 px-3.5 py-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shadow-inner">
                              <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="select-all tracking-wider">{item.licenseKey}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyKey(item.licenseKey)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                                copiedKey === item.licenseKey
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                              }`}
                              title="Copy License Key"
                            >
                              {copiedKey === item.licenseKey ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Key Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Copy Key</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Download Action & Metadata */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                        {item.downloadUrl ? (
                          <a
                            href={item.downloadUrl}
                            download
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-sun-orange hover:bg-sun-orange-600 active:scale-95 text-white px-6 py-3 text-xs font-extrabold shadow-lg shadow-orange-500/25 transition-all"
                            data-testid={`download-asset-${item.id}`}
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Asset</span>
                          </a>
                        ) : (
                          <p className="text-[11px] font-semibold text-slate-500">
                            No delivery link recorded for this item.
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => handleLicenceProof(item)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 font-bold text-slate-700 dark:text-slate-300 hover:border-sun-orange hover:text-sun-orange transition-colors cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Licence proof</span>
                          </button>

                          <Link
                            to={`/orders/${item.orderGroupId}`}
                            className="text-slate-500 dark:text-slate-400 hover:text-sun-orange dark:hover:text-sun-orange font-bold flex items-center gap-1 transition-colors"
                          >
                            <span>Receipt #{item.orderGroupId}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </QueryState>
          </>
        )}

        {/* Lifetime License Protection Banner */}
        <div className="mt-10 glass-panel rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-white/80 dark:border-white/10 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-outfit font-black text-slate-900 dark:text-white text-base">
                Licences tied to your order
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Each key below was issued when the order was booked and stays readable for as long as that order exists.
                Lost access to a purchase? The order record is the proof.
              </p>
            </div>
          </div>

          <Link
            to="/products?type=digital"
            className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-sun-orange hover:text-sun-orange transition-colors"
          >
            <span>Browse More Digital Goods</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
    </div>
  );
};
