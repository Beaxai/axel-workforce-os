import React from 'react';
import { 
  Star, 
  MapPin, 
  Users, 
  Banknote, 
  Gauge, 
  X
} from 'lucide-react';

export function FifthKpi() {
  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-start justify-center p-8 font-sans">
      <div className="w-full max-w-[1040px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
        {/* Header Background */}
        <div className="absolute inset-0 bg-[#0b0b0f] z-0" />
        
        {/* Subtle Map/Dot Pattern (Approximated with CSS radial gradient + mask) */}
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

        <div className="relative z-10 flex flex-col min-h-[248px] p-6 pb-0">
          <div className="flex justify-between items-start flex-1">
            
            {/* Top Left: Identity */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-inner">
                  <Star className="w-5 h-5 text-zinc-300 fill-zinc-400/20" />
                </div>
                <div>
                  <h2 className="text-white text-[18px] font-semibold tracking-tight leading-none flex items-center gap-3">
                    Green Valley Cultivation
                    <div className="flex -space-x-1.5">
                      <div className="w-6 h-6 rounded-full border border-[#0b0b0f] bg-zinc-700 flex items-center justify-center text-[10px] text-white font-medium">AB</div>
                      <div className="w-6 h-6 rounded-full border border-[#0b0b0f] bg-zinc-600 flex items-center justify-center text-[10px] text-white font-medium">CD</div>
                      <div className="w-6 h-6 rounded-full border border-[#0b0b0f] bg-zinc-800 flex items-center justify-center text-[10px] text-white font-medium">EF</div>
                    </div>
                  </h2>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-zinc-300">JC</span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-zinc-300">Cannabis</span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-zinc-300">WC</span>
                <span className="px-2.5 py-1 rounded-full bg-[#E91E8C]/15 border border-[#E91E8C]/30 text-[11px] font-semibold text-[#E91E8C] tracking-wide">
                  EFFECTIVE 8/31/2026
                </span>
              </div>
            </div>

            {/* Top Right: KPIs & Actions */}
            <div className="flex flex-col items-end mt-1 relative w-[400px]">
              <div className="absolute -top-3 -right-2 p-1.5 rounded-full hover:bg-white/10 cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </div>

              {/* KPI Cluster (4 Core Items) */}
              <div className="flex items-end gap-8 mr-6">
                
                {/* Location */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <MapPin className="w-[13px] h-[13px]" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">Locations</span>
                  </div>
                  <div className="text-[26px] font-semibold text-white leading-none">1</div>
                </div>

                {/* Employees */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <Users className="w-[13px] h-[13px]" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">Employees</span>
                  </div>
                  <div className="text-[26px] font-semibold text-white leading-none">24</div>
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
                  <div className="flex items-center gap-1.5 text-amber-500/70 mb-1">
                    <Gauge className="w-[13px] h-[13px]" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-500/80">Exmod</span>
                  </div>
                  <div className="text-[26px] font-semibold text-amber-400/90 leading-none">1.12</div>
                </div>
              </div>

              {/* GHOST LINE: Subtle Premium */}
              <div className="flex justify-end mt-2.5 mr-6">
                <div className="flex items-center gap-2 group cursor-pointer hover:bg-white/5 px-2 py-1 -mr-2 rounded transition-colors" title="View Quote Details">
                  <div className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-amber-500/60 transition-colors" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 group-hover:text-zinc-400 transition-colors">Est. Premium</span>
                    <span className="text-[13px] font-medium text-zinc-200 tabular-nums group-hover:text-white transition-colors">$140,792</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom: Milestone Tracker */}
          <div className="mt-auto pb-5 flex justify-center">
            <div className="flex items-center gap-0 w-full max-w-[800px]">
              {[
                { label: 'Submitted', status: 'completed' },
                { label: 'Under Review', status: 'completed' },
                { label: 'Indication', status: 'current' },
                { label: 'Proposal', status: 'upcoming' },
                { label: 'Bind', status: 'upcoming' },
                { label: 'Active', status: 'upcoming' },
              ].map((phase, i, arr) => (
                <div key={phase.label} className="flex-1 flex items-center">
                  {/* Node */}
                  <div className="relative flex flex-col items-center gap-2 group">
                    <div className={`w-2.5 h-2.5 rounded-full z-10 transition-all ${
                      phase.status === 'completed' ? 'bg-zinc-500' :
                      phase.status === 'current' ? 'bg-[#0b0b0f] border-2 border-[#E91E8C] shadow-[0_0_8px_rgba(233,30,140,0.6)] w-3 h-3' :
                      'bg-zinc-800'
                    }`} />
                    <span className={`absolute top-5 text-[10px] font-medium tracking-wide whitespace-nowrap ${
                      phase.status === 'completed' ? 'text-zinc-500' :
                      phase.status === 'current' ? 'text-[#E91E8C]' :
                      'text-zinc-700'
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                  
                  {/* Line */}
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-[1px] -ml-2 -mr-2 z-0 ${
                      phase.status === 'completed' ? 'bg-zinc-600' : 'bg-zinc-800'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Mock Body Area to show modal shape */}
        <div className="h-[400px] bg-[#121216] border-t border-white/5 p-6 rounded-b-2xl">
          <div className="w-full h-full border border-white/5 rounded-xl border-dashed flex items-center justify-center text-zinc-600 text-sm">
            Deal Content Area
          </div>
        </div>
      </div>
    </div>
  );
}
