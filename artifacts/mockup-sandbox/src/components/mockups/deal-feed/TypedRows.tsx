import React from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Check, 
  Clock, 
  UploadCloud, 
  AlertTriangle, 
  CheckSquare, 
  Activity
} from 'lucide-react';

export function TypedRows() {
  return (
    <div className="min-h-screen bg-[#0d0d10] p-8 font-sans text-zinc-300 selection:bg-[#E91E8C]/30 flex flex-col">
      <div className="max-w-[860px] w-full mx-auto">
        
        {/* Header */}
        <div className="mb-10 flex items-end justify-between border-b border-[rgba(255,255,255,0.08)] pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Activity Feed</h1>
            <p className="text-sm text-zinc-500 mt-1.5 flex items-center gap-2">
              <span>Acme Corp Workers' Comp</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span className="font-mono text-xs">WC-8921</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm font-medium text-white transition-all hover:border-[rgba(255,255,255,0.12)]">
              Filter Activity
            </button>
            <button className="px-4 py-2 bg-[#E91E8C] hover:bg-[#E91E8C]/90 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(233,30,140,0.25)] hover:shadow-[0_0_20px_rgba(233,30,140,0.4)]">
              New Update
            </button>
          </div>
        </div>

        <div className="space-y-10 pl-2">
          {/* TODAY GROUP */}
          <div className="relative">
            {/* Timeline track (subtle) */}
            <div className="absolute left-[19px] top-8 bottom-0 w-px bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-transparent pointer-events-none hidden md:block"></div>

            <div className="flex items-center gap-4 mb-8">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 bg-[#0d0d10] relative z-10 py-1">Today</div>
              <div className="flex-1 h-px bg-gradient-to-r from-[rgba(255,255,255,0.08)] to-transparent"></div>
            </div>

            <div className="space-y-7 relative z-10">
              
              {/* Event: Human Comment */}
              <div className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm font-bold text-white shrink-0 border border-[rgba(255,255,255,0.12)] shadow-xl relative z-10">
                  SM
                </div>
                <div className="flex-1 max-w-[95%]">
                  <div className="flex items-center gap-2 mb-2 text-sm">
                     <span className="font-semibold text-zinc-100">Sarah Mitchell</span>
                     <span className="text-[9px] font-bold uppercase tracking-widest bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded text-zinc-400">Admin</span>
                     <span className="text-zinc-500 text-xs ml-auto font-medium">10:42 AM</span>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl rounded-tl-sm p-4.5 text-[15px] text-zinc-300 leading-relaxed shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    We just received the signed applications. <span className="text-[#E91E8C] bg-[#E91E8C]/10 px-1.5 py-0.5 rounded-md font-medium inline-block mx-0.5 border border-[#E91E8C]/20">@Marcus Webb</span> can you verify the FEIN matches the state registry before we proceed to indication?
                  </div>
                </div>
              </div>

              {/* Event: Machine Status Change */}
              <div className="flex items-center gap-4 group hover:bg-[rgba(255,255,255,0.02)] p-1.5 -mx-1.5 rounded-xl transition-colors">
                <div className="w-10 flex justify-center shrink-0 relative z-10">
                  <div className="w-[28px] h-[28px] rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                    <Activity size={14} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-between text-[14px]">
                  <div className="text-zinc-400 flex items-center gap-2.5">
                    <span>Stage changed:</span> 
                    <span className="font-medium text-zinc-300 bg-[rgba(255,255,255,0.04)] px-2.5 py-1 rounded-md border border-[rgba(255,255,255,0.06)] text-xs">Submission Review</span> 
                    <ArrowRight size={12} className="text-zinc-600" /> 
                    <span className="font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 text-xs">Indication</span>
                  </div>
                  <div className="text-zinc-600 text-xs font-medium">10:05 AM</div>
                </div>
              </div>

              {/* Event: Task Created */}
              <div className="flex gap-4 group">
                 <div className="w-10 flex justify-center shrink-0 pt-2 relative z-10">
                   <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[rgba(255,255,255,0.15)] flex items-center justify-center bg-[#0d0d10] cursor-pointer hover:border-[#E91E8C] transition-colors shadow-sm group-hover:bg-[rgba(255,255,255,0.02)]"></div>
                 </div>
                 <div className="flex-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.035)] transition-colors hover:border-[rgba(255,255,255,0.1)]">
                   <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          <CheckSquare size={12} /> Task Assigned
                        </div>
                        <span className="text-[15px] font-medium text-zinc-100">Verify FEIN and State Registry</span>
                      </div>
                      <span className="text-zinc-600 text-xs font-medium mt-0.5">10:06 AM</span>
                   </div>
                   <div className="flex items-center gap-2.5">
                     <div className="flex items-center gap-2 bg-[#0d0d10] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-xs text-zinc-400 shadow-inner">
                       <div className="w-4 h-4 rounded-full bg-[#E91E8C]/20 text-[#E91E8C] flex items-center justify-center text-[8px] font-bold ring-1 ring-[#E91E8C]/30">MW</div>
                       Marcus Webb
                     </div>
                     <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400/90 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                       <Clock size={13} strokeWidth={2.5} /> Due Today
                     </div>
                   </div>
                 </div>
              </div>

              {/* Event: Machine Document Upload */}
              <div className="flex items-center gap-4 group hover:bg-[rgba(255,255,255,0.02)] p-1.5 -mx-1.5 rounded-xl transition-colors">
                <div className="w-10 flex justify-center shrink-0 relative z-10">
                  <div className="w-[28px] h-[28px] rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.15)]">
                    <UploadCloud size={14} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-between text-[14px]">
                  <div className="text-zinc-400 flex items-center gap-2.5">
                    <span>Document uploaded:</span>
                    <div className="flex items-center gap-2 font-medium text-zinc-300 bg-[rgba(255,255,255,0.04)] px-2.5 py-1 rounded-md border border-[rgba(255,255,255,0.06)] text-xs transition-colors hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">
                      <FileText size={12} className="text-[#7C3AED]" />
                      loss-runs-2025.pdf
                    </div>
                  </div>
                  <div className="text-zinc-600 text-xs font-medium">09:12 AM</div>
                </div>
              </div>

            </div>
          </div>

          {/* YESTERDAY GROUP */}
          <div className="relative pt-4">
            {/* Timeline track (subtle) */}
            <div className="absolute left-[19px] top-8 bottom-0 w-px bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-transparent pointer-events-none hidden md:block"></div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 bg-[#0d0d10] relative z-10 py-1">Yesterday</div>
              <div className="flex-1 h-px bg-gradient-to-r from-[rgba(255,255,255,0.08)] to-transparent"></div>
            </div>

            <div className="space-y-7 relative z-10">
              
              {/* Event: Machine Approval */}
              <div className="flex items-center gap-4 group hover:bg-[rgba(255,255,255,0.02)] p-1.5 -mx-1.5 rounded-xl transition-colors">
                <div className="w-10 flex justify-center shrink-0 relative z-10">
                  <div className="w-[28px] h-[28px] rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-between text-[14px]">
                  <div className="text-zinc-300">
                    <span className="text-emerald-400 font-medium">Indication parameters approved</span>
                    <span className="text-zinc-600 ml-2 text-[13px]">by System Automation</span>
                  </div>
                  <div className="text-zinc-600 text-xs font-medium">04:30 PM</div>
                </div>
              </div>

              {/* Event: Task Completed */}
              <div className="flex gap-4 opacity-60 hover:opacity-100 transition-opacity duration-300 group">
                 <div className="w-10 flex justify-center shrink-0 pt-2 relative z-10">
                   <div className="text-emerald-500 bg-emerald-500/10 rounded-full p-0.5 border border-emerald-500/20">
                     <CheckCircle2 size={18} strokeWidth={2.5} className="fill-emerald-500/20" />
                   </div>
                 </div>
                 <div className="flex-1 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] rounded-xl p-4">
                   <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                          <CheckSquare size={12} /> Task Completed
                        </div>
                        <span className="text-[15px] font-medium text-zinc-400 line-through decoration-zinc-600">Collect 5-year loss runs</span>
                      </div>
                      <span className="text-zinc-600 text-xs font-medium mt-0.5">02:15 PM</span>
                   </div>
                   <div className="flex items-center gap-2.5">
                     <div className="flex items-center gap-2 bg-[#0d0d10] border border-[rgba(255,255,255,0.04)] rounded-lg px-2 py-1.5 text-xs text-zinc-500">
                       <div className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[8px] font-bold ring-1 ring-zinc-700">SM</div>
                       Sarah Mitchell
                     </div>
                   </div>
                 </div>
              </div>

              {/* Event: Machine RFI / Alert */}
              <div className="flex items-center gap-4 group hover:bg-[rgba(255,255,255,0.02)] p-1.5 -mx-1.5 rounded-xl transition-colors">
                <div className="w-10 flex justify-center shrink-0 relative z-10">
                  <div className="w-[28px] h-[28px] rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                    <AlertTriangle size={14} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-between text-[14px]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-400 font-medium">Missing Information:</span>
                    <span className="text-zinc-300">Exact physical address for Location #2 is a PO Box.</span>
                  </div>
                  <div className="text-zinc-600 text-xs font-medium shrink-0 ml-4">11:45 AM</div>
                </div>
              </div>

              {/* Event: Human Comment */}
              <div className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E91E8C]/30 to-[#7C3AED]/30 flex items-center justify-center text-sm font-bold text-white shrink-0 border border-[rgba(255,255,255,0.12)] shadow-xl relative z-10">
                  MW
                </div>
                <div className="flex-1 max-w-[95%]">
                  <div className="flex items-center gap-2 mb-2 text-sm">
                     <span className="font-semibold text-zinc-100">Marcus Webb</span>
                     <span className="text-[9px] font-bold uppercase tracking-widest bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded text-zinc-400">Agent</span>
                     <span className="text-zinc-500 text-xs ml-auto font-medium">11:30 AM</span>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl rounded-tl-sm p-4.5 text-[15px] text-zinc-300 leading-relaxed shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    I reached out to the insured about Location 2. They will provide the physical address by tomorrow. In the meantime, I've attached the preliminary loss runs in the documents tab.
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          {/* End of feed indicator */}
          <div className="pt-10 pb-12 flex justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.15)] shadow-[0_12px_0_0_rgba(255,255,255,0.08),0_24px_0_0_rgba(255,255,255,0.03)]"></div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default TypedRows;
