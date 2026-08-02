import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Flag, 
  ChevronRight,
  ArrowRight,
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  GitCommit,
  Settings
} from 'lucide-react';

const TOTAL_DAYS = 62;
const TODAY_DAY = 32; // Mocking "Today" as Aug 2 in this 62-day timeline

function getPercent(day: number) {
  return (day / TOTAL_DAYS) * 100;
}

const WEEKS = [
  { label: 'Jul 1', day: 0 },
  { label: 'Jul 8', day: 7 },
  { label: 'Jul 15', day: 14 },
  { label: 'Jul 22', day: 21 },
  { label: 'Jul 29', day: 28 },
  { label: 'Aug 5', day: 35 },
  { label: 'Aug 12', day: 42 },
  { label: 'Aug 19', day: 49 },
  { label: 'Aug 26', day: 56 },
];

type Phase = {
  name: string;
  status: 'complete' | 'current' | 'future';
};

const JOURNEYS = [
  {
    id: '1',
    company: 'Harbor & Vine Restaurants',
    product: 'ASO',
    status: 'Overdue',
    progress: 81,
    startDay: 3, // Jul 4
    targetDay: 21, // Jul 22
    phases: [
      { name: 'Kickoff', status: 'complete' },
      { name: 'Data Collection', status: 'complete' },
      { name: 'Payroll Setup', status: 'complete' },
      { name: 'Benefits Enrollment', status: 'current' },
      { name: 'Go-Live', status: 'future' },
    ] as Phase[],
    nextTask: {
      name: 'Carrier confirmation',
      owner: 'INTERNAL',
      blockedDays: 0,
    }
  },
  {
    id: '2',
    company: 'Emerald Coast Cultivation',
    product: 'WC',
    status: 'In Progress',
    progress: 62,
    startDay: 28, // Jul 29
    targetDay: 34, // Aug 4
    phases: [
      { name: 'Kickoff', status: 'complete' },
      { name: 'Data Collection', status: 'complete' },
      { name: 'Payroll Setup', status: 'current' },
      { name: 'Benefits Enrollment', status: 'future' },
      { name: 'Go-Live', status: 'future' },
    ] as Phase[],
    nextTask: {
      name: 'Confirm class codes',
      owner: 'INTERNAL'
    }
  },
  {
    id: '3',
    company: 'Bayline Logistics',
    product: 'PEO',
    status: 'In Progress',
    progress: 34,
    startDay: 26, // Jul 27
    targetDay: 48, // Aug 18
    phases: [
      { name: 'Kickoff', status: 'complete' },
      { name: 'Data Collection', status: 'current' },
      { name: 'Payroll Setup', status: 'future' },
      { name: 'Benefits Enrollment', status: 'future' },
      { name: 'Go-Live', status: 'future' },
    ] as Phase[],
    nextTask: {
      name: 'Upload employee census',
      owner: 'CLIENT',
      blockedDays: 3,
    }
  },
  {
    id: '4',
    company: 'Piedmont Fabrication',
    product: 'WC',
    status: 'In Progress',
    progress: 15,
    startDay: 32, // Aug 2 (Today)
    targetDay: 38, // Aug 8
    phases: [
      { name: 'Kickoff', status: 'current' },
      { name: 'Data Collection', status: 'future' },
      { name: 'Payroll Setup', status: 'future' },
      { name: 'Benefits Enrollment', status: 'future' },
      { name: 'Go-Live', status: 'future' },
    ] as Phase[],
    nextTask: {
      name: 'Schedule kickoff call',
      owner: 'INTERNAL'
    }
  },
  {
    id: '5',
    company: 'Vertex Media',
    product: 'PEO',
    status: 'In Progress',
    progress: 9,
    startDay: 30, // Jul 31
    targetDay: 52, // Aug 22
    phases: [
      { name: 'Kickoff', status: 'current' },
      { name: 'Data Collection', status: 'future' },
      { name: 'Payroll Setup', status: 'future' },
      { name: 'Benefits Enrollment', status: 'future' },
      { name: 'Go-Live', status: 'future' },
    ] as Phase[],
    nextTask: {
      name: 'Sign service agreement',
      owner: 'CLIENT',
      blockedDays: 1,
    }
  },
  {
    id: '6',
    company: 'Northstar Dental Group',
    product: 'PEO',
    status: 'Complete',
    progress: 100,
    startDay: -13, // Jun 18
    targetDay: 9, // Jul 10
    phases: [
      { name: 'Kickoff', status: 'complete' },
      { name: 'Data Collection', status: 'complete' },
      { name: 'Payroll Setup', status: 'complete' },
      { name: 'Benefits Enrollment', status: 'complete' },
      { name: 'Go-Live', status: 'complete' },
    ] as Phase[]
  }
];

