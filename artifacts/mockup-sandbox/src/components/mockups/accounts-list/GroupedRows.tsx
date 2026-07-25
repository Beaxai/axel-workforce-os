import React from "react";
import { Search, Plus, MapPin, Users, Building2, ChevronDown, ChevronRight } from "lucide-react";

export function GroupedRows() {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const groups = [
    {
      name: "Cannabis",
      stats: "5 prospects · $5.65M total payroll",
      rows: [
        { name: "Fixcheck Botanicals", state: "CA", payroll: "$900,000", employees: 12, badge: "Prospect", badgeColor: "gray" },
        { name: "Cascade Wellness Group", state: "OR", payroll: "$2,400,000", employees: 31, badge: "Prospect", badgeColor: "gray" },
        { name: "Green Valley Cultivation", state: "CA", payroll: "$1,850,000", employees: 24, badge: "Active Prospect", badgeColor: "purple" },
        { name: "Sierra Leaf Co", state: "CA", payroll: "$500,000", employees: 5, badge: "Prospect", badgeColor: "gray" },
        { name: "Bloom & Root Collective", state: "CA", payroll: "—", employees: 9, badge: "Prospect", badgeColor: "gray" },
      ]
    },
    {
      name: "Construction",
      stats: "3 prospects · $6.85M total payroll",
      rows: [
        { name: "Keystone Construction", state: "CT", payroll: "$3,020,000", employees: 40, badge: "Prospect", badgeColor: "gray" },
        { name: "Pacific Crest Builders", state: "OR", payroll: "$1,200,000", employees: 12, badge: "Prospect", badgeColor: "gray" },
        { name: "Keystone Construction Inc", state: "CT", payroll: "$2,630,000", employees: 40, badge: "Prospect", badgeColor: "gray" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d10] text-white p-8 font-sans selection:bg-pink-500/30">
      <div className="max-w-[1280px] mx-auto space-y-8">
        {/* Page Chrome */}
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
            <p className="text-zinc-400 text-sm">44 prospects in pipeline</p>
          </div>
          <button className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] border border-pink-400/20">
            <Plus className="w-4 h-4" />
            New Account
          </button>
        </header>

        {/* Tabs & Filters */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex gap-8 text-sm font-medium">
            <button className="text-zinc-400 hover:text-zinc-200 transition-colors pb-4 -mb-4">Leads</button>
            <button className="text-white border-b-2 border-pink-500 pb-4 -mb-4">Prospects</button>
            <button className="text-zinc-400 hover:text-zinc-200 transition-colors pb-4 -mb-4">Clients</button>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search accounts..." 
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all w-64"
            />
          </div>
        </div>

        {/* Grouped List */}
        <div className="space-y-8">
          {groups.map(group => {
            const isCollapsed = collapsedGroups[group.name];
            return (
              <div key={group.name} className="space-y-3">
                {/* Section Header */}
                <button 
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between group py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-zinc-400 group-hover:text-white transition-colors">
                      {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-lg font-semibold text-zinc-100">{group.name}</h2>
                      <span className="text-sm text-zinc-500 font-medium">{group.stats}</span>
                    </div>
                  </div>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/[0.08] to-transparent ml-6"></div>
                </button>

                {/* Rows */}
                {!isCollapsed && (
                  <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-xl">
                    <div className="divide-y divide-white/[0.06]">
                      {group.rows.map((row, idx) => (
                        <div 
                          key={idx} 
                          className="group/row flex items-center p-4 hover:bg-white/[0.04] transition-colors cursor-pointer relative"
                        >
                          {/* Hover indicator */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 opacity-0 group-hover/row:opacity-100 transition-opacity"></div>
                          
                          {/* Name & Basic Info */}
                          <div className="w-[35%] pl-2">
                            <h3 className="font-semibold text-zinc-100 text-[15px] group-hover/row:text-pink-100 transition-colors">
                              {row.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {row.state}
                              </span>
                            </div>
                          </div>

                          {/* Metrics Container */}
                          <div className="flex flex-1 items-center justify-end gap-16 pr-8">
                            {/* Payroll */}
                            <div className="text-right w-24">
                              <p className="text-xs text-zinc-500 mb-1">Payroll</p>
                              <p className={`text-sm font-medium tabular-nums ${row.payroll === '—' ? 'text-zinc-600' : 'text-zinc-300'}`}>
                                {row.payroll}
                              </p>
                            </div>

                            {/* Employees */}
                            <div className="text-right w-20">
                              <p className="text-xs text-zinc-500 mb-1">Employees</p>
                              <p className="text-sm font-medium text-zinc-300 tabular-nums">
                                {row.employees}
                              </p>
                            </div>
                          </div>

                          {/* Actions / Badge */}
                          <div className="w-[140px] flex items-center justify-end gap-4">
                            <span className={`
                              inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-medium rounded-full border
                              ${row.badgeColor === 'purple' 
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}
                            `}>
                              {row.badge}
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover/row:text-pink-400 transition-colors opacity-0 group-hover/row:opacity-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
