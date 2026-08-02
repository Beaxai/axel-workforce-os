import React, { useState } from 'react';
import { 
  Star, ChevronDown, ChevronUp, FileText, CheckSquare, 
  MessageSquare, Activity, ChevronRight, Folder
} from 'lucide-react';

type StageId = 'submission' | 'indication' | 'uw_review' | 'approved' | 'binding' | 'implementation';

interface StageInfo {
  id: StageId;
  name: string;
  dateStr?: string;
  isCurrent?: boolean;
  isPast?: boolean;
}

const STAGES: StageInfo[] = [
  { id: 'submission', name: 'Submission Pending', dateStr: 'Jul 2', isPast: true },
  { id: 'indication', name: 'Indication', dateStr: 'Jul 9', isPast: true },
  { id: 'uw_review', name: 'U/W Review', dateStr: 'Jul 18', isCurrent: true, isPast: true },
  { id: 'approved', name: 'Approved / Declined', isPast: false },
  { id: 'binding', name: 'Binding', isPast: false },
  { id: 'implementation', name: 'Implementation', isPast: false },
];

interface FeedItem {
  id: string;
  type: 'note' | 'doc' | 'task' | 'system';
  title: string;
  desc?: string;
  date: string;
  author?: { name: string };
}

const STAGE_CONTENT: Record<StageId, FeedItem[]> = {
  submission: [
    { id: '1', type: 'system', title: 'Deal created & submission started', date: 'Jul 2, 09:12 AM' },
    { id: '2', type: 'doc', title: 'Payroll report Q2.xlsx uploaded', date: 'Jul 2, 10:45 AM', desc: 'Added by Broker via Portal' },
    { id: '3', type: 'task', title: 'Collect missing loss runs', date: 'Jul 3, 01:00 PM', desc: 'Completed Jul 5. Verified with carrier.' }
  ],
  indication: [
    { id: '4', type: 'system', title: 'Stage moved to Indication', date: 'Jul 9, 08:30 AM' },
    { id: '5', type: 'doc', title: 'ACORD 130.pdf generated', date: 'Jul 10, 11:20 AM' },
    { id: '6', type: 'note', title: 'Note from Sarah Chen', desc: 'Carrier indicated appetite, pending final underwriting. Will need to follow up on the 2023 941s.', date: 'Jul 11, 02:15 PM', author: { name: 'Sarah Chen' } },
  ],
  uw_review: [
    { id: '7', type: 'system', title: 'Stage moved to U/W Review', date: 'Jul 18, 09:00 AM' },
    { id: '8', type: 'doc', title: 'Loss runs 2023-25.pdf uploaded', date: 'Jul 19, 10:00 AM' },
    { id: '9', type: 'note', title: 'RFI answered: payroll audit docs', desc: 'Provided the missing 941s for 2023. Underwriter confirmed receipt.', date: 'Jul 20, 11:30 AM', author: { name: 'Alex Johnson' } },
    { id: '10', type: 'system', title: 'Quote v3 generated — WC premium updated', date: 'Jul 21, 04:00 PM' },
    { id: '11', type: 'task', title: 'Collect signed BOR', date: 'Jul 30, Due', desc: 'Pending signature from the insured.' },
    { id: '12', type: 'task', title: 'Confirm class codes 0005/8810', date: 'Aug 2, Due', desc: 'Need clarification on nursery vs field workers.' }
  ],
  approved: [],
  binding: [],
  implementation: []
};

function Kpi({ label, value, highlight = false, suffix = '' }: { label: string, value: string, highlight?: boolean, suffix?: string }) {
  return (
    <div>
       <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">{label}</div>
       <div className={`text-2xl sm:text-3xl font-light tabular-nums flex items-baseline gap-1 ${highlight ? 'text-white' : 'text-slate-200'}`}>
          {value} {suffix && <span className="text-sm text-[#E91E8C] font-semibold">{suffix}</span>}
       </div>
    </div>
  )
}

