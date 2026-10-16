import React from 'react';
import { CatalogBrowser } from '../features/catalog/components/CatalogBrowser';

/**
 * All Products (/products, /search): the shared catalogue browser with its
 * default identity. The browser lives in features/catalog — /products,
 * /new-arrivals and /deals are one implementation, so a facet or
 * card fix lands on all three at once.
 */
export const ProductsPage: React.FC = () => (
  <CatalogBrowser fallbackHeading="All Products" />
);
