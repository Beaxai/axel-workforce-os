import React from "react";
import { 
  Star, 
  MapPin, 
  Users, 
  Banknote, 
  Gauge, 
  X, 
  Check 
} from "lucide-react";

export function PricingStrip() {
  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center p-8 font-sans">
      
      {/* Mockup Container */}
      <div className="w-full max-w-[1040px] bg-[#0b0b0f] rounded-2xl border border-white/[0.08] shadow-2xl relative overflow-hidden flex flex-col min-h-[256px]">
        
        {/* Background Patterns */}
        <div 
          className="absolute inset-0 z-0 opacity-15 pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', 
            backgroundSize: '24px 24px' 
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0b0b0f] via-transparent to-[#0b0b0f] pointer-events-none" />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-[#0b0b0f]/80 pointer-events-none" />

        {/* Top Header Row */}
        <div className="relative z-10 flex justify-between items-start pt-6 px-8 flex-1">
          
          {/* Top Left: Identity */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg shadow-inner">
                <Star className="w-6 h-6 text-amber-400 fill-amber-400/20" />
              </div>
              <h1 className="text-white text-[20px] font-semibold tracking-tight">
                Green Valley Cultivation
              </h1>
              <div className="flex -space-x-2.5 ml-2">
                <div className="w-7 h-7 rounded-full bg-slate-700 border-[1.5px] border-[#0b0b0f] flex items-center justify-center text-[9px] font-bold text-white uppercase shadow-sm">JS</div>
                <div className="w-7 h-7 rounded-full bg-emerald-800 border-[1.5px] border-[#0b0b0f] flex items-center justify-center text-[9px] font-bold text-white uppercase shadow-sm">KL</div>
                <div className="w-7 h-7 rounded-full bg-sky-800 border-[1.5px] border-[#0b0b0f] flex items-center justify-center text-[9px] font-bold text-white uppercase shadow-sm">MT</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/70 font-medium">JC</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/70 font-medium">Cannabis</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/70 font-medium">WC</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E91E8C]/15 border border-[#E91E8C]/20 text-[#E91E8C] text-[10px] font-bold tracking-wider ml-1">EFFECTIVE 8/31/2026</span>
            </div>
          </div>

          {/* Top Right: KPIs */}
          <div className="flex flex-col items-end relative mr-8">
            <button className="absolute -top-3 -right-10 p-1.5 text-white/30 hover:text-white rounded-md hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" />
            </button>
            
            {/* KPI Cluster + Quiet 5th Metric */}
            <div className="flex gap-7 items-start mt-1">
              {/* Existing 4 KPIs */}
              <div className="flex flex-col items-end gap-1 group cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-1.5 text-white/40">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Locations</span>
                </div>
                <span className="text-[26px] font-semibold text-white leading-none tabular-nums">1</span>
              </div>
              <div className="flex flex-col items-end gap-1 group cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Employees</span>
                </div>
                <span className="text-[26px] font-semibold text-white leading-none tabular-nums">24</span>
              </div>
              <div className="flex flex-col items-end gap-1 group cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Banknote className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Payroll</span>
                </div>
                <span className="text-[26px] font-semibold text-[#E91E8C] leading-none tabular-nums">$1.9M</span>
              </div>
              <div className="flex flex-col items-end gap-1 group cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-1.5 text-amber-500/70">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Exmod</span>
                </div>
                <span className="text-[26px] font-semibold text-amber-500 leading-none tabular-nums">1.12</span>
              </div>

              {/* Vertical Divider */}
              <div className="w-[1px] h-10 bg-white/[0.08] self-center mx-1"></div>

              {/* Quiet 5th Metric: Premium */}
              <div className="flex flex-col items-end gap-[9px] group cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Banknote className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Premium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/30" title="Docs required to bind" />
                  <span className="text-[16px] font-medium text-white/70 leading-none tabular-nums">$140,792</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Milestone Tracker */}
        <div className="relative z-10 px-10 pb-8 mt-10">
          <div className="flex items-center justify-between relative max-w-[95%] mx-auto">
            <div className="absolute left-[3%] right-[3%] top-[9px] h-[1px] bg-white/[0.08] -z-10"></div>
            
            {[
              { label: "Submitted", state: "completed" },
              { label: "Under Review", state: "completed" },
              { label: "Indication", state: "current" },
              { label: "Proposal", state: "upcoming" },
              { label: "Bind", state: "upcoming" },
              { label: "Active", state: "upcoming" }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-3 relative group">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-[#0b0b0f] border-[1.5px] transition-colors ${
                  step.state === 'completed' ? 'border-white/20 bg-white/[0.03]' :
                  step.state === 'current' ? 'border-[#E91E8C] shadow-[0_0_12px_rgba(233,30,140,0.4)] bg-[#E91E8C]/10' :
                  'border-white/10'
                }`}>
                  {step.state === 'completed' && <Check className="w-3 h-3 text-white/50" />}
                  {step.state === 'current' && <div className="w-1.5 h-1.5 rounded-full bg-[#E91E8C] shadow-[0_0_5px_#E91E8C]"></div>}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  step.state === 'current' ? 'text-[#E91E8C]' :
                  step.state === 'completed' ? 'text-white/50' :
                  'text-white/20'
                }`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
