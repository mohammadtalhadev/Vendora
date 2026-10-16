import React from 'react';
import type { SiteSection } from '../../api/sections';
import { AppPromoSection, type AppPromoContent } from '../../components/AppPromoSection';

/**
 * The promo banner as a section renderer. The panel carries
 * copy only, so its content is read from the section settings the console
 * edits (eyebrow, heading lines, subtext, one bullet per entry); anything
 * a row leaves empty falls back to AppPromoSection's built-in words.
 */
export const PromoBannerSection: React.FC<{ section: SiteSection }> = ({ section }) => {
  const settings = section.settings;
  const content: Partial<AppPromoContent> = {};

  const readText = (key: keyof AppPromoContent) => {
    const value = settings[key];
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  };

  const eyebrow = readText('eyebrow');
  if (eyebrow) content.eyebrow = eyebrow;
  const headingLead = readText('headingLead');
  if (headingLead) content.headingLead = headingLead;
  const headingAccent = readText('headingAccent');
  if (headingAccent) content.headingAccent = headingAccent;
  const subtext = readText('subtext');
  if (subtext) content.subtext = subtext;

  const bullets = settings.bullets;
  if (Array.isArray(bullets)) {
    const labels = bullets
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry !== '');
    if (labels.length > 0) content.bullets = labels;
  }

  return <AppPromoSection content={content} />;
};
