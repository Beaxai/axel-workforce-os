import React, { useState, useMemo } from 'react';
import { Search, Clock, ChevronRight, Activity, Filter, CheckCircle } from 'lucide-react';

// Local utility for Tailwind class merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- Types ---
type JourneyHealth = 'On Track' | 'At Risk' | 'Overdue' | 'Complete';

type Journey = {
  id: string;
  businessName: string;
  product: 'WC' | 'PEO' | 'ASO';
  status: 'In Progress' | 'Complete';
  goLiveDate: string;
  progress: number;
  daysElapsed: number;
  targetDays: number;
  currentPhase: string;
  health: JourneyHealth;
  nextAction: {
    task: string;
    owner: 'INTERNAL' | 'CLIENT';
    waitingDays?: number;
  } | null;
};

// --- Mock Data ---
const MOCK_JOURNEYS: Journey[] = [
  {
    id: '1',
    businessName: 'Emerald Coast Cultivation',
    product: 'WC',
    status: 'In Progress',
    goLiveDate: 'Aug 4',
    progress: 62,
    daysElapsed: 5,
    targetDays: 7,
    currentPhase: 'Payroll Setup',
    health: 'On Track',
    nextAction: { task: 'Confirm class codes', owner: 'INTERNAL' }
  },
  {
    id: '2',
    businessName: 'Bayline Logistics',
    product: 'PEO',
    status: 'In Progress',
    goLiveDate: 'Aug 18',
    progress: 34,
    daysElapsed: 12,
    targetDays: 22,
    currentPhase: 'Data Collection',
    health: 'At Risk',
    nextAction: { task: 'Upload employee census', owner: 'CLIENT', waitingDays: 3 }
  },
  {
    id: '3',
    businessName: 'Harbor & Vine Restaurants',
    product: 'ASO',
    status: 'In Progress',
    goLiveDate: 'Jul 22',
    progress: 81,
    daysElapsed: 24,
    targetDays: 18,
    currentPhase: 'Benefits Enrollment',
    health: 'Overdue',
    nextAction: { task: 'Carrier confirmation', owner: 'INTERNAL' }
  },
  {
    id: '4',
    businessName: 'Piedmont Fabrication',
    product: 'WC',
    status: 'In Progress',
    goLiveDate: 'Aug 9',
    progress: 15,
    daysElapsed: 1,
    targetDays: 7,
    currentPhase: 'Kickoff',
    health: 'On Track',
    nextAction: { task: 'Review underwriting', owner: 'INTERNAL' }
  },
  {
    id: '6',
    businessName: 'Apex Industrial Services',
    product: 'PEO',
    status: 'In Progress',
    goLiveDate: 'Aug 2',
    progress: 55,
    daysElapsed: 21,
    targetDays: 22,
    currentPhase: 'Payroll Setup',
    health: 'At Risk',
    nextAction: { task: 'Finalize benefit elections', owner: 'CLIENT', waitingDays: 4 }
  },
  {
    id: '7',
    businessName: 'Suncoast Medical Partners',
    product: 'ASO',
    status: 'In Progress',
    goLiveDate: 'Jul 25',
    progress: 92,
    daysElapsed: 26,
    targetDays: 18,
    currentPhase: 'Go-Live',
    health: 'Overdue',
    nextAction: { task: 'System credentials dispatch', owner: 'INTERNAL' }
  },
  {
    id: '5',
    businessName: 'Northstar Dental Group',
    product: 'PEO',
    status: 'Complete',
    goLiveDate: 'Jul 10',
    progress: 100,
    daysElapsed: 22,
    targetDays: 22,
    currentPhase: 'Go-Live',
    health: 'Complete',
    nextAction: null
  }
];

// --- Helpers ---
function getGoLiveCountdown(journey: Journey) {
  if (journey.health === 'Complete') return 'Live';
  
  const remaining = journey.targetDays - journey.daysElapsed;
  if (remaining < 0) {
    return `+${Math.abs(remaining)}d over`;
  }
  return `T-${remaining}d`;
}

