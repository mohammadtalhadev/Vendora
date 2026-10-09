import React from 'react';
import { Download } from 'lucide-react';

export interface TechSpecItem {
  label: string;
  value: string;
}

export interface TechSpecsGridProps {
  specs?: TechSpecItem[];
  onDownloadSpecSheet?: () => void;
}

const DEFAULT_SPECS: TechSpecItem[] = [
  {
    label: 'Display',
    value: '6.9" Super Retina XDR OLED (2868 x 1320)',
  },
  {
    label: 'Refresh Rate',
    value: 'ProMotion 120Hz Adaptive',
  },
  {
    label: 'Processor',
    value: 'Apple A18 Pro Bionic (3nm)',
  },
  {
    label: 'Main Camera',
    value: '48MP Fusion Camera (24mm, f/1.78)',
  },
  {
    label: 'Ultra Wide & Telephoto',
    value: '48MP Ultra Wide + 12MP 5x Telephoto',
  },
  {
    label: 'Material & Body',
    value: 'Grade 5 Titanium Frame, Ceramic Shield',
  },
];

export const TechSpecsGrid: React.FC<TechSpecsGridProps> = ({
  specs = DEFAULT_SPECS,
  onDownloadSpecSheet,
}) => {
  const handleDownload = () => {
    if (onDownloadSpecSheet) {
      onDownloadSpecSheet();
    } else {
      // Mock download action
      const blob = new Blob(
        [
          JSON.stringify(
            {
              title: 'Vendora Technical Specifications Sheet',
              timestamp: new Date().toISOString(),
              specs,
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'specs-sheet.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <section className="mt-14 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            IN-DEPTH DATA
          </span>
          <h3 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Technical Specifications
          </h3>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>Download PDF Spec Sheet</span>
        </button>
      </div>

      {/* 6-box Spec Grid */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {specs.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs transition-all hover:border-slate-300"
          >
            <span className="text-xs font-medium text-slate-500">{item.label}</span>
            <span className="text-right text-xs font-bold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
