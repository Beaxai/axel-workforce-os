import React, { useState } from 'react';
import {
  MapPin, FileText, MessageSquare, Activity, FileCheck, Search, Users, Map, Check
} from 'lucide-react';
import { cn } from "@/lib/utils";

// Mock Data
const STAGES = [
  { id: 'sub', name: 'Submission Pending', date: 'Jul 2', duration: '7d', status: 'completed' },
  { id: 'ind', name: 'Indication', date: 'Jul 9', duration: '9d', status: 'completed' },
  { id: 'uw', name: 'U/W Review', date: 'Jul 18', duration: 'Current (5d)', status: 'current' },
  { id: 'dec', name: 'Approved / Declined', date: null, duration: null, status: 'future' },
  { id: 'bind', name: 'Binding', date: null, duration: null, status: 'future' },
  { id: 'imp', name: 'Implementation', date: null, duration: null, status: 'future' },
];

const ACTIVITIES = [
  { id: 1, type: 'status', text: 'Stage moved to U/W Review', date: 'Jul 18, 09:12 AM', author: 'System', stage: 'uw' },
  { id: 2, type: 'doc', text: 'RFI answered: payroll audit docs uploaded', date: 'Jul 15, 02:30 PM', author: 'Sarah Chen', stage: 'ind' },
  { id: 3, type: 'note', text: 'Spoke with U/W regarding the 2024 loss ratio. Waiting for Q2 update to finalize.', date: 'Jul 14, 11:15 AM', author: 'Sarah Chen', stage: 'ind' },
  { id: 4, type: 'quote', text: 'Quote v3 generated — WC premium updated to reflect new payroll', date: 'Jul 12, 04:45 PM', author: 'System', stage: 'ind' },
  { id: 5, type: 'status', text: 'Stage moved to Indication', date: 'Jul 9, 10:00 AM', author: 'System', stage: 'ind' },
  { id: 6, type: 'note', text: 'Initial submission sent to 3 carriers.', date: 'Jul 2, 01:20 PM', author: 'Sarah Chen', stage: 'sub' },
];

const DOCUMENTS = [
  { id: 1, name: 'ACORD 130.pdf', type: 'application/pdf', size: '2.4 MB', date: 'Jul 2', stage: 'sub' },
  { id: 2, name: 'Loss runs 2023-25.pdf', type: 'application/pdf', size: '4.1 MB', date: 'Jul 2', stage: 'sub' },
  { id: 3, name: 'Payroll report Q2.xlsx', type: 'application/vnd.ms-excel', size: '1.2 MB', date: 'Jul 15', stage: 'ind' },
];

const TASKS = [
  { id: 1, text: 'Collect signed BOR', due: 'Jul 30', status: 'open', owner: 'Sarah Chen', stage: 'uw' },
  { id: 2, text: 'Confirm class codes 0005/8810', due: 'Aug 2', status: 'open', owner: 'System', stage: 'uw' },
  { id: 3, text: 'Review initial carrier questions', due: 'Jul 11', status: 'completed', owner: 'Sarah Chen', stage: 'ind' },
];

