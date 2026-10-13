import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  Heart,
  ArrowRight,
  ChevronRight,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  responsibilities: string[];
}

const OPEN_POSITIONS: JobPosition[] = [
  {
    id: 'job-1',
    title: 'Senior Frontend Engineer (React / TypeScript)',
    department: 'Engineering',
    location: 'Karachi (Hybrid) / Remote',
    type: 'Full-time',
    experience: '4+ Years',
    description: 'Lead the architecture of Vendora\'s high-velocity multi-vendor storefront, micro-animations, and real-time order tracking telematics.',
    responsibilities: [
      'Architect performant, accessible React interfaces with Tailwind CSS and Zustand',
      'Optimize Web Vitals, micro-interactions, and offline-first cart synchronizations',
      'Collaborate directly with designers to craft world-class UX matching global tier-1 standards',
    ],
  },
  {
    id: 'job-2',
    title: 'Lead Escrow & Payments Infrastructure Architect',
    department: 'Fintech & Trust',
    location: 'Karachi / Lahore (Hybrid)',
    type: 'Full-time',
    experience: '5+ Years',
    description: 'Design robust SBP-compliant escrow release pipelines, RAAST instant bank settlements, and fraud prevention algorithms.',
    responsibilities: [
      'Scale automated milestone-based escrow release rails holding multi-million rupee order batches',
      'Integrate with 1-Link, RAAST, JazzCash, and Easypaisa direct webhooks',
      'Implement real-time anomaly detection for unboxing dispute claims',
    ],
  },
  {
    id: 'job-3',
    title: 'Regional Logistics Operations Lead (Sindh & Punjab)',
    department: 'Supply Chain',
    location: 'Karachi / Lahore',
    type: 'Full-time',
    experience: '3+ Years',
    description: 'Oversee 3-hour doorstep courier dispatches via Bykea, TCS, and Leopards express logistics networks.',
    responsibilities: [
      'Manage SLA compliance for doorstep pickups across Karachi and Lahore express centers',
      'Reduce first-mile dispatch latency to under 120 minutes',
      'Supervise merchant packaging quality control and return collection workflows',
    ],
  },
  {
    id: 'job-4',
    title: 'Senior Merchant Success Advocate',
    department: 'Merchant Growth',
    location: 'Islamabad / Remote',
    type: 'Full-time',
    experience: '2+ Years',
    description: 'Empower verified manufacturers and independent sellers across Pakistan to scale their catalog, promotions, and revenue.',
    responsibilities: [
      'Onboard flagship brand partners and verify official manufacturer credentials',
      'Guide merchants on catalog SEO, batch upload management, and inventory forecasts',
      'Resolve merchant disputes and maintain 99.4% seller satisfaction metrics',
    ],
  },
];

const PERKS = [
  {
    icon: ShieldCheck,
    title: 'Comprehensive Health & Wellness',
    desc: 'Premium inpatient & outpatient health coverage for you and your direct dependents.',
  },
  {
    icon: Sparkles,
    title: 'Generous Equity Grants',
    desc: 'Own a stake in Pakistan\'s most modern and transparent multi-vendor marketplace.',
  },
  {
    icon: Users,
    title: 'Hybrid & Remote Flexibility',
    desc: 'Work from our state-of-the-art Clifton hub or your home office with full tech stipend.',
  },
  {
    icon: Heart,
    title: 'Learning & Growth Budget',
    desc: 'Annual Rs. 150,000 allowance for technical certifications, books, and global conferences.',
  },
];

