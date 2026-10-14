import React from 'react';
import { cn } from '../../../lib/utils';

export interface SectionHeadingProps {
  /**
   * Small overline above the title. A plain string is rendered in the
   * shared eyebrow style; pass a node when the section's eyebrow carries
   * its own icon chip / colour identity (rendered as-is).
   */
  eyebrow?: React.ReactNode;
  /** Section title — rendered as the section's semantic <h2>. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional content rendered inline after the title (e.g. category pills). */
  inline?: React.ReactNode;
  /** Optional right-aligned header content (View All link, filter pills, scroll arrows). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * The one homepage section header. Before this component every home
 * section hand-rolled its own eyebrow/title/subtitle block with slightly
 * different type weights, spacing and header layout; they now share a
 * single treatment: Outfit display title on the section scale, one
 * subtitle style, one header rhythm (mb-6, action right-aligned).
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  subtitle,
  inline,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        {eyebrow !== undefined &&
          (typeof eyebrow === 'string' ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange-700">
              {eyebrow}
            </p>
          ) : (
            eyebrow
          ))}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <h2 className="mt-1 font-outfit text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
          {inline}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
};
