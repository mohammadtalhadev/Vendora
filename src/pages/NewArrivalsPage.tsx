import React from 'react';
import { CatalogBrowser } from '../features/catalog/components/CatalogBrowser';

/**
 * New Arrivals (/new-arrivals): the shared catalogue browser in its
 * newest-first identity — the same server-side facets, sort, grid and cards
 * as /products (Batch 52). Before this batch the page was a bare grid of the
 * 40 newest products with no filters at all, which the owner flagged.
 */
export const NewArrivalsPage: React.FC = () => (
  <CatalogBrowser
    fallbackHeading="New Arrivals"
    headerDescription="The latest products added to Vendora, newest first — straight from our sellers' shelves."
    defaultSort="newest"
  />
);

export default NewArrivalsPage;