function TabButton({ active, icon, label, count }: { active?: boolean, icon: React.ReactNode, label: string, count?: number }) {
  return (
     <button className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-white/10 text-white shadow-[inset_2px_0_0_#E91E8C]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
        <div className="flex items-center gap-3">
           {icon}
           <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        </div>
        {count !== undefined && <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums">{count}</span>}
     </button>
  )
}

const typeStyles = {
  doc: {
    icon: <FileText className="w-4 h-4 text-blue-400" />,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Document'
  },
  task: {
    icon: <CheckSquare className="w-4 h-4 text-amber-400" />,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Task'
  },
  note: {
    icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Note'
  }
};

function FeedItemCard({ item }: { item: FeedItem }) {
  const isSystem = item.type === 'system';
  
  if (isSystem) {
    return (
      <div className="flex items-start gap-4 py-2 px-4 relative group">
         <div className="w-7 h-7 shrink-0 rounded-full bg-slate-800/50 flex items-center justify-center border border-white/5 mt-0.5 group-hover:border-white/20 transition-colors">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
         </div>
         <div className="flex-1">
            <div className="text-sm font-medium text-slate-300">{item.title}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 tabular-nums">{item.date}</div>
         </div>
      </div>
    );
  }

  const style = typeStyles[item.type as keyof typeof typeStyles];

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:bg-slate-800/60 hover:border-white/10 transition-all cursor-pointer group shadow-sm hover:shadow-xl backdrop-blur-sm sm:ml-4">
       <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
             <div className={`p-1.5 rounded-lg ${style.bg} ${style.border} border`}>
                {style.icon}
             </div>
             <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
               {style.label}
             </span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 tabular-nums font-medium">{item.date}</div>
       </div>
       
       <h4 className="text-base text-slate-200 font-medium group-hover:text-white transition-colors leading-snug">{item.title}</h4>
       
       {item.desc && <p className="text-sm text-slate-400 mt-2 leading-relaxed">{item.desc}</p>}
       
       {item.author && (
         <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border border-white/10 flex items-center justify-center text-[10px] text-white font-bold">
               {item.author.name.charAt(0)}
            </div>
            <span className="text-xs text-slate-400 font-medium">{item.author.name}</span>
         </div>
       )}
    </div>
  )
}

export function StageStory() {
  const [focusedStageId, setFocusedStageId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedStages(prev => ({...prev, [id]: !prev[id]}));
  };

  const scrollToStage = (id: string) => {
    const container = document.getElementById('story-scroll-container');
    const el = document.getElementById(`stage-${id}`);
    if (container && el) {
      container.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center sm:p-8 font-sans selection:bg-[#E91E8C]/30 selection:text-white">
       <div className="w-full max-w-[1280px] h-[100dvh] sm:h-[92vh] sm:max-h-[900px] flex flex-col bg-[#07090E] sm:border border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden relative shadow-[#E91E8C]/[0.03]">
          
          {/* Header */}
          <div className="relative shrink-0 border-b border-white/10 bg-slate-900/50 flex flex-col overflow-hidden">
             {/* Map background pattern */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 0%, #E91E8C 0%, transparent 40%)' }}>
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                   <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                     <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/20"/>
                   </pattern>
                   <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
             </div>

             <div className="p-6 sm:p-8 relative z-10 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="text-[10px] font-bold tracking-widest text-[#E91E8C] uppercase mb-3 flex items-center gap-2">
                         <Star className="w-3.5 h-3.5 fill-[#E91E8C]" /> Pipeline / New Business
                      </div>
                      <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight mb-2">Emerald Coast Cultivation</h1>
                      <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">Cannabis Cultivation • Florida</p>
                   </div>

                   {/* Deal Team */}
                   <div className="hidden sm:flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-full py-1.5 px-3 backdrop-blur-xl shadow-lg">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mr-1">Deal Team</span>
                      <div className="flex -space-x-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">SC</div>
                        <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">AJ</div>
                        <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">+2</div>
                      </div>
                   </div>
                </div>

                <div className="flex flex-wrap gap-6 sm:gap-10">
                   <Kpi label="Est. Premium" value="$128,400" suffix="/yr" highlight />
                   <Kpi label="Locations" value="3" />
                   <Kpi label="Employees" value="42" />
                   <Kpi label="E-Mod" value="0.87" />
                </div>
             </div>

             {/* Slim horizontal breadcrumb under the KPI band */}
             <div className="h-12 border-t border-white/10 bg-slate-950/40 backdrop-blur-md px-4 sm:px-8 flex items-center gap-1 z-10 w-full overflow-x-auto no-scrollbar">
                {STAGES.map((stage, idx) => (
                   <React.Fragment key={stage.id}>
                      <button 
                         onClick={() => scrollToStage(stage.id)}
                         className={`text-[10px] uppercase tracking-widest font-bold transition-colors whitespace-nowrap px-3 py-1.5 rounded-md
                            ${stage.isCurrent ? 'text-[#E91E8C] bg-[#E91E8C]/10' : stage.isPast ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
                      >
                         {stage.name}
                      </button>
                      {idx < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
                   </React.Fragment>
                ))}
             </div>
          </div>

          {/* Main Body */}
          <div className="flex flex-1 overflow-hidden">
             {/* Left Rail */}
             <div className="hidden sm:flex w-[180px] shrink-0 border-r border-white/10 bg-[#04060A]/80 p-4 flex-col gap-1 backdrop-blur-xl z-20">
                <TabButton active icon={<Activity className="w-4 h-4" />} label="Overview" />
                <TabButton icon={<FileText className="w-4 h-4" />} label="Quote" />
                <TabButton icon={<Folder className="w-4 h-4" />} label="Documents" count={5} />
                <TabButton icon={<CheckSquare className="w-4 h-4" />} label="Tasks" count={2} />
             </div>
             
             {/* Stage Story Content */}
             <div className="flex-1 overflow-y-auto bg-[#07090E] relative scroll-smooth p-6 sm:p-10" id="story-scroll-container">
                <div className="max-w-3xl mx-auto pb-32">
                   {STAGES.map((stage, idx) => {
                      const isFocused = focusedStageId === stage.id;
                      const isHidden = focusedStageId && !isFocused;
                      const items = STAGE_CONTENT[stage.id as StageId] || [];
                      const isCollapsed = collapsedStages[stage.id];
                      
                      if (isHidden) {
                         return (
                            <div key={stage.id} className="relative pl-14 py-4 opacity-40 hover:opacity-100 transition-opacity cursor-pointer group" onClick={() => setFocusedStageId(stage.id)}>
                               {idx < STAGES.length - 1 && (
                                  <div className="absolute left-[27.5px] top-8 bottom-[-16px] w-px bg-white/20" />
                               )}
                               <div className="absolute left-[24px] top-[22px] w-2 h-2 rounded-full z-10 bg-slate-700 group-hover:bg-slate-500 transition-colors" />
                               <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-widest">
                                  <span className="text-slate-400 group-hover:text-slate-300">{stage.name}</span>
                                  {stage.dateStr && <span className="text-slate-600">{stage.dateStr}</span>}
                               </div>
                            </div>
                         )
                      }

                      return (
                         <div key={stage.id} id={`stage-${stage.id}`} className="relative pl-14 pb-12 transition-all duration-500">
                            {/* Vertical progress line */}
                            {idx < STAGES.length - 1 && (
                               <div className={`absolute left-[27.5px] top-10 bottom-[-24px] w-px ${stage.isCurrent ? 'bg-gradient-to-b from-[#E91E8C] to-slate-800' : stage.isPast ? 'bg-slate-700' : 'bg-slate-800'}`} />
                            )}

                            {/* Stage Node */}
                            <div className="absolute left-[17px] top-6 w-[22px] h-[22px] rounded-full bg-[#07090E] flex items-center justify-center z-20 ring-4 ring-[#07090E]">
                               <div className={`w-2.5 h-2.5 rounded-full ${stage.isCurrent ? 'bg-[#E91E8C] shadow-[0_0_12px_#E91E8C]' : stage.isPast ? 'bg-slate-400' : 'bg-slate-800 border border-slate-700'}`} />
                            </div>

                            {/* Sticky Header */}
                            <div className="sticky top-0 z-30 -ml-4 py-4 pl-4 bg-[#07090E]/80 backdrop-blur-xl border-b border-transparent group transition-colors flex items-center justify-between">
                               <div className="flex items-center gap-3 sm:gap-4 cursor-pointer" onClick={(e) => toggleCollapse(stage.id, e)}>
                                  <h2 className={`text-lg sm:text-xl font-light tracking-tight ${stage.isCurrent ? 'text-white' : stage.isPast ? 'text-slate-300' : 'text-slate-600'}`}>
                                     {stage.name}
                                  </h2>
                                  {stage.dateStr && <span className="text-xs sm:text-sm text-slate-500 tabular-nums">{stage.dateStr}</span>}
                                  {items.length > 0 && (
                                     <span className="hidden sm:inline-block bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                                        {items.length} EVENTS
                                     </span>
                                  )}
                               </div>

                               <div className="flex items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                     onClick={(e) => { e.stopPropagation(); setFocusedStageId(focusedStageId === stage.id ? null : stage.id); }}
                                     className={`text-[10px] uppercase tracking-widest font-bold transition-colors px-3 py-1.5 rounded-full border 
                                        ${focusedStageId === stage.id 
                                           ? 'text-[#E91E8C] border-[#E91E8C]/30 bg-[#E91E8C]/10' 
                                           : 'text-slate-400 border-transparent hover:border-[#E91E8C]/30 bg-transparent hover:bg-[#E91E8C]/10 hover:text-[#E91E8C]'}`}
                                  >
                                     {focusedStageId === stage.id ? 'Unfocus' : 'Focus'}
                                  </button>
                                  <button 
                                     onClick={(e) => toggleCollapse(stage.id, e)}
                                     className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
                                  >
                                     {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                  </button>
                               </div>
                            </div>

                            {/* Content items */}
                            <div className={`mt-6 flex flex-col gap-4 overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
                               {items.length > 0 ? items.map(item => (
                                  <FeedItemCard key={item.id} item={item} />
                               )) : (
                                  <div className="py-8 text-center text-sm text-slate-600 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                                     No activity recorded in this stage yet.
                                  </div>
                               )}
                            </div>
                         </div>
                      )
                   })}
                </div>
             </div>
          </div>

       </div>
    </div>
  )
}
