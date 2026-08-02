import React, { useState } from 'react';
import { 
  Search, Clock, Users, UserCircle, 
  AlertCircle, Bell, Check, CheckCircle2, 
  LayoutDashboard, Calendar
} from 'lucide-react';

type Task = {
  id: string;
  name: string;
  owner: "INTERNAL" | "CLIENT";
  status: "PENDING" | "COMPLETED" | "BLOCKED" | "WAITING";
  daysWaiting?: number;
};

type Phase = {
  id: string;
  name: string;
  status: "PENDING" | "CURRENT" | "COMPLETED";
  tasks: Task[];
};

type Journey = {
  id: string;
  businessName: string;
  productType: "WC" | "PEO" | "ASO";
  status: "IN_PROGRESS" | "COMPLETE";
  progress: number;
  goLiveDate: string;
  daysElapsed: number;
  targetDays: number;
  phases: Phase[];
  health: "HEALTHY" | "AT_RISK" | "OVERDUE";
};

const MOCK_JOURNEYS: Journey[] = [
  {
    id: "1",
    businessName: "Emerald Coast Cultivation",
    productType: "WC",
    status: "IN_PROGRESS",
    progress: 62,
    goLiveDate: "Aug 4",
    daysElapsed: 5,
    targetDays: 7,
    health: "HEALTHY",
    phases: [
      { id: "p1", name: "Kickoff", status: "COMPLETED", tasks: [{ id: "t0", name: "Welcome call", owner: "INTERNAL", status: "COMPLETED" }] },
      { id: "p2", name: "Data Collection", status: "COMPLETED", tasks: [{ id: "t00", name: "Collect FEIN", owner: "CLIENT", status: "COMPLETED" }] },
      { id: "p3", name: "Payroll Setup", status: "CURRENT", tasks: [
        { id: "t1", name: "Confirm class codes", owner: "INTERNAL", status: "PENDING" },
        { id: "t2", name: "Map departments", owner: "INTERNAL", status: "PENDING" },
        { id: "t3", name: "Configure pay schedules", owner: "INTERNAL", status: "PENDING" },
      ] },
      { id: "p4", name: "Go-Live", status: "PENDING", tasks: [] },
    ]
  },
  {
    id: "2",
    businessName: "Bayline Logistics",
    productType: "PEO",
    status: "IN_PROGRESS",
    progress: 34,
    goLiveDate: "Aug 18",
    daysElapsed: 12,
    targetDays: 22,
    health: "AT_RISK",
    phases: [
      { id: "p1", name: "Kickoff", status: "COMPLETED", tasks: [{ id: "t0", name: "Sign master service agreement", owner: "CLIENT", status: "COMPLETED" }] },
      { id: "p2", name: "Data Collection", status: "CURRENT", tasks: [
        { id: "t1", name: "Upload employee census", owner: "CLIENT", status: "WAITING", daysWaiting: 3 },
        { id: "t2", name: "Provide benefits history", owner: "CLIENT", status: "WAITING", daysWaiting: 2 },
        { id: "t3", name: "Review historical claims", owner: "INTERNAL", status: "PENDING" },
        { id: "t4", name: "Identify key contacts", owner: "CLIENT", status: "COMPLETED" }
      ] },
      { id: "p3", name: "Payroll Setup", status: "PENDING", tasks: [] },
      { id: "p4", name: "Benefits Enrollment", status: "PENDING", tasks: [] },
      { id: "p5", name: "Go-Live", status: "PENDING", tasks: [] },
    ]
  },
  {
    id: "3",
    businessName: "Harbor & Vine Restaurants",
    productType: "ASO",
    status: "IN_PROGRESS",
    progress: 81,
    goLiveDate: "Jul 22",
    daysElapsed: 24,
    targetDays: 18,
    health: "OVERDUE",
    phases: [
      { id: "p1", name: "Kickoff", status: "COMPLETED", tasks: [] },
      { id: "p2", name: "Data Collection", status: "COMPLETED", tasks: [] },
      { id: "p3", name: "Payroll Setup", status: "COMPLETED", tasks: [] },
      { id: "p4", name: "Benefits Enrollment", status: "CURRENT", tasks: [
        { id: "t0", name: "Finalize plan mapping", owner: "INTERNAL", status: "COMPLETED" },
        { id: "t1", name: "Carrier confirmation", owner: "INTERNAL", status: "BLOCKED" },
        { id: "t2", name: "Setup open enrollment window", owner: "INTERNAL", status: "PENDING" },
      ] },
      { id: "p5", name: "Go-Live", status: "PENDING", tasks: [] },
    ]
  },
  {
    id: "4",
    businessName: "Piedmont Fabrication",
    productType: "WC",
    status: "IN_PROGRESS",
    progress: 15,
    goLiveDate: "Aug 9",
    daysElapsed: 1,
    targetDays: 7,
    health: "HEALTHY",
    phases: [
      { id: "p1", name: "Kickoff", status: "CURRENT", tasks: [
        { id: "t1", name: "Introductory call", owner: "INTERNAL", status: "PENDING" },
        { id: "t2", name: "Send welcome packet", owner: "INTERNAL", status: "PENDING" },
      ] },
      { id: "p2", name: "Data Collection", status: "PENDING", tasks: [] },
      { id: "p3", name: "Payroll Setup", status: "PENDING", tasks: [] },
      { id: "p4", name: "Go-Live", status: "PENDING", tasks: [] },
    ]
  },
  {
    id: "5",
    businessName: "Northstar Dental Group",
    productType: "PEO",
    status: "COMPLETE",
    progress: 100,
    goLiveDate: "Jul 10",
    daysElapsed: 20,
    targetDays: 22,
    health: "HEALTHY",
    phases: [
      { id: "p1", name: "Kickoff", status: "COMPLETED", tasks: [] },
      { id: "p2", name: "Data Collection", status: "COMPLETED", tasks: [] },
      { id: "p3", name: "Payroll Setup", status: "COMPLETED", tasks: [] },
      { id: "p4", name: "Benefits Enrollment", status: "COMPLETED", tasks: [] },
      { id: "p5", name: "Go-Live", status: "COMPLETED", tasks: [
        { id: "t1", name: "First payroll run", owner: "INTERNAL", status: "COMPLETED" },
        { id: "t2", name: "Client feedback call", owner: "INTERNAL", status: "COMPLETED" }
      ] },
    ]
  }
];

