import React from 'react';
import {
  CheckSquare, Check, ChevronRight, ChevronUp, UploadCloud, 
  CheckCircle2, ArrowRightLeft, AlertTriangle, Calendar, 
  ClipboardList
} from 'lucide-react';

export function QuietSystem() {
  return (
    <div className="min-h-screen bg-[#0d0d10] p-8 text-zinc-300 font-sans">
      <div className="max-w-[860px] mx-auto space-y-8">
        
        {/* Day Header */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-white/[0.04] flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Today</span>
          <div className="h-px bg-white/[0.04] flex-1" />
        </div>

        {/* Comment from Admin */}
        <div className="flex gap-4 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#7C3AED] p-[1px] shrink-0 mt-1 shadow-[0_0_15px_rgba(233,30,140,0.15)] relative">
            <div className="w-full h-full bg-[#0d0d10] rounded-full flex items-center justify-center text-xs font-medium text-zinc-100">
              SM
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0d0d10]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-zinc-200 text-sm">Sarah Mitchell</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#E91E8C]/10 text-[#E91E8C] border border-[#E91E8C]/20">Admin</span>
              <span className="text-xs text-zinc-600 ml-2 font-medium">10:42 AM</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl rounded-tl-sm p-4 text-sm text-zinc-300 leading-relaxed shadow-sm">
              <span className="text-[#E91E8C] font-medium bg-[#E91E8C]/10 px-1.5 py-0.5 rounded-md border border-[#E91E8C]/10 mr-1">@Marcus Webb</span> 
              check the loss runs, I'm seeing a discrepancy for the 2023 claims. Could you follow up with the insured?
            </div>
          </div>
        </div>

        {/* Collapsed System Event Group */}
        <div className="flex flex-col items-center justify-center py-2 relative group cursor-pointer">
          <button className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors bg-[#0d0d10] px-4 py-1.5 rounded-full border border-white/[0.05] hover:border-white/[0.1] shadow-sm relative z-10">
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            3 system updates
            <span className="text-zinc-600 font-normal ml-2">10:15 AM</span>
          </button>
          {/* Subtle line going through */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors -z-0" />
        </div>

        {/* Blocking RFI */}
        <div className="flex justify-center py-1 relative">
          <div className="inline-flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-3.5 max-w-2xl w-full shadow-[0_0_20px_rgba(245,158,11,0.03)] backdrop-blur-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-500" />
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[13px] text-amber-500/90 font-medium tracking-wide">RFI: Missing details on 2023 workers comp claims. Required to proceed to Indication.</span>
            <span className="text-[11px] text-amber-500/40 ml-auto whitespace-nowrap font-medium">09:30 AM</span>
          </div>
        </div>

        {/* Comment from Marcus */}
        <div className="flex gap-4 group">
          <div className="w-10 h-10 rounded-full bg-white/[0.08] p-[1px] shrink-0 mt-1 relative">
            <div className="w-full h-full bg-[#16161a] rounded-full flex items-center justify-center text-xs font-medium text-zinc-300">
              MW
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-zinc-200 text-sm">Marcus Webb</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">Agent</span>
              <span className="text-xs text-zinc-600 ml-2 font-medium">09:15 AM</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl rounded-tl-sm p-4 text-sm text-zinc-300 leading-relaxed shadow-sm">
              I've reached out to the client about this. They should get back to us by this afternoon. Let's prep the tasks in the meantime.
            </div>
          </div>
        </div>

        {/* Open Task */}
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/5 border border-amber-500/10 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
            <ClipboardList className="w-4 h-4 text-amber-500/80" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-zinc-200 text-sm">Task Created</span>
              <span className="text-xs text-zinc-600 ml-2 font-medium">09:05 AM</span>
            </div>
            <div className="bg-[#0d0d10] border border-white/[0.08] rounded-xl flex items-center p-3 pl-4 gap-3 overflow-hidden relative shadow-sm hover:border-white/[0.15] transition-colors group cursor-pointer">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/80" />
              <button className="w-4 h-4 rounded-[4px] border border-white/[0.2] flex items-center justify-center group-hover:border-amber-500 transition-colors shrink-0 bg-[#0d0d10]" />
              <div className="flex-1 text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                Collect updated loss runs for 2023
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded-full">
                  <div className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-[9px] font-bold text-zinc-300">MW</div>
                  <span className="text-[11px] text-zinc-400 font-medium">Marcus</span>
                </div>
                <div className="text-[11px] text-amber-500/90 font-medium bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                  <Calendar className="w-3 h-3" />
                  Due Today
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Task */}
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0 mt-1">
            <CheckSquare className="w-4 h-4 text-emerald-500/70" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-zinc-200 text-sm">Task Completed</span>
              <span className="text-xs text-zinc-600 ml-2 font-medium">09:00 AM</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center p-3 pl-4 gap-3 overflow-hidden relative shadow-sm opacity-60 hover:opacity-100 transition-opacity group">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500/40 group-hover:bg-emerald-500/60 transition-colors" />
              <div className="w-4 h-4 rounded-[4px] bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="flex-1 text-sm font-medium text-zinc-400 line-through decoration-zinc-500 group-hover:text-zinc-300 transition-colors">
                Review initial submission data packet
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded-full">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#7C3AED] flex items-center justify-center text-[9px] font-bold text-white">SM</div>
                  <span className="text-[11px] text-zinc-500 font-medium">Sarah</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Day Header */}
        <div className="flex items-center gap-4 pt-6 pb-2">
          <div className="h-px bg-white/[0.04] flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Yesterday</span>
          <div className="h-px bg-white/[0.04] flex-1" />
        </div>

        {/* Expanded System Event Group */}
        <div className="flex flex-col items-center py-4 gap-3 relative">
          {/* Subtle vertical connector just for the group */}
          <div className="absolute top-2 bottom-8 left-1/2 -translate-x-1/2 w-px bg-white/[0.04] -z-10" />
          
          <div className="flex items-center gap-2.5 text-[12px] text-zinc-400 bg-[#0d0d10] px-3 py-0.5">
            <UploadCloud className="w-3.5 h-3.5 text-zinc-500" />
            <span>Loss history uploaded — <span className="text-zinc-300 hover:text-[#E91E8C] cursor-pointer transition-colors font-medium border-b border-transparent hover:border-[#E91E8C]/50">loss-runs-2025.pdf</span></span>
            <span className="text-zinc-600 ml-2 text-[11px]">04:30 PM</span>
          </div>
          
          <div className="flex items-center gap-2.5 text-[12px] text-zinc-400 bg-[#0d0d10] px-3 py-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>Indication params approved</span>
            <span className="text-zinc-600 ml-2 text-[11px]">04:15 PM</span>
          </div>

          <div className="flex items-center gap-2.5 text-[12px] text-zinc-400 bg-[#0d0d10] px-3 py-0.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400/70" />
            <span>Stage: <span className="text-zinc-500 line-through mr-1">Submission Review</span> <span className="text-zinc-200 font-medium">Indication</span></span>
            <span className="text-zinc-600 ml-2 text-[11px]">04:00 PM</span>
          </div>
          
          <button className="mt-3 flex items-center gap-2 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors bg-[#0d0d10] px-4 py-1.5 rounded-full border border-white/[0.05] hover:border-white/[0.1] shadow-sm cursor-pointer z-10">
            <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
            Collapse updates
          </button>
        </div>

        {/* Comment from Marcus */}
        <div className="flex gap-4 group">
          <div className="w-10 h-10 rounded-full bg-white/[0.08] p-[1px] shrink-0 mt-1 relative">
            <div className="w-full h-full bg-[#16161a] rounded-full flex items-center justify-center text-xs font-medium text-zinc-300">
              MW
            </div>
            {/* Offline/Away indicator */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#0d0d10]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-zinc-200 text-sm">Marcus Webb</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">Agent</span>
              <span className="text-xs text-zinc-600 ml-2 font-medium">03:45 PM</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl rounded-tl-sm p-4 text-sm text-zinc-300 leading-relaxed shadow-sm">
              I've started the submission review. Waiting on the client for the latest loss runs, they should upload them shortly.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default QuietSystem;
