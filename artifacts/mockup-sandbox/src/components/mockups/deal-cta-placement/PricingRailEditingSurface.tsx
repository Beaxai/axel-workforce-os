import React, { useState } from "react";
import { Star, X, MapPin, Users, Wallet, RefreshCcw, LayoutGrid, FileText, ShieldCheck, Folder, Quote, FileCheck, CheckSquare, Plus, ChevronRight, ArrowUp, Shield } from "lucide-react";

export type CtaPlacement = "strip" | "header" | "journey" | "footer" | "rail" | "pricingRail";

const PINK = "#E91E8C";
const GRAD = "linear-gradient(90deg, #E91E8C, #A855F7)";

function Cta({ small = false, hint = true }: { small?: boolean; hint?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {hint && <span className="text-[10.5px] text-zinc-500">1 section to complete</span>}
      <button
        className="text-white font-semibold rounded-lg"
        style={{ background: GRAD, fontSize: small ? 12 : 12.5, padding: small ? "6px 14px" : "7px 18px" }}
      >
        Request Proposal
      </button>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, dot }: { icon: React.ElementType; label: string; value: string; dot?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-zinc-400">
        <Icon size={11} />
        <span className="text-[9px] tracking-widest font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[24px] font-bold" style={{ color: label === "EXMOD" ? "#fff" : PINK }}>{value}</span>
        {dot && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />}
      </div>
    </div>
  );
}

function Badge({ value, sub, label }: { value: string; sub?: string; label: string }) {
  return (
    <div className="rounded-xl px-4 py-2.5 text-center border" style={{ borderColor: PINK, boxShadow: `0 0 12px ${PINK}66` }}>
      <div className="flex items-center justify-center gap-1.5">
        <Shield size={13} className="text-purple-400" />
        <span className="text-white font-bold text-[16px]">{value}<span className="text-[9px] font-medium text-zinc-300">{sub}</span></span>
      </div>
      <div className="text-[8.5px] tracking-wider mt-0.5" style={{ color: PINK }}>{label}</div>
    </div>
  );
}

const STAGES = ["SUBMISSION\nPENDING", "INDICATION", "U/W REVIEW", "APPROVED /\nDECLINED", "BINDING", "IMPLEMENTATION"];

