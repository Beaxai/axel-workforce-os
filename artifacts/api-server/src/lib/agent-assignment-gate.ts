import {
  agentProfilesTable,
  agenciesTable,
  db,
  partnersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

export const AGENT_ATTACHMENT_GATE_CODE = "AGENT_ATTACHMENT_BLOCKED";
export const AGENT_ATTACHMENT_GATE_MESSAGE =
  "This agent (or their agency) is suspended and cannot be attached to deals.";

export interface AgentAttachmentGateResult {
  allowed: boolean;
  code?: typeof AGENT_ATTACHMENT_GATE_CODE;
  error?: typeof AGENT_ATTACHMENT_GATE_MESSAGE;
}

export function isActiveAgentAgencyAssociation(
  agentStatus: string | null | undefined,
  agencyStatus: string | null | undefined,
): boolean {
  return agentStatus?.toLowerCase() === "active" && agencyStatus?.toLowerCase() === "active";
}

/**
 * The single gate for every runtime write that creates a producing-agent
 * association. Existing associations and detach operations intentionally pass.
 * Attachments only require an active agent and active agency; registration
 * approval is the compliance checkpoint, not this association operation.
 */
export async function validateNewProducingAgentAttachment({
  dbc = db,
  agentUserId,
  existingAgentUserId,
}: {
  dbc?: DbOrTx;
  agentUserId: string | null | undefined;
  existingAgentUserId?: string | null;
}): Promise<AgentAttachmentGateResult> {
  if (
    !agentUserId || agentUserId === existingAgentUserId
  ) {
    return { allowed: true };
  }

  const [agent] = await dbc
    .select({
      agentStatus: partnersTable.status,
      agencyStatus: agenciesTable.status,
    })
    .from(agentProfilesTable)
    .innerJoin(partnersTable, eq(partnersTable.id, agentProfilesTable.partnerId))
    .innerJoin(agenciesTable, eq(agenciesTable.id, partnersTable.agencyId))
    .where(eq(agentProfilesTable.userId, agentUserId))
    .limit(1);

  return isActiveAgentAgencyAssociation(agent?.agentStatus, agent?.agencyStatus)
    ? { allowed: true }
    : {
        allowed: false,
        code: AGENT_ATTACHMENT_GATE_CODE,
        error: AGENT_ATTACHMENT_GATE_MESSAGE,
      };
}