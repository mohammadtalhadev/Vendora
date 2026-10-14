import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Check, Copy, Store, TicketPercent } from 'lucide-react';
import { fetchCouponCentre, type CentreCoupon } from '../features/cart/api/promotions';
import { fetchStoreDirectory } from '../features/vendor/api/store';
import { formatPrice } from '../store/currency-store';

const CONTAINER = 'mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8';

/**
 * Coupon Centre (/coupons). Every card is a live promotion read from the
 * same `promotions` table the cart validates against — RLS hides inactive
 * rows and this page applies the same window/usage rules as checkout, so a
 * code shown here is a code that will work (subject to its minimum spend).
 * Seller-issued codes say which store issued them.
 */
export const CouponCentrePage: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const coupons = useQuery({
    queryKey: ['coupon-centre'] as const,
    queryFn: ({ signal }) => fetchCouponCentre(signal),
  });
  const directory = useQuery({
    queryKey: ['home', 'store-directory'] as const,
    queryFn: ({ signal }) => fetchStoreDirectory(signal),
    staleTime: 5 * 60 * 1000,
  });

  const storeById = new Map((directory.data ?? []).map((s) => [s.id, s]));
  const rows = coupons.data ?? [];

  const copy = async (coupon: CentreCoupon) => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopiedCode(coupon.code);
      window.setTimeout(() => setCopiedCode((c) => (c === coupon.code ? null : c)), 2000);
    } catch {
      setCopiedCode(null);
    }
  };

  const renderCard = (coupon: CentreCoupon) => {
    const store =
      coupon.sellerScope && coupon.sellerScope !== 'platform'
        ? storeById.get(coupon.sellerScope)
        : undefined;
    const benefit =
      coupon.type === 'percentage' ? `${coupon.value}% off` : `${formatPrice(coupon.value)} off`;
    return (
      <article
        key={coupon.code}
        className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-orange/10 text-sun-orange">
            <TicketPercent className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-outfit text-xl font-black text-slate-900">{benefit}</span>
        </div>
        <p className="mt-4 font-mono text-base font-black tracking-wider text-slate-900">
          {coupon.code}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-slate-500">
          <li>
            {!coupon.sellerScope || coupon.sellerScope === 'platform' ? (
              'Vendora platform offer — works across the marketplace'
            ) : store ? (
              <>
                Issued by{' '}
                <Link to={`/vendors/${store.slug}`} className="font-bold text-sun-orange hover:underline">
                  {store.storeName}
                </Link>{' '}
                — applies to that seller&apos;s items
              </>
            ) : (
              'Seller offer — applies to the issuing seller\'s items'
            )}
          </li>
          {coupon.minSpend !== undefined && coupon.minSpend > 0 && (
            <li>Minimum spend {formatPrice(coupon.minSpend)}</li>
          )}
          {coupon.endsAt && (
            <li>
              Ends{' '}
              {new Date(coupon.endsAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </li>
          )}
        </ul>
        <button
          type="button"
          onClick={() => void copy(coupon)}
          className={`mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-black tracking-wide uppercase transition-all ${
            copiedCode === coupon.code
              ? 'bg-emerald-600 text-white'
              : 'bg-sun-orange text-white hover:bg-[#E63E00]'
          }`}
        >
          {copiedCode === coupon.code ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" /> Copy code
            </>
          )}
        </button>
      </article>
    );
  };

  return (
    <div className="bg-slate-50 pb-20 font-sans text-slate-800 antialiased selection:bg-orange-200">
      <section className="border-b border-slate-200 bg-white">
        <div className={`${CONTAINER} py-10 sm:py-14`}>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-sun-orange uppercase">
            <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" /> Save more
          </span>
          <h1 className="mt-2 font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Coupon Centre
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            Every code below is live right now — the same promotions checkout checks
            against. Copy one, add it in your cart or at checkout, and the discount comes
            off before you pay.
          </p>
        </div>
      </section>

      <div className={`${CONTAINER} mt-10`}>
        {coupons.isError && (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            Live offers could not be loaded just now. Codes you already have will still
            work at checkout.
          </p>
        )}
        {coupons.isPending && !coupons.isError ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading coupons">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 && !coupons.isError ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Store className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="mt-3 font-outfit text-lg font-black text-slate-900">
              No live offers at the moment
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              Promotions come and go — when sellers or Vendora publish a new code, it
              appears here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(renderCard)}</div>
        )}

        <p className="mt-8 text-xs text-slate-500">
          One code per order. A seller&apos;s code only discounts that seller&apos;s
          items in your cart.
        </p>
      </div>
    </div>
  );
};

export default CouponCentrePage;
