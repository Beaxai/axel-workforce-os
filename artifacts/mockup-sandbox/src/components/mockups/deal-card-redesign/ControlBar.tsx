import React, { useState } from 'react';
import { 
  Star, MapPin, Users, Briefcase, FileText, CheckCircle2, 
  Activity, ListTodo, Filter, ChevronDown, X, Clock, 
  MessageSquare, UploadCloud, Search, MoreHorizontal
} from 'lucide-react';

// --- MOCK DATA ---

const DEAL = {
  name: "Emerald Coast Cultivation",
  industry: "Cannabis Cultivation",
  location: "Orlando, FL",
  estPremium: 128400,
  locations: 3,
  employees: 42,
  emod: 0.87,
};

const STAGES = [
  { id: 'submission', label: 'Submission Pending', date: 'Jul 2', status: 'completed' },
  { id: 'indication', label: 'Indication', date: 'Jul 9', status: 'completed' },
  { id: 'review', label: 'U/W Review', date: 'Jul 18', status: 'current' },
  { id: 'decision', label: 'Approved / Declined', date: null, status: 'upcoming' },
  { id: 'binding', label: 'Binding', date: null, status: 'upcoming' },
  { id: 'implementation', label: 'Implementation', date: null, status: 'upcoming' },
];

const ACTIVITY_FEED = [
  { id: 1, type: 'status', text: 'Stage moved to U/W Review', date: 'Jul 18, 10:42 AM', author: 'System' },
  { id: 2, type: 'note', text: 'Spoke with underwriter. They need the Q2 payroll audit before finalizing the quote.', date: 'Jul 17, 3:15 PM', author: 'Sarah Chen' },
  { id: 3, type: 'rfi', text: 'RFI answered: payroll audit docs uploaded.', date: 'Jul 16, 9:00 AM', author: 'Client Portal' },
  { id: 4, type: 'quote', text: 'Quote v3 generated — WC premium updated', date: 'Jul 12, 11:30 AM', author: 'System' },
  { id: 5, type: 'status', text: 'Stage moved to Indication', date: 'Jul 9, 2:10 PM', author: 'System' },
  { id: 6, type: 'document', text: 'Loss runs 2023-25.pdf processed', date: 'Jul 5, 4:20 PM', author: 'System' },
];

const DOCUMENTS = [
  { id: 1, name: 'ACORD 130.pdf', type: 'Application', date: 'Jul 2', size: '2.4 MB' },
  { id: 2, name: 'Loss runs 2023-25.pdf', type: 'History', date: 'Jul 5', size: '4.1 MB' },
  { id: 3, name: 'Payroll report Q2.xlsx', type: 'Financial', date: 'Jul 16', size: '1.2 MB' },
];

const TASKS = [
  { id: 1, text: 'Collect signed BOR', due: 'Jul 30', assignee: 'Sarah Chen', status: 'pending' },
  { id: 2, text: 'Confirm class codes 0005/8810', due: 'Aug 2', assignee: 'Michael Ross', status: 'pending' },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'quote', label: 'Quote', icon: Briefcase },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
];

const FILTER_PRESETS = [
  { id: 'full', label: 'Full history' },
  { id: 'current', label: 'Current stage' },
  { id: 'last30', label: 'Last 30 days' },
];

// --- COMPONENTS ---

