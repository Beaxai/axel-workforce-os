import React from 'react';
import { 
  CheckCircle2, 
  MessageSquare,
  ShieldAlert,
  Pencil,
  FileText,
  User,
  Activity,
  History,
  Paperclip
} from 'lucide-react';

export function ActionBand() {
  const stages = ["Lead", "Qualified", "Submission", "Quote", "Bound", "Live"];
  const activeStage = 3; // Quote (0-indexed)

  const navItems = [
    { name: 'Overview', active: true },
    { name: 'Submission', active: false },
    { name: 'Subjectivities', active: false, badge: '2' },
    { name: 'Documents', active: false },
    { name: 'Tasks', active: false, badge: '1' },
    { name: 'Quote', active: false },
    { name: 'Policy', active: false },
  ];

  const activities = [
    {
      id: 1,
      user: "Sarah Jenkins",
      action: "uploaded revised payroll documents",
      time: "2 hours ago",
      icon: <FileText className="w-4 h-4 text-zinc-400" />,
      content: "Q3_941_revised_final.pdf (2.4 MB)"
    },
    {
      id: 2,
      user: "System",
      action: "auto-generated initial quote based on class code analysis",
      time: "Yesterday, 4:15 PM",
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      content: null
    },
    {
      id: 3,
      user: "Marcus Chen",
      action: "left a note",
      time: "Yesterday, 2:30 PM",
      icon: <MessageSquare className="w-4 h-4 text-blue-400" />,
      content: "Waiting on confirmation for the additional out-of-state location before we can proceed with binding."
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#050505] to-[#050505] flex items-center justify-center p-4 md:p-8 font-sans text-zinc-300">
      
      {/* Dialog Frame */}
      <div className="w-full max-w-[1240px] h-[92vh] flex flex-col bg-[#0a0a0b] rounded-xl border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5 relative">
        
        {/* Header Block with Map Artwork */}
        <div className="relative shrink-0 overflow-hidden bg-zinc-950 border-b border-white/5">
          {/* Subtle map / topography placeholder */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 100 Q 25 50 50 100 T 100 100 M 0 50 Q 25 0 50 50 T 100 50' fill='none' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.2'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23p)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px'
          }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0b]/80 to-[#0a0a0b] pointer-events-none" />
          
          <div className="relative z-10 px-8 py-6 pb-5">
            {/* Business Info */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Emerald Coast Cultivation</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cannabis</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">WC</span>
                </div>
                {/* KPI Row */}
                <div className="flex items-center gap-6 text-[11px] font-bold tracking-widest text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span>LOCATIONS</span>
                    <span className="text-zinc-200">3</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-800" />
                  <div className="flex items-center gap-2">
                    <span>EMPLOYEES</span>
                    <span className="text-zinc-200">42</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-800" />
                  <div className="flex items-center gap-2">
                    <span>PAYROLL</span>
                    <span className="text-zinc-200">$2.1M</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-800" />
                  <div className="flex items-center gap-2">
                    <span>EXMOD</span>
                    <span className="text-zinc-200">1.12</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BAND (The core redesign) */}
            <div className="flex items-center justify-between bg-[#121214]/80 backdrop-blur-md border border-white/[0.08] rounded-lg p-2.5 shadow-lg relative overflow-hidden h-[52px]">
              <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />
              
              <div className="flex items-center h-full flex-1 relative z-10 w-full">
                {/* Left: WC Pricing */}
                <div className="flex items-center gap-4 px-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 shrink-0">WC Premium</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[22px] leading-none font-mono font-medium text-white tracking-tight">$140,792</span>
                    <button className="text-[10px] font-semibold tracking-wider uppercase text-[#E91E8C] hover:text-pink-400 flex items-center gap-1 transition-colors">
                      <Pencil className="w-3 h-3" />
                      Modify
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-white/[0.08] mx-2" />

                {/* Middle: WFS Pricing & Warnings */}
                <div className="flex items-center justify-between px-3 flex-1 overflow-hidden">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 shrink-0">WFS</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[15px] font-mono font-medium text-zinc-200">$8,420</span>
                      <span className="text-[11px] font-mono text-zinc-500">/mo</span>
                    </div>
                    <span className="text-zinc-700 font-bold">·</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[13px] font-mono font-medium text-zinc-400">$182</span>
                      <span className="text-[11px] font-mono text-zinc-600">PEPM</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded bg-amber-500/[0.04] border border-amber-500/10 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-[11px] italic text-amber-500/90 font-medium">
                      Required documents missing for binding.
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 pl-2 pr-1 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/[0.08] border border-red-500/20 rounded text-[10px] font-bold uppercase tracking-wider text-red-400">
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    2 open RFIs
                  </div>
                  
                  <button className="px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-transparent hover:bg-white/5 rounded transition-colors h-[34px] flex items-center">
                    Decline
                  </button>
                  <button className="px-6 text-[11px] font-bold uppercase tracking-wider text-white rounded bg-gradient-to-r from-[#E91E8C] to-[#d81b60] opacity-50 cursor-not-allowed shadow-[0_4px_14px_rgba(233,30,140,0.2)] h-[34px] flex items-center transition-all hover:opacity-60">
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Tracker */}
        <div className="shrink-0 bg-[#0c0c0d] border-b border-white/5 py-4 px-8">
          <div className="flex items-center w-full max-w-3xl">
            {stages.map((stage, i) => {
              const isPast = i < activeStage;
              const isActive = i === activeStage;
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center
                      ${isActive ? 'bg-[#E91E8C] shadow-[0_0_12px_rgba(233,30,140,0.5)] ring-4 ring-[#E91E8C]/20' : 
                        isPast ? 'bg-zinc-600' : 'bg-zinc-800 border border-zinc-700'}`} 
                    >
                      {isPast && <CheckCircle2 className="w-2.5 h-2.5 text-zinc-950" />}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest absolute top-6 whitespace-nowrap
                      ${isActive ? 'text-[#E91E8C]' : isPast ? 'text-zinc-500' : 'text-zinc-700'}`}>
                      {stage}
                    </span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className={`flex-1 h-px mx-2 -translate-y-2.5
                      ${isPast ? 'bg-zinc-700' : 'bg-zinc-800'}`} 
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 min-h-0 flex bg-[#050505]">
          {/* Left Nav Rail */}
          <div className="w-[200px] shrink-0 border-r border-white/5 py-6 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                className={`flex items-center justify-between w-full px-6 py-2.5 text-[12px] font-medium transition-colors
                  ${item.active ? 'text-white bg-white/5 border-l-2 border-[#E91E8C]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border-l-2 border-transparent'}`}
              >
                {item.name}
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                    ${item.name === 'Subjectivities' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-zinc-400'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Center Content (Overview Activity Feed Mock) */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            <div className="max-w-2xl">
              <h2 className="text-sm font-semibold text-white mb-6">Recent Activity</h2>
              
              <div className="space-y-8 relative">
                {/* Timeline track */}
                <div className="absolute top-2 bottom-0 left-[19px] w-px bg-zinc-800/50 -z-10" />
                
                {/* Composer */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 focus-within:border-zinc-700 transition-colors">
                    <textarea 
                      placeholder="Add a note or mention someone..."
                      className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none min-h-[60px]"
                    />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                      <button className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded hover:bg-zinc-200 transition-colors">
                        Post
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feed Items */}
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 z-10">
                      {activity.icon}
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="text-sm">
                          <span className="font-semibold text-zinc-200">{activity.user}</span>
                          <span className="text-zinc-500 ml-1.5">{activity.action}</span>
                        </div>
                        <span className="text-[11px] text-zinc-600 font-medium">{activity.time}</span>
                      </div>
                      
                      {activity.content && (
                        <div className="mt-2 text-sm text-zinc-400 bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3">
                          {activity.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-4 pb-8 text-zinc-600">
                  <History className="w-4 h-4" />
                  <span className="text-xs font-medium">View all previous activity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
