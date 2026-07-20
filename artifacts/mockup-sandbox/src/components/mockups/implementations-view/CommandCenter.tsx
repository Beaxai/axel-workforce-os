import React, { useState } from "react";
import { 
  Search, Filter, ChevronDown, AlertTriangle, 
  CheckCircle2, Clock, MoreHorizontal, ArrowUpDown,
  Building2, Briefcase, Truck, Users, Leaf, ArrowRight
} from "lucide-react";
import "./_group.css";

// Demo Data
const JOURNEYS = [
  {
    id: 1,
    business: "GreenLeaf Dispensary",
    industry: "cannabis",
    product: "PEO",
    status: "In Progress",
    progress: 85,
    goLiveDate: "2026-08-15",
    daysElapsed: 20,
    targetDays: 22,
    phase: "Payroll Setup",
    openTasks: 3,
    specialist: "Sarah J."
  },
  {
    id: 2,
    business: "Acme Staffing",
    industry: "staffing",
    product: "WC",
    status: "In Progress",
    progress: 40,
    goLiveDate: "2026-08-05",
    daysElapsed: 9,
    targetDays: 7,
    phase: "Carrier Bind",
    openTasks: 5,
    specialist: "Mike T.",
    atRisk: true
  },
  {
    id: 3,
    business: "Pacific Builders",
    industry: "construction",
    product: "ASO",
    status: "In Progress",
    progress: 60,
    goLiveDate: "2026-08-20",
    daysElapsed: 12,
    targetDays: 18,
    phase: "Benefits Enrollment",
    openTasks: 4,
    specialist: "Elena R."
  },
  {
    id: 4,
    business: "Summit Manufacturing",
    industry: "manufacturing",
    product: "PEO",
    status: "In Progress",
    progress: 95,
    goLiveDate: "2026-07-30",
    daysElapsed: 25,
    targetDays: 22,
    phase: "Final Review",
    openTasks: 1,
    specialist: "Sarah J.",
    atRisk: true
  },
  {
    id: 5,
    business: "Coastal Cannabis Co",
    industry: "cannabis",
    product: "WC",
    status: "Complete",
    progress: 100,
    goLiveDate: "2026-07-15",
    daysElapsed: 6,
    targetDays: 7,
    phase: "Live",
    openTasks: 0,
    specialist: "Mike T."
  },
  {
    id: 6,
    business: "Redwood Logistics",
    industry: "transportation",
    product: "ASO",
    status: "In Progress",
    progress: 25,
    goLiveDate: "2026-09-01",
    daysElapsed: 4,
    targetDays: 18,
    phase: "Kickoff",
    openTasks: 8,
    specialist: "Elena R."
  },
  {
    id: 7,
    business: "Apex Healthcare",
    industry: "healthcare",
    product: "PEO",
    status: "In Progress",
    progress: 15,
    goLiveDate: "2026-09-10",
    daysElapsed: 2,
    targetDays: 22,
    phase: "Data Collection",
    openTasks: 12,
    specialist: "Sarah J."
  },
];

const IND_ICONS: Record<string, React.ElementType> = {
  cannabis: Leaf,
  staffing: Users,
  construction: Building2,
  manufacturing: Briefcase,
  transportation: Truck,
  healthcare: Users
};

