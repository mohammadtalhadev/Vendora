import React from 'react';
import type { SiteSection } from '../../api/sections';
import {
  InspirationMosaic,
  type Hotspot,
  type LookbookCard,
} from '../../components/InspirationMosaic';

/**
 * The inspiration mosaic as a section renderer. Cards come from
 * the section's items: image, heading (card title), subtext and the tag
 * chip carried in the item label. The card spans follow the built-in
 * mosaic's 8/4/6/6 rhythm by position. The shop-the-look pins are
 * type-specific structured data, so they live in the section settings
 * (`hotspotsByItemId`, keyed by item id) and are read defensively - a pin
 * whose item was edited away simply never renders.
 */

const SPAN_CYCLE = [
  'md:col-span-8 min-h-[380px] sm:min-h-[440px]',
  'md:col-span-4 min-h-[380px] sm:min-h-[440px]',
  'md:col-span-6 min-h-[320px] sm:min-h-[380px]',
  'md:col-span-6 min-h-[320px] sm:min-h-[380px]',
];

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hotspotsFromSettings(settings: Record<string, unknown>, itemId: string): Hotspot[] {
  const byItem = asRecord(settings.hotspotsByItemId);
  const raw = byItem[itemId];
  if (!Array.isArray(raw)) return [];
  const hotspots: Hotspot[] = [];
  for (const entry of raw) {
    const pin = asRecord(entry);
    const title = text(pin.title);
    const productUrl = text(pin.productUrl);
    if (!title || !productUrl) continue;
    hotspots.push({
      id: text(pin.id) || `${itemId}-pin-${hotspots.length + 1}`,
      top: text(pin.top) || '50%',
      left: text(pin.left) || '50%',
      title,
      price: num(pin.price),
      productUrl,
      image: text(pin.image),
    });
  }
  return hotspots;
}

export const InspirationMosaicSection: React.FC<{ section: SiteSection }> = ({ section }) => {
  const cards: LookbookCard[] = section.items
    .filter((item) => item.imageUrl)
    .map((item, index) => ({
      id: item.id,
      title: item.heading,
      subtitle: item.subtext,
      categoryTag: item.ctaLabel,
      image: item.imageUrl,
      spanClass: SPAN_CYCLE[index % SPAN_CYCLE.length],
      hotspots: hotspotsFromSettings(section.settings, item.id),
    }));
  if (cards.length === 0) return null;
  return <InspirationMosaic cards={cards} title={section.title || undefined} />;
};
