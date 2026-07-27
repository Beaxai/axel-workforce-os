import React from 'react';
import { MapPin, Users, Banknote, Gauge } from 'lucide-react';

interface RowProps {
  caption: string;
  exmodValue: string;
  exmodWord: string;
  dotColor: string;
}

function KpiRow({ caption, exmodValue, exmodWord, dotColor }: RowProps) {
  return (
    <div className="flex flex-col gap-3 w-full max-w-[700px]">
      <div className="text-zinc-500 text-[11px] font-medium pl-2 tracking-wide">{caption}</div>
      <div className="bg-[#0b0b0f] border border-white/10 rounded-2xl px-10 py-10 relative overflow-hidden shadow-2xl">
        {/* Subtle Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to right, black 30%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to right, black 30%, transparent 80%)'
          }}
        />
        
        {/* Legibility Gradient (matched from FifthKpi) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f] via-[#0b0b0f]/80 to-transparent z-0 pointer-events-none" />

        <div className="relative z-10 flex items-end justify-center">
          <div className="flex items-end gap-16">
            {/* Location */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <MapPin className="w-[13px] h-[13px]" />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Locations</span>
              </div>
              <div className="text-[26px] font-semibold text-white/90 leading-none">1</div>
            </div>

            {/* Employees */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <Users className="w-[13px] h-[13px]" />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Employees</span>
              </div>
              <div className="text-[26px] font-semibold text-white/90 leading-none">24</div>
            </div>

            {/* Payroll */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-[#E91E8C]/70 mb-1">
                <Banknote className="w-[13px] h-[13px]" />
                <span className="text-[10px] uppercase tracking-widest font-semibold text-[#E91E8C]/80">Payroll</span>
              </div>
              <div className="text-[26px] font-semibold text-[#E91E8C] leading-none">$1.9M</div>
            </div>

            {/* Exmod */}
            <div className="flex flex-col items-end relative">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <Gauge className="w-[13px] h-[13px]" />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Exmod</span>
              </div>
              <div className="text-[26px] font-semibold text-white/90 leading-none relative">
                {exmodValue}
                {/* Quiet Word Variant */}
                <div className="absolute -bottom-[22px] right-0 flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}60` }} />
                  <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 leading-none">{exmodWord}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExmodWord() {
  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center py-16 gap-16 font-sans">
      <KpiRow 
        caption="Good — 0.87" 
        exmodValue="0.87" 
        exmodWord="GOOD" 
        dotColor="#00D68F" 
      />
      <KpiRow 
        caption="Medium — 1.12" 
        exmodValue="1.12" 
        exmodWord="WATCH" 
        dotColor="#FFB547" 
      />
      <KpiRow 
        caption="High — 1.45" 
        exmodValue="1.45" 
        exmodWord="HIGH" 
        dotColor="#ef4444" 
      />
    </div>
  );
}
