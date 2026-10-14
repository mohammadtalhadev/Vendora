import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Mail,
  Phone,
  Store,
  Scale,
  ShieldAlert,
  Clock,
  CheckCircle2,
  MessageSquare,
  Truck,
  HelpCircle,
} from 'lucide-react';
import { Button, buttonVariants } from '../components/ui/button';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/common/Toast';
import { sendContactMessage } from '../features/forms/api/public-forms';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHANNELS = [
  {
    id: 'buyer-care',
    title: 'Buyer Care',
    blurb: 'Orders, deliveries, refunds and account questions for shoppers.',
    email: 'help@vendora.market',
    phone: '+92 300 555 8363',
    icon: MessageSquare,
  },
  {
    id: 'seller-ops',
    title: 'Seller & Store Operations',
    blurb: 'Onboarding, listings, commissions, payouts and catalog approvals.',
    email: 'ops@vendora.market',
    icon: Store,
  },
  {
    id: 'legal-privacy',
    title: 'Legal, Privacy & Compliance',
    blurb: 'Data requests, takedowns, regulatory and audit correspondence.',
    email: 'legal@vendora.market',
    icon: Scale,
  },
  {
    id: 'trust-safety',
    title: 'Report Fraud or Counterfeits',
    blurb: 'Suspected fake goods, payment fraud or an unsafe marketplace listing.',
    email: 'help@vendora.market',
    icon: ShieldAlert,
  },
] as const;

const OFFICES = [
  {
    city: 'Karachi',
    role: 'Registered office & dispute desk',
    lines: ['Clifton Block 5, Karachi, Sindh', 'Karachi Centre for Dispute Resolution (KCDR) panel'],
  },
  {
    city: 'Dubai',
    role: 'Gulf vendor operations',
    lines: ['Sheikh Zayed Road, Dubai, United Arab Emirates'],
  },
];

const RESPONSE_TIMES = [
  { channel: 'Buyer care chat & email', window: 'Within 4 hours, 09:00–23:00 PKT daily' },
  { channel: 'Seller operations', window: 'Within 1 business day' },
  { channel: 'Dispute claims', window: 'First response within 24 hours' },
  { channel: 'Legal & data requests', window: 'Acknowledged within 72 hours' },
];

