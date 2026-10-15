import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, RefreshCw, Zap } from 'lucide-react';
import { useCurrency, type CurrencyCode } from '../../store/currency-store';

interface CurrencySelectorProps {
  variant?: 'topbar' | 'mobile' | 'footer';
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  variant = 'topbar',
  className = '',
}) => {
  const {
    currency,
    setCurrency,
    rates,
    isLoading,
    lastUpdated,
    fetchRates,
    currencies,
    config,
  } = useCurrency();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch live rates on mount (debounced/cached by store)
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: CurrencyCode) => {
    setCurrency(code);
    setIsOpen(false);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchRates(true);
  };

  // Mobile drawer variant: inline selectable pills or expandable block
  if (variant === 'mobile') {
    return (
      <div className={`p-3 rounded-2xl bg-slate-50 border border-slate-200/80 ${className}`}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">
              Market Currency
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-orange-600 transition-colors"
            title="Refresh live exchange rates"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
            <span>Live rates</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {currencies.slice(0, 6).map((c) => {
            const isSelected = currency === c.code;
            const rate = rates[c.code] ?? 1;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelect(c.code)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  <div>
                    <div className="text-xs leading-none font-bold">
                      {c.code} <span className={isSelected ? 'text-amber-300' : 'text-slate-500'}>({c.symbol})</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      1 PKR = {rate < 1 ? rate.toFixed(4) : rate.toFixed(rate > 100 ? 0 : 2)}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Topbar / Header dropdown
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Currency"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 hover:text-sun-orange hover:bg-slate-100/80 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <span className="text-sm leading-none">{config.flag}</span>
        <span className="tracking-tight">
          {config.code} <span className="text-slate-400 font-medium">({config.symbol})</span>
        </span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white/95 backdrop-blur-xl p-2.5 text-slate-800 shadow-2xl ring-1 ring-slate-900/10 border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
              <span className="text-[11px] font-extrabold text-slate-800">
                Live Google Rates
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
              title="Refresh real-time market rates"
            >
              <RefreshCw className={`h-2.5 w-2.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
              <span>{isLoading ? 'Updating...' : 'Sync'}</span>
            </button>
          </div>

          {/* Currencies List */}
          <div data-lenis-prevent className="mt-1.5 max-h-72 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
            {currencies.map((c) => {
              const isSelected = currency === c.code;
              const rate = rates[c.code] ?? 1;

              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/80 text-orange-950 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>{c.code}</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          {c.name} ({c.symbol})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        1 PKR = {rate < 1 ? rate.toFixed(4) : rate.toFixed(rate > 100 ? 1 : 2)} {c.code}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white shrink-0">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-2 pt-2 border-t border-slate-100 px-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Base: 1 PKR</span>
            <span>
              {lastUpdated
                ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Reference rates'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
