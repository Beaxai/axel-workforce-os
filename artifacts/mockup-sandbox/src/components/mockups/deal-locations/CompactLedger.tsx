import React, { useState } from 'react';
import { MapPin, Plus, Trash2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

type Location = {
  id: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  classCodesCount: number;
  employeesCount: number;
  payroll: string;
};

const SEED_DATA: Location[] = [
  { id: "1", street1: "4820 Harvest Rd", city: "Salinas", state: "CA", zip: "93901", classCodesCount: 3, employeesCount: 24, payroll: "$1.2M" },
  { id: "2", street1: "112 Commerce Way", street2: "Suite B", city: "Portland", state: "OR", zip: "97202", classCodesCount: 2, employeesCount: 15, payroll: "$850k" },
  { id: "3", street1: "77 Meridian Ave", city: "Denver", state: "CO", zip: "80014", classCodesCount: 4, employeesCount: 42, payroll: "$2.1M" }
];

export function CompactLedger() {
  const [locations, setLocations] = useState<Location[]>(SEED_DATA);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["2"]));

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const update = (id: string, field: keyof Location, val: string) => {
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, [field]: val } : loc));
  };

  const remove = (id: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== id));
  };

  const add = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setLocations(prev => [...prev, {
      id,
      street1: "",
      city: "",
      state: "",
      zip: "",
      classCodesCount: 0,
      employeesCount: 0,
      payroll: "$0"
    }]);
    setExpanded(prev => new Set(prev).add(id));
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-8 bg-[#0f0f13] min-h-screen text-white font-sans antialiased">
      
      {/* Header section */}
      <div className="flex items-center gap-3">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E91E8C]/10 flex items-center justify-center border border-[#E91E8C]/20 shadow-[0_0_15px_rgba(233,30,140,0.15)]">
          <MapPin className="w-[17px] h-[17px] text-[#E91E8C]" />
        </div>
        <div>
          <div className="text-[16px] font-bold leading-tight tracking-tight text-white/95">Locations</div>
          <div className="text-[12px] text-white/50 mt-0.5">Where the business operates — full address per location.</div>
        </div>
      </div>

      {/* Ledger Container */}
      <div className="flex flex-col border border-white/[0.08] rounded-xl bg-white/[0.02] shadow-2xl overflow-hidden backdrop-blur-xl">
        
        {/* Ledger Header */}
        <div className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-black/20 text-[10px] text-white/40 uppercase tracking-[0.06em] font-semibold">
          <div className="w-8"></div>
          <div className="flex-1">Location / Address</div>
          <div className="w-32 hidden sm:block">Class Codes</div>
          <div className="w-32 hidden sm:block">Employees</div>
          <div className="w-32 hidden sm:block">Est. Payroll</div>
          <div className="w-8"></div>
        </div>

        {/* Ledger Rows */}
        <div className="flex flex-col">
          {locations.map((loc, i) => {
            const isExpanded = expanded.has(loc.id);
            const isCA = loc.state === 'CA';
            const caMissingZip = isCA && loc.zip.replace(/\D/g, '').length < 5;
            const addressString = [loc.street1, loc.street2, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
            
            return (
              <div 
                key={loc.id} 
                className={`flex flex-col border-b border-white/[0.06] last:border-b-0 transition-all duration-200 ${isExpanded ? 'bg-white/[0.03]' : 'hover:bg-white/[0.04]'}`}
              >
                {/* Summary Row */}
                <div 
                  className="flex items-center px-4 py-3.5 cursor-pointer select-none group"
                  onClick={() => toggle(loc.id)}
                >
                  <div className="w-8 flex items-center justify-start text-white/30 group-hover:text-white/60 transition-colors">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2.5 pr-4 truncate">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className={`text-[13px] font-medium truncate ${addressString ? 'text-white/90' : 'text-white/40 italic'}`}>
                      {addressString || 'New Location'}
                    </span>
                    {caMissingZip && !isExpanded && <AlertTriangle className="w-3.5 h-3.5 text-[#FFB547] flex-shrink-0" />}
                  </div>

                  <div className="w-32 text-[12px] text-white/50 hidden sm:flex items-center gap-1.5">
                    <span className="text-white/80 font-medium">{loc.classCodesCount}</span> classes
                  </div>
                  <div className="w-32 text-[12px] text-white/50 hidden sm:flex items-center gap-1.5">
                    <span className="text-white/80 font-medium">{loc.employeesCount}</span> employees
                  </div>
                  <div className="w-32 text-[12px] text-white/50 hidden sm:block">
                    {loc.payroll}
                  </div>
                  
                  <div className="w-8 flex justify-end">
                    {locations.length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); remove(loc.id); }} 
                        className="text-white/20 hover:text-red-400 transition-colors p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove location"
                      >
                        <Trash2 className="w-[15px] h-[15px]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Form */}
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-5 pt-2 flex flex-col gap-5 pl-[60px] pr-[52px]">
                      
                      <div className="flex gap-4 flex-col sm:flex-row">
                        <div className="flex-1">
                          <label className="block text-[10px] text-white/50 uppercase tracking-[0.08em] font-semibold mb-1.5">Street Address</label>
                          <input 
                            value={loc.street1} 
                            onChange={(e) => update(loc.id, 'street1', e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-white/20 shadow-inner" 
                            placeholder="123 Main St" 
                          />
                        </div>
                        <div className="sm:w-[30%]">
                          <label className="block text-[10px] text-white/50 uppercase tracking-[0.08em] font-semibold mb-1.5">
                            Suite/Unit <span className="opacity-60 lowercase tracking-normal font-normal ml-0.5">(opt)</span>
                          </label>
                          <input 
                            value={loc.street2 || ''} 
                            onChange={(e) => update(loc.id, 'street2', e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-white/20 shadow-inner" 
                            placeholder="Apt 4B" 
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 flex-col sm:flex-row">
                        <div className="flex-1">
                          <label className="block text-[10px] text-white/50 uppercase tracking-[0.08em] font-semibold mb-1.5">City</label>
                          <input 
                            value={loc.city} 
                            onChange={(e) => update(loc.id, 'city', e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-white/20 shadow-inner" 
                            placeholder="City" 
                          />
                        </div>
                        <div className="sm:w-[120px]">
                          <label className="block text-[10px] text-white/50 uppercase tracking-[0.08em] font-semibold mb-1.5">State</label>
                          <div className="relative">
                            <select 
                              value={loc.state} 
                              onChange={(e) => update(loc.id, 'state', e.target.value)} 
                              className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all appearance-none shadow-inner"
                            >
                              <option value="">--</option>
                              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-white/40">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                        <div className="sm:w-[140px]">
                          <label className="flex items-center gap-1.5 text-[10px] text-white/50 uppercase tracking-[0.08em] font-semibold mb-1.5 h-[15px]">
                            ZIP 
                            {isCA && <span className="text-[#FFB547] lowercase tracking-normal font-normal flex items-center gap-1"><span className="w-[3px] h-[3px] rounded-full bg-[#FFB547]"></span> 5-digit req</span>}
                          </label>
                          <input 
                            value={loc.zip} 
                            onChange={(e) => update(loc.id, 'zip', e.target.value)} 
                            maxLength={10} 
                            className={`w-full bg-black/40 border ${caMissingZip ? 'border-[#FFB547]/50 focus:border-[#FFB547]' : 'border-white/10 focus:border-[#E91E8C]/50'} rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-1 ${caMissingZip ? 'focus:ring-[#FFB547]/50' : 'focus:ring-[#E91E8C]/50'} transition-all placeholder:text-white/20 shadow-inner`} 
                            placeholder="ZIP code" 
                          />
                        </div>
                      </div>
                      
                      {caMissingZip && (
                        <div className="text-[11.5px] text-[#FFB547] flex items-center gap-2 mt-[-4px] bg-[#FFB547]/10 border border-[#FFB547]/20 px-3 py-2 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          California locations need a 5-digit ZIP to determine the territorial rating factor.
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer Actions */}
      <button 
        onClick={add} 
        className="group flex items-center gap-2 text-[12px] font-medium text-white/70 hover:text-[#E91E8C] px-4 py-2.5 rounded-lg hover:bg-[#E91E8C]/10 border border-transparent hover:border-[#E91E8C]/20 self-start transition-all shadow-[0_0_0_rgba(233,30,140,0)] hover:shadow-[0_0_15px_rgba(233,30,140,0.15)]"
      >
        <Plus className="w-3.5 h-3.5 text-white/40 group-hover:text-[#E91E8C] transition-colors" />
        Add another location
      </button>

    </div>
  );
}