export function PricingRailEditingSurface() {
  const placement = "pricingRail";
  
  const [wcPremium, setWcPremium] = useState("67,294");
  const [peoPerEmployee, setPeoPerEmployee] = useState("136");
  
  // derived
  const employees = 15;
  const peoTotal = (parseInt(peoPerEmployee.replace(/,/g, '')) || 0) * employees;

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ---------- Header over map ---------- */}
      <div className="relative px-5 pt-4 pb-3" style={{ background: "radial-gradient(ellipse at 50% 30%, #16161c 0%, #0a0a0d 70%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Star size={16} className="text-zinc-500" />
              <span className="text-[20px] font-bold">Keystone Custom</span>
              <span className="flex -space-x-1.5">
                <span className="w-7 h-7 rounded-full bg-zinc-700 border border-black inline-block" />
                <span className="w-7 h-7 rounded-full bg-zinc-600 border border-black inline-flex items-center justify-center text-[9px]">JC</span>
                <span className="w-7 h-7 rounded-full bg-zinc-700 border border-black inline-block" />
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">Construction</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">PEO</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold" style={{ color: PINK, border: `1px solid ${PINK}` }}>EFFECTIVE 9/1/2026</span>
            </div>
          </div>
          <div className="flex items-start gap-5">
            <div className="flex gap-5 pt-1">
              <Kpi icon={MapPin} label="LOCATIONS" value="2" />
              <Kpi icon={Users} label="EMPLOYEES" value="15" />
              <Kpi icon={Wallet} label="PAYROLL" value="$1.2M" />
              <Kpi icon={RefreshCcw} label="EXMOD" value="1.00" dot />
            </div>
            <X size={16} className="text-zinc-500 mt-1 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
        
        {/* ---------- Journey timeline ---------- */}
        <div className="mt-4">
          <div className="relative flex items-center justify-between px-8">
            <div className="absolute left-8 right-8 top-[5px] h-px bg-zinc-700" />
            {STAGES.map((s, i) => (
              <div key={s} className="relative flex flex-col items-center" style={{ width: 110 }}>
                <span
                  className="w-[11px] h-[11px] rounded-full border-2 z-10"
                  style={i === 1 ? { borderColor: "#fff", background: "#000", boxShadow: "0 0 8px #fff8" } : { borderColor: "#3f3f46", background: i === 0 ? "#71717a" : "#0a0a0d" }}
                />
                <span className="text-[8.5px] tracking-widest font-semibold text-zinc-400 mt-2 text-center whitespace-pre-line">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="flex flex-1 min-h-0 border-t border-zinc-800">
        {/* Left nav */}
        <div className="w-[150px] border-r border-zinc-800 py-3 flex flex-col gap-0.5 shrink-0">
          {[
            { icon: LayoutGrid, label: "Overview", active: true },
            { icon: FileText, label: "Submission" },
            { icon: ShieldCheck, label: "Subjectivities" },
            { icon: Folder, label: "Documents" },
            { icon: Quote, label: "Quote" },
            { icon: FileCheck, label: "Policy" },
            { icon: CheckSquare, label: "Tasks" },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-2 text-[11.5px] ${active ? "text-white border-l-2 cursor-default" : "text-zinc-400 hover:bg-zinc-900 cursor-pointer"}`} style={active ? { borderColor: PINK, background: "#E91E8C1a" } : {}}>
              <Icon size={13} style={active ? { color: PINK } : {}} />
              {label}
            </div>
          ))}
        </div>

        {/* Center column */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-zinc-800 relative bg-[#060606]">
          {/* Dim overlay over main content to draw focus to right rail */}
          <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
          
          <div className="flex-1 px-6 py-4 overflow-hidden relative z-0">
            <div className="text-[9.5px] tracking-widest text-zinc-500 font-semibold">YESTERDAY</div>
            <div className="flex items-center gap-2 mt-3 text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
              <span className="font-semibold">Record created</span>
              <span className="text-zinc-500">· Indication saved for Keystone Custom · 4:26 PM</span>
            </div>
            <div className="flex items-center justify-between mt-5">
              <span className="text-[9.5px] px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 tracking-wider">RFIS</span>
              <span className="text-[11px]" style={{ color: PINK }}>+ Request info</span>
            </div>
            <div className="flex items-center gap-2.5 mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
              <span className="w-7 h-7 rounded-full bg-zinc-700 shrink-0" />
              <span className="text-[12px] text-zinc-500 flex-1">Type a message</span>
              <span className="w-8 h-8 rounded-full inline-flex items-center justify-center" style={{ background: GRAD }}><ArrowUp size={14} /></span>
            </div>
          </div>
        </div>

        {/* Right rail — Editing State */}
        <div className="w-[280px] shrink-0 flex flex-col bg-[#0a0a0d] shadow-[-8px_0_24px_rgba(0,0,0,0.5)] z-20 relative">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <Wallet size={14} style={{ color: PINK }} />
              <span className="text-[11px] tracking-widest font-semibold text-white">EDIT PRICING</span>
            </div>
            <X size={14} className="text-zinc-400 cursor-pointer hover:text-white transition-colors" />
          </div>
          
          <div className="px-5 py-5 flex flex-col gap-6 overflow-y-auto">
            
            {/* WC Premium Edit Group */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[9.5px] tracking-widest font-semibold text-zinc-400">
                <Shield size={11} className="text-purple-400" /> WC ANNUAL PREMIUM
              </div>
              
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-[14px]">$</span>
                <input 
                  type="text" 
                  value={wcPremium}
                  onChange={(e) => setWcPremium(e.target.value)}
                  className="w-full bg-[#121217] border border-zinc-700 hover:border-zinc-500 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C] text-white rounded-lg pl-8 pr-4 py-2.5 text-[15px] font-semibold outline-none transition-all"
                />
              </div>
              
              <div className="flex items-center justify-between px-1">
                <span className="text-[10.5px] text-zinc-500">Monthly</span>
                <span className="text-[11px] text-zinc-300 font-medium">${Math.round(parseInt(wcPremium.replace(/,/g, '')) / 12 || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800/80 w-full" />

            {/* PEO Premium Edit Group */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[9.5px] tracking-widest font-semibold text-zinc-400">
                <Shield size={11} className="text-purple-400" /> PEO ADMIN FEE
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-[13px]">$</span>
                    <input 
                      type="text" 
                      value={peoPerEmployee}
                      onChange={(e) => setPeoPerEmployee(e.target.value)}
                      className="w-full bg-[#121217] border border-zinc-700 hover:border-zinc-500 focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C] text-white rounded-lg pl-7 pr-2 py-2 text-[14px] font-semibold outline-none transition-all text-center"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">/ee</span>
                  </div>
                  
                  <X size={12} className="text-zinc-600" />
                  
                  <div className="bg-[#1a1a21] border border-zinc-800 rounded-lg px-3 py-2 text-center">
                    <span className="text-[13px] font-semibold text-zinc-200">{employees}</span>
                    <span className="text-zinc-500 text-[10px] ml-1">ee's</span>
                  </div>
                </div>

                <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">Monthly PEO Total</span>
                  <span className="text-[14px] text-white font-bold">${peoTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Total Annual Value Preview */}
            <div className="mt-2 rounded-xl p-4 border" style={{ borderColor: `${PINK}33`, background: `linear-gradient(180deg, ${PINK}08 0%, transparent 100%)` }}>
              <div className="text-[10px] text-zinc-400 text-center mb-1">TOTAL ANNUAL PREMIUM</div>
              <div className="text-[24px] font-bold text-white text-center">
                ${((parseInt(wcPremium.replace(/,/g, '')) || 0) + (peoTotal * 12)).toLocaleString()}
              </div>
            </div>
            
          </div>
          
          <div className="mt-auto border-t border-zinc-800 bg-[#0d0d11] p-4 flex gap-3">
            <button className="flex-1 rounded-lg text-[12px] font-semibold py-2.5 border text-zinc-300 border-zinc-700 hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button className="flex-1 text-white font-semibold rounded-lg text-[12px] py-2.5 transition-opacity hover:opacity-90 shadow-[0_0_15px_rgba(233,30,140,0.3)]" style={{ background: GRAD }}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
