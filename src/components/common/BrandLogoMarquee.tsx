import React from 'react';
import { cn } from '../../lib/utils';

/**
 * The ONE brand-logo marquee. Every logo strip on the site used
 * to be a single combined PNG with all the brands baked into one image —
 * frozen, uneditable, and impossible to restyle per brand. This component
 * renders each brand as its own PNG on a continuously scrolling track
 * (the list is duplicated so the -50% keyframe loop in base.css is
 * seamless), muted grey at rest and full colour on hover, pausing while
 * hovered. Under prefers-reduced-motion the track stands still and the
 * rail scrolls horizontally instead (see base.css), so no logo is ever
 * unreachable. Feed it one of the ready sets below, or any { src, alt }
 * list. It replaces the orphaned TrustLogosMarquee, which nothing imported.
 */
export interface BrandLogo {
  src: string;
  alt: string;
}

export const ELECTRONICS_BRAND_LOGOS: BrandLogo[] = [
  { src: '/images/brands/electronics/apple.webp', alt: 'Apple' },
  { src: '/images/brands/electronics/samsung.webp', alt: 'Samsung' },
  { src: '/images/brands/electronics/google.webp', alt: 'Google' },
  { src: '/images/brands/electronics/oppo.webp', alt: 'Oppo' },
  { src: '/images/brands/electronics/siemens.webp', alt: 'Siemens' },
  { src: '/images/brands/electronics/dyson.webp', alt: 'Dyson' },
  { src: '/images/brands/electronics/sony.webp', alt: 'Sony' },
  { src: '/images/brands/electronics/dell.webp', alt: 'Dell' },
  { src: '/images/brands/electronics/lenovo.webp', alt: 'Lenovo' },
  { src: '/images/brands/electronics/intel.webp', alt: 'Intel' },
  { src: '/images/brands/electronics/microsoft.webp', alt: 'Microsoft' },
  { src: '/images/brands/electronics/lg.webp', alt: 'LG' },
];

export const BEAUTY_BRAND_LOGOS: BrandLogo[] = [
  { src: '/images/brands/beauty/chanel.webp', alt: 'Chanel' },
  { src: '/images/brands/beauty/dior.webp', alt: 'Dior' },
  { src: '/images/brands/beauty/loreal.webp', alt: "L'Oréal" },
  { src: '/images/brands/beauty/sephora.webp', alt: 'Sephora' },
  { src: '/images/brands/beauty/estee-lauder.webp', alt: 'Estée Lauder' },
  { src: '/images/brands/beauty/lancome.webp', alt: 'Lancôme' },
  { src: '/images/brands/beauty/aesop.webp', alt: 'Aesop' },
  { src: '/images/brands/beauty/aveda.webp', alt: 'Aveda' },
  { src: '/images/brands/beauty/kerastase.webp', alt: 'Kérastase' },
  { src: '/images/brands/beauty/biotherm.webp', alt: 'Biotherm' },
  { src: '/images/brands/beauty/allure.webp', alt: 'Allure' },
  { src: '/images/brands/beauty/unilever.webp', alt: 'Unilever' },
];

export interface BrandLogoMarqueeProps {
  logos: BrandLogo[];
  /** Accessible name for the strip region. */
  label: string;
  className?: string;
}

export const BrandLogoMarquee: React.FC<BrandLogoMarqueeProps> = ({
  logos,
  label,
  className,
}) => {
  const loop = [...logos, ...logos];

  return (
    <div
      role="region"
      aria-label={label}
      className={cn('brand-logo-marquee w-full', className)}
    >
      <div className="brand-logo-marquee-track flex w-max items-center">
        {loop.map((logo, idx) => {
          const isDuplicate = idx >= logos.length;
          return (
            <div
              key={`${logo.src}-${idx}`}
              aria-hidden={isDuplicate || undefined}
              className="flex shrink-0 items-center justify-center px-8 sm:px-12"
            >
              <img
                src={logo.src}
                alt={isDuplicate ? '' : logo.alt}
                loading="lazy"
                className="h-8 w-auto object-contain opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 sm:h-10"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