interface FormState {
  name: string;
  email: string;
  orderId: string;
  topic: string;
  message: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', orderId: '', topic: 'buyer-care', message: '' };

export const ContactPage: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const channelTopic = CHANNELS.find((channel) => channel.id === form.topic) ?? CHANNELS[0];

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) next.name = 'Tell us the name we should reply to.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) next.message = 'Please write at least 10 characters so we can help.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // The message is stored in the contact_messages inbox for real — the
  // success state below is only shown after the row lands. (This replaces
  // the old mailto: shim, which sent nothing anywhere.)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || submitState === 'sending') return;
    setSubmitState('sending');
    try {
      await sendContactMessage({
        name: form.name,
        email: form.email,
        topic: channelTopic.id,
        orderRef: form.orderId,
        message: form.message,
      });
      setSubmitState('sent');
      setForm(EMPTY_FORM);
    } catch (err) {
      setSubmitState('idle');
      showToast(
        err instanceof Error ? err.message : 'Your message could not be sent. Please try again.',
        'error',
      );
    }
  };

  return (
    <div className="pb-16 pt-4 sm:pt-6">
      {toast && <Toast toast={toast} onDismiss={hideToast} />}

      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Link to="/" className="hover:text-sun-orange transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-slate-900">Contact</span>
        </nav>

        {/* Header */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7 space-y-4">
            <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold text-slate-600">
              <Phone className="h-3.5 w-3.5 text-sun-orange" />
              Vendora Care
            </span>
            <h1 className="font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Talk to a human at Vendora
            </h1>
            <p className="max-w-[680px] text-sm leading-relaxed text-slate-600 sm:text-base">
              Every message lands with the team that owns the answer — buyer care, seller operations, or legal. No
              ticket numbers you never hear about again.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/track-order" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <Truck className="h-4 w-4" aria-hidden="true" />
                Track an order
              </Link>
              <Link to="/faq" className={buttonVariants({ variant: 'glass-pill', size: 'sm' })}>
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                Help centre &amp; FAQ
              </Link>
            </div>
          </div>

          {/* Response times */}
          <div className="glass-card lg:col-span-5 rounded-[26px] border border-white/80 bg-white/75 p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2 text-xs font-black text-slate-500">
              <Clock className="h-4 w-4 text-sun-orange" />
              Response times
            </div>
            <ul className="mt-4 space-y-3">
              {RESPONSE_TIMES.map((row) => (
                <li key={row.channel} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className="text-xs font-bold text-slate-800">{row.channel}</span>
                  <span className="text-right text-[11px] leading-snug text-slate-500">{row.window}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Channels */}
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Choose the right desk</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const selected = form.topic === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, topic: channel.id }));
                    setErrors((prev) => ({ ...prev, topic: undefined }));
                  }}
                  aria-pressed={selected}
                  className={`flex flex-col rounded-[22px] border p-5 text-left transition-all duration-200 ${
                    selected
                      ? 'border-sun-orange/60 bg-orange-50/70 shadow-md shadow-orange-500/10'
                      : 'border-white/80 bg-white/70 hover:-translate-y-0.5 hover:border-orange-200/80 hover:shadow-lg'
                  } backdrop-blur-md`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C1046] to-[#312E81] text-white shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-3 text-sm font-extrabold tracking-tight text-slate-900">{channel.title}</span>
                  <span className="mt-1 text-[11px] leading-relaxed text-slate-500">{channel.blurb}</span>
                  <span className="mt-3 text-[11px] font-bold text-sun-orange">{channel.email}</span>
                  {'phone' in channel && channel.phone ? (
                    <span className="text-[11px] font-semibold text-slate-500">{channel.phone}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Form + shortcuts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="glass-card lg:col-span-7 rounded-[26px] border border-white/80 bg-white/75 p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-8">
            <h2 className="font-outfit text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Write to {channelTopic.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Send this form and the {channelTopic.title} team will reply to your email address. Prefer email? Write to{' '}
              {channelTopic.email} directly.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="block text-[11px] font-bold text-slate-500">
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    aria-invalid={Boolean(errors.name)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sun-orange focus:ring-2 focus:ring-sun-orange/30"
                  />
                  {errors.name ? (
                    <p role="alert" className="mt-1 text-[11px] font-semibold text-rose-600">
                      {errors.name}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-[11px] font-bold text-slate-500">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    aria-invalid={Boolean(errors.email)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sun-orange focus:ring-2 focus:ring-sun-orange/30"
                  />
                  {errors.email ? (
                    <p role="alert" className="mt-1 text-[11px] font-semibold text-rose-600">
                      {errors.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="contact-order" className="block text-[11px] font-bold text-slate-500">
                  Order reference <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="contact-order"
                  name="orderId"
                  type="text"
                  placeholder="Your order ID, if this is about an order"
                  value={form.orderId}
                  onChange={(event) => setForm((prev) => ({ ...prev, orderId: event.target.value }))}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sun-orange focus:ring-2 focus:ring-sun-orange/30"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-[11px] font-bold text-slate-500">
                  How can we help?
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  aria-invalid={Boolean(errors.message)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-sun-orange focus:ring-2 focus:ring-sun-orange/30"
                />
                {errors.message ? (
                  <p role="alert" className="mt-1 text-[11px] font-semibold text-rose-600">
                    {errors.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="submit" size="sm" disabled={submitState === 'sending'}>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {submitState === 'sending' ? 'Sending…' : 'Send message'}
                </Button>
              </div>

              {submitState === 'sent' ? (
                <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-800">Message sent</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80">
                      Thank you — your message is with the {channelTopic.title} team. We reply to the email address
                      you gave above.
                    </p>
                  </div>
                </div>
              ) : null}
            </form>
          </div>

          {/* Shortcuts + offices */}
          <div className="space-y-4 lg:col-span-5">
            <div className="glass-card rounded-[26px] border border-white/80 bg-white/75 p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Faster ways to solve it</h3>
              <ul className="mt-4 space-y-2.5 text-xs font-medium text-slate-600">
                <li>
                  <Link to="/orders" className="inline-flex items-center gap-1.5 hover:text-sun-orange">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> Order history &amp; status
                  </Link>
                </li>
                <li>
                  <Link to="/returns" className="inline-flex items-center gap-1.5 hover:text-sun-orange">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> Start a return or replacement
                  </Link>
                </li>
                <li>
                  <Link to="/disputes" className="inline-flex items-center gap-1.5 hover:text-sun-orange">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> Escalate to the dispute desk
                  </Link>
                </li>
                <li>
                  <Link to="/become-a-seller" className="inline-flex items-center gap-1.5 hover:text-sun-orange">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> Seller fee schedule &amp; guidelines
                  </Link>
                </li>
              </ul>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <a href="tel:+923005558363" className={buttonVariants({ variant: 'default', size: 'sm', className: 'w-full' })}>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call buyer care · +92 300 555 8363
                </a>
              </div>
            </div>

            <div className="glass-card rounded-[26px] border border-white/80 bg-white/75 p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Where we are</h3>
              <div className="mt-4 space-y-4">
                {OFFICES.map((office) => (
                  <div key={office.city}>
                    <p className="text-xs font-black text-slate-500">{office.city}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-700">{office.role}</p>
                    {office.lines.map((line) => (
                      <p key={line} className="text-[11px] leading-relaxed text-slate-500">
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                Post is not opened daily — email is the fastest route to the desk that answers.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
