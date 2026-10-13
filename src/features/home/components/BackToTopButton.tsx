import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min(100, Math.round((scrollY / docHeight) * 100)));
      }
      setIsVisible(scrollY > 350);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-7 right-7 z-40 animate-in fade-in zoom-in-75 duration-300">
      <button
        type="button"
        onClick={scrollToTop}
        className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 p-0 text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:text-sun-orange hover:shadow-2xl hover:shadow-orange-500/20 active:scale-95 cursor-pointer"
        aria-label="Scroll back to top"
      >
        {/* Circular Progress Stroke (Subtle) */}
        <svg className="absolute inset-0 h-full w-full -rotate-90 p-0.5" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={125.6}
            strokeDashoffset={125.6 - (125.6 * scrollProgress) / 100}
            strokeLinecap="round"
            className="text-sun-orange transition-all duration-150"
          />
        </svg>

        <ArrowUp className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />

        {/* Hover Tooltip Pill */}
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          Top ({scrollProgress}%)
        </span>
      </button>
    </div>
  );
};
