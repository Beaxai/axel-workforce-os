import React from "react";
import { Search, Calendar, ChevronDown, Clock, AlertTriangle, CheckCircle2, User, Filter, MoreHorizontal } from "lucide-react";
import "./_group.css";
import { Badge } from "@/components/ui/badge";

type ProductType = "WC" | "PEO" | "ASO";
type Status = "In Progress" | "Complete" | "At Risk";

interface Journey {
  id: string;
  businessName: string;
  productType: ProductType;
  status: Status;
  progress: number;
  startDate: Date;
  targetDays: number;
  daysElapsed: number;
  currentPhase: string;
  openTasks: number;
  specialist: string;
}

const mockData: Journey[] = [
  {
    id: "1",
    businessName: "GreenLeaf Dispensary",
    productType: "WC",
    status: "In Progress",
    progress: 85,
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    targetDays: 7,
    daysElapsed: 5,
    currentPhase: "Policy Issuance",
    openTasks: 1,
    specialist: "Sarah J."
  },
  {
    id: "2",
    businessName: "Acme Staffing",
    productType: "PEO",
    status: "At Risk",
    progress: 60,
    startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    targetDays: 22,
    daysElapsed: 25,
    currentPhase: "Benefits Enrollment",
    openTasks: 4,
    specialist: "Marcus T."
  },
  {
    id: "3",
    businessName: "Pacific Builders",
    productType: "ASO",
    status: "In Progress",
    progress: 30,
    startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    targetDays: 18,
    daysElapsed: 6,
    currentPhase: "Payroll Setup",
    openTasks: 2,
    specialist: "Jessica W."
  },
  {
    id: "4",
    businessName: "Summit Manufacturing",
    productType: "WC",
    status: "Complete",
    progress: 100,
    startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    targetDays: 7,
    daysElapsed: 7,
    currentPhase: "Bound",
    openTasks: 0,
    specialist: "Sarah J."
  },
  {
    id: "5",
    businessName: "Coastal Cannabis Co",
    productType: "PEO",
    status: "In Progress",
    progress: 45,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    targetDays: 22,
    daysElapsed: 10,
    currentPhase: "Employee Onboarding",
    openTasks: 3,
    specialist: "David L."
  },
  {
    id: "6",
    businessName: "Redwood Logistics",
    productType: "ASO",
    status: "At Risk",
    progress: 75,
    startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    targetDays: 18,
    daysElapsed: 20,
    currentPhase: "Final Review",
    openTasks: 2,
    specialist: "Jessica W."
  }
].sort((a, b) => {
  // Sort by target date proximity (closest first), then by status
  const aTarget = a.targetDays - a.daysElapsed;
  const bTarget = b.targetDays - b.daysElapsed;
  return aTarget - bTarget;
});

const getProductColor = (product: ProductType) => {
  switch (product) {
    case "WC": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "PEO": return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    case "ASO": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }
};

const getProductBarColor = (product: ProductType) => {
  switch (product) {
    case "WC": return "bg-blue-500";
    case "PEO": return "bg-purple-500";
    case "ASO": return "bg-emerald-500";
  }
};

const getStatusIcon = (status: Status) => {
  switch (status) {
    case "Complete": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "At Risk": return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case "In Progress": return <Clock className="w-4 h-4 text-blue-400" />;
  }
};

