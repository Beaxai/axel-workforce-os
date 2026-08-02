import React from 'react';

export function TwoLane() {
  return (
    <div className="min-h-screen bg-[#0d0d10] text-zinc-300 p-8 font-sans selection:bg-[#E91E8C]/30">
      <div className="max-w-[760px] mx-auto pb-20 flex flex-col gap-10">
        
        {/* Today */}
        <section className="flex flex-col gap-3">
          <h3 className="text-zinc-500 text-[11px] font-semibold uppercase tracking-widest mb-2 pl-12">Today</h3>
          
          {/* Human Comment 1 */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[11px] font-medium text-zinc-300">
              SM
            </div>
            <div className="flex-1 flex flex-col pt-1.5">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-semibold text-zinc-200 text-sm">Sarah Mitchell</span>
                <span className="text-[12px] text-zinc-500">10:42 AM</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Reviewed the initial submission. <span className="text-[#E91E8C]">@Marcus</span> can you double check the loss run figures for 2023? They seem slightly off compared to the carrier's preliminary report.
              </p>
            </div>
          </div>

          {/* Event: Stage Change */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-6 flex justify-center items-center">
              <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[13px] text-zinc-500 leading-6">
                <span className="text-zinc-300">Sarah Mitchell</span> moved deal to Indication <span className="text-zinc-700 mx-1.5">·</span> 10:45 AM
              </p>
            </div>
          </div>

          {/* Event: Open Task */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-6 flex justify-center items-center">
              <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[13px] text-zinc-500 leading-6">
                <span className="text-zinc-300">Sarah Mitchell</span> assigned task <span className="text-zinc-700 mx-1.5">·</span> Collect loss runs <span className="text-zinc-700 mx-1.5">·</span> 10:46 AM
              </p>
              <div className="h-6 flex items-center">
                <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.08] leading-none flex items-center">
                  Open
                </span>
              </div>
            </div>
          </div>

          {/* Human Comment 2 */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[11px] font-medium text-zinc-300">
              MW
            </div>
            <div className="flex-1 flex flex-col pt-1.5">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-semibold text-zinc-200 text-sm">Marcus Webb</span>
                <span className="text-[12px] text-zinc-500">11:15 AM</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Looking into it now. I'll upload the corrected documents shortly.
              </p>
            </div>
          </div>

          {/* Event: Upload */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-6 flex justify-center items-center">
              <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[13px] text-zinc-500 leading-6">
                <span className="text-zinc-300">Marcus Webb</span> uploaded document <span className="text-zinc-700 mx-1.5">·</span> loss-runs-2025.pdf <span className="text-zinc-700 mx-1.5">·</span> 11:30 AM
              </p>
            </div>
          </div>

          {/* Event: Completed Task */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-6 flex justify-center items-center">
              <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[13px] text-zinc-500 leading-6">
                <span className="text-zinc-300">Marcus Webb</span> completed task <span className="text-zinc-700 mx-1.5">·</span> <span className="line-through decoration-zinc-700">Verify loss run figures</span> <span className="text-zinc-700 mx-1.5">·</span> 11:35 AM
              </p>
            </div>
          </div>
        </section>

        {/* Yesterday */}
        <section className="flex flex-col gap-3">
          <h3 className="text-zinc-500 text-[11px] font-semibold uppercase tracking-widest mb-2 pl-12">Yesterday</h3>
          
          {/* Event: System Create */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-6 flex justify-center items-center">
              <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[13px] text-zinc-500 leading-6">
                <span className="text-zinc-300">System</span> created deal <span className="text-zinc-700 mx-1.5">·</span> Workers Comp - Acme Corp <span className="text-zinc-700 mx-1.5">·</span> 9:00 AM
              </p>
            </div>
          </div>

          {/* Event: Stage Change */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-6 flex justify-center items-center">
              <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[13px] text-zinc-500 leading-6">
                <span className="text-zinc-300">Marcus Webb</span> moved deal to Submission Review <span className="text-zinc-700 mx-1.5">·</span> 2:15 PM
              </p>
            </div>
          </div>

          {/* Human Comment 3 */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[11px] font-medium text-zinc-300">
              MW
            </div>
            <div className="flex-1 flex flex-col pt-1.5">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-semibold text-zinc-200 text-sm">Marcus Webb</span>
                <span className="text-[12px] text-zinc-500">2:20 PM</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Initial details are in. Waiting on admin review before proceeding with indications.
              </p>
            </div>
          </div>

          {/* Event: Deal Approved */}
          <div className="flex gap-4 items-start">
            <div className="flex-none w-8 h-6 flex justify-center items-center">
              <div className="w-1 h-1 rounded-full bg-[#E91E8C]"></div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[13px] text-zinc-500 leading-6">
                <span className="text-zinc-300">Sarah Mitchell</span> approved deal <span className="text-zinc-700 mx-1.5">·</span> 4:00 PM
              </p>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}

export default TwoLane;