const SORTED_JOURNEYS = [...JOURNEYS].sort((a, b) => a.targetDay - b.targetDay);

const ShimmerStyles = () => (
  <style>{`
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
  `}</style>
);

const phaseStyles = (p: Phase, isCompleteJourney: boolean) => {
  if (p.status === 'complete') {
    return isCompleteJourney ? 'bg-emerald-500' : 'bg-[#E91E8C]';
  }
  if (p.status === 'current') {
    return 'bg-[#E91E8C]/40 relative overflow-hidden before:content-[\'\'] before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:animate-[shimmer_2s_infinite]';
  }
  return 'bg-white/5'; 
};

function Row({ journey }: { journey: typeof JOURNEYS[0] }) {
  const isOverdue = journey.status === 'Overdue' || (journey.targetDay < TODAY_DAY && journey.status !== 'Complete');
  
  const actualEndDay = isOverdue ? TODAY_DAY : journey.targetDay;
  const totalWidthPercent = getPercent(actualEndDay - journey.startDay);
  const targetWidthPercent = getPercent(journey.targetDay - journey.startDay);
  
  const targetWidthRatio = totalWidthPercent > 0 ? targetWidthPercent / totalWidthPercent : 1;

  return (
    <div className="flex group border-b border-white/5 hover:bg-white/[0.03] transition-colors h-[96px] relative">
       {/* LEFT PANEL */}
       <div className="w-[360px] shrink-0 border-r border-transparent p-4 pl-6 flex flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-[16px] font-medium text-zinc-100 tracking-tight truncate" title={journey.company}>
                {journey.company}
              </h3>
              <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-white/90 uppercase border border-white/10 shadow-sm shrink-0">
                {journey.product}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`text-[10px] uppercase tracking-widest font-bold ${
              journey.status === 'Complete' ? 'text-emerald-400' : 
              isOverdue ? 'text-red-400' : 
              'text-[#E91E8C]'
            }`}>
              {journey.status}
            </span>
            <div className="flex items-center gap-2">
               <span className="text-zinc-400 tabular-nums text-[11px] font-medium text-right">{journey.progress}%</span>
               <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
                 <div className={`h-full ${
                   journey.status === 'Complete' ? 'bg-emerald-400' : 
                   isOverdue ? 'bg-red-500' : 
                   'bg-[#E91E8C]'
                 }`} style={{ width: `${journey.progress}%` }} />
               </div>
            </div>
          </div>
          
          {/* Next Task Area */}
          <div className="text-[11px] h-5 flex items-center mt-0.5">
             {isOverdue && journey.nextTask && (
               <div className="flex items-center gap-1.5 text-red-400 font-medium">
                 <AlertTriangle size={12} className="shrink-0" />
                 <span className="truncate">Blocked task "{journey.nextTask.name}" ({journey.nextTask.owner})</span>
               </div>
             )}
             {!isOverdue && journey.nextTask && journey.nextTask.owner === 'CLIENT' && (
               <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                 <Clock size={12} className="shrink-0" />
                 <span className="truncate">Waiting on CLIENT task "{journey.nextTask.name}" for {journey.nextTask.blockedDays} day{journey.nextTask.blockedDays !== 1 ? 's' : ''}</span>
               </div>
             )}
             {!isOverdue && journey.nextTask && journey.nextTask.owner === 'INTERNAL' && (
               <div className="flex items-center gap-1.5 text-zinc-400">
                 <ArrowRight size={12} className="text-[#E91E8C] shrink-0" />
                 <span className="truncate group-hover:text-zinc-200 transition-colors">Next task: "{journey.nextTask.name}" (INTERNAL)</span>
               </div>
             )}
             {journey.status === 'Complete' && (
               <div className="flex items-center gap-1.5 text-emerald-400/80 font-medium">
                 <CheckCircle2 size={12} className="shrink-0" />
                 <span>Fully implemented</span>
               </div>
             )}
          </div>
       </div>

       {/* GANTT PANEL */}
       <div className="flex-1 relative overflow-hidden">
         {/* The Runway Bar */}
         <div 
           className="absolute top-1/2 -translate-y-1/2 h-8 flex items-center z-10"
           style={{ 
             left: `${getPercent(journey.startDay)}%`,
             width: `${totalWidthPercent}%`
           }}
         >
           {/* Actual Progress Fill Container */}
           <div className="absolute inset-y-2.5 left-0 right-0 flex rounded-full overflow-hidden shadow-sm">
             {/* Expected duration block (Target) */}
             <div className="flex h-full gap-[1px] bg-[#050507]" style={{ width: `${targetWidthRatio * 100}%` }}>
                {journey.phases.map((p, idx) => (
                  <div key={idx} className={`h-full flex-1 ${phaseStyles(p, journey.status === 'Complete')}`} title={p.name} />
                ))}
             </div>
             
             {/* Overdue Extension */}
             {isOverdue && (
               <div 
                 className="flex-1 h-full relative border-y border-r border-red-500/30"
                 style={{ 
                   background: 'repeating-linear-gradient(45deg, rgba(248,113,113,0.15), rgba(248,113,113,0.15) 8px, rgba(248,113,113,0.3) 8px, rgba(248,113,113,0.3) 16px)'
                 }}
               />
             )}
           </div>

           {/* Go-Live Flag / Target Marker */}
           <div 
             className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1"
             style={{ left: `${targetWidthRatio * 100}%`, transform: 'translateX(-50%)' }}
           >
              <div className={`absolute -top-5 text-[9px] uppercase tracking-widest font-bold whitespace-nowrap ${isOverdue ? 'text-red-400' : journey.status === 'Complete' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                Go-Live
              </div>
              <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-[#09090b] shadow-xl border-2
                 ${isOverdue ? 'border-red-500 text-red-500' : journey.status === 'Complete' ? 'border-emerald-500 text-emerald-500' : 'border-[#E91E8C] text-[#E91E8C]'}`}>
                 <Flag size={10} className={isOverdue ? 'fill-red-500/20' : journey.status === 'Complete' ? 'fill-emerald-500' : 'fill-[#E91E8C]/20'} />
              </div>
           </div>
         </div>
       </div>
    </div>
  );
}