function HealthDot({ health }: { health: JourneyHealth }) {
  switch (health) {
    case 'On Track': return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_theme(colors.emerald.500)]" />;
    case 'At Risk': return <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_theme(colors.amber.500)]" />;
    case 'Overdue': return <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_theme(colors.red.500)] animate-pulse" />;
    case 'Complete': return <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />;
    default: return <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />;
  }
}

// --- Components ---

function FilterCard({ 
  label, 
  count, 
  active, 
  onClick, 
  colorClass 
}: { 
  label: string; 
  count: number; 
  active: boolean; 
  onClick: () => void; 
  colorClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group",
        active 
          ? "bg-white/10 border-white/20 shadow-lg shadow-black/40"
          : "bg-white/[0.02] border-white/5 hover:bg-white-[0.04] hover:border-white/10"
      )}
    >
      {active && (
        <div className={cn("absolute inset-0 opacity-10 blur-xl pointer-events-none", colorClass)} />
      )}
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", colorClass)} />
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 group-hover:text-zinc-300 transition-colors">
          {label}
        </span>
      </div>
      <span className="text-3xl font-light text-white tabular-nums tracking-tight relative z-10">
        {count}
      </span>
    </button>
  );
}

function JourneyRow({ journey }: { journey: Journey }) {
  const isOverdue = journey.health === 'Overdue';
  const isComplete = journey.health === 'Complete';
  
  return (
    <div className={cn(
      "group grid grid-cols-[2fr_0.8fr_1.5fr_1.5fr_1.5fr_2.5fr_auto] gap-4 px-6 py-4 items-center border-b border-white/5 transition-all duration-300 cursor-pointer relative",
      isOverdue ? "bg-red-500/[0.03] hover:bg-red-500/[0.08]" : "hover:bg-white/[0.04]",
      isComplete ? "opacity-60 hover:opacity-100" : ""
    )}>
      {/* Overdue Left Border Indicator */}
      {isOverdue && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_theme(colors.red.500)]" />
      )}

      {/* Business & Health */}
      <div className="flex flex-col gap-1.5 pr-4">
        <span className="font-medium text-zinc-100 truncate" title={journey.businessName}>
          {journey.businessName}
        </span>
        <div className="flex items-center gap-2">
          <HealthDot health={journey.health} />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
            {journey.health}
          </span>
        </div>
      </div>
       
      {/* Product */}
      <div>
        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-white/[0.08] text-[10px] font-bold text-zinc-300 uppercase border border-white/10 shadow-sm backdrop-blur-sm">
          {journey.product}
        </span>
      </div>
       
      {/* Go Live */}
      <div className="flex flex-col gap-1.5 tabular-nums">
        <span className={cn(
          "font-medium text-sm",
          isOverdue ? "text-red-400 font-bold" : "text-zinc-200"
        )}>
          {getGoLiveCountdown(journey)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {journey.goLiveDate} • {journey.daysElapsed}/{journey.targetDays}D
        </span>
      </div>
       
      {/* Progress */}
      <div className="flex flex-col gap-2 justify-center pr-8">
        <div className="flex justify-between items-end">
          <span className="text-xs font-semibold text-zinc-300 tabular-nums">{journey.progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              isComplete ? "bg-emerald-500" : "bg-[#E91E8C]"
            )}
            style={{ width: `${journey.progress}%` }}
          />
        </div>
      </div>

      {/* Phase */}
      <div>
        <span className="text-sm text-zinc-300 font-medium">{journey.currentPhase}</span>
      </div>

      {/* Next Action */}
      <div className="pr-4">
        {journey.nextAction ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
              <span className={cn(
                "px-1.5 py-0.5 rounded-[4px] font-bold border",
                journey.nextAction.owner === 'CLIENT' 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}>
                {journey.nextAction.owner}
              </span>
              {journey.nextAction.waitingDays && (
                <span className="text-amber-500/80 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  WAITING {journey.nextAction.waitingDays}D
                </span>
              )}
            </div>
            <span className="text-sm text-zinc-200 truncate font-medium" title={journey.nextAction.task}>
              {journey.nextAction.task}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-500">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm italic">All tasks complete</span>
          </div>
        )}
      </div>

      {/* Chevron */}
      <div className="flex items-center justify-end text-zinc-600 group-hover:text-[#E91E8C] transition-colors">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );
}

