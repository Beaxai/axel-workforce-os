import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProducerSchedulingActionInput, ProducerSchedulingActionResult } from "@workspace/api-client-react";
import { api, ApiError } from "@/lib/api";
import { useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";
import { X, Loader2, AlertCircle, Calendar, CheckCircle2, XCircle, FileText, Download, Activity, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { PinkButton, GhostButton, AxelBadge } from "@/components/ui/axel-index";

interface ApplicationDetailModalProps {
  applicationId: string;
  onClose: () => void;
}

export function ApplicationDetailModal({ applicationId, onClose }: ApplicationDetailModalProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const qc = useQueryClient();

  const [notes, setNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: app, isLoading, isError } = useQuery<any>({
    queryKey: ["producer-registrations", applicationId],
    queryFn: () => api.get(`/producer-registrations/${applicationId}`),
  });

  const onSuccessMutate = () => {
    qc.invalidateQueries({ queryKey: ["producer-registrations"] });
    qc.invalidateQueries({ queryKey: ["producer-registrations", applicationId] });
    setServerError(null);
  };

  const onErrorMutate = (error: any) => {
    let msg = "An error occurred";
    if (error instanceof ApiError) msg = error.message;
    setServerError(msg);
  };

  const completeCallMut = useMutation({
    mutationFn: () => api.post(`/producer-registrations/${applicationId}/call-complete`, { notes }),
    onSuccess: onSuccessMutate,
    onError: onErrorMutate,
  });

  const approveMut = useMutation({
    mutationFn: () => api.post(`/producer-registrations/${applicationId}/approve`, {}),
    onSuccess: onSuccessMutate,
    onError: onErrorMutate,
  });

  const declineMut = useMutation({
    mutationFn: () => api.post(`/producer-registrations/${applicationId}/decline`, { reason: declineReason }),
    onSuccess: onSuccessMutate,
    onError: onErrorMutate,
  });

  const sendLinkMut = useMutation({
    mutationFn: (action: ProducerSchedulingActionInput) =>
      api.post<ProducerSchedulingActionResult>(`/producer-registrations/${applicationId}/send-scheduling-link`, action),
    onSuccess: (res) => {
      sessionStorage.removeItem(`scheduling-action:${user?.id}:${applicationId}`);
      onSuccessMutate();
      if (res?.status === "blocked") {
        setServerError(`Blocked: ${res.reason}`);
      }
    },
    onError: onErrorMutate,
  });

  const hasSchedulingRequest = app?.activity?.some(
    (entry: any) => entry.action === "SCHEDULING_LINK_DELIVERY_BLOCKED",
  );
  const requestSchedulingLink = () => {
    // Keep unresolved actions across transport retries and modal reloads.
    const storageKey = `scheduling-action:${user?.id}:${applicationId}`;
    try {
      const pending = sessionStorage.getItem(storageKey);
      const action = pending ? JSON.parse(pending) : {
        actionId: crypto.randomUUID(),
        intent: hasSchedulingRequest ? "resend" : "send",
      };
      sessionStorage.setItem(storageKey, JSON.stringify(action));
      sendLinkMut.mutate(action);
    } catch {
      setServerError("Unable to preserve the scheduling request for safe retries. Please check browser storage access.");
    }
  };

  const issueCredsMut = useMutation({
    mutationFn: () => api.post(`/producer-registrations/${applicationId}/issue-credentials`, {}),
    onSuccess: onSuccessMutate,
    onError: onErrorMutate,
  });

  const handleDownloadDoc = async (docId: string) => {
    try {
      const res: any = await api.get(`/producer-registrations/${applicationId}/documents/${docId}/access`);
      if (res.url) {
        window.open(res.url, "_blank");
      }
    } catch (e: any) {
      alert("Could not access document: " + (e.message || "Unknown error"));
    }
  };

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const bgPanel = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const borderPanel = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";

  const renderPayloadValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "object") {
      return (
        <div style={{ marginLeft: "12px", borderLeft: borderPanel, paddingLeft: "12px", marginTop: "4px" }}>
          {Object.entries(val).map(([k, v]) => (
            <div key={k} style={{ marginBottom: "4px" }}>
              <span style={{ color: textMuted, fontSize: "12px" }}>{k}: </span>
              <span style={{ color: textPrimary, fontSize: "12px" }}>{renderPayloadValue(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return String(val);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end", background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "600px", height: "100%", background: isDark ? "rgba(18,18,24,0.95)" : "rgba(255,255,255,0.98)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, display: "flex", flexDirection: "column", boxShadow: "-24px 0 80px rgba(0,0,0,0.2)" }}>
        
        <div style={{ padding: "24px 32px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: 0 }}>Application Details</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: "4px" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {isLoading && (
            <div style={{ textAlign: "center", padding: "40px", color: textMuted }}>
              <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", margin: "0 auto 12px auto" }} />
              <p>Loading details...</p>
            </div>
          )}

          {isError && (
            <div style={{ textAlign: "center", padding: "40px", color: "#E91E1E" }}>
              <AlertCircle style={{ width: 24, height: 24, margin: "0 auto 12px auto" }} />
              <p>Failed to load application details.</p>
            </div>
          )}

          {app && (
            <>
              {serverError && (
                <div style={{ padding: "12px 16px", background: "rgba(233,30,30,0.1)", borderRadius: "8px", border: "1px solid rgba(233,30,30,0.2)", display: "flex", gap: "8px", alignItems: "flex-start", color: "#E91E1E" }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{serverError}</span>
                </div>
              )}

              {/* Header Info */}
              <div>
                <h3 style={{ fontSize: "24px", fontWeight: 600, color: textPrimary, margin: "0 0 4px 0" }}>{app.agencyName}</h3>
                <p style={{ fontSize: "14px", color: textMuted, margin: "0 0 16px 0" }}>Reference: {app.reference} • Principal: {app.principalName}</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <AxelBadge label={app.displayStatus} color="gray" />
                  {app.decision && app.decision !== "pending" && (
                    <AxelBadge label={`Decision: ${app.decision.toUpperCase()}`} color={app.decision === "approved" ? "green" : "red"} />
                  )}
                  {app.flags?.map((f: string) => (
                    <AxelBadge key={f} label={f} color="yellow" />
                  ))}
                </div>
              </div>

              {/* Blocking Reasons */}
              {app.blockingReasons && app.blockingReasons.length > 0 && (
                <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(233,195,30,0.1)", border: "1px solid rgba(233,195,30,0.2)" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <AlertCircle style={{ width: 16, height: 16, color: "#E9C31E" }} />
                    <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#E9C31E", margin: 0 }}>Action Blocked</h4>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "24px", color: "#E9C31E", fontSize: "13px" }}>
                    {app.blockingReasons.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Milestones / Packet */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: bgPanel, border: borderPanel, borderRadius: "12px", padding: "16px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 0" }}>Milestones</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Milestone label="Submitted" date={app.submittedAt} />
                    <Milestone label="Packet Sent" date={app.packetSentAt} />
                    <Milestone label="Packet Signed" date={app.packetSignedAt} />
                    <Milestone label="Countersigned" date={app.countersignedAt} />
                    <Milestone label="Credentials Issued" date={app.credentialsIssuedAt} />
                  </div>
                </div>

                <div style={{ background: bgPanel, border: borderPanel, borderRadius: "12px", padding: "16px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 0" }}>Discovery Call</p>
                  {app.callScheduledFor ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <p style={{ fontSize: "14px", color: textPrimary, margin: 0 }}>{format(new Date(app.callScheduledFor), "MMM d, yyyy h:mm a")}</p>
                      {app.meetingUrl && (
                        <a href={app.meetingUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
                          <LinkIcon style={{ width: 14, height: 14 }} /> Join Meeting
                        </a>
                      )}
                      <Milestone label="Call Completed" date={app.callCompletedAt} />
                      {app.callNotes && (
                        <p style={{ fontSize: "13px", color: textMuted, margin: "8px 0 0 0", fontStyle: "italic", borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: "8px" }}>"{app.callNotes}"</p>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>Not scheduled yet.</p>
                  )}
                  {app.permissions?.canSendSchedulingLink && (
                    <PinkButton onClick={requestSchedulingLink} style={{ width: "100%", marginTop: "16px", padding: "8px" }} disabled={sendLinkMut.isPending}>
                      {sendLinkMut.isPending ? "Recording..." : sendLinkMut.isError ? "Retry Scheduling Request" : hasSchedulingRequest ? "Resend Scheduling Link" : "Send Scheduling Link"}
                    </PinkButton>
                  )}
                </div>
              </div>

              {/* Call Completion Action */}
              {app.permissions?.canCompleteCall && !app.callCompletedAt && (
                <div style={{ background: "rgba(30,233,123,0.05)", border: "1px solid rgba(30,233,123,0.2)", borderRadius: "12px", padding: "16px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#1EE97B", margin: "0 0 12px 0" }}>Complete Discovery Call</p>
                  <textarea
                    placeholder="Short notes from the call..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: borderPanel, background: "rgba(0,0,0,0.2)", color: textPrimary, fontSize: "14px", outline: "none", resize: "vertical", minHeight: "80px", marginBottom: "12px" }}
                  />
                  <PinkButton onClick={() => completeCallMut.mutate()} disabled={!notes.trim() || completeCallMut.isPending} style={{ width: "100%" }}>
                    {completeCallMut.isPending ? "Saving..." : "Mark Call Complete"}
                  </PinkButton>
                </div>
              )}

              <div style={{ background: bgPanel, border: borderPanel, borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 8px" }}>Configuration availability</p>
                <p style={{ fontSize: "12px", color: textMuted }}>Separate from staff permissions and application milestones.</p>
                {(["approve", "issueCredentials"] as const).map(action => (
                  !app.availability?.[action]?.available && (
                    <p key={action} style={{ fontSize: "13px", color: textMuted }}>
                      {app.availability?.[action]?.reason ?? "Availability could not be confirmed. This action is unavailable."}
                    </p>
                  )
                ))}
              </div>

              {/* Documents */}
              {app.documents && app.documents.length > 0 && (
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px 0" }}>Documents</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {app.documents.map((doc: any) => (
                      <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: bgPanel, border: borderPanel, borderRadius: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <FileText style={{ width: 16, height: 16, color: textMuted }} />
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 500, color: textPrimary, margin: 0 }}>{doc.docType}</p>
                            <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>{doc.filename} • {doc.ingestionStatus}</p>
                            {!doc.accessAvailability?.available && (
                              <p style={{ fontSize: "12px", color: textMuted, margin: "4px 0 0" }}>
                                {doc.accessAvailability?.reason ?? "Document access availability could not be confirmed."}
                              </p>
                            )}
                          </div>
                        </div>
                        {doc.canAccess && (
                          <button disabled={!doc.accessAvailability?.available} onClick={() => handleDownloadDoc(doc.id)} style={{ background: "none", border: "none", color: "var(--accent-primary)", cursor: doc.accessAvailability?.available ? "pointer" : "not-allowed", opacity: doc.accessAvailability?.available ? 1 : 0.5, display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500 }}>
                            <Download style={{ width: 14, height: 14 }} /> Download
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owners */}
              {app.owners && app.owners.length > 0 && (
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px 0" }}>Owners</p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {app.owners.map((owner: any) => (
                      <div key={owner.id} style={{ padding: "12px", background: bgPanel, border: borderPanel, borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{owner.name} <span style={{ color: textMuted, fontWeight: 400 }}>({owner.ownershipPct}%)</span></p>
                          <p style={{ fontSize: "12px", color: textMuted, margin: "2px 0 0 0" }}>{owner.title} • {owner.email}</p>
                        </div>
                        {owner.exhibitASignedAt ? (
                          <AxelBadge label="Exhibit A Signed" color="green" />
                        ) : (
                          <AxelBadge label="Pending Exhibit A" color="gray" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Payload (Admin Only) */}
              {isAdmin && app.payload && (
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px 0" }}>Application Data (Raw)</p>
                  <div style={{ background: "rgba(0,0,0,0.2)", border: borderPanel, borderRadius: "8px", padding: "16px", maxHeight: "300px", overflowY: "auto", fontFamily: "monospace" }}>
                    {Object.entries(app.payload).map(([key, value]) => (
                      <div key={key} style={{ marginBottom: "12px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-primary)" }}>{key}: </span>
                        <div style={{ color: textPrimary, fontSize: "13px", marginTop: "4px" }}>
                          {renderPayloadValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications */}
              {app.notificationRequests && app.notificationRequests.length > 0 && (
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px 0" }}>Delivery Status</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {app.notificationRequests.map((notif: any) => (
                      <div key={notif.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: bgPanel, border: borderPanel, borderRadius: "8px" }}>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: textPrimary, margin: 0 }}>{notif.event}</p>
                          <p style={{ fontSize: "12px", color: textMuted, margin: "2px 0 0 0" }}>{format(new Date(notif.createdAt), "MMM d, yyyy h:mm a")}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <AxelBadge label={notif.status} color={notif.status === "blocked" || notif.failureCode ? "red" : "gray"} />
                          {notif.failureCode && (
                            <p style={{ fontSize: "11px", color: "#E91E1E", margin: "4px 0 0 0" }}>{notif.failureCode}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Log */}
              {app.activity && app.activity.length > 0 && (
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px 0" }}>Activity</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {app.activity.map((act: any) => (
                      <div key={act.id} style={{ display: "flex", gap: "12px" }}>
                        <div style={{ width: "32px", display: "flex", justifyContent: "center", position: "relative" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-primary)", marginTop: "4px" }} />
                          <div style={{ position: "absolute", top: "16px", bottom: "-12px", left: "15px", width: "2px", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
                        </div>
                        <div>
                          <p style={{ fontSize: "13px", color: textPrimary, margin: 0, fontWeight: 500 }}>{act.action}</p>
                          <p style={{ fontSize: "12px", color: textMuted, margin: "2px 0 0 0" }}>{format(new Date(act.createdAt), "MMM d, h:mm a")} • {act.actorId || "System"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Footer */}
        {app && (app.permissions?.canDecide || app.permissions?.canIssueCredentials) && (
          <div style={{ padding: "24px 32px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`, background: bgPanel, flexShrink: 0 }}>
            {app.permissions?.canIssueCredentials && !app.credentialsIssuedAt && (
              <PinkButton onClick={() => issueCredsMut.mutate()} disabled={!app.availability?.issueCredentials?.available || issueCredsMut.isPending} style={{ width: "100%", marginBottom: "12px" }}>
                {issueCredsMut.isPending ? "Issuing..." : "Issue Credentials"}
              </PinkButton>
            )}

            {app.permissions?.canDecide && app.decision === "pending" && (
              <>
                {showDeclineForm ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <textarea
                      placeholder="Reason for decline..."
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: borderPanel, background: "rgba(0,0,0,0.2)", color: textPrimary, fontSize: "14px", outline: "none", resize: "vertical", minHeight: "80px" }}
                    />
                    <div style={{ display: "flex", gap: "12px" }}>
                      <PinkButton onClick={() => declineMut.mutate()} disabled={!declineReason.trim() || declineMut.isPending} style={{ flex: 1, background: "#E91E1E", color: "#fff" }}>
                        {declineMut.isPending ? "Declining..." : "Confirm Decline"}
                      </PinkButton>
                      <GhostButton onClick={() => setShowDeclineForm(false)} style={{ flex: 1 }}>Cancel</GhostButton>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px" }}>
                    <PinkButton onClick={() => approveMut.mutate()} disabled={!app.availability?.approve?.available || approveMut.isPending} style={{ flex: 1, background: "#1EE97B", color: "#000" }}>
                      {approveMut.isPending ? "Approving..." : "Approve Appointment"}
                    </PinkButton>
                    <GhostButton onClick={() => setShowDeclineForm(true)} style={{ flex: 1, color: "#E91E1E", borderColor: "rgba(233,30,30,0.3)" }}>
                      Decline...
                    </GhostButton>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Milestone({ label, date }: { label: string; date: string | null | undefined }) {
  const isDark = useThemeStore().theme === "dark";
  if (!date) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.5 }}>
        <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}` }} />
        <span style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{label}</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <CheckCircle2 style={{ width: 16, height: 16, color: "#1EE97B" }} />
      <span style={{ fontSize: "13px", color: isDark ? "#fff" : "#111" }}>{label}</span>
      <span style={{ fontSize: "11px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
        {format(new Date(date), "MMM d, yyyy")}
      </span>
    </div>
  );
}