export function GoLiveRunway() {
  return (
    <div className="min-h-screen w-full bg-[#050507] text-zinc-300 font-sans selection:bg-[#E91E8C]/30 overflow-hidden flex flex-col">
      <ShimmerStyles />
      
      {/* App Header Mock */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-black/60 flex items-center px-6 justify-between backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#E91E8C] to-purple-600 flex items-center justify-center text-white font-bold tracking-tighter shadow-[0_0_15px_rgba(233,30,140,0.4)]">
            A
          </div>
          <h1 className="text-sm font-medium text-white flex items-center gap-2">
            Workforce OS <ChevronRight size={14} className="text-zinc-600" /> 
            Implementations <ChevronRight size={14} className="text-zinc-600" /> 
            <span className="text-[#E91E8C]">Runway</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-lg border border-white/5">
           <button className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"><Search size={14} /></button>
           <button className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"><Settings size={14} /></button>
           <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white ml-2">SJ</div>
        </div>
      </header>
      
      {/* Tools / Filters Bar */}
      <div className="h-14 shrink-0 border-b border-white/5 bg-white/[0.01] flex items-center px-6 justify-between z-10">
        <div className="flex items-center gap-6">
          <div className="flex p-1 bg-black/40 rounded-lg border border-white/5">
             <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white shadow-sm flex items-center gap-1.5">
               <GitCommit size={14} className="text-[#E91E8C]" /> Runway
             </button>
             <button className="px-3 py-1.5 text-xs font-medium rounded-md text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
               <List size={14} /> List
             </button>
             <button className="px-3 py-1.5 text-xs font-medium rounded-md text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
               <LayoutGrid size={14} /> Board
             </button>
          </div>
          
          <div className="h-4 w-px bg-white/10" />
          
          <div className="flex items-center gap-4 text-xs font-medium">
             <button className="text-white">All Products</button>
             <button className="text-zinc-500 hover:text-zinc-300">WC (2)</button>
             <button className="text-zinc-500 hover:text-zinc-300">PEO (3)</button>
             <button className="text-zinc-500 hover:text-zinc-300">ASO (1)</button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mr-2">
            <Filter size={14} />
            <span>6 active journeys</span>
          </div>
          <button className="h-8 px-3 bg-[#E91E8C] hover:bg-[#E91E8C]/90 text-white text-xs font-medium rounded-md flex items-center gap-2 transition-colors shadow-[0_0_10px_rgba(233,30,140,0.3)]">
            <Plus size={14} />
            New Journey
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-0">
         {/* Grid Header */}
         <div className="flex border-b border-white/10 bg-[#050507]/90 backdrop-blur-xl shrink-0 h-10 sticky top-0 z-30">
            <div className="w-[360px] shrink-0 border-r border-white/10 px-6 flex items-center bg-[#050507]">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Journey Details</span>
            </div>
            <div className="flex-1 relative overflow-hidden">
              {WEEKS.map(w => (
                <div key={w.day} className="absolute top-0 bottom-0 flex flex-col justify-center border-l border-white/10" style={{ left: `${getPercent(w.day)}%` }}>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 ml-2 font-medium">{w.label}</span>
                </div>
              ))}
              {/* Today Header Marker */}
              <div className="absolute top-0 bottom-0 border-l border-[#E91E8C]/60 z-10" style={{ left: `${getPercent(TODAY_DAY)}%` }}>
                <div className="bg-[#050507] border border-[#E91E8C]/40 text-[#E91E8C] text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded absolute -translate-x-1/2 top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(233,30,140,0.2)]">
                  Today
                </div>
              </div>
            </div>
         </div>

         {/* Scrollable Rows Area */}
         <div className="flex-1 overflow-y-auto relative bg-[#050507]">
            {/* Global Vertical Grid Lines (Spans full scrolling height) */}
            <div className="absolute inset-0 pointer-events-none min-h-full z-0">
              <div className="relative w-full h-full flex">
                 <div className="w-[360px] shrink-0 border-r border-white/5" />
                 <div className="flex-1 relative overflow-hidden">
                   {WEEKS.map(w => (
                     <div key={w.day} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: `${getPercent(w.day)}%` }} />
                   ))}
                   {/* Today Line global highlight */}
                   <div className="absolute top-0 bottom-0 border-l border-[#E91E8C]/30" style={{ left: `${getPercent(TODAY_DAY)}%` }}>
                     <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-[#E91E8C]/5 to-transparent" />
                   </div>
                 </div>
              </div>
            </div>
            
            <div className="relative z-10">
              {SORTED_JOURNEYS.map(journey => (
                 <Row key={journey.id} journey={journey} />
              ))}
              <div className="h-24" /> {/* bottom padding */}
            </div>
         </div>
      </div>
    </div>
  );
}
