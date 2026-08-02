import React from 'react';
import { 
  MapPin, 
  Users, 
  Banknote, 
  Gauge
} from 'lucide-react';

export function ExmodScale() {
  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-full max-w-[1040px] flex flex-col gap-10">
        <KpiRow title="Good — 0.87" exmodValue="0.87" exmodHealth="good" markerPos="25%" />
        <KpiRow title="Medium — 1.12" exmodValue="1.12" exmodHealth="medium" markerPos="65%" />
        <KpiRow title="High — 1.45" exmodValue="1.45" exmodHealth="bad" markerPos="95%" />
      </div>
    </div>
  );
}

function KpiRow({ 
  title, 
  exmodValue, 
  exmodHealth, 
  markerPos 
}: { 
  title: string, 
  exmodValue: string, 
  exmodHealth: 'good' | 'medium' | 'bad', 
  markerPos: string 
}) {
  const healthColors = {
    good: '#00D68F',
    medium: '#FFB547',
    bad: '#ef4444'
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-zinc-500 font-medium pl-2">{title}</div>
      <div className="bg-[#0b0b0f] border border-white/10 rounded-2xl p-6 flex justify-end shadow-2xl relative overflow-hidden h-[130px] items-center">
        {/* Subtle Map/Dot Pattern like FifthKpi for the card background */}
        <div 
          className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to right, black 30%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to right, black 30%, transparent 80%)'
          }}
        />
        
        {/* Legibility Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f] via-[#0b0b0f]/80 to-transparent z-0 pointer-events-none" />

        <div className="relative z-10 flex items-start gap-8 mr-6">
          
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
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
              <Gauge className="w-[13px] h-[13px]" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Exmod</span>
            </div>
            <div className="text-[26px] font-semibold text-white/90 leading-none">{exmodValue}</div>
            
            {/* Mini Scale */}
            <div className="relative w-16 h-[3px] rounded-full bg-white/10 mt-2.5">
              {/* Midpoint tick */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-2.5 bg-white/20 rounded-full" />
              
              {/* Marker Dot */}
              <div 
                className="absolute top-1/2 w-2 h-2 rounded-full z-10"
                style={{ 
                  left: markerPos, 
                  backgroundColor: healthColors[exmodHealth],
                  transform: 'translate(-50%, -50%)',
                  boxShadow: `0 0 6px ${healthColors[exmodHealth]}99`
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
