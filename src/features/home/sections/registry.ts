import type { ComponentType } from 'react';
import type { SiteSection } from '../api/sections';
import { CategoryTilesSection } from './renderers/CategoryTilesSection';
import { InspirationMosaicSection } from './renderers/InspirationMosaicSection';
import { PromoBannerSection } from './renderers/PromoBannerSection';

/**
 * The homepage section registry.
 *
 * Every homepage block the console can manage is a section TYPE registered
 * here: a renderer component, the page anchor it renders at, and the item
 * schema it uses. This file is the whole contract for future sections:
 *
 *   1. Build a renderer component that takes `{ section }` (see
 *      ./renderers for the pattern - items and settings in, JSX out, with
 *      built-in defaults for anything the row leaves empty).
 *   2. Register its type below with an anchor.
 *   3. Done. Admins can then create, edit, reorder, enable/disable and
 *      delete instances of that type from Admin -> Homepage Sections with
 *      no further code, and the storefront renders them at the anchor.
 *
 * Anchors are the fixed slots in HomePage's composition (layout order is
 * a design decision, so it stays in code); INSTANCES are data. Several
 * instances of anchored types render at their anchor in sort order.
 *
 * Product-data rails are registered with `component: null`: they render
 * catalogue data through their own components (RecommendedShelf,
 * DealsStrip, BrandSpotlight, SellerSpotlight,
 * DigitalShowcase) and are listed so the registry names every homepage
 * block, but they are not admin-creatable section instances - there is no
 * image/copy for a console to own; the catalogue is the content.
 */

export type SectionAnchor = 'categories' | 'mosaic' | 'promo';

export interface SectionSettingsField {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'lines';
  placeholder?: string;
}

export interface SectionTypeDefinition {
  type: string;
  label: string;
  description: string;
  /** Where instances render on the homepage; null = not slot-rendered. */
  anchor: SectionAnchor | null;
  /** The renderer; null for data-driven rails managed by their own components. */
  component: ComponentType<{ section: SiteSection }> | null;
  usesItems: boolean;
  usesImage: boolean;
  usesCta: boolean;
  settingsFields: SectionSettingsField[];
}

export const SECTION_TYPE_REGISTRY: SectionTypeDefinition[] = [
  {
    type: 'category-tiles',
    label: 'Category tiles',
    description:
      'The circular category tiles row. Each item is one tile: image, name, and the catalogue link it opens.',
    anchor: 'categories',
    component: CategoryTilesSection,
    usesItems: true,
    usesImage: true,
    usesCta: true,
    settingsFields: [],
  },
  {
    type: 'inspiration-mosaic',
    label: 'Inspiration mosaic (shop the look)',
    description:
      'Editorial lookbook cards with shop-the-look pins. Each item is one card: image, title, subtitle and a tag chip (the item label). Pins are type-specific data kept in the section settings.',
    anchor: 'mosaic',
    component: InspirationMosaicSection,
    usesItems: true,
    usesImage: true,
    usesCta: false,
    settingsFields: [],
  },
  {
    type: 'promo-banner',
    label: 'Promo banner',
    description:
      'The dark gradient promo panel (the mobile-browser promo). It carries copy only - no items; its text lives in the section settings below.',
    anchor: 'promo',
    component: PromoBannerSection,
    usesItems: false,
    usesImage: false,
    usesCta: false,
    settingsFields: [
      { key: 'eyebrow', label: 'Eyebrow badge', kind: 'text' },
      { key: 'headingLead', label: 'Heading (first line)', kind: 'text' },
      { key: 'headingAccent', label: 'Heading (accent line)', kind: 'text' },
      { key: 'subtext', label: 'Subtext', kind: 'textarea' },
      {
        key: 'bullets',
        label: 'Feature bullets (one per line)',
        kind: 'lines',
        placeholder: 'Instant Escrow Alerts',
      },
    ],
  },
  /* Data-driven rails: registered for completeness, rendered by their own
   * catalogue-fed components, not creatable as section instances. */
  {
    type: 'recommended-shelf',
    label: 'Recommended shelf (product data)',
    description: 'Renders live catalogue data via RecommendedShelf.',
    anchor: null,
    component: null,
    usesItems: false,
    usesImage: false,
    usesCta: false,
    settingsFields: [],
  },
  {
    type: 'deals-strip',
    label: 'Deals strip (product data)',
    description: 'Renders live deal data via DealsStrip.',
    anchor: null,
    component: null,
    usesItems: false,
    usesImage: false,
    usesCta: false,
    settingsFields: [],
  },
  {
    type: 'brand-spotlight',
    label: 'Brand spotlight (store data)',
    description: 'Renders live store data via BrandSpotlight.',
    anchor: null,
    component: null,
    usesItems: false,
    usesImage: false,
    usesCta: false,
    settingsFields: [],
  },
  {
    type: 'seller-spotlight',
    label: 'Seller spotlight (store data)',
    description: 'Renders live store data via SellerSpotlight.',
    anchor: null,
    component: null,
    usesItems: false,
    usesImage: false,
    usesCta: false,
    settingsFields: [],
  },
  {
    type: 'digital-showcase',
    label: 'Digital showcase (product data)',
    description: 'Renders live digital-product data via DigitalShowcase.',
    anchor: null,
    component: null,
    usesItems: false,
    usesImage: false,
    usesCta: false,
    settingsFields: [],
  },
];

export function sectionTypeDefinition(type: string): SectionTypeDefinition | undefined {
  return SECTION_TYPE_REGISTRY.find((def) => def.type === type);
}

/** The types an admin may create instances of (the slot-rendered ones). */
export const ADMIN_CREATABLE_TYPES: SectionTypeDefinition[] = SECTION_TYPE_REGISTRY.filter(
  (def) => def.component !== null,
);

/** Sections of one anchor, in render order. */
export function sectionsForAnchor(sections: SiteSection[], anchor: SectionAnchor): SiteSection[] {
  return sections.filter((section) => sectionTypeDefinition(section.type)?.anchor === anchor);
}
