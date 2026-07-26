import React from 'react';
import { FileText, Plus, ChevronRight, Upload } from 'lucide-react';

export default function FocusFirst() {
  return (
    <div className="min-h-screen bg-[#0d0d10] text-slate-300 p-8 font-sans selection:bg-[#E91E8C]/30">
      <div className="max-w-[820px] mx-auto space-y-16 mt-8">
        
        {/* Top Area: Featured Cards */}
        <div className="grid grid-cols-2 gap-6">
          {/* Rate Indication Card */}
          <div className="bg-[#151518] border border-white/5 rounded-3xl p-8 flex flex-col justify-between group cursor-pointer hover:border-white/10 hover:bg-[#1a1a1f] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#E91E8C]/10 blur-[64px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />
            <div className="text-slate-500 text-xs font-semibold tracking-wider uppercase mb-10">Rate Indication</div>
            <div>
              <div className="text-3xl font-light text-[#E91E8C] tracking-tight flex items-baseline gap-2">
                $126,713 <span className="text-slate-500 font-normal text-xl">to</span> $154,872
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                View indication <ChevronRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
            </div>
          </div>

          {/* Binder & Policy Card */}
          <div className="bg-[#151518] border border-white/5 rounded-3xl p-8 flex flex-col justify-between group relative overflow-hidden">
            <div className="text-slate-500 text-xs font-semibold tracking-wider uppercase mb-10">Binder & Policy</div>
            <div>
              <div className="text-xl font-light text-slate-200 flex items-center gap-3">
                <span>Binder on file</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-slate-500">Policy needed</span>
              </div>
              <div className="mt-6 flex items-center text-sm">
                <button className="text-[#E91E8C] hover:text-pink-400 font-medium transition-colors flex items-center gap-1.5 opacity-90 hover:opacity-100">
                  <Plus className="w-4 h-4" /> Add policy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Area: All files */}
        <div className="pl-2">
          <div className="flex items-center justify-between mb-6 pr-4">
            <h3 className="text-sm font-medium text-slate-400">All files</h3>
            <button className="text-xs font-medium text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors group">
              <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                <Upload className="w-3 h-3" />
              </div>
              Upload file
            </button>
          </div>
          
          <div className="flex flex-col">
            {[
              { name: "WC Application (ACORD 130)" },
              { name: "Supplemental Cannabis Application" },
              { name: "Rate Indication" },
              { name: "Application Summary" },
              { name: "Coverage Verification" },
              { name: "Carrier Binder", meta: "binder-acme-2026.pdf" },
            ].map((doc, i) => (
              <div 
                key={i} 
                className="group flex items-center gap-4 px-4 py-3.5 -ml-4 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 group-hover:border-white/10 transition-colors backdrop-blur-md">
                  <FileText className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium text-slate-300 group-hover:text-white transition-colors leading-snug">{doc.name}</span>
                  {doc.meta && <span className="text-[13px] text-slate-500 mt-0.5">{doc.meta}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
