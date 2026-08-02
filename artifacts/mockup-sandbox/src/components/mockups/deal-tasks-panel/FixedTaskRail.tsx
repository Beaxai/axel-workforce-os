import React, { useState } from 'react';
import {
  MapPin, CheckCircle2, Circle, MessageSquare,
  Paperclip, Clock, Calendar, CheckSquare, Plus, ChevronDown, ChevronUp, User, LayoutDashboard, FileText, AlertCircle, Shield, Briefcase
} from 'lucide-react';

const OPEN_TASKS = [
  { 
    id: 1, 
    name: "Collect loss runs for 2023-2025", 
    assignee: "Marcus Webb", 
    role: "Underwriter", 
    initials: "MW", 
    dueDate: "2023-07-29", 
    dueLabel: "2d overdue", 
    status: "overdue" 
  },
  { 
    id: 2, 
    name: "Confirm class codes 0035 & 8017 with the carrier before binding", 
    assignee: "Sarah Chen", 
    role: "Underwriter", 
    initials: "SC", 
    dueDate: "2023-08-01", 
    dueLabel: "1d overdue", 
    status: "overdue" 
  },
  { 
    id: 3, 
    name: "Schedule safety inspection for the Tampa grow facility", 
    assignee: "Marcus Webb", 
    role: "Underwriter", 
    initials: "MW", 
    dueDate: "2023-08-04", 
    dueLabel: "due in 2d", 
    status: "soon" 
  },
  { 
    id: 4, 
    name: "Follow up on outstanding subjectivities with broker", 
    assignee: "Elena Rostova", 
    role: "Broker", 
    initials: "ER", 
    dueDate: "2023-08-06", 
    dueLabel: "due in 4d", 
    status: "soon" 
  },
  { 
    id: 5, 
    name: "Verify certificate of insurance wording", 
    assignee: null, 
    role: null, 
    initials: null, 
    dueDate: null, 
    dueLabel: null, 
    status: "open" 
  }
];

const COMPLETED_TASKS = [
  { 
    id: 6, 
    name: "Request updated payroll report", 
    assignee: "Marcus Webb", 
    role: "Underwriter", 
    initials: "MW", 
    dueDate: "2023-07-25", 
    dueLabel: "completed", 
    status: "completed" 
  },
  { 
    id: 7, 
    name: "Send indication to broker", 
    assignee: "Sarah Chen", 
    role: "Underwriter", 
    initials: "SC", 
    dueDate: "2023-07-26", 
    dueLabel: "completed", 
    status: "completed" 
  }
];

const stages = ["Lead", "Qualified", "Submission", "Quote", "Bound", "Live"];

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Submission", icon: FileText },
  { label: "Subjectivities", icon: AlertCircle },
  { label: "Documents", icon: Paperclip },
  { label: "Quote", icon: MessageSquare },
  { label: "Policy", icon: Shield }
];

const activities = [
  { user: "Sarah Chen", action: "generated a new quote", time: "2 hours ago", detail: "$48,200 est. premium. Version 2." },
  { user: "Marcus Webb", action: "updated employee count", time: "4 hours ago", detail: "Changed from 38 to 42." },
  { user: "System", action: "flagged class code 0035 for review", time: "1 day ago", detail: "High risk category for new locations." },
  { user: "Broker (Elena)", action: "uploaded loss runs", time: "2 days ago", detail: "2023-2025_loss_runs.pdf attached." },
];

