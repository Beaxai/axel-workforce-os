/**
 * Faithful static replica of the Axel deal-card dialog (Keystone Custom) used
 * to explore placements for the "Request Proposal" primary CTA. The
 * `placement` prop moves the CTA; everything else stays identical so the
 * comparison isolates the placement decision.
 */
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

export function DealCardFrame({ placement }: { placement: CtaPlacement }) {
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
              {placement === "header" && <span className="ml-1"><Cta small /></span>}
            </div>
          </div>
          <div className="flex items-start gap-5">
            <div className="flex gap-5 pt-1">
              <Kpi icon={MapPin} label="LOCATIONS" value="2" />
              <Kpi icon={Users} label="EMPLOYEES" value="15" />
              <Kpi icon={Wallet} label="PAYROLL" value="$1.2M" />
              <Kpi icon={RefreshCcw} label="EXMOD" value="1.00" dot />
            </div>
            <X size={16} className="text-zinc-500 mt-1" />
          </div>
        </div>
        {placement !== "pricingRail" && (
          <div className="flex justify-end gap-3 mt-2">
            <Badge value="$67,294" label="WC ANNUAL PREMIUM" />
            <Badge value="$2,040" sub="/mo" label="PEO · $136/EMPLOYEE" />
          </div>
        )}
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
                {placement === "journey" && i === 1 && (
                  <div className="mt-1.5 flex flex-col items-center gap-0.5">
                    <button className="text-white font-semibold rounded-md text-[10.5px] px-3 py-1.5" style={{ background: GRAD, boxShadow: `0 0 10px ${PINK}55` }}>
                      Request Proposal
                    </button>
                    <span className="text-[8.5px] text-zinc-500">1 section to complete</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="flex flex-1 min-h-0 border-t border-zinc-800" style={{ paddingTop: placement === "journey" ? 6 : 0 }}>
        {/* Left nav */}
        <div className="w-[150px] border-r border-zinc-800 py-3 flex flex-col gap-0.5 shrink-0">
          {[
            { icon: LayoutGrid, label: "Overview", active: true },
            { icon: FileText, label: "Submission" },
            { icon: ShieldCheck, label: "Subjectivities" },
            { icon: Folder, label: "Documents" },
            { icon: Quote, label: "Quote" },
            { icon: FileCheck, label: "Policy" },
            ...(placement === "pricingRail" ? [{ icon: CheckSquare, label: "Tasks" }] : []),
          ].map(({ icon: Icon, label, active }: { icon: React.ElementType; label: string; active?: boolean }) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-2 text-[11.5px] ${active ? "text-white border-l-2" : "text-zinc-400"}`} style={active ? { borderColor: PINK, background: "#E91E8C1a" } : {}}>
              <Icon size={13} style={active ? { color: PINK } : {}} />
              {label}
            </div>
          ))}
        </div>

        {/* Center column */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-zinc-800">
          {placement === "strip" && (
            <div className="flex items-center justify-center py-2 border-b border-zinc-800 bg-zinc-950">
              <Cta />
            </div>
          )}
          <div className="flex-1 px-6 py-4 overflow-hidden">
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
          {placement === "footer" && (
            <div className="flex items-center justify-between px-6 py-2.5 border-t border-zinc-800 bg-zinc-950">
              <span className="text-[10.5px] text-zinc-500">1 section to complete before underwriting</span>
              <button className="text-white font-semibold rounded-lg text-[12.5px] px-5 py-2" style={{ background: GRAD }}>Request Proposal</button>
            </div>
          )}
        </div>

        {/* Right rail — tasks by default, pricing in the pricingRail variant */}
        {placement === "pricingRail" ? (
          <div className="w-[240px] shrink-0 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <Wallet size={13} style={{ color: PINK }} />
              <span className="text-[10.5px] tracking-widest font-semibold">PRICING</span>
              <span className="ml-auto flex items-center gap-2 text-zinc-500"><ChevronRight size={13} /></span>
            </div>
            <div className="px-3 pt-3 flex flex-col gap-3">
              {/* Next action stays at the top of the rail */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-[10px] tracking-widest text-zinc-500 font-semibold mb-2">NEXT ACTION</div>
                <button className="w-full text-white font-semibold rounded-lg text-[12px] py-2" style={{ background: GRAD }}>Request Proposal</button>
                <div className="text-[10px] text-zinc-500 mt-1.5 text-center">1 section to complete</div>
              </div>
              {/* WC premium card */}
              <div className="rounded-xl border p-3" style={{ borderColor: PINK, boxShadow: `0 0 12px ${PINK}44`, background: "#0d0d11" }}>
                <div className="flex items-center gap-1.5 text-[9px] tracking-widest font-semibold" style={{ color: PINK }}>
                  <Shield size={11} className="text-purple-400" /> WC ANNUAL PREMIUM
                </div>
                <div className="text-white font-bold text-[22px] mt-1.5">$67,294</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">$5,608/mo · effective 9/1/2026</div>
              </div>
              {/* PEO premium card */}
              <div className="rounded-xl border p-3" style={{ borderColor: PINK, boxShadow: `0 0 12px ${PINK}44`, background: "#0d0d11" }}>
                <div className="flex items-center gap-1.5 text-[9px] tracking-widest font-semibold" style={{ color: PINK }}>
                  <Shield size={11} className="text-purple-400" /> PEO ADMIN FEE
                </div>
                <div className="text-white font-bold text-[22px] mt-1.5">$2,040<span className="text-[11px] font-medium text-zinc-400">/mo</span></div>
                <div className="text-[10px] text-zinc-500 mt-0.5">$136/employee · 15 employees</div>
              </div>
              <button className="w-full rounded-lg text-[12px] font-semibold py-2 border text-zinc-200 hover:bg-zinc-900" style={{ borderColor: "#3f3f46", background: "transparent" }}>
                Modify Pricing
              </button>
            </div>
            <div className="flex-1" />
          </div>
        ) : (
          <div className="w-[240px] shrink-0 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <CheckSquare size={13} style={{ color: PINK }} />
              <span className="text-[10.5px] tracking-widest font-semibold">TASKS</span>
              <span className="ml-auto flex items-center gap-2 text-zinc-500"><Plus size={13} /><ChevronRight size={13} /></span>
            </div>
            {placement === "rail" && (
              <div className="mx-3 mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-[10px] tracking-widest text-zinc-500 font-semibold mb-2">NEXT ACTION</div>
                <button className="w-full text-white font-semibold rounded-lg text-[12px] py-2" style={{ background: GRAD }}>Request Proposal</button>
                <div className="text-[10px] text-zinc-500 mt-1.5 text-center">1 section to complete</div>
              </div>
            )}
            <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-500">No tasks yet.</div>
          </div>
        )}
      </div>
    </div>
  );
}
