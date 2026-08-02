import React, { useState } from 'react';
import { 
  Users, DollarSign, Activity, 
  ChevronRight, MapPin, 
  Calendar, ListTodo, CheckSquare, 
  FileText, FileCheck, ShieldCheck, 
  Plus, Paperclip, Send, Check
} from 'lucide-react';

export function TaskDrawer() {
  const [tasksExpanded, setTasksExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 font-sans text-zinc-300">
      
      {/* Dialog Frame */}
      <div className="w-full max-w-[1200px] h-[92vh] max-h-[900px] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black overflow-hidden relative selection:bg-pink-500/30">
        
        {/* 1. Header Band */}
        <div className="relative h-[120px] shrink-0 border-b border-zinc-800 flex flex-col justify-between p-6 overflow-hidden bg-zinc-900/50">
          {/* Background Map Art - Mocked via CSS */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(233, 30, 140, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 0%, rgba(255,255,255,0.05) 0%, transparent 40%)' }}>
            {/* Map lines mocked with SVG */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path d="M-100,40 Q100,20 200,60 T400,40 T600,80 T800,30 T1000,70 T1300,40" fill="none" stroke="currentColor" strokeWidth="1" className="text-zinc-600 opacity-20" />
              <path d="M-100,80 Q150,90 250,50 T450,100 T650,60 T850,90 T1050,40 T1300,80" fill="none" stroke="currentColor" strokeWidth="1" className="text-zinc-600 opacity-20" />
              <path d="M-50,10 Q200,80 350,30 T600,90 T850,20 T1100,80 T1350,20" fill="none" stroke="currentColor" strokeWidth="1" className="text-pink-500 opacity-10" />
            </svg>
          </div>
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-semibold text-white tracking-tight">Emerald Coast Cultivation</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 rounded">CANNABIS</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">WC</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium text-zinc-500 tracking-wide">
                <div className="flex items-center gap-1.5"><MapPin size={12} className="text-zinc-400" /> LOCATIONS <span className="text-zinc-300">3</span></div>
                <div className="w-px h-3 bg-zinc-700" />
                <div className="flex items-center gap-1.5"><Users size={12} className="text-zinc-400" /> EMPLOYEES <span className="text-zinc-300">42</span></div>
                <div className="w-px h-3 bg-zinc-700" />
                <div className="flex items-center gap-1.5"><DollarSign size={12} className="text-zinc-400" /> PAYROLL <span className="text-zinc-300">$2.1M</span></div>
                <div className="w-px h-3 bg-zinc-700" />
                <div className="flex items-center gap-1.5"><Activity size={12} className="text-zinc-400" /> EXMOD <span className="text-zinc-300">1.12</span></div>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end gap-1.5">
              <div className="text-[10px] font-bold text-zinc-500 tracking-wider">EST. PREMIUM</div>
              <div className="text-2xl font-semibold text-pink-400 bg-zinc-950/50 px-4 py-1.5 rounded-lg border border-zinc-800 shadow-inner">
                $48,200
              </div>
            </div>
          </div>
        </div>

        {/* 2. Stage Tracker */}
        <div className="h-14 shrink-0 bg-zinc-950 border-b border-zinc-800 flex items-center px-6 text-[10px] font-bold tracking-widest text-zinc-500 uppercase overflow-x-auto no-scrollbar">
          {['Lead', 'Qualified', 'Submission', 'Quote', 'Bound', 'Live'].map((stage, i, arr) => (
            <React.Fragment key={stage}>
              <div className={`flex items-center gap-2.5 whitespace-nowrap ${stage === 'Quote' ? 'text-pink-400' : (i < 3 ? 'text-zinc-300' : 'text-zinc-600')}`}>
                <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center border text-[10px] ${
                  stage === 'Quote' ? 'bg-pink-500/10 border-pink-500/30' : 
                  (i < 3 ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-transparent border-zinc-800')
                }`}>
                  {i < 3 ? <Check size={12} /> : i + 1}
                </div>
                {stage}
              </div>
              {i < arr.length - 1 && (
                <div className={`w-8 h-px mx-3.5 ${i < 3 ? 'bg-zinc-700' : 'bg-zinc-800/80'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 3. Body */}
        <div className="flex-1 flex overflow-hidden bg-zinc-950">
          
          {/* Left Nav Rail */}
          <div className="w-[132px] shrink-0 border-r border-zinc-800 bg-zinc-900/30 p-3 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            <NavButton icon={<Activity size={18} />} label="Overview" active />
            <NavButton icon={<FileText size={18} />} label="Submission" />
            <NavButton icon={<ListTodo size={18} />} label="Subjectivities" />
            <NavButton icon={<FileCheck size={18} />} label="Documents" />
            <NavButton icon={<DollarSign size={18} />} label="Quote" />
            <NavButton icon={<ShieldCheck size={18} />} label="Policy" />
          </div>

          {/* Center Content - Overview Mock */}
          <div className="flex-1 flex flex-col relative transition-all duration-300 min-w-0">
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-7">
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 text-zinc-400 shadow-sm mt-0.5">
                  <Activity size={14} />
                </div>
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[13px] font-semibold text-zinc-200">System generated quote #4992</div>
                    <div className="text-xs text-zinc-500 font-medium">Jul 28, 2:14 PM</div>
                  </div>
                  <div className="text-[13px] text-zinc-400 leading-relaxed">Quote generated for $48,200 based on submitted class codes. Subject to favorable inspection.</div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400 text-xs font-bold shadow-sm mt-0.5">
                  SC
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-semibold text-zinc-200">Sarah Chen</span>
                    <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded">Underwriter</span>
                    <span className="text-xs text-zinc-500 font-medium ml-auto">Jul 28, 4:30 PM</span>
                  </div>
                  <div className="text-[13px] text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 rounded-tl-sm shadow-sm leading-relaxed">
                    I've reviewed the loss runs. We need to push on subjectivities before the end of the week or we risk losing the 8/1 effective date. Can we get those class codes confirmed today?
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 border border-pink-500/20 text-pink-400 text-xs font-bold shadow-sm mt-0.5">
                  MW
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-semibold text-zinc-200">Marcus Webb</span>
                    <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded">Broker</span>
                    <span className="text-xs text-zinc-500 font-medium ml-auto">Yesterday, 9:15 AM</span>
                  </div>
                  <div className="text-[13px] text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 rounded-tl-sm shadow-sm leading-relaxed">
                    Hey team, waiting on the insured to confirm the updated class codes. They said they'd have it to me by EOD today. I'll upload as soon as I get it.
                  </div>
                </div>
              </div>

            </div>
            
            {/* Composer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 focus-within:border-pink-500/50 focus-within:ring-1 focus-within:ring-pink-500/50 transition-all shadow-sm">
                <textarea 
                  placeholder="Type a message or internal note..." 
                  className="w-full bg-transparent text-[13px] text-white placeholder-zinc-500 resize-none h-16 p-2 focus:outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between px-2 pt-2 border-t border-zinc-800/50">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <button className="p-1.5 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"><Paperclip size={16} /></button>
                    <button className="p-1.5 hover:text-zinc-300 hover:bg-zinc-800 rounded font-medium text-[15px] leading-none transition-colors">@</button>
                  </div>
                  <button className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-pink-500/20">
                    Send <Send size={12} className="ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. NEW Right Tasks Panel (Collapsible) */}
          <div 
            className={`shrink-0 border-l border-zinc-800 bg-zinc-900 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.5)] ${
              tasksExpanded ? 'w-[360px]' : 'w-[48px] hover:bg-zinc-800/50 cursor-pointer group'
            }`}
            onClick={() => !tasksExpanded && setTasksExpanded(true)}
          >
            {tasksExpanded ? (
              // Expanded State
              <div className="flex flex-col h-full w-[360px] opacity-100 transition-opacity duration-300 delay-100">
                <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-5 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5 text-[13px] font-semibold text-zinc-100 tracking-wide">
                    <CheckSquare size={16} className="text-pink-500" />
                    TASKS
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setTasksExpanded(false); }}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                
                {/* Quick Add */}
                <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30 shrink-0">
                  <div className="relative group/input">
                    <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/input:text-pink-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Add a task... ↵" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Task List Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-7 no-scrollbar pb-10 bg-zinc-900/10">
                  
                  {/* OVERDUE */}
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[10px] font-bold tracking-widest text-red-400 uppercase flex items-center gap-2 px-1 mb-0.5">
                      Overdue <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[9px] leading-none">2</span>
                    </div>
                    <TaskItem 
                      title="Collect loss runs for 2023-2025" 
                      assignee="Marcus Webb" role="Broker" due="Jul 29" overdue
                    />
                    <TaskItem 
                      title="Confirm class codes 0035 & 8017 with the carrier before binding" 
                      assignee="Sarah Chen" role="Underwriter" due="Aug 1" overdue
                    />
                  </div>

                  {/* OPEN */}
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 px-1 mb-0.5">
                      Open <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-[9px] leading-none">3</span>
                    </div>
                    <TaskItem 
                      title="Schedule safety inspection for the Tampa grow facility" 
                      due="Aug 4" 
                    />
                    <TaskItem 
                      title="Follow up on outstanding subjectivities with broker" 
                      due="Aug 6" 
                    />
                    <TaskItem 
                      title="Verify certificate of insurance wording" 
                      unassigned
                    />
                  </div>

                  {/* COMPLETED */}
                  <div className="flex flex-col gap-2.5 opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-2 px-1 mt-2 mb-0.5">
                      Completed <span className="bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] leading-none">2</span>
                    </div>
                    <TaskItem 
                      title="Request updated payroll report" 
                      assignee="Sarah Chen" role="Underwriter" due="Jul 25" completed
                    />
                    <TaskItem 
                      title="Send indication to broker" 
                      assignee="Marcus Webb" role="Broker" due="Jul 26" completed
                    />
                  </div>

                </div>
              </div>
            ) : (
              // Collapsed State
              <div className="flex flex-col items-center h-full w-[48px] py-4 relative">
                <div className="relative mb-8 text-zinc-400 group-hover:text-pink-400 transition-colors shrink-0">
                  <CheckSquare size={18} />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-zinc-900 rounded-full" />
                </div>
                
                <div className="flex-1 relative w-full flex justify-center">
                  <div className="absolute top-10 flex items-center gap-2 -rotate-90 origin-center whitespace-nowrap text-[11px] font-bold tracking-widest text-zinc-500 uppercase group-hover:text-zinc-300 transition-colors">
                    TASKS
                    <span className="bg-zinc-800/80 border border-zinc-700 text-zinc-300 w-5 h-5 flex items-center justify-center rounded-full text-[10px] rotate-90">5</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Legend for mockup review */}
        <div className="absolute bottom-4 left-4 max-w-[280px] bg-black/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-2xl z-50">
          <div className="text-[11px] font-bold text-pink-400 uppercase tracking-wider mb-2">Variant: Collapsible Drawer</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Hypothesis: Task persistence shouldn't cost fixed width. Click the collapse chevron <ChevronRight size={12} className="inline align-text-bottom" /> in the drawer header to toggle the 44px slim state. Notice the red indicator for overdue items.
          </p>
        </div>

      </div>
    </div>
  );
}

// Subcomponents

function NavButton({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl transition-all ${
      active 
        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50' 
        : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 border border-transparent'
    }`}>
      <div className={`${active ? 'text-pink-400' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
    </button>
  );
}

function TaskItem({ 
  title, assignee, role, due, overdue = false, unassigned = false, completed = false 
}: { 
  title: string, assignee?: string, role?: string, due?: string, overdue?: boolean, unassigned?: boolean, completed?: boolean 
}) {
  return (
    <div className={`group flex items-start gap-3.5 p-3 rounded-xl border transition-all ${
      completed 
        ? 'hover:bg-zinc-800/30 border-transparent' 
        : 'bg-zinc-950 border-zinc-800/80 hover:border-pink-500/30 shadow-sm'
    }`}>
      <button className={`shrink-0 mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors ${
        completed 
          ? 'bg-pink-500/20 border-pink-500/50 text-pink-500' 
          : overdue 
            ? 'border-red-500/50 bg-red-500/5 hover:border-red-400' 
            : 'border-zinc-600 bg-zinc-900 group-hover:border-pink-500/50'
      }`}>
        {completed && <Check size={12} strokeWidth={3} />}
      </button>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className={`text-[13px] leading-[1.4] font-medium ${
          completed ? 'text-zinc-500 line-through' : 'text-zinc-200'
        }`}>
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium">
          {unassigned ? (
            <span className="text-zinc-500 border border-zinc-700 border-dashed rounded px-1.5 py-0.5 flex items-center gap-1 bg-zinc-800/30">
              <Users size={10} /> Unassigned
            </span>
          ) : assignee ? (
            <div className="flex items-center gap-1.5 bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300">
              <span className={`${completed ? 'text-zinc-500' : 'text-zinc-300'}`}>{assignee}</span>
              {role && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-600" />
                  <span className="text-zinc-500">{role}</span>
                </>
              )}
            </div>
          ) : null}
          
          {due && (
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              completed ? 'text-zinc-600' : 
              overdue ? 'text-red-400 bg-red-500/10' : 'text-zinc-400 bg-zinc-800/50'
            } ${!assignee && !unassigned ? '' : 'ml-auto'}`}>
              <Calendar size={10} /> {due}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