const getProductColor = (product: string) => {
  switch(product) {
    case 'WC': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'PEO': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'ASO': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export function CommandCenter() {
  const [filter, setFilter] = useState("All");
  const [sortCol, setSortCol] = useState("goLiveDate");

  // Calculate KPIs
  const activeCount = JOURNEYS.filter(j => j.status === "In Progress").length;
  const riskCount = JOURNEYS.filter(j => j.atRisk && j.status === "In Progress").length;
  const avgProgress = Math.round(JOURNEYS.filter(j => j.status === "In Progress").reduce((acc, curr) => acc + curr.progress, 0) / (activeCount || 1));
  const nextGoLive = JOURNEYS.filter(j => j.status === "In Progress").sort((a, b) => new Date(a.goLiveDate).getTime() - new Date(b.goLiveDate).getTime())[0]?.goLiveDate || "N/A";

  const formatDate = (dateString: string) => {
    if (dateString === "N/A") return dateString;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  return (
    <div className="impl-board-view text-sm p-8 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-heading mb-1 text-white tracking-wide">Command Center</h1>
          <p className="text-white/50">Implementation Portfolio Scorecard</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--primary-pink)]/50 transition-colors w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="px-5 py-2 rounded-lg font-medium text-white shadow-lg bg-gradient-to-r from-[var(--support-purple)] to-[var(--primary-pink)] hover:opacity-90 transition-opacity">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Implementations", value: activeCount, trend: "+2 this week" },
          { label: "At Risk (Over Target)", value: riskCount, trend: "-1 from last week", isRisk: riskCount > 0 },
          { label: "Average Progress", value: `${avgProgress}%`, trend: "+5% wow" },
          { label: "Next Go-Live", value: formatDate(nextGoLive), trend: "In 4 days" }
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--support-purple)] to-[var(--primary-pink)] opacity-0 group-hover:opacity-10 blur-2xl transition-opacity rounded-full -mr-10 -mt-10" />
            <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 font-heading">{kpi.label}</div>
            <div className={`text-3xl font-light mb-1 ${kpi.isRisk ? 'text-[var(--primary-pink)]' : 'text-white'}`}>{kpi.value}</div>
            <div className="text-xs text-white/40">{kpi.trend}</div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="glass-panel overflow-hidden flex-1 flex flex-col">
        {/* Table Controls */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex gap-2">
            {["All", "WC", "PEO", "ASO"].map(t => (
              <button 
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === t ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="text-xs text-white/40 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Updated just now
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 text-xs font-semibold text-white/40 uppercase tracking-wider font-heading">
          <div className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-white/70">Client <ArrowUpDown className="w-3 h-3" /></div>
          <div className="col-span-1">Product</div>
          <div className="col-span-2">Current Phase</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-white/70">Timeline <ArrowUpDown className="w-3 h-3" /></div>
          <div className="col-span-1 flex items-center justify-end">Go-Live</div>
          <div className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-white/70">Owner <ArrowUpDown className="w-3 h-3" /></div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto column-scroll">
          {JOURNEYS.filter(j => filter === "All" || j.product === filter).map(journey => {
            const IndIcon = IND_ICONS[journey.industry] || Building2;
            return (
              <div 
                key={journey.id} 
                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 items-center transition-colors cursor-pointer relative group
                  ${journey.atRisk ? 'bg-[var(--primary-pink)]/[0.03] hover:bg-[var(--primary-pink)]/[0.06]' : 'hover:bg-white/[0.03]'}
                `}
              >
                {/* Risk Indicator left border */}
                {journey.atRisk && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary-pink)] shadow-[0_0_10px_var(--primary-pink)]" />}
                
                {/* Client */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <IndIcon className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{journey.business}</div>
                    <div className="text-xs text-white/40 capitalize truncate">{journey.industry}</div>
                  </div>
                </div>

                {/* Product */}
                <div className="col-span-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getProductColor(journey.product)}`}>
                    {journey.product}
                  </span>
                </div>

                {/* Phase */}
                <div className="col-span-2">
                  <div className="text-white/80 font-medium truncate">{journey.phase}</div>
                  <div className="text-xs text-white/40 mt-0.5">{journey.openTasks} open tasks</div>
                </div>

                {/* Progress */}
                <div className="col-span-2 flex items-center gap-3 pr-4">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${journey.progress === 100 ? 'bg-green-400' : 'bg-gradient-to-r from-[var(--support-purple)] to-[var(--primary-pink)]'}`}
                      style={{ width: `${journey.progress}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium w-8 text-right text-white/70">{journey.progress}%</div>
                </div>

                {/* Timeline */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold ${journey.atRisk ? 'text-[var(--primary-pink)]' : 'text-white'}`}>
                      Day {journey.daysElapsed}
                    </span>
                    <span className="text-xs text-white/40">/ {journey.targetDays}</span>
                  </div>
                  {journey.atRisk && (
                    <div className="text-[10px] text-[var(--primary-pink)] flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" /> +{journey.daysElapsed - journey.targetDays} days
                    </div>
                  )}
                </div>

                {/* Go-Live */}
                <div className="col-span-1 flex items-center justify-end text-white/80 font-medium whitespace-nowrap">
                  {formatDate(journey.goLiveDate)}
                </div>

                {/* Owner */}
                <div className="col-span-1 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {journey.specialist.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-white/70 text-xs truncate">{journey.specialist}</span>
                </div>

                {/* Status */}
                <div className="col-span-1 flex items-center justify-end">
                  {journey.status === "Complete" ? (
                    <div className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-2 py-1 rounded-md text-xs font-medium border border-green-400/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Done
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 transition-colors">
                      <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-white" />
                      <MoreHorizontal className="w-4 h-4 group-hover:hidden" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
