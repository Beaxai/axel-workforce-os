import React from 'react';
import { MessageSquare, ArrowRight, CheckCircle2, Circle, FileText, Check } from 'lucide-react';

export function CleanCards() {
  return (
    <div className="min-h-screen bg-[#0d0d10] p-8 text-zinc-300 font-sans antialiased">
      <div className="max-w-[760px] mx-auto">
        
        <div className="mb-10 px-2 flex items-center justify-between">
          <h1 className="text-xl font-medium text-zinc-100">Activity Feed</h1>
        </div>

        {/* TODAY */}
        <div className="mb-10">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-4 px-2">Today</h3>
          <div className="flex flex-col gap-2">
            
            {/* Stage Change */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <CheckCircle2 size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  <span className="font-medium text-zinc-200">Sarah Mitchell</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 mx-2">Admin</span>
                  approved the deal
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-500">1:24 PM</span>
              </div>
            </div>

            {/* Comment with @mention */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <MessageSquare size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  <span className="font-medium text-zinc-200">Marcus Webb</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 mx-2">Agent</span>
                  commented
                </div>
                <div className="mt-1 text-zinc-300">
                  <span className="text-[#E91E8C] font-medium">@Sarah Mitchell</span> all set on my end. The insured is ready to review.
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-500">12:15 PM</span>
              </div>
            </div>

            {/* Completed Task */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <Check size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  <span className="font-medium text-zinc-200">Sarah Mitchell</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 mx-2">Admin</span>
                  completed task <span className="text-zinc-300">Verify agent license</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-500">10:30 AM</span>
              </div>
            </div>

          </div>
        </div>

        {/* YESTERDAY */}
        <div className="mb-10">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-4 px-2">Yesterday</h3>
          <div className="flex flex-col gap-2">
            
            {/* Open Task */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <Circle size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  <span className="font-medium text-zinc-200">Marcus Webb</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 mx-2">Agent</span>
                  was assigned task <span className="text-zinc-300">Collect loss runs</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E91E8C]" />
                  <span className="text-xs text-[#E91E8C]">Due today</span>
                </div>
                <span className="text-sm text-zinc-500 ml-2">4:45 PM</span>
              </div>
            </div>

            {/* Document Upload */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <FileText size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  <span className="font-medium text-zinc-200">Sarah Mitchell</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 mx-2">Admin</span>
                  uploaded <span className="text-zinc-300">loss-runs-2025.pdf</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-500">2:10 PM</span>
              </div>
            </div>

            {/* Stage Change */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <ArrowRight size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  System moved deal from <span className="text-zinc-300">Submission Review</span> to <span className="text-zinc-200 font-medium">Indication</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-500">1:15 PM</span>
              </div>
            </div>

            {/* Comment 2 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <MessageSquare size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  <span className="font-medium text-zinc-200">Sarah Mitchell</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 mx-2">Admin</span>
                  commented
                </div>
                <div className="mt-1 text-zinc-300">
                  Reviewing the newly uploaded documents now. Loss runs look clean.
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-500">11:00 AM</span>
              </div>
            </div>

            {/* Comment 3 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5 text-zinc-500">
                <MessageSquare size={16} />
              </div>
              <div className="flex-1 text-sm leading-relaxed">
                <div className="text-zinc-400">
                  <span className="font-medium text-zinc-200">Marcus Webb</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 mx-2">Agent</span>
                  commented
                </div>
                <div className="mt-1 text-zinc-300">
                  Client reached out, they are gathering the loss runs. Should have them shortly.
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-500">9:45 AM</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default CleanCards;
