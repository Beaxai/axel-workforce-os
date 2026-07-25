import React from "react";
import { Search, Plus, ChevronRight, ChevronDown, ArrowUpDown, Building2, MapPin, Users } from "lucide-react";

export function TableRows() {
  const data = [
    { name: "Keystone Construction", vertical: "Construction", state: "CT", payroll: "$3,020,000", employees: 40, stage: "Prospect" },
    { name: "Fixcheck Botanicals", vertical: "Cannabis", state: "CA", payroll: "$900,000", employees: 12, stage: "Prospect" },
    { name: "Cascade Wellness Group", vertical: "Cannabis", state: "OR", payroll: "$2,400,000", employees: 31, stage: "Active Prospect" },
    { name: "Green Valley Cultivation", vertical: "Cannabis", state: "CA", payroll: "$1,850,000", employees: 24, stage: "Prospect" },
    { name: "Sierra Leaf Co", vertical: "Cannabis", state: "CA", payroll: "$500,000", employees: 5, stage: "Prospect" },
    { name: "Pacific Crest Builders", vertical: "Construction", state: "OR", payroll: "$1,200,000", employees: 12, stage: "Prospect" },
    { name: "Keystone Construction Inc", vertical: "Construction", state: "CT", payroll: "$2,630,000", employees: 40, stage: "Prospect" },
    { name: "Bloom & Root Collective", vertical: "Cannabis", state: "CA", payroll: null, employees: 9, stage: "Prospect" },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d10] text-zinc-300 font-sans p-8 flex justify-center">
      <div className="w-full max-w-[1280px] flex flex-col gap-8 mt-4">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <h1 className="text-3xl font-semibold text-white tracking-tight">Accounts</h1>
              <span className="text-zinc-500 text-sm font-medium px-2 py-1 bg-white/5 rounded-md border border-white/5">44 prospects</span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium hover:from-pink-400 hover:to-purple-500 transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_20px_rgba(236,72,153,0.5)]">
              <Plus className="w-4 h-4" />
              New Account
            </button>
          </div>
          
          <div className="flex items-center justify-between border-b border-white/10 pb-px mt-2">
            <div className="flex gap-8">
              {['Leads', 'Prospects', 'Clients'].map((tab) => (
                <button 
                  key={tab}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    tab === 'Prospects' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                  {tab === 'Prospects' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-pink-500 rounded-t-full shadow-[0_-2px_8px_rgba(236,72,153,0.6)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar: search (top-left) + filters + sort */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="relative w-[380px]">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search accounts..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-16 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 shadow-lg transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-500 bg-white/[0.05] border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
            </div>

            {/* Filter pills */}
            {[
              { label: "Vertical", value: "All" },
              { label: "State", value: "All" },
              { label: "Stage", value: "All" },
            ].map((f) => (
              <button
                key={f.label}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-pink-500/40 transition-all"
              >
                <span className="text-zinc-500">{f.label}:</span>
                <span className="text-zinc-200 font-medium">{f.value}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            ))}

            {/* Sort control — pushed to the right edge */}
            <button className="ml-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-pink-500/40 transition-all">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500">Sort:</span>
              <span className="text-zinc-200 font-medium">Most recent</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Data Table Panel */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[16px] overflow-hidden backdrop-blur-xl shadow-2xl">
          
          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1.5fr_auto] gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.01] text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            <div>Company</div>
            <div>Vertical</div>
            <div>State</div>
            <div className="text-right">Annual Payroll</div>
            <div className="text-right">Employees</div>
            <div className="pl-8">Stage</div>
            <div className="w-6"></div>
          </div>
          
          {/* Table Body */}
          <div className="flex flex-col">
            {data.map((row, i) => (
              <div 
                key={i}
                className={`grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1.5fr_auto] items-center gap-4 px-6 h-[52px] group hover:bg-pink-500/[0.04] hover:cursor-pointer transition-colors ${
                  i !== data.length - 1 ? 'border-b border-white/[0.04]' : ''
                }`}
              >
                <div className="font-semibold text-zinc-100 truncate group-hover:text-pink-50 transition-colors">
                  {row.name}
                </div>
                
                <div className="text-sm text-zinc-400 flex items-center gap-2 truncate group-hover:text-zinc-300 transition-colors">
                  {row.vertical}
                </div>
                
                <div className="text-sm text-zinc-400 flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
                  {row.state}
                </div>
                
                <div className="text-sm text-zinc-300 text-right tabular-nums group-hover:text-zinc-200 transition-colors">
                  {row.payroll || <span className="text-zinc-600">—</span>}
                </div>
                
                <div className="text-sm text-zinc-300 text-right tabular-nums group-hover:text-zinc-200 transition-colors">
                  {row.employees}
                </div>
                
                <div className="pl-8 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border ${
                    row.stage === 'Active Prospect' 
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}>
                    {row.stage}
                  </span>
                </div>
                
                <div className="flex justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity w-6 text-pink-400">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
          
        </div>

      </div>
    </div>
  );
}
