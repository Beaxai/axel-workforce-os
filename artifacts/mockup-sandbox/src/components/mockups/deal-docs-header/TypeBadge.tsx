import React from 'react';
import { FileText, Pencil, Trash2 } from 'lucide-react';

const data = [
  { name: 'Rate Indication — $126,713 to $154,872', type: 'Indication', date: '7/2/2026', by: 'System' },
  { name: 'Application Summary', type: 'Summary', date: '7/2/2026', by: 'System' },
  { name: 'WC Application', type: 'Application', date: '—', by: 'System' },
  { name: 'Emerald Coast Binder', type: 'Binder', date: '7/26/2026', by: 'Sarah Mitchell', hovered: true },
  { name: 'Signed Policy 2026', type: 'Policy', date: '7/26/2026', by: 'Marcus Chen' },
];

function DocumentList({ containerWidth }: { containerWidth?: number | string }) {
  return (
    <div className="w-full tb-container" style={{ maxWidth: containerWidth || '100%' }}>
      <div 
        className="rounded-[12px] flex flex-col overflow-hidden text-sm w-full"
        style={{ 
          border: '1px solid rgba(255,255,255,0.10)', 
          background: 'rgba(255,255,255,0.03)' 
        }}
      >
        {/* Header */}
        <div 
          className="flex gap-[12px] items-center px-[16px] py-[12px] text-[11px] font-[600] uppercase tracking-[0.08em]"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          <div className="w-[16px] flex-none" /> {/* Icon spacer */}
          <div className="flex-1 min-w-0">Document</div>
          <div className="w-[130px] hidden tb-show-on-wide text-right">Uploaded / By</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {data.map((doc, i) => (
            <div 
              key={i}
              className={`flex items-center gap-[12px] px-[16px] py-[13px] group transition-colors duration-150 ${doc.hovered ? 'bg-[rgba(255,255,255,0.05)]' : 'hover:bg-[rgba(255,255,255,0.05)]'}`}
              style={{ 
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Icon */}
              <div className="w-[16px] flex-none flex items-center justify-center">
                <FileText size={16} color="rgba(255,255,255,0.55)" />
              </div>

              {/* Main Content + Mobile Meta */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-[12px]">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-[500] text-white truncate leading-tight">
                      {doc.name}
                    </span>
                    
                    {/* Badge */}
                    <span 
                      className="inline-flex flex-none items-center px-[6px] py-[2px] rounded-full text-[10px] font-[600] leading-none tracking-wide whitespace-nowrap"
                      style={
                        doc.type === 'Binder' || doc.type === 'Policy' 
                          ? { 
                              color: '#E91E8C', 
                              background: 'rgba(233, 30, 140, 0.12)', 
                              border: '1px solid rgba(233, 30, 140, 0.3)' 
                            }
                          : { 
                              color: 'rgba(255,255,255,0.75)', 
                              background: 'rgba(255,255,255,0.06)', 
                              border: '1px solid rgba(255,255,255,0.12)' 
                            }
                      }
                    >
                      {doc.type}
                    </span>
                  </div>
                  
                  {/* Mobile Meta (Hidden on >= 560px) */}
                  <div className="tb-hide-on-wide flex items-center gap-1.5 text-[11.5px] mt-[4px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <span>{doc.date}</span>
                    <span className="opacity-50">•</span>
                    <span>{doc.by}</span>
                  </div>
                </div>

                {/* Hover Actions */}
                <div className={`flex items-center gap-1 shrink-0 ${doc.hovered ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'} transition-all`}>
                  <button className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors cursor-pointer">
                    <Pencil size={14} />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.55)] hover:text-[#E91E8C] transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Desktop Meta (Hidden on < 560px) */}
              <div className="w-[130px] hidden tb-show-on-wide-flex flex-col items-end gap-[3px] shrink-0">
                <div className="text-[11.5px] font-[500] leading-none" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {doc.date}
                </div>
                <div className="text-[11px] leading-none" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {doc.by}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TypeBadgeVariant() {
  return (
    <div className="min-h-screen p-8 text-white font-sans" style={{ background: '#0b0d16' }}>
      <style>{`
        .tb-container {
          container-type: inline-size;
        }
        @container (min-width: 560px) {
          .tb-show-on-wide { display: block !important; }
          .tb-show-on-wide-flex { display: flex !important; }
          .tb-hide-on-wide { display: none !important; }
        }
      `}</style>
      
      <div className="max-w-[1000px] mx-auto flex flex-col gap-12">
        
        {/* Wide Variant */}
        <div className="flex flex-col gap-3">
          <div className="text-[12px] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Wide · ~900px
          </div>
          <DocumentList containerWidth="100%" />
        </div>

        {/* Narrow Variant */}
        <div className="flex flex-col gap-3">
          <div className="text-[12px] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Narrow · ~420px
          </div>
          <DocumentList containerWidth="420px" />
        </div>

      </div>
    </div>
  );
}
