import React from 'react';
import { Cpu, Zap, BatteryCharging, Sparkles } from 'lucide-react';

export interface BentoSiliconBannerProps {
  architecture?: string;
  headline?: string;
  description?: string;
}

export const BentoSiliconBanner: React.FC<BentoSiliconBannerProps> = ({
  architecture = 'Next-Gen 3nm Architecture',
  headline = 'A18 Pro Silicon. Groundbreaking Speed.',
  description = 'Engineered with an unprecedented 6-core GPU, enhanced Neural Engine for advanced Apple Intelligence, and industry-leading power efficiency that pushes battery endurance beyond all previous standards.',
}) => {
  return (
    <div className="relative mt-12 overflow-hidden rounded-3xl border border-slate-800 bg-[#0B0F19] p-7 text-white shadow-2xl lg:p-12">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
        {/* Left Column: Details & Stats */}
        <div className="space-y-6 lg:col-span-7">
          {/* Architecture pill badge */}
          <div className="font-outfit inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>{architecture}</span>
          </div>

          {/* Headline */}
          <h2 className="font-outfit text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[42px] leading-tight">
            {headline}
          </h2>

          {/* Description */}
          <p className="font-outfit max-w-2xl text-sm leading-relaxed text-slate-300 lg:text-base">
            {description}
          </p>

          {/* Stat Capsules */}
          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            {/* Stat 1 */}
            <div className="rounded-2xl border border-slate-800 bg-[#131B2E]/90 p-4 shadow-inner">
              <div className="flex items-center justify-between text-blue-400 mb-1">
                <span className="text-2xl font-black text-white lg:text-3xl">20%</span>
                <Zap className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-slate-400">Faster GPU than A17 Pro</p>
            </div>

            {/* Stat 2 */}
            <div className="rounded-2xl border border-slate-800 bg-[#131B2E]/90 p-4 shadow-inner">
              <div className="flex items-center justify-between text-blue-400 mb-1">
                <span className="text-2xl font-black text-white lg:text-3xl">2x</span>
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-slate-400">Ray Tracing Speed</p>
            </div>

            {/* Stat 3 */}
            <div className="rounded-2xl border border-slate-800 bg-[#131B2E]/90 p-4 shadow-inner">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-2xl font-black text-white lg:text-3xl">33 hrs</span>
                <BatteryCharging className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-slate-400">Video Playback</p>
            </div>
          </div>
        </div>

        {/* Right Column: Bento Architecture Blocks */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-800/80 bg-[#101726]/80 p-5 shadow-inner backdrop-blur-xs space-y-3.5">
            {/* Top row with 2 blocks */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-500/20 bg-[#162035] p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                  <Cpu className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Architecture</span>
                </div>
                <h4 className="text-base font-bold text-white">6-Core CPU</h4>
                <p className="mt-1 text-xs text-slate-400">2x High-Efficiency</p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-[#162035] p-4">
                <div className="flex items-center gap-2 text-indigo-400 mb-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Neural Engine</span>
                </div>
                <h4 className="text-base font-bold text-white">16-Core Neural</h4>
                <p className="mt-1 text-xs text-slate-400">35 TOPs Intelligence</p>
              </div>
            </div>

            {/* Bottom wide block */}
            <div className="rounded-xl border border-blue-500/30 bg-[#162035] p-4.5">
              <div className="flex items-center justify-between text-blue-400 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Graphics Engine</span>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  Pro-Class
                </span>
              </div>
              <h4 className="text-base font-bold text-white">6-Core Pro-Class GPU with Mesh Shading</h4>
              <p className="mt-1 text-xs text-slate-400 leading-normal">
                Console-grade AAA gaming hardware with hardware-accelerated ray tracing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
