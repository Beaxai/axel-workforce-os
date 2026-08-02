import React, { useState } from 'react';
import { Flame, Clock, ListTodo, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import './_group.css';

type ProductType = 'WC' | 'PEO' | 'ASO';
type PhaseType = 'Kickoff' | 'Documents' | 'Setup' | 'Testing' | 'Go-Live' | 'Complete';

interface Journey {
  id: string;
  name: string;
  product: ProductType;
  status: 'In Progress' | 'Complete';
  progress: number;
  goLiveDate: string;
  daysElapsed: number;
  targetDays: number;
  phase: PhaseType;
  openTasks: number;
  specialist: string;
}

const DEMO_DATA: Journey[] = [
  { id: '1', name: 'GreenLeaf Dispensary', product: 'WC', status: 'In Progress', progress: 20, goLiveDate: '2026-11-15', daysElapsed: 3, targetDays: 7, phase: 'Documents', openTasks: 4, specialist: 'JD' },
  { id: '2', name: 'Acme Staffing', product: 'PEO', status: 'In Progress', progress: 45, goLiveDate: '2026-12-01', daysElapsed: 12, targetDays: 22, phase: 'Setup', openTasks: 12, specialist: 'Sarah K' },
  { id: '3', name: 'Pacific Builders', product: 'ASO', status: 'In Progress', progress: 80, goLiveDate: '2026-11-20', daysElapsed: 15, targetDays: 18, phase: 'Testing', openTasks: 2, specialist: 'Mike T' },
  { id: '4', name: 'Summit Manufacturing', product: 'WC', status: 'In Progress', progress: 95, goLiveDate: '2026-11-10', daysElapsed: 8, targetDays: 7, phase: 'Go-Live', openTasks: 1, specialist: 'JD' },
  { id: '5', name: 'Coastal Cannabis Co', product: 'PEO', status: 'In Progress', progress: 10, goLiveDate: '2026-12-15', daysElapsed: 2, targetDays: 22, phase: 'Kickoff', openTasks: 15, specialist: 'Sarah K' },
  { id: '6', name: 'Redwood Logistics', product: 'WC', status: 'Complete', progress: 100, goLiveDate: '2026-11-01', daysElapsed: 6, targetDays: 7, phase: 'Complete', openTasks: 0, specialist: 'JD' },
  { id: '7', name: 'Apex Engineering', product: 'ASO', status: 'In Progress', progress: 60, goLiveDate: '2026-11-25', daysElapsed: 20, targetDays: 18, phase: 'Setup', openTasks: 8, specialist: 'Mike T' },
  { id: '8', name: 'Metro Healthcare', product: 'PEO', status: 'In Progress', progress: 35, goLiveDate: '2026-12-05', daysElapsed: 9, targetDays: 22, phase: 'Documents', openTasks: 6, specialist: 'Sarah K' },
];

const PHASES: PhaseType[] = ['Kickoff', 'Documents', 'Setup', 'Testing', 'Go-Live', 'Complete'];

export function PhaseBoard() {
  const [filter, setFilter] = useState<ProductType | 'ALL'>('ALL');

  const filteredData = DEMO_DATA.filter(j => filter === 'ALL' || j.product === filter);

  return (
    <div className="impl-board-view p-6 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="font-heading text-3xl tracking-wide uppercase font-bold text-white mb-1">
            Implementations <span className="text-zinc-500 font-normal">|</span> <span className="gradient-text">Pipeline</span>
          </h1>
          <p className="text-zinc-400 text-sm">Track active client onboardings across all phases</p>
        </div>
        
        <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-full border border-white/5">
          {(['ALL', 'WC', 'PEO', 'ASO'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Board */}
      <div className="flex gap-6 overflow-x-auto pb-4 h-full">
        {PHASES.map(phase => {
          const journeys = filteredData.filter(j => j.phase === phase);
          return (
            <div key={phase} className="flex flex-col min-w-[320px] w-[320px] glass-panel h-full shrink-0">
              <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <h2 className="font-heading text-lg font-semibold text-zinc-200 uppercase tracking-wider">{phase}</h2>
                <Badge variant="secondary" className="bg-white/10 text-zinc-300 hover:bg-white/20">
                  {journeys.length}
                </Badge>
              </div>
              
              <div className="p-4 flex flex-col gap-3 overflow-y-auto column-scroll flex-1">
                {journeys.map(journey => {
                  const isAtRisk = journey.daysElapsed > journey.targetDays && journey.status !== 'Complete';
                  
                  return (
                    <div 
                      key={journey.id} 
                      className={`glass-card p-4 cursor-pointer group relative overflow-hidden ${isAtRisk ? 'at-risk' : ''}`}
                    >
                      {/* Top row */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-zinc-100 text-base mb-1 truncate max-w-[180px]" title={journey.name}>
                            {journey.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={`text-[10px] px-1.5 py-0 border-none ${
                                journey.product === 'WC' ? 'bg-blue-500/20 text-blue-300' :
                                journey.product === 'PEO' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {journey.product}
                            </Badge>
                            {isAtRisk && (
                              <div className="flex items-center text-pink-500 text-xs font-medium">
                                <Flame className="w-3 h-3 mr-1 fill-pink-500/20" /> At Risk
                              </div>
                            )}
                          </div>
                        </div>
                        <Avatar className="w-7 h-7 border border-white/10">
                          <AvatarFallback className="bg-zinc-800 text-xs font-medium text-zinc-300">
                            {journey.specialist.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Middle: Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                          <span>Progress</span>
                          <span>{journey.progress}%</span>
                        </div>
                        <Progress 
                          value={journey.progress} 
                          className={`h-1.5 bg-zinc-800 [&>div]:transition-all [&>div]:duration-500 ${
                            journey.progress === 100 
                              ? "[&>div]:bg-emerald-500" 
                              : "[&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500"
                          }`} 
                        />
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-zinc-400">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5" title="Days elapsed vs target">
                            <Clock className={`w-3.5 h-3.5 ${isAtRisk ? 'text-pink-500' : 'text-zinc-500'}`} />
                            <span className={isAtRisk ? 'text-pink-400 font-medium' : ''}>
                              {journey.daysElapsed}/{journey.targetDays}d
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Open tasks">
                            <ListTodo className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{journey.openTasks}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5" title="Target Go-Live">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          <span className="font-mono text-[11px]">{new Date(journey.goLiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {journeys.length === 0 && (
                  <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-lg text-zinc-500 text-sm">
                    No active journeys
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
