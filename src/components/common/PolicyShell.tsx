import React from 'react';
import { cn } from '../../lib/utils';

/**
 * The one shell for every policy / info page (Batch 55).
 *
 * Before this component the policy pages had grown at least four different
 * layouts: the honest B45 family (white hero band + numbered white cards on
 * slate-50), a frosted-glass family with ambient glows, a narrow centred
 * column, and several one-off widths — so /cookie-policy, /privacy, /terms,
 * /refund-policy, /shipping, /affiliates, /seller-fees, /seller-policy and
 * /about all looked like different websites. PolicyShell pins the B45 family
 * as the canon: the site container, a white hero band carrying the eyebrow +
 * one h1 + intro, and a body stack of white section cards with numbered
 * outfit headings. Every policy page renders through it; a page's own
 * content (tables, calculators, forms) lives inside PolicySection cards or
 * its own canon-styled blocks.
 */
export const POLICY_CONTAINER = 'mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8';

export interface PolicyShellProps {
  /** Small overline above the title, rendered in the shared eyebrow style. */
  eyebrow: string;
  /** The page's one <h1>. */
  title: React.ReactNode;
  /** Supporting copy under the title (short paragraphs and inline links). */
  intro?: React.ReactNode;
  /** Optional hero-band actions (print, start-a-return, …), right-aligned. */
  action?: React.ReactNode;
  /** Rhythm of the body stack. Chapter-sized pages (About) pass a wider one. */
  bodyClassName?: string;
  children: React.ReactNode;
}

export const PolicyShell: React.FC<PolicyShellProps> = ({
  eyebrow,
  title,
  intro,
  action,
  bodyClassName,
  children,
}) => (
  <div className="bg-slate-50 pb-20 font-sans text-slate-800 antialiased selection:bg-orange-200">
    <section className="border-b border-slate-200 bg-white">
      <div className={`${POLICY_CONTAINER} py-10 sm:py-14`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-black tracking-widest text-sun-orange uppercase">
              {eyebrow}
            </span>
            <h1 className="mt-2 font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>
            {intro && (
              <div className="mt-3 max-w-2xl space-y-3 text-sm leading-relaxed text-slate-500">
                {intro}
              </div>
            )}
          </div>
          {action && (
            <div className="flex shrink-0 flex-wrap items-center gap-2.5 pt-1">{action}</div>
          )}
        </div>
      </div>
    </section>

    <div className={`${POLICY_CONTAINER} mt-10`}>
      <div className={cn('space-y-6', bodyClassName)}>{children}</div>
    </div>
  </div>
);

export interface PolicySectionProps {
  id?: string;
  /** 1-based section number, rendered as the orange "01" prefix. Omit for unnumbered cards. */
  index?: number;
  title: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * One section card inside a PolicyShell body: white rounded card, outfit
 * heading with the orange number, and body copy on the shared prose scale
 * (text-sm / relaxed / slate-600, paragraphs capped at max-w-3xl).
 */
export const PolicySection: React.FC<PolicySectionProps> = ({
  id,
  index,
  title,
  className,
  children,
}) => (
  <article
    id={id}
    className={cn(
      'scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8',
      className,
    )}
  >
    <h2 className="font-outfit text-lg font-black text-slate-900">
      {typeof index === 'number' && (
        <span className="mr-2 text-sun-orange">{String(index).padStart(2, '0')}</span>
      )}
      {title}
    </h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 [&>p]:max-w-3xl">
      {children}
    </div>
  </article>
);