// --- Main Page Component ---
export function TriageBoard() {
  const [filter, setFilter] = useState<JourneyHealth | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Derived state
  const { counts, filteredJourneys } = useMemo(() => {
    const counts = {
      'On Track': 0,
      'At Risk': 0,
      'Overdue': 0,
      'Complete': 0
    };

    const filtered = MOCK_JOURNEYS.filter(j => {
      counts[j.health]++;
      
      const matchesSearch = j.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            j.product.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'All' || j.health === filter;
      
      return matchesSearch && matchesFilter;
    });

    // Sort: Overdue first, then At Risk, then On Track, then Complete
    const healthWeight = { 'Overdue': 0, 'At Risk': 1, 'On Track': 2, 'Complete': 3 };
    filtered.sort((a, b) => healthWeight[a.health] - healthWeight[b.health]);

    return { counts, filteredJourneys: filtered };
  }, [filter, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-[#E91E8C]/30 flex flex-col relative overflow-hidden">
      {/* Ambient background glows for glassmorphism effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#E91E8C]/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[50%] bg-blue-500/5 blur-[140px] rounded-full pointer-events-none" />
      
      {/* Top Header */}
      <header className="flex items-center justify-between py-6 px-8 border-b border-white/10 bg-zinc-950/60 sticky top-0 z-20 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="p-1.5 bg-[#E91E8C]/10 rounded-lg border border-[#E91E8C]/20">
              <Activity className="w-5 h-5 text-[#E91E8C]" />
            </div>
            Implementations
          </h1>
          <p className="text-xs text-zinc-500 mt-2 uppercase tracking-[0.2em] font-medium">
            Risk Triage Board
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search businesses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all w-72 backdrop-blur-md"
            />
          </div>
          <button className="p-2.5 rounded-full bg-zinc-900/50 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </header>
       
      <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 relative z-10">
        
        {/* Summary Strip (Filters) */}
        <div className="grid grid-cols-4 gap-5">
          <FilterCard 
            label="All Journeys" 
            count={MOCK_JOURNEYS.length} 
            active={filter === 'All'} 
            onClick={() => setFilter('All')} 
            colorClass="bg-[#E91E8C]" 
          />
          <FilterCard 
            label="On Track" 
            count={counts['On Track']} 
            active={filter === 'On Track'} 
            onClick={() => setFilter('On Track')} 
            colorClass="bg-emerald-500" 
          />
          <FilterCard 
            label="At Risk" 
            count={counts['At Risk']} 
            active={filter === 'At Risk'} 
            onClick={() => setFilter('At Risk')} 
            colorClass="bg-amber-500" 
          />
          <FilterCard 
            label="Overdue" 
            count={counts['Overdue']} 
            active={filter === 'Overdue'} 
            onClick={() => setFilter('Overdue')} 
            colorClass="bg-red-500" 
          />
        </div>
         
        {/* Board Container */}
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px] w-full">
              
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_0.8fr_1.5fr_1.5fr_1.5fr_2.5fr_auto] gap-4 px-6 py-4 border-b border-white/10 text-[10px] uppercase tracking-[0.15em] font-semibold text-zinc-500 bg-black/20">
                <div>Business & Health</div>
                <div>Product</div>
                <div>Timeline</div>
                <div>Progress</div>
                <div>Current Phase</div>
                <div>Next Action / Blocker</div>
                <div></div>
              </div>
              
              {/* Table Body */}
              <div className="flex flex-col">
                {filteredJourneys.length > 0 ? (
                  filteredJourneys.map(j => <JourneyRow key={j.id} journey={j} />)
                ) : (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                    <Activity className="w-8 h-8 text-zinc-700" />
                    <p className="text-zinc-500 text-sm">No implementation journeys found.</p>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
