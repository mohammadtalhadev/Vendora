import React, { useEffect, useState } from 'react';

export interface CountdownTimerProps {
  initialDays?: number;
  initialHours?: number;
  initialMinutes?: number;
  initialSeconds?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  /** Label above the pills. One label everywhere: "Remaining Time:". */
  label?: string;
}

/**
 * The one countdown. The QA found the home page rendering its
 * timers in four different segment counts under two different labels; the
 * sections had in fact already converged on one local widget inside
 * HomePage — this is that widget, extracted so the format is a shared
 * contract rather than a page-local accident: DD : HH : MM : SS, one label,
 * self-contained ticking (no page re-renders). One deliberate change from
 * the original: its minute-borrow was broken (see the tick reducer).
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  initialDays = 39,
  initialHours = 5,
  initialMinutes = 4,
  initialSeconds = 57,
  days: propDays,
  hours: propHours,
  minutes: propMinutes,
  seconds: propSeconds,
  label = 'Remaining Time:',
}) => {
  const [time, setTime] = useState(() => ({
    days: propDays ?? initialDays,
    hours: propHours ?? initialHours,
    minutes: propMinutes ?? initialMinutes,
    seconds: propSeconds ?? initialSeconds,
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        // Borrow one minute. The HomePage widget this was extracted from set
        // minutes to 59 here regardless of the current minute, so every
        // seconds rollover sent the countdown back UP to :59 — fixed.
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div>
      <p className="font-outfit mb-1.5 text-[11px] font-medium text-[#5A5148]">{label}</p>
      <div className="font-outfit inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold tabular-nums shadow-sm sm:text-sm">
        <span className="text-slate-400">{pad(time.days)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-400">{pad(time.hours)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-400">{pad(time.minutes)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-900">{pad(time.seconds)}</span>
      </div>
    </div>
  );
};
