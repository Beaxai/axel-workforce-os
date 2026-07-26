import React from 'react';
import { FileText, Download, File, AlertCircle, FileArchive, Upload } from 'lucide-react';

export function GroupedSections() {
  return (
    <div className="min-h-screen bg-[#0d0d10] p-8 font-sans">
      <div className="max-w-[820px] mx-auto space-y-12">
        
        {/* Section 1: Applications */}
        <section>
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-1">Applications</h3>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="group flex items-center justify-between p-4 transition-colors hover:bg-white/[0.04] border-b border-white/[0.06]">
              <div className="flex items-center gap-3.5">
                <FileText size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">WC Application (ACORD 130)</span>
                <span className="text-zinc-600 text-xs px-1">•</span>
                <span className="text-xs text-zinc-500">PDF</span>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Download size={16} />
              </button>
            </div>
            <div className="group flex items-center justify-between p-4 transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center gap-3.5">
                <FileText size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">Supplemental Cannabis Application</span>
                <span className="text-zinc-600 text-xs px-1">•</span>
                <span className="text-xs text-zinc-500">PDF</span>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Download size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Generated Documents */}
        <section>
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-1">Generated Documents</h3>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="group flex items-center justify-between p-4 transition-colors hover:bg-white/[0.04] border-b border-white/[0.06]">
              <div className="flex items-center gap-3.5">
                <File size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">Indication Summary</span>
                <span className="text-zinc-600 text-xs px-1">•</span>
                <span className="text-xs text-zinc-500">Generated Jul 24</span>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Download size={16} />
              </button>
            </div>
            <div className="group flex items-center justify-between p-4 transition-colors hover:bg-white/[0.04] border-b border-white/[0.06]">
              <div className="flex items-center gap-3.5">
                <File size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">Proposal Packet</span>
                <span className="text-zinc-600 text-xs px-1">•</span>
                <span className="text-xs text-zinc-500">Draft</span>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Download size={16} />
              </button>
            </div>
            <div className="group flex items-center justify-between p-4 transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center gap-3.5">
                <File size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">Loss Runs 2023-2025</span>
                <span className="text-zinc-600 text-xs px-1">•</span>
                <span className="text-xs text-zinc-500">Received</span>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Download size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Carrier Binder & Policy */}
        <section>
          <div className="flex items-baseline justify-between mb-4 px-1">
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Binder & Policy</h3>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <AlertCircle size={12} className="text-zinc-600" /> 
              Uploading a binder or policy marks the deal as carrier-bound
            </span>
          </div>
          
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden mb-3">
            <div className="group flex items-center justify-between p-4 transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center gap-3.5">
                <FileArchive size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">Carrier Binder</span>
                <span className="text-zinc-600 text-xs px-1">•</span>
                <span className="text-xs text-zinc-400">binder-acme-2026.pdf</span>
                <span className="text-zinc-600 text-xs px-1">•</span>
                <span className="text-xs text-zinc-500">Jul 25 by Sarah Mitchell</span>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Download size={16} />
              </button>
            </div>
          </div>

          {/* Empty Policy Slot - Dashed border */}
          <button className="w-full group flex items-center justify-between p-4 bg-white/[0.01] border border-dashed border-white/[0.12] rounded-xl transition-all hover:bg-[#E91E8C]/[0.03] hover:border-[#E91E8C]/30">
            <div className="flex items-center gap-3.5">
              <Upload size={16} className="text-zinc-500 group-hover:text-[#E91E8C] transition-colors" />
              <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Policy Document</span>
              <span className="text-zinc-600 text-xs px-1">•</span>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">Pending Upload</span>
            </div>
            <span className="text-xs font-medium text-[#E91E8C] opacity-80 group-hover:opacity-100 transition-opacity">
              Upload File
            </span>
          </button>
          
        </section>

      </div>
    </div>
  );
}

export default GroupedSections;