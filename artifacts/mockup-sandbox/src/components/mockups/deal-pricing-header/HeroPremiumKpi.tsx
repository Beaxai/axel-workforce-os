import React from "react";
import {
  MapPin,
  Users,
  DollarSign,
  Activity,
  FileWarning,
  Check,
  X,
  Building2,
  Shield,
  ChevronRight,
  MessageSquare,
  FileText,
  UploadCloud,
  Eye,
  Info,
  Send
} from "lucide-react";

export function HeroPremiumKpi() {
  return (
    <div className="min-h-screen bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 font-sans antialiased text-zinc-300">
      
      {/* Modal Container */}
      <div className="w-full max-w-[1200px] h-[92vh] bg-zinc-950/90 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative">
        
        {/* Abstract Map Background for Header */}
        <div className="absolute top-0 left-0 w-full h-[280px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-900/10 to-transparent pointer-events-none mix-blend-screen opacity-50 z-0">
          <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-122.42,37.77,11/1200x400?access_token=pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJja29xNXptNzkwN3p0MnZxcGw2OXE2b2ZzIn0.example')] bg-cover bg-center opacity-10 mix-blend-luminosity grayscale"></div>
          {/* Fallback pattern if image fails */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjI1KSIvPjwvc3ZnPg==')] bg-repeat"></div>
        </div>

        {/* --- HEADER BAND --- */}
        <div className="relative z-10 flex flex-col pt-8 bg-gradient-to-b from-black/60 to-zinc-950 border-b border-white/5">
          
          {/* Row 1: Identity & Badges */}
          <div className="px-8 flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center shadow-inner">
                <Building2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-medium text-white tracking-tight leading-none mb-2">Emerald Coast Cultivation</h1>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-wider">Cannabis</span>
                  <span className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] uppercase font-bold tracking-wider">WC</span>
                  <span className="text-xs text-zinc-500 ml-2">ID: DEAL-84920</span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions top right */}
            <div className="flex items-center gap-3">
              <button className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm transition-colors flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-400" />
                Underwriting
              </button>
              <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: KPI Row + Hero Premium */}
          <div className="px-8 mb-4">
            <div className="flex items-center bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden text-sm w-max shadow-sm">
              
              {/* Standard KPIs */}
              <div className="flex items-center px-4 py-2 border-r border-white/5 gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">Locations</span>
                <span className="font-medium text-white">3</span>
              </div>
              <div className="flex items-center px-4 py-2 border-r border-white/5 gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">Employees</span>
                <span className="font-medium text-white">42</span>
              </div>
              <div className="flex items-center px-4 py-2 border-r border-white/5 gap-2">
                <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">Payroll</span>
                <span className="font-medium text-white">$2.1M</span>
              </div>
              <div className="flex items-center px-4 py-2 border-r border-white/10 gap-2">
                <Activity className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">ExMod</span>
                <span className="font-medium text-white">1.12</span>
              </div>

              {/* Hero Premium (5th KPI) */}
              <div className="flex items-center px-5 py-2 border-r border-white/10 gap-3 bg-pink-500/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent opacity-50"></div>
                <div className="relative z-10 flex flex-col justify-center">
                  <span className="text-pink-400 text-[10px] uppercase font-bold tracking-widest drop-shadow-[0_0_8px_rgba(233,30,140,0.3)]">Est. Premium</span>
                </div>
                <div className="relative z-10 font-bold text-lg text-white drop-shadow-[0_0_12px_rgba(233,30,140,0.5)]">
                  $140,792
                </div>
              </div>

              {/* WFS (6th KPI) */}
              <div className="flex items-center px-4 py-2 gap-3 bg-white/5">
                <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">WFS</span>
                <button className="h-6 px-3 rounded-md bg-gradient-to-r from-indigo-500 to-indigo-400 text-white text-[10px] font-bold uppercase tracking-wide hover:from-indigo-400 hover:to-indigo-300 transition-all shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                  Get Quote Now
                </button>
              </div>

            </div>
          </div>

          {/* Row 3: Action Line */}
          <div className="px-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500/90 text-sm italic bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <FileWarning className="w-4 h-4" />
              <span>Required documents missing for binding.</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 flex items-center gap-1 font-medium">
                <Info className="w-3 h-3" /> Underwriter view
              </span>
              <div className="h-4 w-px bg-white/10"></div>
              <button className="px-4 py-1.5 rounded-lg text-sm font-medium text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                Decline
              </button>
              <button className="px-5 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 shadow-[0_0_15px_rgba(233,30,140,0.3)] transition-all flex items-center gap-2">
                <Check className="w-4 h-4" />
                Approve
              </button>
            </div>
          </div>
        </div>

        {/* --- STAGE TRACKER --- */}
        <div className="relative z-10 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl px-8 flex items-center h-14 shrink-0">
          <div className="flex items-center w-full max-w-4xl mx-auto justify-between relative">
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-4 right-4 h-px bg-white/10 -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-4 right-1/4 h-px bg-pink-500/50 -translate-y-1/2 z-0 shadow-[0_0_8px_rgba(233,30,140,0.4)]"></div>

            {/* Nodes */}
            {[
              { label: "Lead", state: "done" },
              { label: "Qualified", state: "done" },
              { label: "Submission", state: "done" },
              { label: "Quote", state: "active" },
              { label: "Bound", state: "upcoming" },
              { label: "Live", state: "upcoming" },
            ].map((stage) => (
              <div key={stage.label} className="relative z-10 flex flex-col items-center gap-2 bg-zinc-950 px-2">
                <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                  stage.state === 'done' 
                    ? 'bg-pink-500 border-pink-500 shadow-[0_0_8px_rgba(233,30,140,0.4)]' 
                    : stage.state === 'active'
                    ? 'bg-zinc-950 border-pink-400 ring-4 ring-pink-500/20'
                    : 'bg-zinc-900 border-zinc-700'
                }`} />
                <span className={`absolute top-5 text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${
                  stage.state === 'done' ? 'text-zinc-400'
                  : stage.state === 'active' ? 'text-pink-400'
                  : 'text-zinc-600'
                }`}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 flex overflow-hidden bg-zinc-950/60 relative z-10 mt-6">
          
          {/* Left Nav Rail */}
          <div className="w-56 border-r border-white/5 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
            {[
              { label: "Overview", icon: Eye, active: true },
              { label: "Submission", icon: UploadCloud },
              { label: "Subjectivities", icon: FileWarning, count: 2 },
              { label: "Documents", icon: FileText, count: 14 },
              { label: "Tasks", icon: Check, count: 5 },
              { label: "Quote", icon: DollarSign },
              { label: "Policy", icon: Shield },
            ].map((nav) => (
              <button 
                key={nav.label} 
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  nav.active 
                    ? 'bg-white/10 text-white' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <nav.icon className={`w-4 h-4 ${nav.active ? 'text-pink-400' : 'text-zinc-500'}`} />
                  {nav.label}
                </div>
                {nav.count && (
                  <span className="bg-white/5 px-2 py-0.5 rounded-full text-[10px] font-bold text-zinc-500">
                    {nav.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Center Content (Overview) */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            <div className="max-w-2xl mx-auto flex flex-col gap-8">
              
              {/* Activity Composer */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
                    <span className="text-pink-400 text-xs font-bold">UW</span>
                  </div>
                  <div className="flex-1">
                    <textarea 
                      placeholder="Add a note or update..." 
                      className="w-full bg-transparent border-0 text-sm text-white placeholder-zinc-500 focus:ring-0 resize-none h-12"
                    />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <div className="flex gap-2">
                        <button className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-md transition-colors">
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                      <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2">
                        Post Note
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="flex flex-col gap-6">
                
                {/* System Event */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                    <Activity className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">System</span>
                      <span className="text-xs text-zinc-500">Today at 10:42 AM</span>
                    </div>
                    <div className="text-sm text-zinc-400">
                      Moved deal stage from <span className="text-zinc-300 font-medium">Submission</span> to <span className="text-pink-400 font-medium">Quote</span>.
                    </div>
                  </div>
                </div>

                {/* User Note */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-zinc-400 text-xs font-bold">JD</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">John Doe</span>
                      <span className="text-xs text-zinc-500">Yesterday at 3:15 PM</span>
                    </div>
                    <div className="text-sm text-zinc-300 bg-zinc-900/50 border border-white/5 rounded-xl p-4 mt-2">
                      Reviewed the loss runs. ExMod of 1.12 seems accurate based on the recent claims history. Pushing to quoting.
                    </div>
                  </div>
                </div>

                {/* Document Upload */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                    <UploadCloud className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">Broker Portal</span>
                      <span className="text-xs text-zinc-500">Yesterday at 11:00 AM</span>
                    </div>
                    <div className="text-sm text-zinc-400 mb-2">
                      Uploaded 2 new documents.
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors cursor-pointer w-48">
                        <FileText className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-zinc-300 truncate">loss_runs_2023.pdf</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors cursor-pointer w-48">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-zinc-300 truncate">acord_130.pdf</span>
                      </div>
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
