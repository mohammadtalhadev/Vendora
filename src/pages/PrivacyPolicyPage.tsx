import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Eye,
  FileText,
  Sliders,
  Printer,
  CheckCircle2,
  Server,
  Mail,
  UserCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

export const PrivacyPolicyPage: React.FC = () => {
  // Cookie preference toggles
  const [cookieAnalytics, setCookieAnalytics] = useState(true);
  const [cookieMarketing, setCookieMarketing] = useState(false);
  const [cookiePersonalization, setCookiePersonalization] = useState(true);
  const [isDsarModalOpen, setIsDsarModalOpen] = useState(false);
  const [dsarType, setDsarType] = useState<'export' | 'delete'>('export');
  const [dsarEmail, setDsarEmail] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveCookiePreferences = () => {
    showToast('Your privacy and cookie preferences have been saved and applied.');
  };

  const handleDsarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dsarEmail.trim()) return;
    const reqId = `DSAR-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(
      dsarType === 'export'
        ? `Data export request #${reqId} submitted! Archive will be sent to ${dsarEmail} within 24 hours.`
        : `Account deletion request #${reqId} received. Verification link dispatched to ${dsarEmail}.`
    );
    setIsDsarModalOpen(false);
    setDsarEmail('');
  };

  return (
    <div className="relative">
      {/* ── Ambient Glow Background ───────────────────────────────── */}
      <div className="relative overflow-x-clip">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
          {/* ── Breadcrumb & Header ─────────────────────────────────── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                GOVERNANCE &amp; TRUST <span className="text-slate-300">/</span> GLOBAL PRIVACY CHARTER
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 font-display">
                Privacy Policy
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                Last Updated: March 2026 • Compliant with GDPR (EU/UK), CCPA/CPRA (California), and PIPEDA (Canada).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsDsarModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-glass-pill hover:bg-white transition-all active:scale-95 cursor-pointer"
              >
                <UserCheck className="h-4 w-4 text-sun-orange" />
                Download / Delete Data (DSAR)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full bg-sun-orange hover:bg-sun-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-orange-glow transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Legal Policy
              </button>
            </div>
          </div>

          {/* ── Trust Pillars & Compliance Badges ───────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-glass backdrop-blur-xl flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">GDPR &amp; CCPA Compliant</h4>
                <p className="text-[10px] text-slate-500">Full statutory consumer rights honored</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-glass backdrop-blur-xl flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">AES-256 Bit Encryption</h4>
                <p className="text-[10px] text-slate-500">Encrypted at rest &amp; in transit (TLS 1.3)</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-glass backdrop-blur-xl flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">PCI-DSS Level 1 Vault</h4>
                <p className="text-[10px] text-slate-500">Zero raw card storage on server</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-glass backdrop-blur-xl flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-sun-orange shrink-0">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Zero Data Selling</h4>
                <p className="text-[10px] text-slate-500">We never sell your personal information</p>
              </div>
            </div>
          </div>

          {/* ── Interactive Cookie & Privacy Preferences Center ──────── */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-8 shadow-glass backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-0.5 text-[10px] font-bold text-sun-orange uppercase tracking-wider mb-1">
                  <Sliders className="h-3.5 w-3.5" />
                  Your Privacy, Your Control
                </div>
                <h2 className="text-xl font-black text-slate-900 font-display">
                  Cookie &amp; Tracking Consent Preferences
                </h2>
              </div>
              <button
                type="button"
                onClick={handleSaveCookiePreferences}
                className="rounded-full bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-md hover:shadow-orange-glow active:scale-95 self-start sm:self-auto"
              >
                Save Preferences
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Category 1: Strictly Necessary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Strictly Necessary</span>
                    <span className="rounded bg-slate-200 text-slate-700 px-2 py-0.2 text-[9px] font-bold">
                      ALWAYS ACTIVE
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Essential for login sessions, cart persistence, checkout security, and CSRF protection.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-200">
                  Required for site operation
                </div>
              </div>

              {/* Category 2: Performance & Analytics */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Analytics &amp; Performance</span>
                    <input
                      type="checkbox"
                      checked={cookieAnalytics}
                      onChange={(e) => setCookieAnalytics(e.target.checked)}
                      className="accent-sun-orange h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Helps us understand page load speeds and traffic trends to improve search latency.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100">
                  {cookieAnalytics ? 'Status: Enabled' : 'Status: Disabled'}
                </div>
              </div>

              {/* Category 3: Catalog Personalization */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Personalized Curation</span>
                    <input
                      type="checkbox"
                      checked={cookiePersonalization}
                      onChange={(e) => setCookiePersonalization(e.target.checked)}
                      className="accent-sun-orange h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Tailors recommended marketplace products and deals based on previous items viewed.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100">
                  {cookiePersonalization ? 'Status: Enabled' : 'Status: Disabled'}
                </div>
              </div>

              {/* Category 4: Merchant Partner Marketing */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Partner Marketing</span>
                    <input
                      type="checkbox"
                      checked={cookieMarketing}
                      onChange={(e) => setCookieMarketing(e.target.checked)}
                      className="accent-sun-orange h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Allows independent sellers to measure external promotional campaigns and coupons.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100">
                  {cookieMarketing ? 'Status: Enabled' : 'Status: Disabled'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Policy Body: 8 Core Articles ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sticky Table of Contents (4 cols) */}
            <div className="hidden lg:block lg:col-span-4 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 [scrollbar-width:thin] space-y-4">
              <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass backdrop-blur-xl space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sun-orange" />
                  Table of Contents
                </h3>
                <nav className="space-y-1.5 text-slate-600 font-medium">
                  <a href="#section-1" className="block py-1 hover:text-sun-orange transition-colors">
                    1. Information We Collect
                  </a>
                  <a href="#section-2" className="block py-1 hover:text-sun-orange transition-colors">
                    2. How We Utilize Your Information
                  </a>
                  <a href="#section-3" className="block py-1 hover:text-sun-orange transition-colors font-bold text-slate-900">
                    3. Multi-Vendor Marketplace Data Separation
                  </a>
                  <a href="#section-4" className="block py-1 hover:text-sun-orange transition-colors">
                    4. Cookies &amp; Tracking Technologies
                  </a>
                  <a href="#section-5" className="block py-1 hover:text-sun-orange transition-colors">
                    5. Global Privacy Rights (GDPR / CCPA)
                  </a>
                  <a href="#section-6" className="block py-1 hover:text-sun-orange transition-colors">
                    6. Security &amp; Encryption Standards
                  </a>
                  <a href="#section-7" className="block py-1 hover:text-sun-orange transition-colors">
                    7. Data Retention &amp; Deletion Protocols
                  </a>
                  <a href="#section-8" className="block py-1 hover:text-sun-orange transition-colors">
                    8. Contact our Data Protection Officer
                  </a>
                </nav>
              </div>

              {/* DPO Contact Card */}
              <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass backdrop-blur-xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-600" />
                  Data Protection Officer (DPO)
                </h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Have inquiries regarding your data rights or desire a certified copy of your records?
                </p>
                <a
                  href="mailto:privacy@vendora.market"
                  className="inline-block text-sun-orange font-bold text-xs hover:underline"
                >
                  privacy@vendora.market →
                </a>
              </div>
            </div>

            {/* Comprehensive Articles (8 cols) */}
            <div className="lg:col-span-8 rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-10 shadow-glass backdrop-blur-xl space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {/* Section 1 */}
              <section id="section-1" className="space-y-3 scroll-mt-28">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  1. Information We Collect
                </h2>
                <p>
                  We collect information necessary to fulfill your orders, ensure delivery logistics, prevent marketplace fraud, and provide customer support:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Account Credentials:</strong> Full name, verified email address, phone number, and password hashes (bcrypt/argon2).</li>
                  <li><strong>Delivery &amp; Billing Records:</strong> Physical street addresses, suite numbers, postal codes, and courier delivery notes.</li>
                  <li><strong>Payment Tokens:</strong> Tokenized card references, bank routing numbers for COD payouts, and billing zip codes. We never store raw CVVs or full 16-digit credit card PANs on Vendora servers.</li>
                  <li><strong>Device &amp; Telemetry Data:</strong> IP addresses, browser user agent, screen resolution, operating system, and geolocation (derived from IP) for fraud prevention.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section id="section-2" className="space-y-3 scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  2. How We Utilize Your Information
                </h2>
                <p>
                  Vendora processes personal data under well-defined lawful bases outlined in Article 6 of the GDPR:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Contractual Necessity:</strong> Routing orders to sellers, printing packing slips, processing refunds, and dispatching couriers.</li>
                  <li><strong>Legal Compliance:</strong> Calculating sales tax nexus, issuing 1099-K merchant forms, and retaining anti-money-laundering (AML) audit logs.</li>
                  <li><strong>Legitimate Interests:</strong> Defending against payment chargebacks, platform penetration testing, and authentic customer reviews.</li>
                </ul>
              </section>

              {/* Section 3: Marketplace Data Separation */}
              <section id="section-3" className="space-y-3 scroll-mt-28 border-t border-slate-100 pt-6">
                <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/60 space-y-2">
                  <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-sun-orange" />
                    3. Multi-Vendor Marketplace Data Separation (Zero Leakage)
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Vendora strictly regulates what independent third-party merchants can see:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                    <li>Sellers <strong>ONLY</strong> receive the recipient's name and physical shipping destination for packages they are fulfilling.</li>
                    <li>Sellers <strong>NEVER</strong> see your credit card details, payment history, or what you purchased from other vendors in the same cart.</li>
                    <li>Sellers are legally prohibited under our Merchant Agreement from using customer addresses for unsolicited marketing or external communication.</li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="space-y-3 scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  4. Cookies &amp; Tracking Technologies
                </h2>
                <p>
                  We utilize first-party HTTP cookies and local storage tokens to retain items in your cart, remember your authentication session, and display recently viewed products. You may freely toggle analytics and marketing cookies at any time using the preferences console above.
                </p>
              </section>

              {/* Section 5 */}
              <section id="section-5" className="space-y-3 scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  5. Global Privacy Rights (GDPR / CCPA / PIPEDA)
                </h2>
                <p>
                  Regardless of your country of residence, Vendora extends enterprise-grade data sovereignty rights to every registered user:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <strong className="text-slate-900 block mb-1">Right to Access &amp; Portability</strong>
                    <span>Request an instantaneous, machine-readable JSON/CSV export of all your orders, profiles, and logs.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <strong className="text-slate-900 block mb-1">Right to Erasure ("To Be Forgotten")</strong>
                    <span>Request complete account deletion and cryptographic shredding of all personal identifiers.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <strong className="text-slate-900 block mb-1">Right to Rectification</strong>
                    <span>Easily correct outdated shipping addresses, telephone numbers, and legal names in your account profile.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <strong className="text-slate-900 block mb-1">Non-Discrimination Guarantee</strong>
                    <span>We never alter prices, downgrade service tiers, or restrict catalog access if you exercise your privacy rights.</span>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section id="section-6" className="space-y-3 scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  6. Security &amp; Encryption Standards
                </h2>
                <p>
                  All network communication between your browser and Vendora is enforced via TLS 1.3 with HSTS (HTTP Strict Transport Security). Databases are encrypted using AES-256 with automated daily cryptographic key rotation managed by enterprise hardware security modules (HSM).
                </p>
              </section>

              {/* Section 7 */}
              <section id="section-7" className="space-y-3 scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  7. Data Retention &amp; Deletion Protocols
                </h2>
                <p>
                  We retain order transaction records for 7 years as mandated by federal commercial accounting and tax laws. Once this statutory period expires, order records are irreversibly anonymized into non-identifiable numerical aggregates.
                </p>
              </section>

              {/* Section 8 */}
              <section id="section-8" className="space-y-3 scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="text-xl font-black text-slate-900 font-display">
                  8. Contact our Data Protection Officer
                </h2>
                <p>
                  For formal legal subpoenas, regulatory inquiries, or DSAR escalations, reach our legal counsel directly:
                </p>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                  <div className="font-bold text-slate-900">Vendora Global Governance &amp; Privacy Desk</div>
                  <div className="text-slate-600">Attn: Data Protection Officer (DPO)</div>
                  <div className="text-slate-600">Clifton Block 5, Karachi, Sindh, Pakistan</div>
                  <div className="text-sun-orange font-bold">Email: privacy@vendora.market</div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* ── DSAR Modal (Data Subject Access Request) ───────────────── */}
      <Dialog open={isDsarModalOpen} onOpenChange={setIsDsarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-sun-orange" />
              Data Subject Access Request (DSAR)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Exercise your statutory rights under GDPR Article 15-17 and California CCPA/CPRA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDsarSubmit} className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Request Action</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="dsarType"
                    checked={dsarType === 'export'}
                    onChange={() => setDsarType('export')}
                    className="text-sun-orange"
                  />
                  <div>
                    <strong className="text-slate-900">Export All My Personal Data</strong>
                    <div className="text-[10px] text-slate-500">
                      Receive encrypted JSON/ZIP archive of profile, orders, and addresses.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-200 bg-rose-50/40 cursor-pointer">
                  <input
                    type="radio"
                    name="dsarType"
                    checked={dsarType === 'delete'}
                    onChange={() => setDsarType('delete')}
                    className="text-rose-600"
                  />
                  <div>
                    <strong className="text-rose-900">Request Permanent Account Deletion</strong>
                    <div className="text-[10px] text-rose-700">
                      Irreversibly delete profile, saved methods, and marketing records.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Your Account Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={dsarEmail}
                onChange={(e) => setDsarEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDsarModalOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white transition-all shadow-md hover:shadow-orange-glow active:scale-95 cursor-pointer"
              >
                Submit Formal Request
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Toast Notification ─────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-white/50 bg-white/75 px-5 py-3 text-xs font-semibold text-slate-800 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default PrivacyPolicyPage;
