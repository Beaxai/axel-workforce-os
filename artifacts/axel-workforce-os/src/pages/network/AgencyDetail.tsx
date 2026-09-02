import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, GhostButton, PinkButton, Modal, ContactModal } from "@/components/ui/axel-index";
import { ArrowLeft, Edit2, MoreHorizontal, Mail, Phone, MapPin, ExternalLink, FileCheck, FileMinus, ShieldAlert, ShieldCheck, ChevronRight, Plus } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/auth-store";
import { displayName } from "@/lib/agent-display-name";
import { formatK, SplitProductionLine } from "@/components/ui/NetworkGroups";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import { useContactRoles } from "@/hooks/use-contact-roles";
import { openDealCard } from "@/components/DealCardModal";
import { AddAgentModal } from "@/components/ui/AddAgentModal";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
  background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
};

function calendarDate(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }
  return new Date(value);
}

export default function AgencyDetail() {
  const { agencyId: id } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN" || state.user?.role === "CSA");
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.52)";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({ statesLicensed: [], linesOfAuthority: [] });
  const [confirmAction, setConfirmAction] = useState<"Suspend" | "Terminate" | null>(null);
  const [showAllStates, setShowAllStates] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [showAddAgent, setShowAddAgent] = useState(false);

  const { data: agency, isLoading } = useQuery({
    queryKey: ["agency", id],
    queryFn: () => api.get<any>(`/agencies/${id}`),
  });

  const { data: contacts = [] } = useContacts("agency", id || "", true);
  const { data: roleVocabulary } = useContactRoles();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const { data: partners = [] } = useQuery({
    queryKey: ["partners", "Agent"],
    queryFn: () => api.get<any[]>("/partners?type=Agent"),
  });
  const agents = partners.filter(p => p.agencyId === id);

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => api.get<any[]>("/deals"),
  });
  const agencyDeals = deals.filter(d => agents.some(a => a.userId && a.userId === d.producingAgentId));
  const isBoundOrClient = (stage: unknown) => ["BOUND", "CLIENT"].includes(String(stage || "").toUpperCase());
  const boundDeals = agencyDeals.filter(d => isBoundOrClient(d.stage));
  const openDeals = agencyDeals.filter(d => !isBoundOrClient(d.stage)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/agencies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency", id] });
      qc.invalidateQueries({ queryKey: ["agencies"] });
      setEditing(false);
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: "suspended" | "terminated") => api.patch(`/agencies/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency", id] });
      qc.invalidateQueries({ queryKey: ["agencies"] });
      setConfirmAction(null);
    },
  });

  if (isLoading || !agency) return <div style={{ color: textMuted, padding: "40px" }}>Loading...</div>;

  const legalName = agency.legalName || "Unassigned Agency";
  const initials = legalName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join("") || "A";
  const primaryContact = contacts.find(c => c.isPrimary);
  const metrics = agency.productionMetrics || { wcDeals: 0, wcPremium: 0, peoDeals: 0, peoPremium: 0, asoDeals: 0, asoFees: 0 };

  const startEdit = () => {
    setForm({
      legalName: agency.legalName || "",
      dba: agency.dba || "",
      status: agency.status || "pending",
      mainPhone: agency.mainPhone || "",
      website: agency.website || "",
      address: agency.address || "",
      agencyNpn: agency.agencyNpn || "",
      licenseNumber: agency.licenseNumber || "",
      statesLicensed: Array.isArray(agency.statesLicensed) ? agency.statesLicensed : [],
      linesOfAuthority: Array.isArray(agency.linesOfAuthority) ? agency.linesOfAuthority : [],
      eoCarrier: agency.eoCarrier || "",
      eoPolicyNumber: agency.eoPolicyNumber || "",
      eoCoverageAmount: agency.eoCoverageAmount || "",
      eoExpirationDate: agency.eoExpirationDate || "",
      eoCertificateUrl: agency.eoCertificateUrl || "",
      agreementSignedAt: agency.agreementSignedAt ? String(agency.agreementSignedAt).slice(0, 10) : "",
      agreementUrl: agency.agreementUrl || "",
    });
    setEditing(true);
  };

  const headerSecondary = [];
  if (agency.dba) headerSecondary.push(`DBA ${agency.dba}`);
  headerSecondary.push(`${agents.length} agent${agents.length !== 1 ? "s" : ""}`);
  if (agency.agreementSignedAt) headerSecondary.push(`Appointed ${format(calendarDate(agency.agreementSignedAt), "MMM d, yyyy")}`);

  const hasAgreement = Boolean(agency.agreementSignedAt);
  const eoExpiration = agency.eoExpirationDate ? new Date(agency.eoExpirationDate) : null;
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const eoKey = eoExpiration && !Number.isNaN(eoExpiration.getTime()) ? (
    typeof agency.eoExpirationDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(agency.eoExpirationDate)
      ? agency.eoExpirationDate
      : eoExpiration.toISOString().slice(0, 10)
  ) : null;
  const isEoExpired = eoKey ? eoKey < todayKey : false;
  const hasEo = Boolean(eoKey);

  const usStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
  const states = Array.isArray(agency.statesLicensed) ? agency.statesLicensed : [];
  const visibleStates = showAllStates ? states : states.slice(0, 8);
  const hiddenStateCount = Math.max(states.length - 8, 0);

  const formatMoney = (val: number) => `$${(val || 0).toLocaleString()}`;
  const formatKLabel = (val: number) => {
    if (!val) return "$0K";
    if (val < 1000) return `$${val.toLocaleString()}`;
    return `$${(val / 1000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
  };
  const roleLabel = (role?: string) =>
    role ? (role === "csr" ? "CSR" : role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())) : "";
  const dealLabel = (deal: any) => deal.productionBucket || (
    deal.productType === "PEO" ? "PEO" : deal.productType === "ASO" || deal.productType === "ASO_CAPTIVE" ? "ASO" : "WC"
  );
  const dealValue = (deal: any) => Number(deal.productionValue || 0);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "60px" }}>
      <button
        onClick={() => navigate("/network")}
        style={{
          background: "none", border: "none", color: textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          marginBottom: "24px", fontSize: "13px", padding: 0, fontWeight: 500
        }}
        className="hover:text-primary transition-colors"
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Network
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "12px", background: "rgba(233,30,140,0.15)", color: "#E91E8C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: 0, letterSpacing: "-0.01em" }}>
                {legalName}
              </h1>
              <span style={{ padding: "2px 8px", borderRadius: "999px", background: agency.status === "active" ? "rgba(30,233,123,0.15)" : "rgba(233,195,30,0.15)", color: agency.status === "active" ? "#1EE97B" : "#E9C31E", fontSize: "11px", fontWeight: 600, textTransform: "capitalize" }}>
                {agency.status || "Active"}
              </span>
            </div>
            {headerSecondary.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: textMuted }}>
                {headerSecondary.map((seg, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {seg}
                    {i < headerSecondary.length - 1 && <span>·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {isAdmin && (
            <PinkButton onClick={startEdit} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#E91E8C" }}>
              <Edit2 style={{ width: 14, height: 14 }} /> Edit
            </PinkButton>
          )}

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GhostButton style={{ padding: "8px 12px" }}>
                  <MoreHorizontal style={{ width: 16, height: 16 }} />
                </GhostButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ width: "160px" }}>
                {agency.status !== "suspended" && agency.status !== "terminated" && (
                  <DropdownMenuItem className="text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer font-medium" onSelect={() => setConfirmAction("Suspend")}>
                    Suspend Agency
                  </DropdownMenuItem>
                )}
                {agency.status !== "terminated" && (
                  <DropdownMenuItem className="text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer font-medium" onSelect={() => setConfirmAction("Terminate")}>
                    Terminate Agency
                  </DropdownMenuItem>
                )}
                {agency.status === "terminated" && (
                  <DropdownMenuItem className="cursor-default text-muted-foreground" disabled>
                    Agency Terminated
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="agency-stat-grid" style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "WC deals", val: metrics.wcDeals },
          { label: "WC premium", val: formatMoney(metrics.wcPremium) },
          { label: "PEO deals", val: metrics.peoDeals },
          { label: "PEO premium", val: formatMoney(metrics.peoPremium) },
          { label: "ASO deals", val: metrics.asoDeals },
          { label: "ASO fees", val: formatMoney(metrics.asoFees) },
        ].map(stat => (
          <GlassCard key={stat.label} padding="16px">
            <p style={{ fontSize: "11px", color: textMuted, marginBottom: "8px", fontWeight: 500 }}>{stat.label}</p>
            <p style={{ fontSize: "20px", color: textPrimary, margin: 0, fontWeight: 600 }}>{stat.val}</p>
          </GlassCard>
        ))}

        <GlassCard padding="16px">
          <p style={{ fontSize: "11px", color: textMuted, marginBottom: "8px", fontWeight: 500 }}>Agreement</p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {hasAgreement ? (
              <>
                <FileCheck style={{ width: 14, height: 14, color: "#1EE97B" }} />
                <span style={{ fontSize: "14px", color: "#1EE97B", fontWeight: 600 }}>Signed {format(calendarDate(agency.agreementSignedAt), "M/d/yyyy")}</span>
              </>
            ) : agency.registration ? (
              <span style={{ fontSize: "14px", color: "#E9C31E", fontWeight: 600 }}>
                {agency.latestRegistration?.zoomScheduledAt ? "Call scheduled" : "Awaiting signature"}
              </span>
            ) : (
              <>
                <FileMinus style={{ width: 14, height: 14, color: textMuted }} />
                <span style={{ fontSize: "14px", color: textMuted, fontWeight: 500 }}>No agreement</span>
              </>
            )}
          </div>
        </GlassCard>

        <GlassCard padding="16px">
          <p style={{ fontSize: "11px", color: textMuted, marginBottom: "8px", fontWeight: 500 }}>E&amp;O</p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {hasEo ? (
              isEoExpired ? (
                <>
                  <ShieldAlert style={{ width: 14, height: 14, color: "#E91E1E" }} />
                  <span style={{ fontSize: "14px", color: "#E91E1E", fontWeight: 600 }}>Expired {format(calendarDate(agency.eoExpirationDate!), "M/d/yyyy")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck style={{ width: 14, height: 14, color: "#1EE97B" }} />
                  <span style={{ fontSize: "14px", color: "#1EE97B", fontWeight: 600 }}>Through {format(calendarDate(agency.eoExpirationDate!), "M/d/yyyy")}</span>
                </>
              )
            ) : (
              <span style={{ fontSize: "14px", color: textMuted, fontWeight: 500 }}>No E&amp;O</span>
            )}
          </div>
        </GlassCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <GlassCard padding="24px" style={{ display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "20px" }}>Contact</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: primaryContact ? "24px" : "0" }}>
            {agency.mainPhone && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                 <Phone style={{ width: 15, height: 15, color: textMuted }} />
                 <a href={`tel:${agency.mainPhone}`} style={{ color: textPrimary, fontSize: "14px", textDecoration: "none" }} className="hover:underline">{agency.mainPhone}</a>
              </div>
            )}
            {agency.website && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                 <ExternalLink style={{ width: 15, height: 15, color: "#E91E8C" }} />
                 <a href={/^https?:\/\//i.test(agency.website) ? agency.website : `https://${agency.website}`} target="_blank" rel="noreferrer" style={{ color: "#E91E8C", fontSize: "14px", textDecoration: "none" }} className="hover:underline">{agency.website}</a>
              </div>
            )}
            {agency.address && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                 <MapPin style={{ width: 15, height: 15, color: textMuted, marginTop: "2px" }} />
                 <span style={{ color: textPrimary, fontSize: "14px" }}>{agency.address}</span>
              </div>
            )}
          </div>

          {primaryContact && (
            <>
              <div style={{ height: "1px", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", marginBottom: "20px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: 0 }}>Primary contact</h4>
                <span style={{ padding: "2px 6px", borderRadius: "999px", background: "rgba(233,30,140,0.15)", color: "#E91E8C", fontSize: "10px", fontWeight: 600 }}>Primary</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "14px", color: textPrimary, fontWeight: 500 }}>
                  {primaryContact.firstName} {primaryContact.lastName}
                   {primaryContact.role && <span style={{ color: textMuted, fontWeight: 400, marginLeft: "8px" }}>{roleLabel(primaryContact.role)}</span>}
                </div>
                {(primaryContact.phone || primaryContact.mobile) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                     <Phone style={{ width: 14, height: 14, color: textMuted }} />
                     <a href={`tel:${primaryContact.phone || primaryContact.mobile}`} style={{ color: textPrimary, fontSize: "13px", textDecoration: "none" }} className="hover:underline">{primaryContact.phone || primaryContact.mobile}</a>
                  </div>
                )}
                {primaryContact.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                     <Mail style={{ width: 14, height: 14, color: textMuted }} />
                     <a href={`mailto:${primaryContact.email}`} style={{ color: "#E91E8C", fontSize: "13px", textDecoration: "none" }} className="hover:underline">{primaryContact.email}</a>
                  </div>
                )}
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard padding="24px" style={{ display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "20px" }}>Licensing</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {(agency.agencyNpn || agency.licenseNumber) && (
              <div style={{ fontSize: "14px", color: textPrimary }}>
                {[agency.agencyNpn ? `NPN ${agency.agencyNpn}` : null, agency.licenseNumber ? `License #${agency.licenseNumber}` : null].filter(Boolean).join(" · ")}
              </div>
            )}
            {states.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {visibleStates.map((state: string) => (
                  <span key={state} style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, color: textPrimary, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>{state}</span>
                ))}
                {hiddenStateCount > 0 && (
                  <button
                    onClick={() => setShowAllStates(!showAllStates)}
                    style={{ padding: "4px 10px", border: "none", borderRadius: "999px", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#E91E8C", background: "rgba(233,30,140,0.15)" }}
                  >
                    {showAllStates ? "Show less" : `+${hiddenStateCount} more`}
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ height: "1px", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", marginBottom: "20px" }} />
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>E&amp;O</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {agency.eoCarrier && <div style={{ fontSize: "14px", color: textPrimary }}>Carrier {agency.eoCarrier}</div>}
            {(agency.eoPolicyNumber || agency.eoCoverageAmount) && (
              <div style={{ fontSize: "14px", color: textPrimary }}>
                {[agency.eoPolicyNumber ? `Policy #${agency.eoPolicyNumber}` : null, agency.eoCoverageAmount ? `Policy limit $${Number(agency.eoCoverageAmount).toLocaleString()}` : null].filter(Boolean).join(" · ")}
              </div>
            )}
            {agency.eoExpirationDate && (
              <div style={{ fontSize: "14px", color: textPrimary }}>
                Expires <span style={{ color: isEoExpired ? "#E91E1E" : "#1EE97B", fontWeight: 600 }}>{format(calendarDate(agency.eoExpirationDate), "M/d/yyyy")}</span>
              </div>
            )}
            {(agency.eoCertificateUrl || agency.agreementUrl) && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                {agency.eoCertificateUrl && <a href={agency.eoCertificateUrl} target="_blank" rel="noreferrer" style={{ color: "#E91E8C", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}><ExternalLink style={{ width: 13, height: 13 }} /> E&amp;O certificate</a>}
                {agency.eoCertificateUrl && agency.agreementUrl && <span style={{ color: textMuted }}>·</span>}
                {agency.agreementUrl && <a href={agency.agreementUrl} target="_blank" rel="noreferrer" style={{ color: "#E91E8C", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}><ExternalLink style={{ width: 13, height: 13 }} /> Agency agreement</a>}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>Agents ({agents.length})</h3>
          <PinkButton onClick={() => setShowAddAgent(true)} style={{ padding: "6px 12px", fontSize: "12px", height: "auto", background: "#E91E8C" }}>+ Add Agent</PinkButton>
        </div>
        {agents.length === 0 ? (
          <p style={{ fontSize: "14px", color: textMuted, margin: 0 }}>No agents yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {agents.map(agent => (
              <GlassCard key={agent.id} padding="0" className="hover-elevate" style={{ cursor: "pointer" }} onClick={() => navigate(`/network/agents/${agent.id}`)}>
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(124,58,237,0.15)", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, flexShrink: 0 }}>
                      {displayName(agent).split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", color: textPrimary, fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName(agent)}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {[agent.title, agent.email || agent.contactEmail].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <SplitProductionLine metrics={agent.productionMetrics} />
                    <span style={{ padding: "2px 8px", borderRadius: "999px", background: agent.status === "Active" ? "rgba(30,233,123,0.15)" : "rgba(233,195,30,0.15)", color: agent.status === "Active" ? "#1EE97B" : "#E9C31E", fontSize: "11px", fontWeight: 600 }}>
                      {agent.status || "Active"}
                    </span>
                    <ChevronRight style={{ width: 16, height: 16, color: textMuted }} />
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>Agency contacts ({contacts.length})</h3>
           <PinkButton onClick={() => { setEditingContact(null); setShowContactModal(true); }} style={{ padding: "6px 12px", fontSize: "12px", height: "auto", background: "#E91E8C" }}>+ Add Contact</PinkButton>
        </div>
        {contacts.length === 0 ? (
          <p style={{ fontSize: "14px", color: textMuted, margin: 0 }}>No agency contacts yet.</p>
        ) : (
          <div className="agency-contact-grid" style={{ display: "grid", gap: "12px" }}>
            {[...contacts].sort((a, b) => {
              const roles = roleVocabulary?.agency || [];
              return roles.indexOf(a.role || "") - roles.indexOf(b.role || "") || a.lastName.localeCompare(b.lastName);
            }).map((c: any) => (
              <GlassCard key={c.id} padding="16px" className="hover-elevate" style={{ cursor: "pointer", position: "relative" }} onClick={() => { setEditingContact(c); setShowContactModal(true); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: textPrimary }}>{c.firstName} {c.lastName}</p>
                    {c.isPrimary && <span style={{ padding: "2px 6px", borderRadius: "999px", background: "rgba(233,30,140,0.15)", color: "#E91E8C", fontSize: "10px", fontWeight: 600 }}>Primary</span>}
                  </div>
                </div>
                {c.role && <p style={{ margin: "0 0 8px", fontSize: "12px", color: textMuted }}>{roleLabel(c.role)}</p>}
                {c.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail style={{ width: 12, height: 12, color: textMuted }} />
                    <a href={`mailto:${c.email}`} style={{ color: "#E91E8C", fontSize: "13px", textDecoration: "none" }} onClick={e => e.stopPropagation()} className="hover:underline">{c.email}</a>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Deals</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <p style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Bound ({boundDeals.length})</p>
            {boundDeals.length === 0 ? (
              <p style={{ fontSize: "14px", color: textMuted, margin: 0 }}>No bound deals yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {boundDeals.map(d => (
                  <div key={d.id} onClick={() => openDealCard(d.id)} className="hover-elevate" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "8px", cursor: "pointer", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.clientName || d.businessName || "Client"}</span>
                    <span style={{ fontSize: "12px", color: textMuted, flexShrink: 0, marginLeft: "12px" }}>
                      {dealLabel(d)} · {formatKLabel(dealValue(d))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: "12px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Recent ({openDeals.length})</p>
            {openDeals.length === 0 ? (
              <p style={{ fontSize: "14px", color: textMuted, margin: 0 }}>No open deals</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {openDeals.map(d => (
                  <div key={d.id} onClick={() => openDealCard(d.id)} className="hover-elevate" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "8px", cursor: "pointer", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.clientName || d.businessName || "Client"}</span>
                    <span style={{ fontSize: "12px", color: textMuted, flexShrink: 0, marginLeft: "12px" }}>
                      {dealLabel(d)} · {(d.stage || "").replace(/_/g, " ")} · {formatKLabel(dealValue(d))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Agency">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Legal Name *</label><input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>DBA</label><input value={form.dba} onChange={e => setForm({ ...form, dba: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="terminated">Terminated</option></select></div>
          <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Main Phone</label><input value={form.mainPhone} onChange={e => setForm({ ...form, mainPhone: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Website</label><input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Agency NPN</label><input value={form.agencyNpn} onChange={e => setForm({ ...form, agencyNpn: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>License Number</label><input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>States Licensed</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "110px", overflowY: "auto", padding: "8px", border: "1px solid var(--input-border)", borderRadius: "8px" }}>
              {usStates.map(state => {
                const selectedStates = Array.isArray(form.statesLicensed) ? form.statesLicensed : [];
                const selected = selectedStates.includes(state);
                return <button type="button" key={state} onClick={() => setForm({ ...form, statesLicensed: selected ? selectedStates.filter((value: string) => value !== state) : [...selectedStates, state] })} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", cursor: "pointer", background: selected ? "#E91E8C" : "rgba(128,128,128,0.12)", color: selected ? "#fff" : "var(--input-text)", fontSize: "12px" }}>{state}</button>;
              })}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--input-border)", paddingTop: "12px", marginTop: "4px" }}>
            <p style={{ margin: "0 0 12px", color: "var(--input-text)", fontSize: "14px", fontWeight: 600 }}>E&amp;O and agreement</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>E&O Carrier</label><input value={form.eoCarrier} onChange={e => setForm({ ...form, eoCarrier: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>E&O Policy Number</label><input value={form.eoPolicyNumber} onChange={e => setForm({ ...form, eoPolicyNumber: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>E&O Coverage Amount</label><input type="number" min="0" step="0.01" value={form.eoCoverageAmount} onChange={e => setForm({ ...form, eoCoverageAmount: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>E&O Expiration Date</label><input type="date" value={form.eoExpirationDate} onChange={e => setForm({ ...form, eoExpirationDate: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>E&O Certificate URL</label><input value={form.eoCertificateUrl} onChange={e => setForm({ ...form, eoCertificateUrl: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Agreement Signed Date</label><input type="date" value={form.agreementSignedAt} onChange={e => setForm({ ...form, agreementSignedAt: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Agreement URL</label><input value={form.agreementUrl} onChange={e => setForm({ ...form, agreementUrl: e.target.value })} style={inputStyle} /></div>
            </div>
          </div>
          <button disabled={!form.legalName?.trim() || updateMut.isPending} onClick={() => updateMut.mutate(form)} style={{ marginTop: "8px", border: "none", borderRadius: "8px", padding: "10px 16px", background: "#E91E8C", color: "#fff", cursor: "pointer", fontWeight: 600, opacity: !form.legalName?.trim() || updateMut.isPending ? 0.55 : 1 }}>
            {updateMut.isPending ? "Saving..." : "Save Agency"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={`${confirmAction} Agency`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ fontSize: "14px", color: textMuted, lineHeight: 1.5, margin: 0 }}>
            Are you sure you want to {confirmAction?.toLowerCase()} <strong>{legalName}</strong>?
            This will immediately block new deal attachments for this agency and all its agents. Agent statuses and portal access remain unchanged.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <GhostButton onClick={() => setConfirmAction(null)}>Cancel</GhostButton>
            <PinkButton style={{ background: "#E91E1E", color: "#fff" }} disabled={statusMut.isPending} onClick={() => { if (confirmAction) statusMut.mutate(confirmAction === "Suspend" ? "suspended" : "terminated"); }}>
              {statusMut.isPending ? "Applying..." : `Confirm ${confirmAction}`}
            </PinkButton>
          </div>
        </div>
      </Modal>

      {showContactModal && (
        <ContactModal
          isOpen
          onClose={() => setShowContactModal(false)}
          entityType="agency"
          initialData={editingContact}
          onSubmit={(data) => {
            if (editingContact) updateContact.mutate({ id: editingContact.id, data });
            else createContact.mutate({ ...data, entityType: "agency", entityId: id || "" });
            setShowContactModal(false);
          }}
          onDelete={() => {
            if (editingContact) deleteContact.mutate(editingContact.id);
            setShowContactModal(false);
          }}
        />
      )}
      {showAddAgent && <AddAgentModal initialAgencyId={id || ""} onClose={() => setShowAddAgent(false)} />}
    </div>
  );
}