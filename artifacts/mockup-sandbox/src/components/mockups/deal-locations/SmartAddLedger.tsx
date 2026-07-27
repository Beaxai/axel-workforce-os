import React, { useState } from 'react';
import { MapPin, Plus, Trash2, ChevronDown, AlertTriangle, Edit2, Search, CheckCircle2, Sparkles, Pencil } from 'lucide-react';

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

export function SmartAddLedger() {
  const [locations, setLocations] = useState<Location[]>(SEED_DATA);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualModeIds, setManualModeIds] = useState<Set<string>>(new Set());
  
  const [addText, setAddText] = useState("880 Harrison");
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [newLoc, setNewLoc] = useState<Partial<Location>>({ state: "CA" });

  const toggleEdit = (id: string) => {
    if (editingId === id) setEditingId(null);
    else setEditingId(id);
  };

  const enableManualEdit = (id: string) => {
    setManualModeIds(prev => new Set(prev).add(id));
  };

  const updateLoc = (id: string, field: keyof Location, val: string) => {
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, [field]: val } : loc));
  };

  const removeLoc = (id: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const selectSuggestion = () => {
    const id = Math.random().toString(36).substring(2, 9);
    setLocations(prev => [...prev, {
      id,
      street1: "880 Harrison St",
      city: "San Francisco",
      state: "CA",
      zip: "94107",
      classCodesCount: 0,
      employeesCount: 0,
      payroll: "$0"
    }]);
    setAddText("");
  };

  const saveNewManualLoc = () => {
    const id = Math.random().toString(36).substring(2, 9);
    setLocations(prev => [...prev, {
      id,
      street1: newLoc.street1 || "",
      street2: newLoc.street2 || "",
      city: newLoc.city || "",
      state: newLoc.state || "CA",
      zip: newLoc.zip || "",
      classCodesCount: 0,
      employeesCount: 0,
      payroll: "$0"
    }]);
    setIsAddingManually(false);
    setNewLoc({ state: "CA" });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-8 bg-[#0f0f13] min-h-screen text-zinc-300 font-sans antialiased selection:bg-[#E91E8C]/30">
      
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E91E8C]/10 flex items-center justify-center border border-[#E91E8C]/20 shadow-[0_0_15px_rgba(233,30,140,0.15)]">
            <MapPin className="w-[17px] h-[17px] text-[#E91E8C]" />
          </div>
          <div>
            <div className="text-[16px] font-bold leading-tight tracking-tight text-white/95">Operating Locations</div>
            <div className="text-[12px] text-zinc-400 mt-0.5">Manage all physical premises for this business.</div>
          </div>
        </div>
        <div className="text-[11px] font-medium bg-[#E91E8C]/10 text-[#E91E8C] px-2.5 py-1 rounded-full border border-[#E91E8C]/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(233,30,140,0.1)]">
          <Sparkles className="w-3 h-3" />
          Smart-Add Ledger
        </div>
      </div>

      {/* Ledger Container */}
      <div className="flex flex-col border border-white/[0.08] rounded-xl bg-white/[0.02] shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Ledger Header */}
        <div className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-black/20 text-[10px] text-zinc-500 uppercase tracking-[0.06em] font-semibold rounded-t-xl">
          <div className="w-8"></div>
          <div className="flex-1">Location / Address</div>
          <div className="w-28 hidden sm:block">Class Codes</div>
          <div className="w-28 hidden sm:block">Employees</div>
          <div className="w-28 hidden sm:block">Est. Payroll</div>
          <div className="w-16"></div>
        </div>

        {/* Ledger Rows */}
        <div className="flex flex-col">
          {locations.map((loc, i) => {
            const isEditing = editingId === loc.id;
            const isManualMode = manualModeIds.has(loc.id);
            const isCA = loc.state === 'CA';
            const caMissingZip = isCA && loc.zip.replace(/\D/g, '').length < 5;
            const addressString = [loc.street1, loc.street2, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
            const fullAddress = `${loc.street1}${loc.street2 ? ` ${loc.street2}` : ''}, ${loc.city}, ${loc.state} ${loc.zip}`;
            
            return (
              <div 
                key={loc.id} 
                className={`flex flex-col border-b border-white/[0.06] transition-all duration-200 ${isEditing ? 'bg-white/[0.03]' : 'hover:bg-white/[0.04]'}`}
              >
                {/* 1-Line Summary Row */}
                <div 
                  className={`flex items-center px-4 py-3.5 group ${isEditing ? 'border-b border-white/[0.04]' : ''}`}
                >
                  <div className="w-8 flex justify-start">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0">
                      {i + 1}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2.5 pr-4 truncate">
                    <span className={`text-[13px] font-medium truncate ${addressString ? 'text-zinc-200' : 'text-zinc-500 italic'}`}>
                      {addressString || 'New Location'}
                    </span>
                    {caMissingZip && !isEditing && <AlertTriangle className="w-3.5 h-3.5 text-[#FFB547] flex-shrink-0" />}
                  </div>

                  <div className="w-28 text-[12px] text-zinc-500 hidden sm:flex items-center gap-1.5">
                    <span className="text-zinc-300 font-medium">{loc.classCodesCount}</span> classes
                  </div>
                  <div className="w-28 text-[12px] text-zinc-500 hidden sm:flex items-center gap-1.5">
                    <span className="text-zinc-300 font-medium">{loc.employeesCount}</span> employees
                  </div>
                  <div className="w-28 text-[12px] text-zinc-500 hidden sm:block">
                    {loc.payroll}
                  </div>
                  
                  <div className="w-16 flex justify-end gap-1">
                    <button 
                      onClick={() => toggleEdit(loc.id)} 
                      className={`p-1.5 rounded-md transition-colors ${isEditing ? 'text-[#E91E8C] bg-[#E91E8C]/10' : 'text-zinc-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                      title="Edit location"
                    >
                      <Pencil className="w-[14px] h-[14px]" />
                    </button>
                    {locations.length > 1 && (
                      <button 
                        onClick={() => removeLoc(loc.id)} 
                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove location"
                      >
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Editing Area */}
                {isEditing && (
                  <div className="px-4 py-5 pl-[60px] pr-[52px]">
                    {!isManualMode ? (
                      // Parsed Token View
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
                            Parsed Address
                          </label>
                        </div>
                        <div className="relative mb-3">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-4 w-4 text-[#E91E8C]" />
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={fullAddress}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-9 py-2 text-[13px] text-white focus:outline-none transition-all cursor-default shadow-inner"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <CheckCircle2 className="h-4 w-4 text-[#E91E8C]/80" />
                          </div>
                        </div>
                        
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[11px] px-2 py-1 bg-black/40 border border-white/10 rounded-md text-zinc-300">{loc.street1}</span>
                          {loc.street2 && <span className="text-[11px] px-2 py-1 bg-black/40 border border-white/10 rounded-md text-zinc-300">{loc.street2}</span>}
                          <span className="text-[11px] px-2 py-1 bg-black/40 border border-white/10 rounded-md text-zinc-300">{loc.city}</span>
                          <span className="text-[11px] px-2 py-1 bg-black/40 border border-white/10 rounded-md text-zinc-300">{loc.state}</span>
                          <span className="text-[11px] px-2 py-1 bg-black/40 border border-white/10 rounded-md text-zinc-300">{loc.zip}</span>
                          
                          <button 
                            onClick={() => enableManualEdit(loc.id)}
                            className="text-[11px] text-[#E91E8C] hover:text-[#E91E8C]/80 font-medium ml-2 flex items-center gap-1 transition-colors"
                          >
                            <Edit2 className="h-3 w-3" /> Edit manually
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Manual Grid View
                      <div>
                        <div className="grid grid-cols-12 gap-x-3 gap-y-4">
                          <div className="col-span-12 sm:col-span-8">
                            <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">Street Address</label>
                            <input
                              type="text"
                              value={loc.street1}
                              onChange={(e) => updateLoc(loc.id, 'street1', e.target.value)}
                              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600 shadow-inner"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-4">
                            <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">Suite/Unit <span className="normal-case tracking-normal opacity-60 font-normal">(opt)</span></label>
                            <input
                              type="text"
                              value={loc.street2 || ''}
                              onChange={(e) => updateLoc(loc.id, 'street2', e.target.value)}
                              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600 shadow-inner"
                            />
                          </div>
                          
                          <div className="col-span-12 sm:col-span-5">
                            <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">City</label>
                            <input
                              type="text"
                              value={loc.city}
                              onChange={(e) => updateLoc(loc.id, 'city', e.target.value)}
                              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600 shadow-inner"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-3 relative">
                            <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">State</label>
                            <div className="relative">
                              <select 
                                value={loc.state}
                                onChange={(e) => updateLoc(loc.id, 'state', e.target.value)}
                                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all appearance-none shadow-inner"
                              >
                                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                              </div>
                            </div>
                          </div>
                          <div className="col-span-12 sm:col-span-4">
                            <label className="flex items-center justify-between block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">
                              <span>ZIP Code</span>
                              {isCA && <span className="text-[#FFB547] tracking-normal normal-case text-[9px] bg-[#FFB547]/10 px-1.5 py-0.5 rounded border border-[#FFB547]/20 flex items-center gap-1"><span className="w-[3px] h-[3px] rounded-full bg-[#FFB547]"></span>5-digit req</span>}
                            </label>
                            <input
                              type="text"
                              value={loc.zip}
                              onChange={(e) => updateLoc(loc.id, 'zip', e.target.value)}
                              maxLength={10}
                              className={`w-full bg-[#0f0f13] border ${caMissingZip ? 'border-[#FFB547]/50 focus:border-[#FFB547]' : 'border-white/10 focus:border-[#E91E8C]/50'} rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-1 ${caMissingZip ? 'focus:ring-[#FFB547]/50' : 'focus:ring-[#E91E8C]/50'} transition-all placeholder:text-zinc-600 shadow-inner`}
                            />
                          </div>
                        </div>
                        {caMissingZip && (
                          <div className="text-[11px] text-[#FFB547] flex items-center gap-2 mt-3 bg-[#FFB547]/10 border border-[#FFB547]/20 px-3 py-2 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            California locations require a 5-digit ZIP for territorial rating.
                          </div>
                        )}
                        <div className="mt-4 flex justify-end">
                          <button onClick={() => setEditingId(null)} className="text-[12px] bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-white/10">
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Docked Add Bar */}
        <div className="p-4 bg-black/40 border-t border-white/[0.06] rounded-b-xl relative z-20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-semibold tracking-wider uppercase text-[#E91E8C]/80 flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Add Location
            </label>
            <button 
              onClick={() => setIsAddingManually(!isAddingManually)}
              className="text-[11px] text-[#E91E8C] hover:text-[#E91E8C]/80 font-medium transition-colors"
            >
              {isAddingManually ? "Switch to Smart Entry" : "Enter manually"}
            </button>
          </div>

          {!isAddingManually ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E91E8C]" />
              <input
                value={addText}
                onChange={e => setAddText(e.target.value)}
                placeholder="Start typing an address to add a location..."
                className="w-full bg-[#0f0f13] border border-[#E91E8C]/50 rounded-lg pl-9 pr-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C] transition-all placeholder:text-zinc-600 shadow-inner"
              />
              
              {/* Dummy Open Suggestion Dropdown */}
              {addText.length > 0 && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#15151a] border border-white/10 rounded-lg overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-30">
                  <div className="p-1">
                    <button onClick={selectSuggestion} className="w-full text-left px-3 py-2.5 text-[13px] rounded-md flex items-center gap-3 transition-colors group bg-white/5 border border-white/5">
                      <MapPin className="h-4 w-4 text-[#E91E8C]" />
                      <div>
                        <div className="text-white font-medium">880 Harrison St</div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">San Francisco, CA 94107</div>
                      </div>
                    </button>
                    <button className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-white/5 rounded-md flex items-center gap-3 transition-colors group">
                      <MapPin className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400" />
                      <div>
                        <div className="text-zinc-300 group-hover:text-white">880 Harrison Ave</div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">Boston, MA 02118</div>
                      </div>
                    </button>
                  </div>
                  <div className="bg-black/20 border-t border-white/5 px-3 py-2 text-[11px] text-zinc-500 flex justify-between items-center">
                    <span>Powered by Mapbox</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0f0f13] border border-white/10 rounded-lg p-4">
              <div className="grid grid-cols-12 gap-x-3 gap-y-4">
                <div className="col-span-12 sm:col-span-8">
                  <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">Street Address</label>
                  <input
                    type="text"
                    value={newLoc.street1 || ''}
                    onChange={(e) => setNewLoc(prev => ({ ...prev, street1: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600 shadow-inner"
                  />
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">Suite/Unit</label>
                  <input
                    type="text"
                    value={newLoc.street2 || ''}
                    onChange={(e) => setNewLoc(prev => ({ ...prev, street2: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600 shadow-inner"
                  />
                </div>
                
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">City</label>
                  <input
                    type="text"
                    value={newLoc.city || ''}
                    onChange={(e) => setNewLoc(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600 shadow-inner"
                  />
                </div>
                <div className="col-span-12 sm:col-span-3 relative">
                  <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">State</label>
                  <div className="relative">
                    <select 
                      value={newLoc.state || 'CA'}
                      onChange={(e) => setNewLoc(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all appearance-none shadow-inner"
                    >
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] font-semibold tracking-wider uppercase text-zinc-500 mb-1.5">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={newLoc.zip || ''}
                    onChange={(e) => setNewLoc(prev => ({ ...prev, zip: e.target.value }))}
                    maxLength={10}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#E91E8C]/50 focus:ring-1 focus:ring-[#E91E8C]/50 transition-all placeholder:text-zinc-600 shadow-inner"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={saveNewManualLoc}
                  disabled={!newLoc.street1 || !newLoc.city || !newLoc.zip}
                  className="text-[12px] bg-[#E91E8C] hover:bg-[#E91E8C]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Location
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}