const TaskCard = ({ task }: { task: any }) => (
  <div className="group flex gap-3 p-4 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
    <button className="flex-shrink-0 mt-0.5 text-zinc-600 hover:text-pink-500 transition-colors">
      {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-pink-500" /> : <Circle className="w-4 h-4" />}
    </button>
    <div className="flex-1 min-w-0 space-y-2.5">
      <p className={`text-[13px] leading-relaxed break-words whitespace-normal ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
        {task.name}
      </p>
      
      {task.status !== 'completed' && (
        <div className="flex flex-wrap items-center gap-2">
          {task.assignee ? (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-zinc-800/50 border border-zinc-700/50">
              <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-medium text-zinc-200">
                {task.initials}
              </div>
              <span className="text-[11px] text-zinc-300 font-medium">{task.assignee} <span className="text-zinc-500 font-normal">— {task.role}</span></span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-zinc-700/50 text-zinc-500 bg-zinc-900/30">
              <User className="w-3 h-3" />
              <span className="text-[11px] font-medium">Unassigned</span>
            </div>
          )}

          {task.dueDate && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium ${
              task.status === 'overdue' ? 'border-red-900/50 text-red-400 bg-red-950/20' :
              task.status === 'soon' ? 'border-amber-900/50 text-amber-400 bg-amber-950/20' :
              'border-zinc-800 text-zinc-500'
            }`}>
              <Clock className="w-3 h-3" />
              {task.dueLabel}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

export function FixedTaskRail() {
  const [isAdding, setIsAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="min-h-screen bg-black/80 backdrop-blur-md flex items-center justify-center p-8 font-sans text-[13px] text-zinc-300">
      {/* Dialog Frame */}
      <div className="w-full max-w-[1280px] h-[92vh] bg-zinc-950 border border-zinc-800/80 rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative">
        
        {/* Header Band */}
        <div className="relative h-[140px] border-b border-zinc-800 flex-shrink-0 bg-zinc-900">
          {/* Artwork & Gradients */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              <path d="M0 80 Q 150 10, 300 100 T 600 50 T 900 120 T 1300 40" fill="none" stroke="white" strokeWidth="1" />
              <path d="M0 120 Q 200 60, 400 140 T 800 80 T 1300 150" fill="none" stroke="white" strokeWidth="0.5" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-900/50"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-900/10 via-transparent to-transparent mix-blend-screen"></div>
          </div>
          
          {/* Header Content */}
          <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3.5">
                <h1 className="text-xl font-semibold text-white tracking-tight shadow-sm">Emerald Coast Cultivation</h1>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold tracking-wider">CANNABIS</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold tracking-wider">WC</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div className="px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-medium text-[13px] shadow-[0_0_15px_rgba(233,30,140,0.15)] flex items-center gap-2 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                  $48,200 Est. Premium
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-[11px] font-semibold tracking-wider text-zinc-500">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-zinc-300">LOCATIONS 3</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-zinc-300">EMPLOYEES 42</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-zinc-300">PAYROLL $2.1M</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-zinc-300">EXMOD 1.12</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stage Tracker */}
        <div className="h-14 border-b border-zinc-800/80 flex items-center px-6 flex-shrink-0 bg-zinc-950 z-10 relative">
          <div className="flex items-center w-full">
            {stages.map((stage, idx) => (
              <React.Fragment key={stage}>
                <div className={`flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase ${stage === 'Quote' ? 'text-pink-500' : idx < 3 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${stage === 'Quote' ? 'bg-pink-500 shadow-[0_0_10px_rgba(233,30,140,0.6)]' : idx < 3 ? 'bg-zinc-500' : 'border border-zinc-700 bg-zinc-900'}`} />
                  {stage}
                </div>
                {idx < stages.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${idx < 3 ? 'bg-zinc-700' : 'bg-zinc-800/80'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body Area */}
        <div className="flex flex-1 min-h-0 bg-zinc-950 relative">
          
          {/* Left Nav */}
          <div className="w-[140px] border-r border-zinc-800/80 flex-shrink-0 p-3 space-y-0.5 bg-zinc-950/50 overflow-y-auto">
            {navItems.map(item => (
              <button key={item.label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${item.active ? 'bg-zinc-800/60 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}>
                <item.icon className="w-4 h-4 opacity-80" />
                <span className="text-[12px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
          
          {/* Center Content (Overview Tab) */}
          <div className="flex-1 min-w-0 flex flex-col relative bg-[#09090b]">
            <div className="h-12 flex items-center px-6 border-b border-zinc-800/50 flex-shrink-0 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="text-[13px] font-semibold text-zinc-200">Activity Overview</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {activities.map((act, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] text-zinc-400 font-medium shadow-sm">
                    {act.user.charAt(0)}
                  </div>
                  <div className="space-y-2 text-[13px] max-w-2xl">
                    <div>
                      <span className="font-semibold text-zinc-200">{act.user}</span>{' '}
                      <span className="text-zinc-400">{act.action}</span>
                      <span className="text-zinc-600 ml-2 text-[11px] font-medium">{act.time}</span>
                    </div>
                    <div className="px-4 py-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-zinc-300 leading-relaxed shadow-sm">
                      {act.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
              <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-hidden focus-within:border-zinc-700 focus-within:bg-zinc-900/50 transition-colors shadow-sm">
                <textarea 
                  placeholder="Add a note, update, or mention someone..." 
                  className="w-full bg-transparent p-3.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none min-h-[72px]"
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/50 bg-zinc-900/50">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <button className="p-1.5 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"><Paperclip className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"><User className="w-4 h-4" /></button>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-md bg-zinc-800 text-zinc-200 text-[12px] font-medium hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50 shadow-sm">
                    Post update
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Persistent Tasks Rail */}
          <div className="w-[340px] border-l border-zinc-800 flex-shrink-0 flex flex-col bg-zinc-900/20 z-10 shadow-[-8px_0_24px_rgba(0,0,0,0.2)]">
            {/* Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-800/80 flex-shrink-0 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Tasks</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-300 text-[10px] font-bold leading-none shadow-sm">
                  {OPEN_TASKS.length}
                </span>
              </div>
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className={`w-6 h-6 rounded border flex items-center justify-center transition-colors shadow-sm ${
                  isAdding 
                  ? 'bg-zinc-800 border-zinc-600 text-white' 
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-700'
                }`}
              >
                <Plus className={`w-3.5 h-3.5 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Inline Add Task */}
              {isAdding && (
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 space-y-3 shadow-inner">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="What needs to be done?" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all shadow-sm"
                  />
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors text-[11px] font-medium">
                      <User className="w-3 h-3" /> Assign
                    </button>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors text-[11px] font-medium">
                      <Calendar className="w-3 h-3" /> Due date
                    </button>
                    <div className="flex-1" />
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="px-2.5 py-1.5 rounded text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-3 py-1.5 rounded text-[11px] font-medium bg-pink-600 text-white hover:bg-pink-500 shadow-sm transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Open Tasks List */}
              <div className="divide-y divide-zinc-800/40">
                {OPEN_TASKS.map(task => <TaskCard key={task.id} task={task} />)}
              </div>

              {/* Completed Tasks Section */}
              <div className="mt-2 mb-8">
                <button 
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 px-4 py-3 w-full text-left text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20 transition-colors text-[12px] font-medium"
                >
                  {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Completed ({COMPLETED_TASKS.length})
                </button>
                
                {showCompleted && (
                  <div className="divide-y divide-zinc-800/30 border-t border-zinc-800/30 bg-zinc-950/20">
                     {COMPLETED_TASKS.map(task => <TaskCard key={task.id} task={task} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
