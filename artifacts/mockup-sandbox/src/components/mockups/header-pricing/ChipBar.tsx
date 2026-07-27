import React from 'react';
import {
  Star, MapPin, Users, Banknote, Gauge, X,
  AlertCircle, Pencil
} from 'lucide-react';

export function ChipBar() {
  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center p-8 font-sans antialiased text-slate-200">
      <div className="w-[1000px] min-h-[248px] bg-[#0b0b0f] rounded-2xl relative flex flex-col justify-between overflow-hidden shadow-2xl border border-white/5">

        {/* Background Artwork */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            backgroundPosition: 'center',
          }}
        />
        {/* Left-to-right legibility gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #0b0b0f 20%, rgba(11,11,15,0.7) 60%, rgba(11,11,15,0.1) 100%)'
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full flex-grow p-6">
          {/* Top Row: Identity & KPIs */}
          <div className="flex justify-between items-start w-full">

            {/* Left: Identity */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-white/30 fill-white/10" />
                <h1 className="text-[18px] font-semibold text-white tracking-tight">Green Valley Cultivation</h1>
                {/* Team Avatars */}
                <div className="flex items-center ml-2">
                  <div className="w-7 h-7 rounded-full bg-[#1c1c24] border-2 border-[#0b0b0f] flex items-center justify-center text-[10px] font-bold text-white/70 z-30">JD</div>
                  <div className="w-7 h-7 rounded-full bg-[#2a2a35] border-2 border-[#0b0b0f] flex items-center justify-center text-[10px] font-bold text-white/70 -ml-2 z-20">AL</div>
                  <div className="w-7 h-7 rounded-full bg-[#1c1c24] border-2 border-[#0b0b0f] flex items-center justify-center text-[10px] font-bold text-white/70 -ml-2 z-10">MK</div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2">
                <div className="bg-white/10 text-white/80 border border-white/5 rounded-full px-3 py-0.5 text-[10px] uppercase tracking-widest font-semibold">JC</div>
                <div className="bg-white/10 text-white/80 border border-white/5 rounded-full px-3 py-0.5 text-[10px] uppercase tracking-widest font-semibold">Cannabis</div>
                <div className="bg-white/10 text-white/80 border border-white/5 rounded-full px-3 py-0.5 text-[10px] uppercase tracking-widest font-semibold">WC</div>
                <div className="bg-[#E91E8C]/20 text-[#E91E8C] border border-[#E91E8C]/10 rounded-full px-3 py-0.5 text-[10px] uppercase tracking-widest font-semibold">Effective 8/31/2026</div>
              </div>
            </div>

            {/* Right: KPIs and Pricing Chips */}
            <div className="flex flex-col items-end gap-5 relative">
              {/* Close Button - absolute to the container via negative margins to push it out of the flow */}
              <button className="absolute -top-2 -right-2 text-white/40 hover:text-white transition-colors p-2">
                <X className="w-5 h-5" />
              </button>

              {/* KPI Cluster */}
              <div className="flex items-center gap-8 mr-8 mt-1">
                <Kpi label="LOCATIONS" value="1" icon={<MapPin className="w-3.5 h-3.5" />} color="pink" />
                <Kpi label="EMPLOYEES" value="24" icon={<Users className="w-3.5 h-3.5" />} color="pink" />
                <Kpi label="PAYROLL" value="$1.9M" icon={<Banknote className="w-3.5 h-3.5" />} color="pink" />
                <Kpi label="EXMOD" value="1.12" icon={<Gauge className="w-3.5 h-3.5" />} color="amber" />
              </div>

              {/* Hypothesis 3: Pricing Chip Bar */}
              <div className="flex items-center gap-2 mr-8">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/20 text-xs font-medium cursor-help" title="Required documents missing for binding.">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Docs to bind
                </div>
                <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 text-xs font-medium transition-colors">
                  WFS: Get Quote
                </button>
                <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E91E8C]/15 text-[#E91E8C] border border-[#E91E8C]/30 hover:bg-[#E91E8C]/25 transition-colors group">
                  <span className="font-semibold tabular-nums tracking-tight">$140,792</span>
                  <span className="text-xs opacity-80 font-medium">est. premium</span>
                  <Pencil className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ml-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-grow" />

          {/* Bottom Row: Milestone Tracker + Actions */}
          <div className="flex items-end justify-between w-full mt-10">
            {/* Timeline */}
            <div className="flex items-center w-full max-w-xl pr-12 relative mb-2">
              <PhaseNode label="Submitted" state="completed" />
              <PhaseLine state="completed" />
              <PhaseNode label="Under Review" state="completed" />
              <PhaseLine state="completed" />
              <PhaseNode label="Indication" state="current" />
              <PhaseLine state="future" />
              <PhaseNode label="Proposal" state="future" />
              <PhaseLine state="future" />
              <PhaseNode label="Bind" state="future" />
              <PhaseLine state="future" />
              <PhaseNode label="Active" state="future" />
            </div>

            {/* Actions (Underwriter View) docked at the far right of the timeline row */}
            <div className="flex items-center gap-3">
              <button className="px-5 py-2 rounded-lg text-white/70 hover:text-white bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-white/10 text-sm font-medium transition-colors shadow-sm">
                Decline
              </button>
              <button className="px-6 py-2 rounded-lg text-white bg-gradient-to-r from-[#E91E8C] to-[#9b2cba] hover:from-[#f52b9a] hover:to-[#a834c9] text-sm font-medium shadow-[0_0_15px_rgba(233,30,140,0.3)] hover:shadow-[0_0_20px_rgba(233,30,140,0.5)] border border-white/10 transition-all">
                Approve
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: 'pink' | 'amber' }) {
  const isAmber = color === 'amber';
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 text-white/50 text-[10px] uppercase tracking-widest font-bold">
        {icon}
        {label}
      </div>
      <div className={`text-[26px] font-semibold tabular-nums leading-none tracking-tight ${isAmber ? 'text-[#fff01f]' : 'text-[#E91E8C]'}`}>
        {value}
      </div>
    </div>
  );
}

function PhaseNode({ label, state }: { label: string, state: 'completed' | 'current' | 'future' }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Node */}
      <div className="flex items-center justify-center w-6 h-6">
        {state === 'completed' && <div className="w-2.5 h-2.5 rounded-full bg-white/20" />}
        {state === 'current' && (
          <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-[#E91E8C] bg-[#0b0b0f] shadow-[0_0_12px_rgba(233,30,140,0.7)] z-10" />
        )}
        {state === 'future' && <div className="w-2 h-2 rounded-full bg-white/10" />}
      </div>
      {/* Label */}
      <div
        className={`absolute top-7 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap ${
          state === 'completed' ? 'text-white/40' :
          state === 'current' ? 'text-[#E91E8C]' : 'text-white/20'
        }`}
      >
        {label}
      </div>
    </div>
  );
}

function PhaseLine({ state }: { state: 'completed' | 'future' }) {
  return (
    <div
      className={`h-[2px] flex-1 mx-1 rounded-full ${
        state === 'completed' ? 'bg-white/10' : 'bg-white/5'
      }`}
    />
  );
}