export function TimelineRail() {
  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  const toggleStage = (id: string) => {
    if (selectedStages.includes(id)) {
      setSelectedStages(selectedStages.filter(s => s !== id));
    } else {
      setSelectedStages([...selectedStages, id]);
    }
  };

  const isFiltering = selectedStages.length > 0;
  const filteredActivities = ACTIVITIES.filter(a => !isFiltering || selectedStages.includes(a.stage));
  const filteredDocs = DOCUMENTS.filter(d => !isFiltering || selectedStages.includes(d.stage));
  const filteredTasks = TASKS.filter(t => !isFiltering || selectedStages.includes(t.stage));

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8 font-sans selection:bg-[#E91E8C]/30 selection:text-white">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#E91E8C]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Main Dialog Panel */}
      <div className="relative w-full max-w-[1040px] h-[92vh] bg-neutral-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5">
        
        {/* Header */}
        <div className="h-[88px] px-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02] relative z-20">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              E
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-wide mb-1">Emerald Coast Cultivation</h1>
              <div className="flex items-center gap-3 text-[11px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">
                <span className="flex items-center gap-1 text-neutral-300"><MapPin size={12} className="text-[#E91E8C]"/> FL</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span>Cannabis</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span className="flex items-center gap-1"><Map size={12}/> 3 Locs</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span className="flex items-center gap-1"><Users size={12}/> 42 Emps</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span>E-mod 0.87</span>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col justify-center items-end">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Est. Premium</div>
            <div className="text-2xl font-mono text-[#E91E8C] tracking-tight">$128,400</div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left rail - Timeline Filter */}
          <div className="w-[300px] shrink-0 border-r border-white/10 bg-black/20 overflow-y-auto flex flex-col py-6 px-5 relative z-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Timeline Filter</div>
              <button 
                onClick={() => setSelectedStages([])} 
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-all",
                  isFiltering ? "text-[#E91E8C] hover:text-[#E91E8C]/80 opacity-100" : "text-neutral-600 pointer-events-none opacity-0"
                )}
              >
                Clear
              </button>
            </div>

            <div className="relative">
              <div className="absolute left-[24px] top-6 bottom-6 w-px bg-white/10" />
              <div className="flex flex-col gap-2">
                {STAGES.map((stage) => (
                  <div key={stage.id} className="relative flex items-stretch gap-3 group px-2">
                    <div className="w-8 flex justify-center items-start pt-[14px] shrink-0 relative z-10">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full ring-4 transition-colors",
                        selectedStages.includes(stage.id) ? "bg-[#E91E8C] ring-[#E91E8C]/20" :
                        stage.status === 'completed' ? "bg-white/40 ring-neutral-950" :
                        stage.status === 'current' ? "bg-white ring-white/10 shadow-[0_0_10px_rgba(255,255,255,0.5)] animate-pulse" : "bg-white/10 ring-neutral-950"
                      )} />
                    </div>
                    
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className={cn(
                        "flex-1 p-3.5 rounded-xl border text-left transition-all relative overflow-hidden",
                        selectedStages.includes(stage.id)
                          ? "bg-[#E91E8C]/10 border-[#E91E8C]/30 ring-1 ring-[#E91E8C]/20 shadow-[0_0_15px_rgba(233,30,140,0.1)]"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06]",
                        stage.status === 'future' && "opacity-40 hover:opacity-60"
                      )}
                    >
                      {selectedStages.includes(stage.id) && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#E91E8C]/20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                      <div className="flex justify-between items-center relative z-10">
                        <span className={cn("font-semibold text-[13px] tracking-wide", selectedStages.includes(stage.id) ? "text-white" : "text-neutral-300")}>{stage.name}</span>
                        {selectedStages.includes(stage.id) && <Check size={14} className="text-[#E91E8C]" />}
                      </div>
                      {(stage.date || stage.duration) && (
                        <div className="flex justify-between mt-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider relative z-10">
                          <span className={stage.status === 'current' ? "text-[#E91E8C]" : ""}>{stage.date || 'TBD'}</span>
                          <span>{stage.duration}</span>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 bg-black/10 overflow-y-auto relative scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            
            {/* Active Filter Banner */}
            {isFiltering && (
              <div className="sticky top-0 z-20 px-8 py-2.5 bg-[#E91E8C]/10 border-b border-[#E91E8C]/20 backdrop-blur-xl flex items-center justify-between shadow-[0_4px_20px_-4px_rgba(233,30,140,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-3 h-3">
                    <div className="absolute inset-0 rounded-full bg-[#E91E8C] animate-ping opacity-50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E91E8C]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest truncate max-w-[500px]">
                    Showing: {STAGES.filter(s => selectedStages.includes(s.id)).map(s => s.name).join(', ')}
                  </span>
                </div>
                <button onClick={() => setSelectedStages([])} className="text-[10px] font-bold text-neutral-400 hover:text-white uppercase tracking-widest transition-colors">
                  Show All
                </button>
              </div>
            )}

            <div className="pb-16 pt-2">
              <SectionHeader title="Activity" count={filteredActivities.length} />
              <div className="px-8 pt-4 pb-2">
                {filteredActivities.length ? filteredActivities.map(a => <ActivityItem key={a.id} {...a} />) : <EmptyState section="activities" />}
              </div>

              <SectionHeader title="Documents" count={filteredDocs.length} />
              <div className="pt-2 pb-2">
                {filteredDocs.length ? filteredDocs.map(d => <DocItem key={d.id} {...d} />) : <EmptyState section="documents" />}
              </div>

              <SectionHeader title="Tasks" count={filteredTasks.length} />
              <div className="pt-2 pb-2">
                {filteredTasks.length ? filteredTasks.map(t => <TaskItem key={t.id} {...t} />) : <EmptyState section="tasks" />}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponents

const SectionHeader = ({ title, count }: { title: string, count: number }) => (
  <div className="border-b border-white/10 py-4 px-8 flex items-center justify-between mb-2">
    <h2 className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest">{title}</h2>
    <span className="text-[10px] text-neutral-500 font-mono bg-white/5 px-2 py-0.5 rounded-full">{count}</span>
  </div>
);

const ActivityItem = ({ type, text, date, author }: any) => {
  const Icon = type === 'status' ? Activity : type === 'doc' ? FileCheck : type === 'quote' ? FileText : MessageSquare;
  return (
    <div className="flex gap-4 mb-6 relative group">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors",
        type === 'status' ? "bg-[#E91E8C]/10 border-[#E91E8C]/20 text-[#E91E8C]" :
        "bg-white/[0.02] border-white/5 text-neutral-400 group-hover:bg-white/[0.05]"
      )}>
        <Icon size={14} />
      </div>
      <div className="flex-1 pt-0.5">
        <div className={cn("text-[13px] leading-relaxed", type === 'status' ? "text-[#E91E8C] font-medium" : "text-neutral-300")}>{text}</div>
        <div className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-2 font-mono uppercase tracking-wider">
          <span>{date}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-700" />
          <span>{author}</span>
        </div>
      </div>
    </div>
  );
};

const DocItem = ({ name, size, date }: any) => (
  <div className="flex items-center gap-4 py-3 border-b border-white/5 hover:bg-white/[0.02] px-8 transition-colors group cursor-pointer">
    <div className="w-9 h-9 rounded bg-white/[0.03] border border-white/5 text-neutral-400 flex items-center justify-center shrink-0 group-hover:text-[#E91E8C] transition-colors">
      <FileText size={16} />
    </div>
    <div className="flex-1">
      <div className="text-[13px] text-neutral-200 font-medium group-hover:text-white transition-colors">{name}</div>
      <div className="text-[11px] text-neutral-500 font-mono uppercase tracking-widest mt-1">
        {date} <span className="mx-1 text-neutral-700">•</span> {size}
      </div>
    </div>
    <button className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 group-hover:text-[#E91E8C] transition-colors border border-transparent group-hover:border-[#E91E8C]/30 px-3 py-1.5 rounded-full">
      View
    </button>
  </div>
);

const TaskItem = ({ text, due, status, owner }: any) => (
  <div className="flex items-start gap-4 py-3.5 border-b border-white/5 hover:bg-white/[0.02] px-8 transition-colors group cursor-pointer">
    <button className={cn(
      "w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 transition-all",
      status === 'completed' ? "bg-[#E91E8C] text-white" : "border border-neutral-600 group-hover:border-[#E91E8C]"
    )}>
      {status === 'completed' && <Check size={10} strokeWidth={3} />}
    </button>
    <div className="flex-1">
      <div className={cn("text-[13px] font-medium transition-colors", status === 'completed' ? "text-neutral-500 line-through" : "text-neutral-200 group-hover:text-white")}>{text}</div>
      <div className="text-[11px] text-neutral-500 font-mono uppercase tracking-widest mt-1.5 flex gap-2 items-center">
        <span className={cn(status !== 'completed' && due === 'Jul 30' ? "text-amber-400" : "")}>Due {due}</span>
        <span className="w-1 h-1 rounded-full bg-neutral-700" />
        <span>{owner}</span>
      </div>
    </div>
  </div>
);

const EmptyState = ({ section }: { section: string }) => (
  <div className="py-12 flex flex-col items-center justify-center text-center px-4">
    <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
      <Search size={16} className="text-neutral-500" />
    </div>
    <div className="text-[13px] font-medium text-neutral-400 mb-1">No {section} found</div>
    <div className="text-[11px] text-neutral-600 font-mono uppercase tracking-widest">Adjust your timeline filter</div>
  </div>
);
