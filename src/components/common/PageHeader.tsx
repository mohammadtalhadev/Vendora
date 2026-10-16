import React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  /** The page's one <h1>. Every big storefront page renders exactly one. */
  title: React.ReactNode;
  /** Small overline above the title (rendered in the shared eyebrow style). */
  eyebrow?: string;
  /** Optional supporting line under the title. */
  description?: React.ReactNode;
  /** Optional right-aligned header content (counts, badges, actions). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * The one storefront page header. Before this component every
 * page hand-rolled its title block — Home had no <h1> at all while Checkout
 * carried three — at slightly different sizes and weights. PageHeader pins
 * the standard: one h1 on the shared page scale, one eyebrow style, one
 * description style, action right-aligned.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  eyebrow,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange-700">
            {eyebrow}
          </p>
        )}
        <h1 className="font-outfit text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</div>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </div>
  );
};
