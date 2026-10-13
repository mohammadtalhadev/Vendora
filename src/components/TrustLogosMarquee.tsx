import React from 'react';

const TRUST_LOGOS = [
  { src: '/images/bevesi/logo-02.png', alt: 'Lenovo' },
  { src: '/images/bevesi/logo-03.png', alt: 'Sony' },
  { src: '/images/bevesi/logo-04.png', alt: 'Intel' },
  { src: '/images/bevesi/logo-05.png', alt: 'Siemens' },
  { src: '/images/bevesi/logo-06.png', alt: 'Dell' },
  { src: '/images/bevesi/logo-07.png', alt: 'Dyson' },
  { src: '/images/bevesi/logo-08.png', alt: 'Oppo' },
];

export const TrustLogosMarquee: React.FC = () => {
  const logos = [...TRUST_LOGOS, ...TRUST_LOGOS];

  return (
    <section className="mb-10">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#F4F6FB] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#F4F6FB] to-transparent" />

        <div className="flex animate-marquee">
          {logos.map((logo, idx) => (
            <div
              key={idx}
              className="flex shrink-0 items-center justify-center px-8 sm:px-12"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="h-8 w-auto object-contain opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 sm:h-10"
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};
