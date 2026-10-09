import React from 'react';

export const PaymentIcons: React.FC = () => {
  return (
    <div className="flex items-center justify-between gap-1.5 pt-1">
      {/* Apple Pay */}
      <div
        className="flex h-7 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 shadow-2xs transition-colors hover:border-slate-300"
        title="Apple Pay"
      >
        <div className="flex items-center gap-0.5 text-slate-900">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.92-3.39-8.02-8.58-12.3-15.58-7.73-12.73-13.43-27.17-17.1-43.3-3.67-16.14-5.5-31.54-5.5-46.2 0-18.06 4.35-33.19 13.06-45.39 8.7-12.2 19.86-18.42 33.48-18.66 6.82 0 13.67 1.7 20.55 5.1 6.88 3.4 11.16 5.17 12.83 5.3 1.96-.13 6.42-1.96 13.39-5.48 6.96-3.53 13.75-5.17 20.37-4.92 10.68.64 19.98 4.29 27.9 10.95 7.92 6.66 13.48 15.22 16.68 25.68-9.48 5.73-14.28 13.62-14.4 23.68-.12 9.4 3.73 17.51 11.55 24.33 7.82 6.82 17.38 10.87 28.69 12.15-2.22 6.53-4.94 13.46-8.16 20.78zM119.22 33.09c0-7.73 2.76-15.04 8.28-21.94 5.52-6.9 12.57-11.45 21.15-13.65.24 1.1.36 2.08.36 2.94 0 7.73-2.82 15.04-8.46 21.94-5.64 6.9-12.87 11.39-21.69 13.47-.24-.98-.36-1.89-.36-2.76z" />
          </svg>
          <span className="text-[10px] font-semibold tracking-tight">Pay</span>
        </div>
      </div>

      {/* tabby */}
      <div
        className="flex h-7 items-center justify-center rounded-md border border-[#3EFEBA]/40 bg-[#E8FCF5] px-2.5 shadow-2xs transition-colors hover:border-[#3EFEBA]"
        title="tabby - Split in 4"
      >
        <span className="text-[11px] font-black tracking-tight text-[#059669]">
          tabby
        </span>
      </div>

      {/* tamara */}
      <div
        className="flex h-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-2.5 shadow-2xs transition-colors hover:border-amber-300"
        title="tamara - Pay in installments"
      >
        <span className="text-[11px] font-bold tracking-tight text-amber-700">
          tamara
        </span>
      </div>

      {/* VISA */}
      <div
        className="flex h-7 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 shadow-2xs transition-colors hover:border-slate-300"
        title="Visa"
      >
        <span className="text-[11px] font-black italic tracking-wider text-[#1A1F71]">
          VISA
        </span>
      </div>

      {/* Mastercard */}
      <div
        className="flex h-7 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 shadow-2xs transition-colors hover:border-slate-300"
        title="Mastercard"
      >
        <div className="flex items-center -space-x-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-[#EB001B] opacity-90" />
          <div className="h-3.5 w-3.5 rounded-full bg-[#F79E1B] opacity-90" />
        </div>
      </div>
    </div>
  );
};
