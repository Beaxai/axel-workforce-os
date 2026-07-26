import React from 'react';
import { FileText, FileBarChart, File, ShieldCheck, UploadCloud, Plus } from 'lucide-react';

export default function SingleList() {
  const docs = [
    { icon: FileText, name: "WC Application (ACORD 130)", type: "Application" },
    { icon: FileText, name: "Supplemental Cannabis Application", type: "Application" },
    { icon: FileBarChart, name: "Rate Indication — $126,713 to $154,872", type: "Indication" },
    { icon: FileText, name: "Application Summary", type: "Summary" },
    { icon: ShieldCheck, name: "Coverage Verification", type: "Verification" },
    { icon: File, name: "Carrier Binder", type: "binder-acme-2026.pdf" },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d10] p-8 font-sans selection:bg-[#E91E8C]/30 flex flex-col">
      <div className="w-full max-w-[820px] mx-auto mt-12">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-1">
          <h2 className="text-[16px] font-medium text-zinc-100 tracking-tight">Documents</h2>
          <button className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-all duration-200">
            <UploadCloud className="w-4 h-4" strokeWidth={2} />
            Upload
          </button>
        </div>

        {/* The List */}
        <div className="space-y-1">
          {docs.map((doc, i) => {
            const Icon = doc.icon;
            return (
              <button 
                key={i}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group text-left border border-transparent hover:border-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <Icon className="w-[18px] h-[18px] text-zinc-600 group-hover:text-[#E91E8C] transition-colors duration-300" strokeWidth={1.5} />
                  <span className="text-[14px] font-medium text-zinc-300 group-hover:text-white transition-colors duration-200">
                    {doc.name}
                  </span>
                </div>
                <span className="text-[13px] text-zinc-500 group-hover:text-zinc-400 transition-colors duration-200">
                  {doc.type}
                </span>
              </button>
            );
          })}

          {/* Policy Add Row */}
          <div className="pt-2">
            <button className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-dashed border-white/[0.08] hover:border-[#E91E8C]/30 hover:bg-[#E91E8C]/[0.02] transition-all duration-300 text-left group mt-1">
              <div className="flex items-center gap-4">
                <Plus className="w-[18px] h-[18px] text-zinc-600 group-hover:text-[#E91E8C] transition-colors duration-300" strokeWidth={1.5} />
                <span className="text-[14px] font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors duration-200">
                  Add policy document
                </span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
