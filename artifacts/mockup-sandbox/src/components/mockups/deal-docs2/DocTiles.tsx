import { FileText, FilePlus, Upload } from "lucide-react";

export default function DocTiles() {
  const documents = [
    { name: "WC Application (ACORD 130)", kind: "Application", hasKeyIndicator: false },
    { name: "Supplemental Cannabis Application", kind: "Application", hasKeyIndicator: false },
    { name: "Rate Indication — $126,713 to $154,872", kind: "Quote", hasKeyIndicator: true },
    { name: "Application Summary", kind: "Summary", hasKeyIndicator: false },
    { name: "Coverage Verification", kind: "Verification", hasKeyIndicator: false },
    { name: "Carrier Binder", kind: "binder-acme-2026.pdf", hasKeyIndicator: false },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d10] p-8">
      <div className="mx-auto max-w-[820px]">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-medium text-white/95">Documents</h2>
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/90">
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {documents.map((doc, i) => (
            <button
              key={i}
              className="group relative flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10"
            >
              {doc.hasKeyIndicator && (
                <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#E91E8C] shadow-[0_0_8px_rgba(233,30,140,0.6)]" />
              )}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <FileText className="h-6 w-6 text-white/60 transition-colors group-hover:text-white/80" />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="mb-1.5 line-clamp-2 text-[15px] font-medium leading-snug text-white/95">
                  {doc.name}
                </div>
                <div className="text-xs text-white/40">{doc.kind}</div>
              </div>
            </button>
          ))}

          <button className="group flex items-start gap-4 rounded-2xl border border-dashed border-white/20 bg-transparent p-6 text-left transition-all hover:border-[#E91E8C]/50 hover:bg-[#E91E8C]/5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/30 bg-transparent transition-all group-hover:border-[#E91E8C]/50 group-hover:bg-[#E91E8C]/10">
              <FilePlus className="h-6 w-6 text-white/40 transition-colors group-hover:text-[#E91E8C]/90" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="mb-1.5 text-[15px] font-medium leading-snug text-white/60 transition-colors group-hover:text-[#E91E8C]/90">
                Add policy
              </div>
              <div className="text-xs text-white/30">Not yet uploaded</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