export function ControlBar() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeFilter, setActiveFilter] = useState('current');
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>(['review']);

  const toggleStage = (stageId: string) => {
    setSelectedStages(prev => 
      prev.includes(stageId) 
        ? prev.filter(s => s !== stageId) 
        : [...prev, stageId]
    );
    setActiveFilter('custom');
  };

  const setPreset = (presetId: string) => {
    setActiveFilter(presetId);
    if (presetId === 'current') setSelectedStages(['review']);
    if (presetId === 'full') setSelectedStages(STAGES.map(s => s.id));
  };

  return (
    <div className="min-h-screen bg-[#05070A] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-[#05070A] to-[#05070A] flex items-center justify-center p-4 sm:p-8 font-sans text-slate-200">
      
      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-[1040px] h-[92vh] max-h-[900px] bg-[#0A0D14]/80 backdrop-blur-2xl border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/10">
        
        {/* Subtle Map Background overlaying the header area */}
        <div className="absolute top-0 left-0 right-0 h-64 opacity-5 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMC41Ij48cGF0aCBkPSJNMTAgMTBoMTh2MTBIMTB6Ii8+PC9zdmc+')] bg-repeat" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />

        {/* HEADER SECTION */}
        <header className="relative z-10 flex flex-col pt-8 pb-4 px-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          
          {/* Identity & KPI Row */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E91E8C]/10 border border-[#E91E8C]/20 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-[#E91E8C]" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-medium tracking-tight text-white">{DEAL.name}</h1>
                  <button className="text-slate-500 hover:text-yellow-400 transition-colors">
                    <Star className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400 font-mono tracking-tight uppercase">
                  <span>{DEAL.industry}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>{DEAL.location}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>{DEAL.locations} LOC</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>{DEAL.employees} EMP</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>E-MOD {DEAL.emod}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-semibold">Est. Premium</div>
              <div className="text-3xl font-light text-white tracking-tight">
                ${DEAL.estPremium.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Display-Only Stage Tracker */}
          <div className="relative mb-6">
            <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-white/10" />
            <div className="absolute top-3.5 left-6 w-[40%] h-0.5 bg-[#E91E8C] shadow-[0_0_10px_rgba(233,30,140,0.5)]" />
            
            <div className="relative flex justify-between">
              {STAGES.map((stage) => {
                const isCompleted = stage.status === 'completed';
                const isCurrent = stage.status === 'current';
                
                return (
                  <div key={stage.id} className="flex flex-col items-center gap-2 group w-24">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 border-2 transition-colors ${
                      isCompleted ? 'bg-[#E91E8C] border-[#E91E8C] text-white shadow-[0_0_10px_rgba(233,30,140,0.4)]' :
                      isCurrent ? 'bg-[#0A0D14] border-[#E91E8C] text-[#E91E8C] shadow-[0_0_15px_rgba(233,30,140,0.6)]' :
                      'bg-[#0A0D14] border-white/20 text-white/20'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-[#E91E8C]' : 'bg-transparent'}`} />}
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isCurrent || isCompleted ? 'text-white' : 'text-slate-500'
                      }`}>{stage.label}</span>
                      {stage.date && (
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">{stage.date}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explicit Filter Bar */}
          <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/10 rounded-xl relative">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 pl-2 pr-4 border-r border-white/10">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Filter By</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {FILTER_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setPreset(preset.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeFilter === preset.id 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <div className="relative">
                <button 
                  onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
                    activeFilter === 'custom' || stageDropdownOpen
                      ? 'bg-white/10 text-white border-white/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                  }`}
                >
                  Stages: {selectedStages.length === STAGES.length ? 'All' : selectedStages.length > 0 ? `${selectedStages.length} selected` : 'None'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${stageDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {stageDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setStageDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#131824] border border-white/10 rounded-xl shadow-xl z-50 py-2">
                      <div className="px-3 pb-2 mb-2 border-b border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Stages</span>
                        <button 
                          onClick={() => { setSelectedStages(STAGES.map(s => s.id)); setActiveFilter('custom'); }}
                          className="text-[10px] text-[#E91E8C] hover:text-pink-400 font-medium"
                        >
                          Select All
                        </button>
                      </div>
                      {STAGES.map(stage => (
                        <button
                          key={stage.id}
                          onClick={() => toggleStage(stage.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedStages.includes(stage.id) 
                              ? 'bg-[#E91E8C] border-[#E91E8C]' 
                              : 'border-white/20 bg-transparent'
                          }`}>
                            {selectedStages.includes(stage.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-slate-300">{stage.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pr-2">
              <span className="text-xs text-slate-500 font-mono">Showing 6 of 16 events</span>
              {activeFilter !== 'full' && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#E91E8C]/10 border border-[#E91E8C]/20 text-[#E91E8C]">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {activeFilter === 'current' ? 'U/W Review' : activeFilter === 'last30' ? 'Last 30 Days' : 'Custom'}
                  </span>
                  <button 
                    onClick={() => setPreset('full')}
                    className="hover:bg-[#E91E8C]/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BODY SECTION */}
        <div className="flex flex-1 overflow-hidden relative z-0">
          
          {/* Left Rail */}
          <div className="w-[140px] shrink-0 border-r border-white/5 flex flex-col p-3 gap-1 bg-[#0A0D14]/50">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#E91E8C]/10 to-transparent text-[#E91E8C] border-l-2 border-[#E91E8C]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 opacity-70" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-[#0A0D14]/30">
            <div className="p-6 h-full flex flex-col">
              
              {activeTab === 'overview' && (
                <div className="max-w-3xl">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-medium text-white tracking-tight">Activity Feed</h2>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search activity..." 
                        className="bg-[#131824] border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#E91E8C]/50 w-64 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {ACTIVITY_FEED.map((item, idx) => (
                      <div key={item.id} className="relative pl-6 pb-2">
                        {/* Timeline line */}
                        {idx !== ACTIVITY_FEED.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-0 w-px bg-white/5" />
                        )}
                        
                        {/* Timeline node */}
                        <div className="absolute left-[7px] top-1.5 w-2 h-2 rounded-full bg-[#E91E8C] shadow-[0_0_8px_rgba(233,30,140,0.6)]" />
                        
                        <div className="bg-[#131824]/80 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {item.type === 'status' && <Activity className="w-4 h-4 text-[#E91E8C]" />}
                              {item.type === 'note' && <MessageSquare className="w-4 h-4 text-blue-400" />}
                              {item.type === 'rfi' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              {item.type === 'quote' && <FileText className="w-4 h-4 text-amber-400" />}
                              {item.type === 'document' && <UploadCloud className="w-4 h-4 text-purple-400" />}
                              
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                {item.type}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-500">{item.date}</span>
                          </div>
                          
                          <p className="text-sm text-slate-200 leading-relaxed mb-3">
                            {item.text}
                          </p>
                          
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-300 border border-white/10">
                              {item.author.charAt(0)}
                            </div>
                            <span className="text-xs text-slate-500">{item.author}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium text-white tracking-tight">Documents</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#E91E8C] hover:bg-[#E91E8C]/90 text-white rounded-lg text-sm font-medium transition-colors">
                      <UploadCloud className="w-4 h-4" />
                      Upload File
                    </button>
                  </div>
                  
                  <div className="bg-[#131824]/80 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Name</th>
                          <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Type</th>
                          <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Date Added</th>
                          <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Size</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {DOCUMENTS.map((doc) => (
                          <tr key={doc.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-[#E91E8C]" />
                                <span className="text-sm text-slate-200 font-medium">{doc.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">{doc.type}</td>
                            <td className="px-4 py-3 text-sm text-slate-400 font-mono">{doc.date}</td>
                            <td className="px-4 py-3 text-sm text-slate-400 font-mono">{doc.size}</td>
                            <td className="px-4 py-3">
                              <button className="text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium text-white tracking-tight">Open Tasks</h2>
                    <button className="text-sm text-[#E91E8C] font-medium hover:text-pink-400 transition-colors">
                      + Add Task
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {TASKS.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-4 bg-[#131824]/80 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <button className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center hover:border-[#E91E8C] hover:bg-[#E91E8C]/10 transition-all">
                            {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-[#E91E8C]" />}
                          </button>
                          <span className="text-sm text-slate-200">{task.text}</span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-white/10">
                              {task.assignee.charAt(0)}
                            </div>
                            <span className="text-xs text-slate-400">{task.assignee}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-400/10 px-2 py-1 rounded">
                            <Clock className="w-3 h-3" />
                            {task.due}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'quote' && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">Quote Workspace</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      Currently in U/W Review. The quote workspace will be unlocked once an indication is finalized.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
