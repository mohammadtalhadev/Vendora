import React from 'react';
import { Check } from 'lucide-react';
import type { Product } from '../../../types/domain';

/** Builds a Ronin-style two-column spec table from real product data. */
function buildSpecRows(product: Product): Array<[string, string]> {
  const rows: Array<[string, string]> = [];

  rows.push(['Model', product.brand ? `${product.brand} ${product.id.toUpperCase()}` : product.id.toUpperCase()]);

  const firstVariant = product.variants[0];
  if (firstVariant) {
    const attrs = Object.entries(firstVariant.attributes || {});
    for (const [key, value] of attrs) {
      rows.push([key.replace(/_/g, ' ').toUpperCase(), String(value)]);
    }
  }

  if (product.type === 'digital') {
    rows.push(['PRODUCT TYPE', 'Digital Asset License (Instant Delivery)']);
    if (product.digitalAssetInfo?.fileSizeMb) {
      rows.push(['FILE SIZE', `${product.digitalAssetInfo.fileSizeMb} MB`]);
    }
    if (product.digitalAssetInfo?.licenseType) {
      rows.push(['LICENSE', product.digitalAssetInfo.licenseType]);
    }
    rows.push(['DELIVERY', 'License key emailed immediately after payment']);
  } else {
    rows.push(['PRODUCT TYPE', 'Physical Goods']);
    if (product.shippingSettings?.weightKg) {
      rows.push(['WEIGHT', `${product.shippingSettings.weightKg} kg`]);
    }
    rows.push([
      'SHIPPING',
      product.shippingSettings?.freeShipping
        ? 'Free shipping included'
        : `Standard fee $${(product.shippingSettings?.standardFee ?? 0).toFixed(2)}`,
    ]);
    rows.push(['VARIANTS', `${product.variants.length} option(s) available`]);
  }

  rows.push(['AVAILABILITY', product.stock > 0 ? `${product.stock} units in stock` : 'Out of stock']);
  rows.push(['SELLER', `${product.sellerName} (${product.sellerType === 'platform' ? 'Sold by Vendora' : 'Marketplace Vendor'})`]);
  rows.push(['WARRANTY', product.type === 'digital' ? 'Not applicable' : '1-year official brand warranty']);

  return rows;
}

interface ProductSpecsTableProps {
  product: Product;
}

/** Ronin "Technical Specs" — clean two-column table on brand palette. */
export const ProductSpecsTable: React.FC<ProductSpecsTableProps> = ({ product }) => {
  const rows = buildSpecRows(product);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-mist-100 px-5 py-4">
        <Check className="h-4 w-4 text-sun-orange" />
        <h3 className="text-sm font-extrabold tracking-tight text-ink-900">Technical Specs</h3>
      </div>
      <table className="w-full text-left text-xs">
        <tbody>
          {rows.map(([label, value], idx) => (
            <tr
              key={label}
              className={idx % 2 === 0 ? 'bg-white' : 'bg-mist-100/60'}
            >
              <th
                scope="row"
                className="w-[38%] border-b border-slate-100 px-5 py-3.5 align-top text-[11px] font-extrabold tracking-wide text-ink-500 sm:w-[30%]"
              >
                {label}
              </th>
              <td className="border-b border-slate-100 px-5 py-3.5 align-top font-medium leading-relaxed text-ink-800">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
