import React from 'react';
import { MapPin, Users, Banknote, Gauge } from 'lucide-react';

export function ExmodDot() {
  const rows = [
    { label: 'Good — 0.87', value: '0.87', color: '#00D68F' },
    { label: 'Medium — 1.12', value: '1.12', color: '#FFB547' },
    { label: 'High — 1.45', value: '1.45', color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-[1040px] flex flex-col gap-10">
        
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-3">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500 ml-4">
              {row.label}
            </span>
            <div className="rounded-2xl border border-white/10 bg-[#0b0b0f] p-6 relative overflow-hidden shadow-2xl">
              
              {/* Subtle Map/Dot Pattern */}
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

              <div className="relative z-10 flex items-center justify-between min-h-[80px]">
                
                {/* Left Side (Placeholder Context) */}
                <div className="flex flex-col gap-2 opacity-40">
                  <div className="w-48 h-6 bg-zinc-800 rounded-md" />
                  <div className="w-32 h-4 bg-zinc-800 rounded-md" />
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

                  {/* Exmod - The Variant */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                      <Gauge className="w-[13px] h-[13px]" />
                      <span className="text-[10px] uppercase tracking-widest font-semibold">Exmod</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[26px] font-semibold text-white/90 leading-none tracking-tight">
                        {row.value}
                      </span>
                      <div className="flex h-full items-center pb-[2px]">
                        <div 
                          className="w-[7px] h-[7px] rounded-full"
                          style={{
                            backgroundColor: row.color,
                            boxShadow: `0 0 12px 2px ${row.color}33`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
