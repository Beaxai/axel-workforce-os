import React from 'react';
import { MapPin, Trash2, Plus, Edit2, Search, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';

export function SmartEntry() {
  return (
    <div className="min-h-screen bg-[#0f0f13] text-zinc-300 p-8 font-sans selection:bg-[#E91E8C]/30 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-[#0f0f13] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white mb-1">Operating Locations</h2>
            <p className="text-[13px] text-zinc-400">Manage all physical premises for this business.</p>
          </div>
          <div className="text-[11px] font-medium bg-[#E91E8C]/10 text-[#E91E8C] px-2.5 py-1 rounded-full border border-[#E91E8C]/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(233,30,140,0.1)]">
            <Sparkles className="w-3 h-3" />
            Smart Entry
          </div>
        </div>

        <div className="space-y-4">
          {/* Location 1: Parsed & Confirmed */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 relative group hover:bg-white/[0.04] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">
                  Location 1 (Primary)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-[#E91E8C]" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value="4820 Harvest Rd, Salinas, CA 93901"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-9 py-2 text-[13px] text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-zinc-600 cursor-default"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <CheckCircle2 className="h-4 w-4 text-[#E91E8C]/80" />
                  </div>
                </div>
              </div>
              <button className="ml-4 mt-6 p-1.5 text-zinc-500 hover:text-[#E91E8C] hover:bg-[#E91E8C]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <span className="text-[11px] px-2 py-1 bg-white/5 border border-white/5 rounded-md text-zinc-300">4820 Harvest Rd</span>
              <span className="text-[11px] px-2 py-1 bg-white/5 border border-white/5 rounded-md text-zinc-300">Salinas</span>
              <span className="text-[11px] px-2 py-1 bg-white/5 border border-white/5 rounded-md text-zinc-300">CA</span>
              <span className="text-[11px] px-2 py-1 bg-white/5 border border-white/5 rounded-md text-zinc-300">93901</span>
              <button className="text-[11px] text-zinc-500 hover:text-zinc-300 ml-1 flex items-center gap-1 transition-colors">
                <Edit2 className="h-3 w-3" /> Edit manually
              </button>
            </div>

            <div className="flex items-center text-[12px] text-zinc-500 pt-3 border-t border-white/5">
              <span>3 class codes</span>
              <span className="mx-2">·</span>
              <span>24 employees</span>
              <span className="mx-2">·</span>
              <span>$1.2M payroll</span>
            </div>
          </div>

          {/* Location 2: Actively Typing with Suggestions */}
          <div className="bg-white/[0.03] border border-[#E91E8C]/30 rounded-xl p-4 relative ring-1 ring-[#E91E8C]/20 shadow-[0_0_15px_rgba(233,30,140,0.05)]">
            <div className="flex items-start justify-between mb-3 relative z-20">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold tracking-wider uppercase text-[#E91E8C]/80 mb-1.5">
                  Location 2
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-[#E91E8C]" />
                  </div>
                  <input
                    type="text"
                    defaultValue="112 Commer"
                    className="w-full bg-[#0f0f13] border border-[#E91E8C]/50 rounded-lg pl-9 pr-4 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C] transition-all placeholder:text-zinc-600 shadow-inner"
                    placeholder="Start typing an address..."
                    autoFocus
                  />
                  
                  {/* Suggestion Dropdown */}
                  <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#15151a] border border-white/10 rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-30">
                    <div className="p-1">
                      <button className="w-full text-left px-3 py-2.5 text-[13px] rounded-md flex items-center gap-3 transition-colors group bg-white/5">
                        <MapPin className="h-4 w-4 text-[#E91E8C]" />
                        <div>
                          <div className="text-white font-medium">112 Commerce Way<span className="text-zinc-500 font-normal"> Suite B</span></div>
                          <div className="text-zinc-400 text-[11px] mt-0.5">Portland, OR 97202</div>
                        </div>
                      </button>
                      <button className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-white/5 rounded-md flex items-center gap-3 transition-colors group">
                        <MapPin className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400" />
                        <div>
                          <div className="text-zinc-300 group-hover:text-white">112 Commercial St</div>
                          <div className="text-zinc-500 text-[11px] mt-0.5">Salem, OR 97301</div>
                        </div>
                      </button>
                    </div>
                    <div className="bg-black/20 border-t border-white/5 px-3 py-2 text-[11px] text-zinc-500 flex justify-between items-center">
                      <span>Powered by Mapbox</span>
                      <button className="text-[#E91E8C] hover:text-[#E91E8C]/80 font-medium">Enter manually</button>
                    </div>
                  </div>
                </div>
              </div>
              <button className="ml-4 mt-6 p-1.5 text-zinc-500 hover:text-[#E91E8C] hover:bg-[#E91E8C]/10 rounded-md transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center text-[12px] text-zinc-600 pt-3 border-t border-white/5 mt-6">
              <span>0 class codes</span>
              <span className="mx-2">·</span>
              <span>0 employees</span>
            </div>
          </div>

          {/* Location 3: Manual Entry Mode */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 relative group hover:bg-white/[0.04] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
                    Location 3
                  </label>
                  <button className="text-[11px] text-[#E91E8C] hover:text-[#E91E8C]/80 font-medium flex items-center gap-1.5">
                    <Search className="h-3 w-3" /> Switch to Smart Entry
                  </button>
                </div>
                
                <div className="grid grid-cols-12 gap-x-3 gap-y-4">
                  <div className="col-span-8">
                    <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">Street Address</label>
                    <input
                      type="text"
                      defaultValue="77 Meridian Ave"
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">Suite/Unit</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                  
                  <div className="col-span-5">
                    <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">City</label>
                    <input
                      type="text"
                      defaultValue="Los Angeles"
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="col-span-3 relative">
                    <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">State</label>
                    <div className="relative">
                      <select 
                        defaultValue="CA"
                        className="w-full bg-[#0f0f13] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all appearance-none"
                      >
                        <option value="CO">CO</option>
                        <option value="CA">CA</option>
                        <option value="OR">OR</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <label className="flex items-center justify-between block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">
                      <span>ZIP Code</span>
                      <span className="text-[#E91E8C] tracking-normal normal-case text-[9px] bg-[#E91E8C]/10 px-1.5 py-0.5 rounded border border-[#E91E8C]/20">5-digit req</span>
                    </label>
                    <input
                      type="text"
                      defaultValue="90001"
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>
              <button className="ml-4 mt-6 p-1.5 text-zinc-500 hover:text-[#E91E8C] hover:bg-[#E91E8C]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center text-[12px] text-zinc-500 pt-3 border-t border-white/5 mt-4">
              <span>1 class code</span>
              <span className="mx-2">·</span>
              <span>8 employees</span>
              <span className="mx-2">·</span>
              <span>$450k payroll</span>
            </div>
          </div>
        </div>

        <button className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 text-[13px] font-medium text-zinc-400 hover:text-white border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-xl transition-all">
          <Plus className="h-4 w-4" />
          Add location
        </button>
      </div>
    </div>
  );
}
