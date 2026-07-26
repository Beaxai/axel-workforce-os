import { Download, Upload, FileText, FileCheck, File } from "lucide-react";

export function FileTable() {
  const documents = [
    {
      name: "WC Application (ACORD 130)",
      type: "Application",
      status: null,
      date: "Jul 22, 2025",
      action: "download",
      filename: "acord-130-wc.pdf"
    },
    {
      name: "Supplemental Cannabis Application",
      type: "Application",
      status: null,
      date: "Jul 22, 2025",
      action: "download",
      filename: "cannabis-supplemental.pdf"
    },
    {
      name: "Indication Summary",
      type: "Generated",
      status: "Generated",
      date: "Jul 24, 2025",
      action: "download",
      filename: "indication-summary.pdf"
    },
    {
      name: "Proposal Packet",
      type: "Generated",
      status: "Draft",
      date: "Jul 23, 2025",
      action: "download",
      filename: "proposal-packet.pdf"
    },
    {
      name: "Loss Runs 2023-2025",
      type: "Generated",
      status: "Received",
      date: "Jul 20, 2025",
      action: "download",
      filename: "loss-runs.pdf"
    },
    {
      name: "Carrier Binder",
      type: "Binder",
      status: "Uploaded by Sarah Mitchell",
      date: "Jul 25, 2025",
      action: "download",
      filename: "binder-acme-2026.pdf"
    },
    {
      name: "Policy Document",
      type: "Policy",
      status: null,
      date: null,
      action: "upload",
      filename: null
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d10] p-8">
      <div className="mx-auto max-w-[820px]">
        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-[320px]">
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-white/[0.12] transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#E91E8C] text-white text-sm font-medium rounded-lg hover:bg-[#d1186f] transition-colors">
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid gap-4 px-6 py-3 border-b border-white/[0.08]" style={{ gridTemplateColumns: '2.2fr 1fr 1fr 1fr 40px' }}>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Name</div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Type</div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Status</div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Date</div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium"></div>
          </div>

          {/* Rows */}
          {documents.map((doc, index) => (
            <div
              key={index}
              className={`grid gap-4 px-6 py-4 ${
                index !== documents.length - 1 ? 'border-b border-white/[0.04]' : ''
              } ${doc.action === 'upload' ? 'opacity-60' : ''} hover:bg-white/[0.02] transition-colors`}
              style={{ gridTemplateColumns: '2.2fr 1fr 1fr 1fr 40px' }}
            >
              {/* Name */}
              <div className="flex items-center gap-3">
                {doc.type === 'Application' && <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                {doc.type === 'Generated' && <FileCheck className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                {doc.type === 'Binder' && <File className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                {doc.type === 'Policy' && <File className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                <span className="text-sm text-zinc-100 truncate">{doc.name}</span>
              </div>

              {/* Type */}
              <div className="flex items-center">
                <span className="text-sm text-zinc-400">{doc.type}</span>
              </div>

              {/* Status */}
              <div className="flex items-center">
                {doc.status ? (
                  <span className="text-sm text-zinc-400">{doc.status}</span>
                ) : doc.action === 'upload' ? (
                  <span className="text-sm text-zinc-500 italic">Awaiting upload</span>
                ) : (
                  <span className="text-sm text-zinc-600">—</span>
                )}
              </div>

              {/* Date */}
              <div className="flex items-center">
                {doc.date ? (
                  <span className="text-sm text-zinc-400">{doc.date}</span>
                ) : (
                  <span className="text-sm text-zinc-600">—</span>
                )}
              </div>

              {/* Action */}
              <div className="flex items-center justify-end">
                {doc.action === 'download' ? (
                  <button className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors group">
                    <Download className="w-4 h-4" />
                  </button>
                ) : (
                  <button className="flex items-center gap-2 text-[#E91E8C] hover:text-[#d1186f] transition-colors text-sm font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-4 px-2">
          <p className="text-xs text-zinc-500">
            Uploading a binder or policy marks the deal as carrier-bound
          </p>
        </div>
      </div>
    </div>
  );
}

export default FileTable;