export function GoLiveTimeline() {
  const maxTimelineDays = 30; // 30 days view window
  
  return (
    <div className="impl-board-view p-6 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-heading mb-1 text-white tracking-wide">Implementation Schedule</h1>
          <p className="text-gray-400 text-sm">Tracking 6 active go-lives across WC, PEO, and ASO</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/30 w-64"
            />
          </div>
          
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm transition-colors text-white">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          
          <button className="bg-gradient-to-r from-[var(--support-purple)] to-[var(--primary-pink)] hover:opacity-90 text-white rounded-full px-5 py-2 text-sm font-medium transition-opacity">
            New Implementation
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="glass-panel flex-1 flex flex-col overflow-hidden rounded-xl">
        {/* Timeline Header Row */}
        <div className="flex border-b border-white/10 bg-white/5">
          {/* Left Rail Header */}
          <div className="w-[380px] p-4 flex-shrink-0 border-r border-white/10 font-heading text-xs text-gray-400 tracking-wider">
            Client & Details
          </div>
          
          {/* Timeline Scale Header */}
          <div className="flex-1 relative overflow-hidden flex items-center">
            {/* Markers for days (every 5 days) */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 border-r border-white/5 relative h-full">
                  <span className="absolute top-4 -translate-x-1/2 text-[10px] text-gray-500 font-mono">
                    Day {i * 5}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Today Line Indicator in Header */}
            <div className="absolute left-[33%] top-0 bottom-0 border-l border-dashed border-[var(--primary-pink)] z-10 flex flex-col items-center">
              <div className="bg-[var(--primary-pink)] text-white text-[10px] font-bold px-2 py-1 rounded-b-md">TODAY</div>
            </div>
          </div>
          
          {/* Right Rail Header */}
          <div className="w-[180px] p-4 flex-shrink-0 border-l border-white/10 font-heading text-xs text-gray-400 tracking-wider text-right">
            Countdown
          </div>
        </div>
        
        {/* Timeline Rows */}
        <div className="flex-1 overflow-y-auto">
          {mockData.map((journey) => {
            // Calculate width and positions for the Gantt bar
            const barWidth = Math.min((journey.targetDays / maxTimelineDays) * 100, 100);
            const progressWidth = Math.min((journey.daysElapsed / journey.targetDays) * 100, 100);
            
            // If overdue, we draw an extension bar
            const isOverdue = journey.daysElapsed > journey.targetDays;
            const overdueWidth = isOverdue ? Math.min(((journey.daysElapsed - journey.targetDays) / maxTimelineDays) * 100, 100 - barWidth) : 0;
            
            const daysRemaining = journey.targetDays - journey.daysElapsed;
            
            return (
              <div 
                key={journey.id} 
                className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                {/* Left Rail: Business Info */}
                <div className="w-[380px] p-4 flex-shrink-0 border-r border-white/5 flex items-center gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(journey.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{journey.businessName}</h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${getProductColor(journey.productType)}`}>
                        {journey.productType}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="truncate max-w-[120px]">{journey.currentPhase}</span>
                      <span className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        {journey.openTasks} tasks
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        <User className="w-3 h-3" />
                        {journey.specialist}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Gantt Area */}
                <div className="flex-1 relative py-6 group-hover:bg-white/[0.01]">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="flex-1 border-r border-white/5 h-full"></div>
                    ))}
                  </div>
                  
                  {/* Today Line */}
                  <div className="absolute left-[33%] top-0 bottom-0 border-l border-dashed border-[var(--primary-pink)]/30 pointer-events-none z-0"></div>
                  
                  {/* The Timeline Bar */}
                  <div className="relative h-6 w-full px-2 z-10 flex items-center">
                    {/* Base Target Bar */}
                    <div 
                      className="absolute h-4 rounded-full bg-white/10 overflow-hidden"
                      style={{ width: `${barWidth}%`, left: '10px' }}
                    >
                      {/* Progress Fill */}
                      <div 
                        className={`absolute top-0 bottom-0 left-0 ${getProductBarColor(journey.productType)} transition-all`}
                        style={{ width: `${progressWidth}%` }}
                      ></div>
                    </div>
                    
                    {/* Overdue Extension Bar */}
                    {isOverdue && (
                      <div 
                        className="absolute h-4 rounded-r-full bg-red-500/40 border border-red-500/50"
                        style={{ 
                          width: `${overdueWidth}%`, 
                          left: `calc(10px + ${barWidth}%)`,
                        }}
                      >
                        <div className="w-full h-full pattern-diagonal-lines pattern-red-500 pattern-bg-transparent pattern-size-2 pattern-opacity-40"></div>
                      </div>
                    )}
                    
                    {/* Progress Text overlay (only show if bar is wide enough) */}
                    {barWidth > 15 && (
                      <span 
                        className="absolute text-[10px] font-bold text-white/90 z-20 pointer-events-none mix-blend-overlay"
                        style={{ left: `calc(10px + 2%)` }}
                      >
                        {journey.progress}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Right Rail: Countdown */}
                <div className="w-[180px] p-4 flex-shrink-0 border-l border-white/5 flex items-center justify-end">
                  {daysRemaining > 0 ? (
                    <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/10 font-mono text-xs">
                      Go-live in {daysRemaining}d
                    </Badge>
                  ) : daysRemaining === 0 ? (
                    <Badge variant="outline" className="bg-[var(--primary-pink)]/20 text-[var(--primary-pink)] border-[var(--primary-pink)]/30 font-bold text-xs">
                      Due Today
                    </Badge>
                  ) : journey.status === "Complete" ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold text-xs">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 font-bold text-xs">
                      {Math.abs(daysRemaining)}d overdue
                    </Badge>
                  )}
                  
                  <button className="ml-4 text-gray-500 hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer/Legend */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500"></div> WC Target
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-purple-500"></div> PEO Target
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div> ASO Target
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500/40 border border-red-500/50"></div> Overdue
            </div>
          </div>
          <div>
            Data reflects real-time status. Syncs every 5 minutes.
          </div>
        </div>
      </div>
    </div>
  );
}
