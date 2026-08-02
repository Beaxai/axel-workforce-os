import React from 'react';
import { MessageSquare, ArrowRight, Check, Circle, FileText, ShieldCheck } from 'lucide-react';

export function SimpleLines() {
  return (
    <div className="min-h-screen bg-[#0d0d10] p-8 flex justify-center text-zinc-300 antialiased selection:bg-[#E91E8C]/30">
      <div className="w-full max-w-[760px] pt-12">
        
        {/* Main Feed Container */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/50">
          
          <div className="mb-10 flex items-center justify-between">
            <h1 className="text-lg font-medium text-zinc-100 tracking-tight">Activity</h1>
          </div>

          {/* Today Group */}
          <div className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-white/[0.08] pb-3 mb-6">
              Today
            </h2>
            
            <div className="space-y-6">
              
              {/* Comment 1 */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <MessageSquare size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 text-sm">
                  <div className="text-zinc-100 font-medium mb-1">
                    Sarah Mitchell <span className="text-zinc-500 font-normal ml-1.5 text-xs">ADMIN</span>
                  </div>
                  <div className="text-zinc-400 leading-relaxed">
                    I've reviewed the documents. <span className="text-[#E91E8C]">@Marcus Webb</span> you're clear to release the quotes.
                  </div>
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  10:42 AM
                </div>
              </div>

              {/* Comment 2 */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <MessageSquare size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 text-sm">
                  <div className="text-zinc-100 font-medium mb-1">
                    Marcus Webb <span className="text-zinc-500 font-normal ml-1.5 text-xs">AGENT</span>
                  </div>
                  <div className="text-zinc-400 leading-relaxed">
                    Understood. I will send them over to the client shortly.
                  </div>
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  10:25 AM
                </div>
              </div>

              {/* Stage Change 1 */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <ArrowRight size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 text-sm text-zinc-400">
                  Moved from Submission Review to <span className="text-zinc-100 font-medium">Indication</span>
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  10:15 AM
                </div>
              </div>

              {/* Task completed */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <Check size={16} strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-sm text-zinc-400">
                  Completed task <span className="text-zinc-100 font-medium">Review loss runs</span>
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  09:30 AM
                </div>
              </div>

              {/* Document upload */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <FileText size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 text-sm text-zinc-400">
                  Attached document <span className="text-zinc-100 font-medium">loss-runs-2025.pdf</span>
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  09:25 AM
                </div>
              </div>

            </div>
          </div>

          {/* Yesterday Group */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-white/[0.08] pb-3 mb-6">
              Yesterday
            </h2>
            
            <div className="space-y-6">
              
              {/* Comment 3 */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <MessageSquare size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 text-sm">
                  <div className="text-zinc-100 font-medium mb-1">
                    Marcus Webb <span className="text-zinc-500 font-normal ml-1.5 text-xs">AGENT</span>
                  </div>
                  <div className="text-zinc-400 leading-relaxed">
                    Working on gathering the necessary documents now. Should have them by end of day.
                  </div>
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  04:12 PM
                </div>
              </div>

              {/* Task open */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <Circle size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 text-sm text-zinc-400">
                  Task added <span className="text-zinc-100 font-medium">Collect loss runs</span> — Assigned to Marcus Webb
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  02:30 PM
                </div>
              </div>

              {/* Stage Change 2 / Deal Approved */}
              <div className="flex gap-4 items-start">
                <div className="mt-0.5 text-zinc-500">
                  <ShieldCheck size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 text-sm text-zinc-400">
                  <span className="text-zinc-100 font-medium">Deal approved</span> by Underwriting
                </div>
                <div className="text-xs text-zinc-500 whitespace-nowrap ml-4 mt-0.5">
                  11:45 AM
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SimpleLines;
