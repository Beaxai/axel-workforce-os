import React, { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

const initialLocations = [
  {
    id: "1",
    street1: "4820 Harvest Rd",
    street2: "",
    city: "Salinas",
    state: "CA",
    zip: "93901",
    summary: "3 class codes · 24 employees · $1.2M payroll"
  },
  {
    id: "2",
    street1: "112 Commerce Way",
    street2: "Suite B",
    city: "Portland",
    state: "OR",
    zip: "97202",
    summary: "2 class codes · 12 employees · $540K payroll"
  },
  {
    id: "3",
    street1: "77 Meridian Ave",
    street2: "",
    city: "Denver",
    state: "CO",
    zip: "80014",
    summary: "1 class code · 5 employees · $210K payroll"
  }
];

export function AddressCards() {
  const [locations, setLocations] = useState(initialLocations);

  const update = (id: string, field: string, value: string) => {
    setLocations(locs => locs.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const remove = (id: string) => {
    setLocations(locs => locs.filter(l => l.id !== id));
  };

  const addLocation = () => {
    setLocations([
      ...locations, 
      {
        id: Math.random().toString(36).substr(2, 9),
        street1: "",
        street2: "",
        city: "",
        state: "",
        zip: "",
        summary: "0 class codes · 0 employees · $0 payroll"
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] p-8 text-white font-sans flex justify-center">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        
        {/* Mock Header for context, styling matched to the brief */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E91E8C]/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-[#E91E8C]" />
          </div>
          <div>
            <div className="text-base font-bold text-white leading-tight">Locations</div>
            <div className="text-xs text-white/50">Where the business operates — state and ZIP per location.</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {locations.map((loc, index) => {
            const isCA = loc.state === "CA";
            const zipWarning = isCA && loc.zip.replace(/\D/g, "").length < 5;

            return (
              <div key={loc.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 shadow-sm">
                
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-[13px] font-bold text-white/90">
                      Location {index + 1}
                    </div>
                    <div className="h-3.5 w-px bg-white/10"></div>
                    <div className="text-[11px] text-white/50 font-medium tracking-wide bg-white/[0.04] border border-white/5 px-2 py-0.5 rounded">
                      {loc.summary}
                    </div>
                  </div>
                  {locations.length > 1 && (
                    <button
                      onClick={() => remove(loc.id)}
                      className="p-1.5 text-white/30 hover:text-[#E91E8C] hover:bg-[#E91E8C]/10 rounded-md transition-colors"
                      title="Remove location"
                    >
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  )}
                </div>

                {/* Grid Form */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-[1fr_120px] gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-white/50 uppercase tracking-[0.07em] font-semibold mb-1.5">Street Address</label>
                      <input
                        value={loc.street1}
                        onChange={(e) => update(loc.id, "street1", e.target.value)}
                        placeholder="e.g. 123 Main St"
                        className="bg-white/[0.03] border border-white/10 rounded-lg text-[13px] text-white px-3 py-2 w-full focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 transition-colors placeholder:text-white/20"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-white/50 uppercase tracking-[0.07em] font-semibold mb-1.5">Suite / Unit</label>
                      <input
                        value={loc.street2}
                        onChange={(e) => update(loc.id, "street2", e.target.value)}
                        placeholder="Optional"
                        className="bg-white/[0.03] border border-white/10 rounded-lg text-[13px] text-white px-3 py-2 w-full focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 transition-colors placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_110px_120px] gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-white/50 uppercase tracking-[0.07em] font-semibold mb-1.5">City</label>
                      <input
                        value={loc.city}
                        onChange={(e) => update(loc.id, "city", e.target.value)}
                        placeholder="City"
                        className="bg-white/[0.03] border border-white/10 rounded-lg text-[13px] text-white px-3 py-2 w-full focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 transition-colors placeholder:text-white/20"
                      />
                    </div>
                    
                    <div className="flex flex-col">
                      <label className="text-[10px] text-white/50 uppercase tracking-[0.07em] font-semibold mb-1.5">State</label>
                      <div className="relative">
                        <select
                          value={loc.state}
                          onChange={(e) => update(loc.id, "state", e.target.value)}
                          className="bg-white/[0.03] border border-white/10 rounded-lg text-[13px] text-white pl-3 pr-8 py-2 w-full focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]/50 transition-colors appearance-none"
                        >
                          <option value="" className="bg-[#1a1a20]">State…</option>
                          {US_STATES.map((s) => <option key={s} value={s} className="bg-[#1a1a20]">{s}</option>)}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] text-white/50 uppercase tracking-[0.07em] font-semibold">ZIP Code</label>
                        {isCA && (
                          <span className="text-[9px] text-[#E91E8C]/90 font-bold tracking-wider">5-DIGIT REQ</span>
                        )}
                      </div>
                      <input
                        value={loc.zip}
                        onChange={(e) => update(loc.id, "zip", e.target.value)}
                        placeholder="ZIP"
                        maxLength={10}
                        className={`bg-white/[0.03] border rounded-lg text-[13px] text-white px-3 py-2 w-full focus:outline-none focus:ring-1 transition-colors placeholder:text-white/20 ${
                          zipWarning 
                            ? "border-[#E91E8C]/60 focus:border-[#E91E8C] focus:ring-[#E91E8C]/50" 
                            : "border-white/10 focus:border-[#E91E8C] focus:ring-[#E91E8C]/50"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-1">
          <button
            onClick={addLocation}
            className="flex items-center gap-2 text-[12px] font-medium text-white/70 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 px-3.5 py-2 rounded-lg transition-colors w-fit"
          >
            <Plus className="w-4 h-4" />
            Add location
          </button>
        </div>
      </div>
    </div>
  );
}
