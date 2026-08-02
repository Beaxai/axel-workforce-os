import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  MapPin, 
  DollarSign, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  FileText, 
  MessageSquare, 
  Settings, 
  Info,
  Map
} from 'lucide-react';

export function DecisionDock() {
  const [hoveringApprove, setHoveringApprove] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-zinc-300 font-sans">
      <div className="w-full max-w-[1200px] h-[92vh] flex flex-col bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] relative">
        
        {/* Header Section */}
        <div className="relative flex flex-row border-b border-white/10 bg-[#0a0a0c] min-h-[220px]">
          
          {/* Abstract Map/Terrain Background - Left Side */}
          <div 
            className="absolute inset-0 w-[62%] opacity-40 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 15% 50%, rgba(233, 30, 140, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 80% 20%, rgba(50, 50, 70, 0.2) 0%, transparent 50%),
                url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E")
              `,
              backgroundSize: 'cover, cover, 60px 60px',
              maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)'
            }} 
          />

          {/* Left: Info (~62%) */}
          <div className="relative z-10 flex-1 p-8 pr-12 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <div className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-semibold bg-zinc-900/80 border border-white/10 text-zinc-300">
                Cannabis
              </div>
              <div className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-semibold bg-zinc-900/80 border border-white/10 text-zinc-300">
                WC
              </div>
            </div>
            
            <h1 className="text-3xl font-semibold text-white tracking-tight mb-6">Emerald Coast Cultivation</h1>
            
            <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                <span>Locations <span className="text-zinc-200 ml-1">3</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Employees <span className="text-zinc-200 ml-1">42</span></span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                <span>Payroll <span className="text-zinc-200 ml-1">$2.1M</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-zinc-500" />
                <span>ExMod <span className="text-zinc-200 ml-1">1.12</span></span>
              </div>
            </div>
          </div>

          {/* Right: Decision Dock (~38%) */}
          <div className="w-[38%] min-w-[380px] max-w-[440px] shrink-0 border-l border-white/10 bg-zinc-950/40 backdrop-blur-xl p-6 flex flex-col relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-start mb-4">
              <div className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Decision</div>
            </div>
            
            <div className="flex items-end gap-3 mb-1">
              <div className="text-4xl font-light text-white tracking-tight">$140,792</div>
              <div className="text-[10px] text-zinc-400 mb-1.5 uppercase tracking-widest font-semibold">Est. Premium</div>
            </div>
            
            <div className="text-xs text-zinc-400 mb-5 flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md w-fit">
              <span className="text-zinc-300 font-medium tracking-wide">WFS</span> 
              <span className="text-zinc-600">|</span> 
              $8,420/mo <span className="text-zinc-600">·</span> $182 PEPM
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Quote priced
              </div>
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-semibold">
                <XCircle className="w-3 h-3" /> Binding docs
              </div>
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-semibold">
                <XCircle className="w-3 h-3" /> 2 RFIs open
              </div>
            </div>

            <div className="mt-auto space-y-2 relative">
              <div 
                className="relative group w-full"
                onMouseEnter={() => setHoveringApprove(true)}
                onMouseLeave={() => setHoveringApprove(false)}
              >
                <button className="w-full h-11 bg-gradient-to-r from-[#E91E8C] to-[#C2185B] opacity-50 cursor-not-allowed rounded-md text-white/70 font-semibold tracking-wide text-xs uppercase transition-opacity">
                  Approve Deal
                </button>
                
                {/* Tooltip */}
                {hoveringApprove && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[85%] bg-zinc-800 text-[11px] text-zinc-200 px-3 py-2 rounded shadow-xl border border-white/10 text-center animate-in fade-in zoom-in-95 duration-100 z-50 pointer-events-none">
                    Blocked by 2 open RFIs and missing binding documents. Resolve or waive them to approve.
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-r border-b border-white/10 rotate-45" />
                  </div>
                )}
              </div>
              
              <button className="w-full h-10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md font-semibold tracking-wide text-xs uppercase transition-colors">
                Decline
              </button>
            </div>
          </div>
        </div>

        {/* 6-node stage tracker */}
        <div className="bg-[#0a0a0c] border-b border-white/5 px-8 py-4 flex items-center gap-2">
          {['Lead', 'Qualified', 'Submission', 'Quote', 'Bound', 'Live'].map((stage, idx, arr) => (
            <React.Fragment key={stage}>
              <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${stage === 'Quote' ? 'text-[#E91E8C]' : idx < 3 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {stage === 'Quote' && <div className="w-1.5 h-1.5 rounded-full bg-[#E91E8C] shadow-[0_0_8px_rgba(233,30,140,0.6)]" />}
                {stage}
              </div>
              {idx < arr.length - 1 && (
                <ChevronRight className={`w-3.5 h-3.5 mx-2 ${idx < 3 ? 'text-zinc-600' : 'text-zinc-800'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0 bg-[#050505]">
          
          {/* Left Nav Rail */}
          <div className="w-56 shrink-0 border-r border-white/5 p-4 flex flex-col gap-1 overflow-y-auto">
            {[
              { id: 'Overview', icon: Activity, active: true },
              { id: 'Submission', icon: FileText },
              { id: 'Subjectivities', icon: Info, count: 2 },
              { id: 'Documents', icon: FileText },
              { id: 'Tasks', icon: CheckCircle2 },
              { id: 'Quote', icon: DollarSign },
              { id: 'Policy', icon: Building2 },
            ].map(item => (
              <button key={item.id} className={`flex items-center justify-between w-full text-left px-3 py-2.5 rounded-md transition-colors ${item.active ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'}`}>
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.id}</span>
                </div>
                {item.count && (
                  <div className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                    {item.count}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Center Content - Context (Activity Feed) */}
          <div className="flex-1 p-8 overflow-y-auto relative">
            <div className="max-w-2xl mx-auto">
              
              <div className="mb-8">
                <h2 className="text-xl font-medium text-white mb-1">Activity Overview</h2>
                <p className="text-sm text-zinc-500">Track deal progress, communications, and requirements.</p>
              </div>

              {/* Composer */}
              <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-4 mb-10 shadow-sm focus-within:border-white/20 transition-colors">
                <textarea 
                  placeholder="Leave a note, log a call, or tag @someone..."
                  className="w-full bg-transparent border-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none min-h-[60px]"
                />
                <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-2">
                  <div className="flex gap-1 text-zinc-500">
                    <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/5 hover:text-zinc-300 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/5 hover:text-zinc-300 transition-colors">
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="h-8 bg-white text-black hover:bg-zinc-200 text-xs px-4 rounded-md font-medium transition-colors">
                    Post Update
                  </button>
                </div>
              </div>

              {/* Feed List */}
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[19px] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-white/10 before:to-transparent">
                
                {/* Activity 1 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-black">
                    <Info className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex-1 bg-[#0a0a0c] border border-white/5 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-white">Subjectivity Added</div>
                      <div className="text-xs text-zinc-500">2 hours ago</div>
                    </div>
                    <div className="text-sm text-zinc-400">
                      Underwriting added a new requirement: <span className="text-zinc-200 font-medium">Missing ACORD 130</span> for binding.
                    </div>
                  </div>
                </div>

                {/* Activity 2 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 shadow-lg shadow-black text-xs font-semibold text-white">
                    SJ
                  </div>
                  <div className="flex-1 bg-[#0a0a0c] border border-white/5 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-white">Sarah Jenkins <span className="text-zinc-500 font-normal">updated quote</span></div>
                      <div className="text-xs text-zinc-500">Yesterday at 4:12 PM</div>
                    </div>
                    <div className="text-sm text-zinc-400 mb-4">
                      Revised WC premium indication based on updated payroll figures provided by the broker.
                    </div>
                    <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-0.5">New Premium</span>
                        <span className="text-sm text-white font-medium">$140,792</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity 3 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 bg-[#0a0a0c] border border-white/5 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-white">Stage Advanced</div>
                      <div className="text-xs text-zinc-500">Oct 24, 2023</div>
                    </div>
                    <div className="text-sm text-zinc-400">
                      Deal moved from <span className="text-zinc-300 font-medium">Submission</span> to <span className="text-zinc-300 font-medium">Quote</span>.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