const healthConfig = {
  HEALTHY: { color: "bg-emerald-500", glow: "shadow-[0_0_12px_rgba(16,185,129,0.6)]" },
  AT_RISK: { color: "bg-amber-500", glow: "shadow-[0_0_12px_rgba(245,158,11,0.6)]" },
  OVERDUE: { color: "bg-red-500", glow: "shadow-[0_0_12px_rgba(239,68,68,0.6)]" }
};

const styles = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
`;

function ProgressRing({ progress, size = 32, strokeWidth = 3, color = "text-pink-500" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90 absolute inset-0">
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-white/[0.05]" />
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={radius} 
          stroke="currentColor" 
          strokeWidth={strokeWidth} 
          fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`} 
        />
      </svg>
      <span className="text-[9px] font-bold text-white tabular-nums tracking-tighter">{progress}</span>
    </div>
  );
}

const GlassPanel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/[0.02] border border-white/10 rounded-2xl shadow-xl backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

export function SplitWorkbench() {
  const [selectedId, setSelectedId] = useState("2");
  
  const selectedJourney = MOCK_JOURNEYS.find(j => j.id === selectedId)!;
  const activePhase = selectedJourney.phases.find(p => p.status === 'CURRENT') || selectedJourney.phases[selectedJourney.phases.length - 1];
  
  const internalTasks = activePhase.tasks.filter(t => t.owner === 'INTERNAL' && t.status !== 'COMPLETED');
  const clientTasks = activePhase.tasks.filter(t => t.owner === 'CLIENT' && t.status !== 'COMPLETED');

  return (
    <>
      <style>{styles}</style>
      <div className="flex h-screen bg-[#06080D] text-slate-300 font-sans overflow-hidden antialiased selection:bg-pink-500/30">
        
        {/* Left Sidebar Pane */}
        <div className="w-[340px] flex-shrink-0 border-r border-white/10 bg-[#0A0D14]/80 backdrop-blur-xl flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
          <div className="p-5 border-b border-white/5 bg-[#0A0D14]/90 z-20 sticky top-0 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-pink-500" />
              </div>
              <h2 className="font-semibold text-white tracking-tight">Implementations</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                placeholder="Search clients or products..." 
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all" 
              />
            </div>
            <div className="flex items-center gap-2 mt-4 overflow-x-auto custom-scrollbar pb-1">
              <button className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors whitespace-nowrap">All Active</button>
              <button className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-transparent text-slate-400 hover:bg-white/5 transition-colors whitespace-nowrap">At Risk</button>
              <button className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-transparent text-slate-400 hover:bg-white/5 transition-colors whitespace-nowrap">Overdue</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 z-10">
            {MOCK_JOURNEYS.map(journey => {
              const isSelected = journey.id === selectedId;
              const hasWaiting = journey.phases.some(p => p.status === 'CURRENT' && p.tasks.some(t => t.owner === 'CLIENT' && t.status === 'WAITING'));
              
              return (
                <button 
                  key={journey.id}
                  onClick={() => setSelectedId(journey.id)}
                  className={`w-full text-left p-4 rounded-xl flex items-start gap-3 transition-all duration-200 relative group
                    ${isSelected ? 'bg-pink-500/[0.08] shadow-[inset_0_1px_0_0_rgba(233,30,140,0.2)] ring-1 ring-pink-500/30' : 'hover:bg-white/[0.03] hover:ring-1 hover:ring-white/10'}
                  `}
                >
                  <div className="relative pt-0.5 flex-shrink-0">
                    <ProgressRing progress={journey.progress} size={36} strokeWidth={3} color={isSelected ? "text-pink-400" : "text-pink-500"} />
                    <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#0A0D14] z-10 ${healthConfig[journey.health].color} ${healthConfig[journey.health].glow}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-semibold truncate text-sm transition-colors ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{journey.businessName}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${isSelected ? 'bg-pink-500/20 text-pink-300' : 'bg-white/10 text-slate-400'}`}>
                        {journey.productType}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 font-medium">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {journey.goLiveDate}</span>
                      <span className="opacity-50">•</span>
                      <span>Day {journey.daysElapsed} of {journey.targetDays}</span>
                    </div>
                    {hasWaiting && (
                      <div className="mt-2.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-1 rounded w-fit font-bold shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2)]">
                        <Clock className="w-3 h-3" /> Waiting on client
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Pane */}
        <div className="flex-1 flex flex-col relative z-10 overflow-y-auto custom-scrollbar h-screen">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />
          
          <div className="px-10 py-12 border-b border-white/5 bg-white/[0.01] relative backdrop-blur-sm z-20">
             <div className="flex items-start justify-between">
                <div className="flex-1 pr-12">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="px-2.5 py-1 rounded bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                        {selectedJourney.productType} Implementation
                      </div>
                      {selectedJourney.health === 'OVERDUE' && (
                        <div className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest ring-1 ring-red-500/30">Overdue</div>
                      )}
                      {selectedJourney.status === 'COMPLETE' && (
                        <div className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest ring-1 ring-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </div>
                      )}
                   </div>
                   <h1 className="text-4xl font-semibold text-white tracking-tight mb-2">{selectedJourney.businessName}</h1>
                   <div className="flex items-center gap-6 text-sm text-slate-400 font-medium">
                      <span className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${healthConfig[selectedJourney.health].color} ${healthConfig[selectedJourney.health].glow}`} />
                        {selectedJourney.health === 'HEALTHY' ? 'On Track' : selectedJourney.health === 'AT_RISK' ? 'At Risk' : 'Needs Immediate Attention'}
                      </span>
                      <span className="opacity-30">|</span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" /> Go-Live: <span className="text-white">{selectedJourney.goLiveDate}</span>
                      </span>
                   </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Timeline</div>
                   <div className="flex items-baseline gap-1">
                     <span className="text-4xl font-light text-white tracking-tighter">{selectedJourney.daysElapsed}</span>
                     <span className="text-lg text-slate-500 font-light">/ {selectedJourney.targetDays}</span>
                     <span className="text-sm text-slate-500 ml-1">days</span>
                   </div>
                   <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-3">
                     <div 
                       className="h-full bg-pink-500 rounded-full transition-all duration-1000 ease-out" 
                       style={{ width: `${Math.min(100, (selectedJourney.daysElapsed / selectedJourney.targetDays) * 100)}%` }} 
                     />
                   </div>
                </div>
             </div>
             
             {/* Phase Stepper */}
             <div className="flex items-center w-full mt-12 gap-1">
                {selectedJourney.phases.map((phase, i) => {
                  const isCompleted = phase.status === 'COMPLETED';
                  const isCurrent = phase.status === 'CURRENT';
                  return (
                    <div key={phase.id} className="flex-1 flex flex-col relative group">
                       <div className="mb-3 flex items-center gap-2 pl-1">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors z-10
                            ${isCompleted ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(233,30,140,0.5)]' : isCurrent ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50' : 'bg-white/5 text-slate-500'}`}>
                            {isCompleted ? <Check className="w-3 h-3" /> : (i + 1)}
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors truncate
                            ${isCompleted ? 'text-slate-300' : isCurrent ? 'text-pink-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                            {phase.name}
                          </span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                          {isCompleted && <div className="absolute inset-0 bg-pink-500" />}
                          {isCurrent && (
                            <div className="absolute inset-y-0 left-0 bg-pink-500/40 w-1/2 rounded-full relative overflow-hidden">
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-400/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            </div>
                          )}
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="px-10 py-8 relative z-20 pb-24">
             {selectedJourney.status !== 'COMPLETE' && (
                <>
                   <div className="flex items-center justify-between mb-6">
                     <h2 className="text-lg font-semibold text-white">Action Queue</h2>
                     <span className="text-xs text-slate-500 font-medium">Prioritized tasks for current phase</span>
                   </div>
                   
                   <div className="flex flex-col xl:flex-row gap-6 mb-12">
                      {/* Your Team Panel */}
                      <div className="flex-1 min-w-[300px]">
                        <GlassPanel className="h-full border-t-2 border-t-pink-500 bg-gradient-to-b from-pink-500/[0.03] to-transparent">
                           <div className="p-5 border-b border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                                 <Users className="w-4 h-4 text-pink-500" />
                               </div>
                               <h3 className="font-semibold text-white">Your Team</h3>
                             </div>
                             <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-pink-500/20 text-pink-400">
                               {internalTasks.length} action{internalTasks.length !== 1 && 's'}
                             </div>
                           </div>
                           <div className="p-4 space-y-3">
                             {internalTasks.length > 0 ? internalTasks.map(task => (
                               <div key={task.id} className="group flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.04]">
                                 <div className="mt-0.5">
                                   {task.status === 'BLOCKED' ? (
                                     <AlertCircle className="w-4 h-4 text-red-500" />
                                   ) : (
                                     <div className="w-4 h-4 rounded border border-white/30" />
                                   )}
                                 </div>
                                 <div className="flex-1">
                                   <div className="text-sm font-medium text-slate-200">{task.name}</div>
                                   {task.status === 'BLOCKED' && (
                                     <div className="text-xs text-red-400 mt-1 font-medium">Blocked by dependency</div>
                                   )}
                                 </div>
                                 {task.status !== 'BLOCKED' && (
                                   <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-bold uppercase tracking-wider bg-pink-500 text-white px-3 py-1.5 rounded-md hover:bg-pink-600 shadow-[0_0_10px_rgba(233,30,140,0.3)]">
                                     Complete
                                   </button>
                                 )}
                               </div>
                             )) : (
                               <div className="text-center py-6 text-sm text-slate-500 font-medium">No pending tasks for your team.</div>
                             )}
                           </div>
                        </GlassPanel>
                      </div>

                      {/* Waiting on Client Panel */}
                      <div className="flex-1 min-w-[300px]">
                        <GlassPanel className="h-full border-t-2 border-t-amber-500 bg-gradient-to-b from-amber-500/[0.03] to-transparent">
                           <div className="p-5 border-b border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                 <UserCircle className="w-4 h-4 text-amber-500" />
                               </div>
                               <h3 className="font-semibold text-white">Waiting on Client</h3>
                             </div>
                             <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400">
                               {clientTasks.length} pending
                             </div>
                           </div>
                           <div className="p-4 space-y-3">
                             {clientTasks.length > 0 ? clientTasks.map(task => (
                               <div key={task.id} className="group flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.04]">
                                 <div className="mt-0.5">
                                   <div className="w-4 h-4 rounded-full border border-dashed border-amber-500/50" />
                                 </div>
                                 <div className="flex-1">
                                   <div className="text-sm font-medium text-slate-200">{task.name}</div>
                                   <div className="text-[11px] font-bold text-amber-500/80 mt-1 flex items-center gap-1 uppercase tracking-wider">
                                     <Clock className="w-3 h-3" /> {task.daysWaiting} days waiting
                                   </div>
                                 </div>
                                 <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 flex items-center gap-1">
                                   <Bell className="w-3 h-3" /> Nudge
                                 </button>
                               </div>
                             )) : (
                               <div className="text-center py-6 text-sm text-slate-500 font-medium">Not waiting on any client actions.</div>
                             )}
                           </div>
                        </GlassPanel>
                      </div>
                   </div>
                </>
             )}

             <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                 {selectedJourney.status === 'COMPLETE' ? 'Final Checklist' : 'Current Phase Checklist'}
                 <span className="text-pink-500">— {activePhase.name}</span>
               </h2>
             </div>
             
             <GlassPanel className="overflow-hidden">
                <div className="bg-black/20 px-6 py-4 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
                  <div className="font-semibold text-slate-300 uppercase tracking-widest text-[10px]">All Tasks</div>
                  <div className="text-[11px] font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full">
                    {activePhase.tasks.filter(t => t.status === 'COMPLETED').length} / {activePhase.tasks.length} Completed
                  </div>
                </div>
                <div className="divide-y divide-white/5 bg-white/[0.01]">
                  {activePhase.tasks.map(task => (
                    <div key={task.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                       <div className="flex items-center gap-4">
                          {task.status === 'COMPLETED' ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)]">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className={`w-6 h-6 rounded-full border-2 ${task.owner === 'CLIENT' ? 'border-dashed border-amber-500/40' : 'border-white/20 group-hover:border-white/40'} flex items-center justify-center transition-colors`} />
                          )}
                          <span className={`text-[15px] font-medium transition-colors ${task.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-white'}`}>
                            {task.name}
                          </span>
                       </div>
                       <div className="flex items-center gap-4">
                          {task.status === 'WAITING' && <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Waiting</span>}
                          {task.status === 'BLOCKED' && <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> Blocked</span>}
                          
                          <div className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-white/5 border border-white/10 ${task.owner === 'CLIENT' ? 'text-amber-500/70' : 'text-slate-400'}`}>
                            {task.owner}
                          </div>
                       </div>
                    </div>
                  ))}
                  {activePhase.tasks.length === 0 && (
                     <div className="p-8 text-center text-slate-500 font-medium">No tasks defined for this phase.</div>
                  )}
                </div>
             </GlassPanel>
          </div>
        </div>
      </div>
    </>
  );
}
