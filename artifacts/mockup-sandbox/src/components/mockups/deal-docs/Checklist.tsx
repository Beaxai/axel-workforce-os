import { CheckCircle2, Circle, Download, Upload, FileText } from "lucide-react";

export function Checklist() {
  return (
    <div className="min-h-screen bg-[#0d0d10] p-8">
      <div className="mx-auto max-w-[820px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Documents</h1>
          <p className="text-sm text-zinc-500">
            Application forms, generated documents, and policy files
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[1.5fr_1fr] gap-6">
          {/* Left: Document checklist */}
          <div className="space-y-3">
            {/* Section: Applications */}
            <div className="mb-6">
              <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                Applications
              </h2>
              <div className="space-y-2">
                <DocumentRow
                  status="complete"
                  name="WC Application (ACORD 130)"
                  meta="Received Jul 18"
                  action="download"
                />
                <DocumentRow
                  status="complete"
                  name="Supplemental Cannabis Application"
                  meta="Received Jul 18"
                  action="download"
                />
              </div>
            </div>

            {/* Section: Generated Documents */}
            <div className="mb-6">
              <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                Generated Documents
              </h2>
              <div className="space-y-2">
                <DocumentRow
                  status="complete"
                  name="Indication Summary"
                  meta="Generated Jul 24"
                  action="download"
                />
                <DocumentRow
                  status="complete"
                  name="Proposal Packet"
                  meta="Draft"
                  action="download"
                />
                <DocumentRow
                  status="complete"
                  name="Loss Runs 2023-2025"
                  meta="Received"
                  action="download"
                />
              </div>
            </div>

            {/* Section: Additional Requirements */}
            <div>
              <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                Additional Requirements
              </h2>
              <div className="space-y-2">
                <DocumentRow
                  status="missing"
                  name="Financial Statements"
                  meta="Required for binding"
                  action="upload"
                />
                <DocumentRow
                  status="missing"
                  name="Safety Program Documentation"
                  meta="Optional"
                  action="upload"
                />
              </div>
            </div>
          </div>

          {/* Right: Binder & Policy panel */}
          <div>
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Binder & Policy
            </h2>
            <div className="space-y-3">
              {/* Carrier Binder - filled */}
              <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/5">
                    <FileText className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white mb-0.5">
                          Carrier Binder
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          binder-acme-2026.pdf
                        </div>
                      </div>
                      <button className="shrink-0 text-zinc-400 hover:text-white transition-colors">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                      Jul 25 · Sarah Mitchell
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Document - empty */}
              <div className="rounded-lg border border-dashed border-white/12 bg-white/[0.01] p-4 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer group">
                <div className="flex flex-col items-center text-center py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/5 mb-3 group-hover:bg-white/8 transition-colors">
                    <Upload className="h-5 w-5 text-zinc-400 group-hover:text-[#E91E8C] transition-colors" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">
                    Policy Document
                  </div>
                  <div className="text-xs text-zinc-500">
                    Click to upload
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div className="rounded-md bg-white/[0.02] border border-white/5 p-3">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Uploading a binder or policy marks the deal as carrier-bound
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  status,
  name,
  meta,
  action,
}: {
  status: "complete" | "missing";
  name: string;
  meta: string;
  action: "download" | "upload";
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 hover:border-white/12 hover:bg-white/[0.04] transition-all">
      {/* Status icon */}
      <div className="shrink-0">
        {status === "complete" ? (
          <CheckCircle2 className="h-5 w-5 text-zinc-400" />
        ) : (
          <Circle className="h-5 w-5 text-zinc-600" />
        )}
      </div>

      {/* Name & meta */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white mb-0.5">{name}</div>
        <div className="text-xs text-zinc-500">{meta}</div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {action === "download" ? (
          <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            <Download className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button className="text-xs text-zinc-500 hover:text-[#E91E8C] transition-colors">
            Upload
          </button>
        )}
      </div>
    </div>
  );
}

export default Checklist;
