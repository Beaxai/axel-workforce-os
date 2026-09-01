import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, AlertTriangle, UserCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ContactCard } from "@/components/ui/ContactCard";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { DealTeamMember } from "./types";
import GhostButton from "@/components/ui/GhostButton";
import { displayName } from "@/lib/agent-display-name";

interface AssignedTeamPopoverProps {
  dealId: string;
  team?: DealTeamMember[];
  children: React.ReactNode;
  onUpdated: () => void;
}

interface AgentPartner {
  userId: string;
  firstName?: string;
  lastName?: string;
  name: string;
  status: string;
}

export default function AssignedTeamPopover({ dealId, team, children, onUpdated }: AssignedTeamPopoverProps) {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const c = useThemeColors();
  const isInternal = user && ["ADMIN", "CSA", "UNDERWRITER"].includes(user.role);

  const members = team ?? [];

  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<AgentPartner[]>({
    queryKey: ["agent-partners"],
    queryFn: () => api.get<AgentPartner[]>("/partners?type=Agent"),
    enabled: !!(open && isInternal),
  });

  // Current producing agent is the one with relation "PRODUCING AGENT" or similar
  const currentAgent = members.find(m => m.relation?.toUpperCase().includes("AGENT"));

  const handleAssignAgent = async (agentId: string) => {
    setAssigning(true);
    setError(null);
    try {
      await api.patch(`/deals/${dealId}/producing-agent`, { producingAgentId: agentId });
      onUpdated();
      setOpen(false);
    } catch (e: any) {
      let msg = e instanceof Error ? e.message : "";
      try {
        const parsed = JSON.parse(msg);
        if (typeof parsed === "string") msg = parsed;
      } catch {
        // Keep the original API message.
      }
      setError(msg || "Add NPN, license state, and current E&O before this agent can be attached to quoted deals.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAgent = async () => {
    setAssigning(true);
    setError(null);
    try {
      await api.patch(`/deals/${dealId}/producing-agent`, { producingAgentId: null });
      onUpdated();
    } catch (e: any) {
      let msg = e instanceof Error ? e.message : "";
      try {
        const parsed = JSON.parse(msg);
        if (typeof parsed === "string") msg = parsed;
      } catch {
        // Keep the original API message.
      }
      setError(msg || "Failed to remove agent");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div style={{ cursor: "pointer" }} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[380px] p-0 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b bg-muted/20">
          <h4 className="font-semibold text-sm">Assigned Team</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Contacts assigned to this deal</p>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-3 space-y-3">
          {members.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No team members assigned
            </div>
          ) : (
            members.map(m => (
              <ContactCard
                key={m.userId}
                variant="staff"
                name={m.name}
                title={m.title ?? undefined}
                role={m.relation ?? undefined}
                email={m.email ?? undefined}
                phoneDirect={m.phoneDirect ?? undefined}
                phoneMobile={m.phoneMobile ?? undefined}
              />
            ))
          )}
        </div>

        {isInternal && (
          <div className="p-3 bg-muted/30 border-t">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Producing Agent</h4>

            {error && (
              <div className="mb-3 flex items-start gap-2 p-2 bg-destructive/10 text-destructive text-xs rounded-md">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <GhostButton
                  style={{ width: "100%", justifyContent: "space-between", padding: "8px 12px", border: "1px solid var(--border)", background: "var(--input-bg)", opacity: assigning ? 0.7 : 1, pointerEvents: assigning ? "none" : "auto" }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <UserCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">
                      {currentAgent ? currentAgent.name : "Assign Producing Agent..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 opacity-50 flex-shrink-0" />
                </GhostButton>
              </PopoverTrigger>
              <PopoverContent className="w-[314px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search agents..." />
                  <CommandList>
                    <CommandEmpty>No agents found.</CommandEmpty>
                    <CommandGroup>
                      {agents.filter((agent) => agent.userId).map(agent => (
                        <CommandItem
                          key={agent.userId}
                          value={displayName(agent)}
                          onSelect={() => handleAssignAgent(agent.userId)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span>{displayName(agent)}</span>
                            {agent.status && (
                              <span className="text-[10px] text-muted-foreground uppercase">{agent.status}</span>
                            )}
                          </div>
                          {currentAgent?.userId === agent.userId && <Check className="w-4 h-4 ml-2" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {currentAgent && (
              <div className="mt-2 text-right">
                <button
                  onClick={handleRemoveAgent}
                  disabled={assigning}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                >
                  Remove Agent
                </button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}