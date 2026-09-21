import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, AxelBadge } from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { format } from "date-fns";
import { ApplicationDetailModal } from "./ApplicationDetailModal";
import { Search, AlertCircle, Loader2, RefreshCcw } from "lucide-react";

interface ProducerRegistrationRow {
  id: string;
  reference: string;
  agencyName: string;
  principalName: string;
  displayStatus: string;
  decision: "pending" | "approved" | "declined";
  flags: string[];
  submittedAt: string;
  callScheduledFor: string | null;
}

interface SchedulingEvent {
  id: string;
  eventType: string;
  reference: string | null;
  inviteeEmail: string | null;
  reviewReason: string | null;
  createdAt: string;
}

export function ApplicationsTab({ search }: { search: string }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: schedulingEvents, isLoading: isEventsLoading, isError: isEventsError, refetch: refetchEvents } = useQuery<SchedulingEvent[]>({
    queryKey: ["producer-registrations-scheduling-events"],
    queryFn: () => api.get<SchedulingEvent[]>("/producer-registrations/scheduling-events"),
  });

  const { data: applications, isLoading, isError, refetch } = useQuery<ProducerRegistrationRow[]>({
    queryKey: ["producer-registrations"],
    queryFn: () => api.get<ProducerRegistrationRow[]>("/producer-registrations"),
  });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", color: textMuted }}>
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", marginBottom: "16px" }} />
        <p style={{ margin: 0, fontSize: "14px" }}>Loading applications...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", color: textMuted }}>
        <AlertCircle style={{ width: 24, height: 24, color: "#E91E1E", marginBottom: "16px" }} />
        <p style={{ margin: 0, fontSize: "14px", marginBottom: "16px" }}>Failed to load applications.</p>
        <button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid var(--input-border)", padding: "8px 16px", borderRadius: "8px", color: textPrimary, cursor: "pointer" }}>
          <RefreshCcw style={{ width: 14, height: 14 }} /> Retry
        </button>
      </div>
    );
  }

  const apps = applications || [];
  
  const filtered = apps.filter(app => {
    const term = search.toLowerCase();
    return (
      (app.agencyName || "").toLowerCase().includes(term) ||
      (app.principalName || "").toLowerCase().includes(term) ||
      (app.reference || "").toLowerCase().includes(term) ||
      (app.displayStatus || "").toLowerCase().includes(term)
    );
  });

  // Sort: Ready for decision (e.g. displayStatus containing "Ready" or decision === null) sorted first by API, but we can enforce it here
  const sorted = [...filtered].sort((a, b) => {
    const aReady = (a.displayStatus || "").toLowerCase().includes("ready") ? -1 : 1;
    const bReady = (b.displayStatus || "").toLowerCase().includes("ready") ? -1 : 1;
    if (aReady !== bReady) return aReady - bReady;
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {/* Staff Attention Queue */}
        {!isEventsLoading && !isEventsError && schedulingEvents && schedulingEvents.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Staff Attention Required</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {schedulingEvents.map(event => (
                <div key={event.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(233,195,30,0.05)", border: "1px solid rgba(233,195,30,0.2)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <AlertCircle style={{ width: 18, height: 18, color: "#E9C31E" }} />
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>
                        {event.eventType === "unmatched_booking" ? "Unmatched Booking" : event.eventType === "ambiguous_booking" ? "Ambiguous Booking" : "Scheduling Alert"}
                        {event.reference && ` • Ref: ${event.reference}`}
                      </p>
                      <p style={{ fontSize: "13px", color: textMuted, margin: "2px 0 0 0" }}>
                        {event.inviteeEmail && `${event.inviteeEmail} — `}{event.reviewReason || "Needs review"}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", color: textMuted }}>
                    {format(new Date(event.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEventsError && (
          <div style={{ padding: "12px 16px", background: "rgba(233,30,30,0.1)", borderRadius: "8px", border: "1px solid rgba(233,30,30,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#E91E1E", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <AlertCircle style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: "14px", fontWeight: 500 }}>Failed to load scheduling alerts.</span>
            </div>
            <button onClick={() => refetchEvents()} style={{ background: "none", border: "none", color: "#E91E1E", cursor: "pointer", fontSize: "13px", fontWeight: 500, textDecoration: "underline" }}>
              Retry
            </button>
          </div>
        )}

        {sorted.map(app => (
          <GlassCard
            key={app.id}
            style={{ cursor: "pointer", transition: "border-color 0.15s" }}
            onClick={() => setSelectedId(app.id)}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>{app.agencyName}</p>
                  <span style={{ fontSize: "12px", color: textMuted, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: "4px" }}>
                    {app.reference}
                  </span>
                </div>
                <p style={{ fontSize: "14px", color: textMuted, margin: "0 0 12px 0" }}>Principal: {app.principalName}</p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <AxelBadge label={app.displayStatus} color={app.displayStatus.toLowerCase().includes("ready") ? "green" : app.displayStatus.toLowerCase().includes("pending") ? "yellow" : "gray"} />
                  {app.decision && app.decision !== "pending" && (
                    <AxelBadge label={`Decision: ${app.decision.toUpperCase()}`} color={app.decision === "approved" ? "green" : "red"} />
                  )}
                  {app.flags?.map(f => (
                    <span key={f} style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "rgba(233,195,30,0.1)", color: "#E9C31E", fontWeight: 500 }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>
                  Submitted: {format(new Date(app.submittedAt), "MMM d, yyyy")}
                </p>
                {app.callScheduledFor && (
                  <p style={{ fontSize: "12px", color: textPrimary, margin: "4px 0 0 0", fontWeight: 500 }}>
                    Call: {format(new Date(app.callScheduledFor), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        ))}

        {sorted.length === 0 && (
          <GlassCard>
            <p style={{ fontSize: "14px", color: textMuted, textAlign: "center", margin: 0 }}>
              {search ? "No applications matched your search." : "No applications found."}
            </p>
          </GlassCard>
        )}
      </div>

      {selectedId && (
        <ApplicationDetailModal
          applicationId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
