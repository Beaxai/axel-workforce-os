import React from 'react';
import { FileText, Pencil, Trash2 } from 'lucide-react';

const docs = [
  { id: 1, name: "Rate Indication — $126,713 to $154,872", type: "Indication", date: "7/2/2026", user: "System" },
  { id: 2, name: "Application Summary", type: "Summary", date: "7/2/2026", user: "System" },
  { id: 3, name: "WC Application", type: "Application", date: "—", user: "System" },
  { id: 4, name: "Emerald Coast Binder", type: "Binder", date: "7/26/2026", user: "Sarah Mitchell", hover: true },
  { id: 5, name: "Signed Policy 2026", type: "Policy", date: "7/26/2026", user: "Marcus Chen" },
];

const InlineMetaVariant = ({ isNarrow = false }: { isNarrow?: boolean }) => {
  return (
    <div className={`docs-container w-full ${isNarrow ? 'max-w-[420px]' : 'max-w-[900px]'}`}>
      <style>{`
        .docs-container {
          container-type: inline-size;
          container-name: docs;
        }
        .doc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .doc-left {
          display: flex;
          align-items: center;
          min-width: 0;
          flex: 1 1 auto;
        }
        .doc-meta {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }
        
        @container docs (max-width: 560px) {
          .doc-row {
            flex-wrap: wrap;
            gap: 2px;
            padding-top: 10px;
            padding-bottom: 10px;
          }
          .doc-left {
            width: 100%;
            flex: 0 0 100%;
          }
          .doc-meta {
            width: 100%;
            flex: 0 0 100%;
            padding-left: 28px;
            justify-content: flex-start;
          }
        }
      `}</style>
      <div 
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.03)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center px-4 py-3 gap-3"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
           <div 
             className="text-[11px] font-semibold tracking-[0.08em] uppercase"
             style={{ color: 'rgba(255,255,255,0.55)' }}
           >
             Documents · {docs.length}
           </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {docs.map((doc, i) => (
            <div
              key={doc.id}
              className="doc-row group relative px-4 py-[13px] transition-colors"
              style={{
                borderBottom: i < docs.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                background: doc.hover ? 'rgba(255,255,255,0.05)' : 'transparent',
              }}
            >
              {/* Left side (Icon + Name + Actions) */}
              <div className="doc-left">
                <FileText 
                  size={16} 
                  style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} 
                />
                <span className="truncate ml-3 text-[13.5px] font-medium text-white">
                  {doc.name}
                </span>
                
                {/* Actions (visible on hover) */}
                <div 
                  className={`flex items-center gap-1 ml-3 shrink-0 ${doc.hover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                >
                  <button className="p-1 rounded hover:bg-white/10 text-white/55 hover:text-white transition-colors cursor-pointer">
                    <Pencil size={14} />
                  </button>
                  <button className="p-1 rounded hover:bg-white/10 text-white/55 hover:text-[#E91E8C] transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Right side (Meta string) */}
              <div className="doc-meta text-[11.5px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span>{doc.type}</span>
                <span>·</span>
                <span>{doc.date}</span>
                <span>·</span>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{doc.user}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen p-10 font-sans antialiased" style={{ background: '#0b0d16' }}>
      <div className="max-w-5xl mx-auto space-y-16">
        
        <div>
          <div className="mb-4 text-[13px] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Wide · ~900px
          </div>
          <InlineMetaVariant isNarrow={false} />
        </div>

        <div>
          <div className="mb-4 text-[13px] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Narrow · ~420px
          </div>
          <InlineMetaVariant isNarrow={true} />
        </div>

      </div>
    </div>
  );
}
