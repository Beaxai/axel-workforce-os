import React from 'react';
import { Search, Plus, Building2, MapPin, ChevronRight, Users } from 'lucide-react';

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

export function ListRows() {
  return (
    <div className="min-h-screen bg-[#0d0d10] text-gray-200 p-8 font-sans selection:bg-pink-500/30">
      <div className="max-w-[1280px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Accounts</h1>
            <p className="text-gray-400 text-sm mt-1">44 prospects</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-lg font-medium text-sm transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)]">
            <Plus className="w-4 h-4" />
            New Account
          </button>
        </div>

        {/* Tabs & Filters */}
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <div className="flex gap-8">
            <button className="text-gray-400 hover:text-gray-200 pb-4 mb-[-17px] text-sm font-medium transition-colors">Leads</button>
            <button className="text-pink-500 border-b-2 border-pink-500 pb-4 mb-[-17px] text-sm font-medium">Prospects</button>
            <button className="text-gray-400 hover:text-gray-200 pb-4 mb-[-17px] text-sm font-medium transition-colors">Clients</button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search accounts..." 
              className="bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-gray-500 rounded-lg py-2 pl-9 pr-4 w-72 focus:outline-none focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 pb-12">
          {data.map((row, i) => (
            <div key={i} className="group flex items-center justify-between p-4 px-5 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] rounded-[14px] transition-all cursor-pointer">
              
              {/* Left: Name and Meta */}
              <div className="flex-1 min-w-0 pr-6">
                <h3 className="text-[15px] font-semibold text-white group-hover:text-pink-400 transition-colors tracking-wide">{row.name}</h3>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-500" />
                    {row.vertical}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    {row.state}
                  </span>
                </div>
              </div>

              {/* Middle: Metrics */}
              <div className="flex items-center gap-16 pr-16">
                <div className="flex flex-col items-end w-28">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Payroll</span>
                  <span className="text-sm font-medium text-gray-200">{row.payroll || <span className="text-gray-600">&mdash;</span>}</span>
                </div>
                <div className="flex flex-col items-end w-24">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Employees</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-200">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    {row.employees}
                  </span>
                </div>
              </div>

              {/* Right: Stage & Action */}
              <div className="flex items-center gap-5 w-44 justify-end">
                {row.stage === 'Active Prospect' ? (
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/20 tracking-wide">
                    {row.stage}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs font-semibold border border-white/10 tracking-wide">
                    {row.stage}
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-pink-500 transition-colors group-hover:translate-x-0.5 transform" />
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
