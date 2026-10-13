import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Check } from 'lucide-react';
import { useCurrency } from '../../../store/currency-store';

export interface MerchantOffer {
  id: string;
  sellerName: string;
  /** Real vendor id/slug so the "sold by" link resolves on VendorStorefrontPage. */
  sellerId?: string;
  sellerSlug?: string;
  itemPrice: number;
  /** Only shown when the caller supplied a real value; never invented. */
  merchantRating?: number;
  ratingCount?: number;
  condition?: string;
  deliveryEstimate?: string;
  isCurrent?: boolean;
}

interface OtherOffersSectionProps {
  /** Real offers from the data layer. When empty/absent the section renders nothing. */
  offers?: MerchantOffer[];
  currentSellerId?: string;
  currentSellerName?: string;
  onSelectSeller?: (offer: MerchantOffer) => void;
}

export const OtherOffersSection: React.FC<OtherOffersSectionProps> = ({
  offers,
  onSelectSeller,
}) => {
  const { formatPrice } = useCurrency();
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const hasOffers = Array.isArray(offers) && offers.length > 0;

  // No fabricated marketplace: without real offers there is nothing honest to render.
  if (!hasOffers) return null;

  const list = offers as MerchantOffer[];
  const isOfferSelected = (offer: MerchantOffer) =>
    selectedOfferId === offer.id || (selectedOfferId === null && offer.isCurrent === true);

  const handleSelect = (offer: MerchantOffer) => {
    setSelectedOfferId(offer.id);
    if (onSelectSeller) onSelectSeller(offer);
  };

  const avatarLetter = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

  const sellerLabel = (offer: MerchantOffer) => {
    const label = offer.sellerName?.trim() || '—';
    const href = offer.sellerSlug || offer.sellerId;
    if (!href) return label;
    return (
      <Link
        to={`/vendors/${href}`}
        className="font-bold text-slate-900 text-sm hover:text-sun-orange transition-colors"
      >
        {label}
      </Link>
    );
  };

  return (
    <section className="mt-12 rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-7 shadow-2xs backdrop-blur-md">
      {/* Section Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sun-orange">
            COMPARE MARKETPLACE MERCHANTS
          </span>
          <h3 className="font-outfit mt-0.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Other Offers for this Item ({list.length} Sellers)
          </h3>
        </div>
      </div>

      {/* Desktop / Tablet Table View */}
      <div className="mt-4 hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3">Seller Name</th>
              <th className="py-3 px-3">Merchant Rating</th>
              <th className="py-3 px-3">Condition</th>
              <th className="py-3 px-3">Delivery</th>
              <th className="py-3 px-3">Item Price</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((offer) => {
              const isSelected = isOfferSelected(offer);
              return (
                <tr
                  key={offer.id}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    isSelected ? 'bg-orange-50/20' : ''
                  }`}
                >
                  {/* Seller Name (links to the real vendor storefront when an id is known) */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-black text-xs">
                        {avatarLetter(offer.sellerName)}
                      </div>
                      {sellerLabel(offer)}
                    </div>
                  </td>

                  {/* Rating — real value only, otherwise an honest em-dash */}
                  <td className="py-4 px-3">
                    {offer.merchantRating !== undefined ? (
                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{offer.merchantRating.toFixed(1)}</span>
                        {offer.ratingCount !== undefined && (
                          <span className="text-slate-400 font-normal">
                            ({offer.ratingCount.toLocaleString()})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Condition badge — from the offer, else em-dash */}
                  <td className="py-4 px-3">
                    {offer.condition ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200/60">
                        {offer.condition}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Delivery — from the offer, else em-dash */}
                  <td className="py-4 px-3">
                    <span className="font-semibold text-slate-600">
                      {offer.deliveryEstimate?.trim() || '—'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-4 px-3">
                    <span className="font-outfit text-base font-black text-slate-900">
                      {formatPrice(offer.itemPrice)}
                    </span>
                  </td>

                  {/* Action button */}
                  <td className="py-4 px-3 text-right">
                    {isSelected ? (
                      <button
                        type="button"
                        disabled
                        aria-pressed
                        aria-label="Currently selected seller"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs cursor-default"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Current Choice</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelect(offer)}
                        aria-label={`Select seller ${offer.sellerName || ''}`.trim()}
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-sun-orange hover:bg-orange-50 hover:text-sun-orange transition-all cursor-pointer active:scale-95"
                      >
                        Select Seller
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="mt-4 md:hidden space-y-3">
        {list.map((offer) => {
          const isSelected = isOfferSelected(offer);
          return (
            <div
              key={offer.id}
              className={`rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-sun-orange bg-orange-50/30 shadow-xs'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-black text-xs">
                    {avatarLetter(offer.sellerName)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{sellerLabel(offer)}</div>
                    {offer.merchantRating !== undefined && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{offer.merchantRating.toFixed(1)}</span>
                        {offer.ratingCount !== undefined && (
                          <span>({offer.ratingCount.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-outfit text-base font-black text-slate-900">
                    {formatPrice(offer.itemPrice)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                <div className="space-y-1">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {offer.condition?.trim() || '—'}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    {offer.deliveryEstimate?.trim() || '—'}
                  </div>
                </div>

                {isSelected ? (
                  <button
                    type="button"
                    disabled
                    aria-pressed
                    aria-label="Currently selected seller"
                    className="inline-flex items-center gap-1 rounded-lg bg-sun-orange px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>Current Choice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(offer)}
                    aria-label={`Select seller ${offer.sellerName || ''}`.trim()}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-sun-orange hover:text-sun-orange"
                  >
                    Select Seller
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
