import React from 'react';
import { CatalogBrowser } from '../features/catalog/components/CatalogBrowser';

/**
 * Deals & Discounts (/deals, /flash-deals): the shared catalogue browser
 * locked to the sale shelf — every query carries the B46 on-sale facet, so
 * the page is the standard catalogue layout (PageHeader, filter rail/drawer,
 * shared ProductCard, pagination) showing only discounted products.
 *
 * Before Batch 52 this page ran its own layout (ambient glow orbs, gradient
 * hero, client-side tab buckets over a 100-row pool) and felt like a different
 * website with no real filters — the owner's complaint. The tabs' jobs are
 * covered by the shared system now: "Under Rs 2,000" is the price facet, and
 * the header count is the server's exact on-sale total. The old hero copy also
 * claimed payments were "held in escrow", which the platform does not do; the
 * description below says only what is true.
 */
export const DealsPage: React.FC = () => (
  <CatalogBrowser
    fallbackHeading="Deals & Discounts"
    headerDescription="Products with genuine price drops from sellers across Vendora — every discount is set by the seller against their original price."
    lockedOnSale
  />
);