export const CareersPage: React.FC = () => {
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantPortfolio, setApplicantPortfolio] = useState('');
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  const departments = ['All', 'Engineering', 'Fintech & Trust', 'Supply Chain', 'Merchant Growth'];

  const filteredJobs = selectedDepartment === 'All'
    ? OPEN_POSITIONS
    : OPEN_POSITIONS.filter((j) => j.department === selectedDepartment);

  const handleOpenApply = (job: JobPosition) => {
    setSelectedJob(job);
    setApplicationSubmitted(false);
    setApplyModalOpen(true);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationSubmitted(true);
    setTimeout(() => {
      setApplyModalOpen(false);
      setApplicantName('');
      setApplicantEmail('');
      setApplicantPhone('');
      setApplicantPortfolio('');
      setApplicationSubmitted(false);
    }, 2500);
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#FF7A1A]/20 selection:text-[#FF7A1A] pb-24">
      {/* Radiant ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-[#FED7AA]/60 via-[#FFEDD5]/65 to-[#FED7AA]/35 blur-[130px] dark:from-[#FF7A1A]/10 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#CFFAFE]/70 via-[#F1F5F9]/80 to-[#FFEDD5]/50 blur-[140px] dark:from-[#00B8C8]/10 pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-[#FFEDD5]/70 via-[#CFFAFE]/50 to-[#F1F5F9] blur-[130px] dark:from-[#FF7A1A]/5 pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-[#FF7A1A] transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Careers at Vendora</span>
        </nav>

        {/* Hero Section */}
        <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 sm:p-14 shadow-sm relative overflow-hidden">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 dark:border-orange-900/40 dark:bg-orange-950/30 px-3.5 py-1 text-xs font-bold text-[#FF7A1A]">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              <span>We Are Hiring Pioneers</span>
            </div>

            <h1 className="font-outfit text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Build the Future of Transparent Commerce in Pakistan
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              At Vendora, we are transforming national trade with automated escrow infrastructure, uncompromised buyer security, and ultra-fast micro-fulfillment. Join an ambitious, high-craft team where your code and decisions impact millions of shipments.
            </p>

            <div className="pt-2">
              <a
                href="#open-roles"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#FF7A1A] hover:bg-[#EA6C13] active:scale-95 text-white px-6 py-3.5 text-xs font-outfit font-black tracking-wider uppercase shadow-lg shadow-orange-500/25 transition-all"
              >
                <span>View {OPEN_POSITIONS.length} Open Roles</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* Culture & Perks Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
              Why Join the Vendora Family?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              We invest deeply in our people with autonomy, competitive equity, and great health protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PERKS.map((perk, i) => {
              const Icon = perk.icon;
              return (
                <div
                  key={i}
                  className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-[#FF7A1A] dark:bg-orange-950/60 mb-4">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-outfit font-bold text-slate-900 dark:text-white text-base mb-2">
                    {perk.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {perk.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Positions Section */}
        <div id="open-roles" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
                Available Openings ({filteredJobs.length})
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Explore open career paths across engineering, operations, and merchant success.
              </p>
            </div>

            {/* Department Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartment(dept)}
                  aria-pressed={selectedDepartment === dept}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedDepartment === dept
                      ? 'bg-[#FF7A1A] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="group rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-[#FF7A1A]/40 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-orange-100 dark:bg-orange-950/60 px-3 py-0.5 text-[10px] font-bold text-[#FF7A1A] border border-orange-200/80">
                        {job.department}
                      </span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {job.type}
                      </span>
                      <span className="rounded-full bg-cyan-100 dark:bg-cyan-950/60 px-3 py-0.5 text-[10px] font-bold text-[#00B8C8]">
                        Exp: {job.experience}
                      </span>
                    </div>

                    <h3 className="font-outfit text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      {job.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span>Posted Recently</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenApply(job)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#FF7A1A] hover:bg-[#EA6C13] active:scale-95 text-white px-6 py-3.5 text-xs font-outfit font-black tracking-wider uppercase shadow-md shadow-orange-500/20 transition-all cursor-pointer self-start lg:self-center"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-black text-slate-900 dark:text-white">
              Apply for {selectedJob?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Department: {selectedJob?.department} • {selectedJob?.location}
            </DialogDescription>
          </DialogHeader>

          {applicationSubmitted ? (
            <div role="status" aria-live="polite" className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <h4 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                Application Received!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thank you for applying to Vendora. Our talent acquisition team will review your profile and reach out via email.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitApplication} className="space-y-4 mt-2">
              <div>
                <label htmlFor="career-applicant-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Legal Name
                </label>
                <input
                  id="career-applicant-name"
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. Ayesha Tariq"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FF7A1A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="career-applicant-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="career-applicant-email"
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="ayesha@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FF7A1A]"
                  />
                </div>
                <div>
                  <label htmlFor="career-applicant-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Number
                  </label>
                  <input
                    id="career-applicant-phone"
                    type="tel"
                    required
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FF7A1A]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="career-applicant-portfolio" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  LinkedIn or Portfolio URL
                </label>
                <input
                  id="career-applicant-portfolio"
                  type="url"
                  required
                  value={applicantPortfolio}
                  onChange={(e) => setApplicantPortfolio(e.target.value)}
                  placeholder="https://linkedin.com/in/... or github.com/..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FF7A1A]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF7A1A] hover:bg-[#EA6C13] active:scale-95 text-white py-3 text-xs font-outfit font-black tracking-wider uppercase shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
