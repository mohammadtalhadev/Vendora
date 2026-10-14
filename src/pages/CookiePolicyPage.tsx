import React from 'react';
import { Link } from 'react-router-dom';

const CONTAINER = 'mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8';

interface CookieSection {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: CookieSection[] = [
  {
    id: 'what',
    title: 'What this page covers',
    body: [
      'Vendora runs in your browser, and a small number of cookies and browser-storage entries are what make it work: they keep you signed in, remember your cart, and hold the preferences you set. This page lists them honestly — including the ones stored by our sign-in provider on our behalf.',
      'Vendora does not run third-party advertising trackers, and nothing in this storage is sold or shared for advertising.',
    ],
  },
  {
    id: 'essential',
    title: 'Essential: sign-in and security',
    body: [
      'When you sign in, our authentication provider (Supabase) stores a session token in your browser so you stay signed in between visits and so the site can tell your account apart from everyone else\'s. Without it, signing in would not survive a page refresh.',
      'Signing out clears the session. Workspace accounts (seller, rider and admin) use the same mechanism — there is no separate tracking cookie for staff.',
    ],
  },
  {
    id: 'functional',
    title: 'Functional: cart, wishlist and preferences',
    body: [
      'Your shopping cart and wishlist are kept in your browser\'s local storage so they are still there when you come back, including before you sign in. When you do sign in, the guest cart merges into your account cart.',
      'Display preferences — such as dismissed notices and recently viewed interface choices — are stored the same way. They never leave your device except as part of the actions you take (placing an order sends the cart\'s contents to checkout, for example).',
    ],
  },
  {
    id: 'control',
    title: 'Your control',
    body: [
      'You can clear cookies and site data for Vendora at any time from your browser settings. Doing so signs you out and empties the locally kept cart and wishlist; your account, orders and saved addresses are stored on our servers and are unaffected.',
      'Most browsers also let you block cookies entirely. Vendora will still let you browse the catalogue, but signing in and checking out will not work with storage fully blocked.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this page',
    body: [
      'If what we store changes — a new preference, a new provider — this page changes with it. The wider handling of your personal data is covered by the Privacy Policy.',
    ],
  },
];

/**
 * Cookie Policy (/cookie-policy). Describes the storage this app genuinely
 * uses: the Supabase auth session and the local-storage cart, wishlist and
 * preferences. No analytics or advertising cookies are claimed because none
 * are set.
 */
export const CookiePolicyPage: React.FC = () => (
  <div className="bg-slate-50 pb-20 font-sans text-slate-800 antialiased selection:bg-orange-200">
    <section className="border-b border-slate-200 bg-white">
      <div className={`${CONTAINER} py-10 sm:py-14`}>
        <span className="text-[10px] font-black tracking-widest text-sun-orange uppercase">
          Legal
        </span>
        <h1 className="mt-2 font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          What Vendora stores in your browser, why, and how to clear it. For the full
          picture of your data, read the{' '}
          <Link to="/privacy" className="font-bold text-sun-orange hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>

    <div className={`${CONTAINER} mt-10`}>
      <div className="space-y-4">
        {SECTIONS.map((section, i) => (
          <article
            key={section.id}
            id={section.id}
            className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8"
          >
            <h2 className="font-outfit text-lg font-black text-slate-900">
              <span className="mr-2 text-sun-orange">{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </h2>
            {section.body.map((paragraph, j) => (
              <p key={j} className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                {paragraph}
              </p>
            ))}
          </article>
        ))}
      </div>
    </div>
  </div>
);

export default CookiePolicyPage;
