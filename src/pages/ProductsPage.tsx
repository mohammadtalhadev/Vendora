import React from 'react';
import { useLocation } from 'react-router-dom';
import { CatalogBrowser } from '../features/catalog/components/CatalogBrowser';
import { RecentlyViewedRail } from '../features/catalog/components/RecentlyViewedRail';

/**
 * All Products (/products, /search): the shared catalogue browser with its
 * default identity. The browser lives in features/catalog — /products,
 * /new-arrivals and /deals are one implementation, so a facet or
 * card fix lands on all three at once.
 *
 * The Recently Viewed rail leads the catalogue on /products only
 *: browsing history belongs in the shopping context, not on
 * the homepage (owner's order) and not above search results, where the
 * shopper has already said what they are looking for. The rail renders
 * nothing when this device has no history.
 */
export const ProductsPage: React.FC = () => {
  const { pathname } = useLocation();
  const isCatalogueHome = pathname === '/products';

  return (
    <>
      {isCatalogueHome && <RecentlyViewedRail />}
      <CatalogBrowser fallbackHeading="All Products" />
    </>
  );
};
