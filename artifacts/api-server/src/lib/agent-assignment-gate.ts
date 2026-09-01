import {
  agentProfilesTable,
  agentRegistrationsTable,
  db,
  partnersTable,
} from "@workspace/db";
import { PIPELINE_STAGE_KEYS } from "@workspace/pipeline";
import { eq } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

export const AGENT_ATTACHMENT_GATE_CODE = "AGENT_ATTACHMENT_BLOCKED";
export const AGENT_ATTACHMENT_GATE_MESSAGE =
  "Add NPN, license state, and current E&O before this agent can be attached to quoted deals.";

const UW_REVIEW_INDEX = PIPELINE_STAGE_KEYS.indexOf("UW_REVIEW");

function stageRequiresQualifiedAgent(stage: string | null | undefined): boolean {
  if (!stage) return false;
  const index = PIPELINE_STAGE_KEYS.indexOf(stage as (typeof PIPELINE_STAGE_KEYS)[number]);
  return index >= UW_REVIEW_INDEX;
}

function profileLicenseStates(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const states = (value as { statesLicensed?: unknown }).statesLicensed;
  return Array.isArray(states)
    ? states.filter((state): state is string => typeof state === "string" && state.trim().length > 0)
    : [];
}

export interface AgentAttachmentGateResult {
  allowed: boolean;
  code?: typeof AGENT_ATTACHMENT_GATE_CODE;
  error?: typeof AGENT_ATTACHMENT_GATE_MESSAGE;
  missing?: Array<"npn" | "licenseState" | "currentEo">;
}

/**
 * The single gate for every runtime write that creates a producing-Agent
 * association. Existing associations and detach operations intentionally pass.
 */
export async function validateNewProducingAgentAttachment({
  dbc = db,
  agentUserId,
  existingAgentUserId,
  stage,
}: {
  dbc?: DbOrTx;
  agentUserId: string | null | undefined;
  existingAgentUserId?: string | null;
  stage: string | null | undefined;
}): Promise<AgentAttachmentGateResult> {
  if (
    !agentUserId ||
    agentUserId === existingAgentUserId ||
    !stageRequiresQualifiedAgent(stage)
  ) {
    return { allowed: true };
  }

  const [agent] = await dbc
    .select({
      individualNpn: agentProfilesTable.individualNpn,
      licenseNumbers: agentProfilesTable.licenseNumbers,
      legacyLicenseStates: partnersTable.licenseStates,
      eoExpirationDate: agentRegistrationsTable.eoExpirationDate,
    })
    .from(agentProfilesTable)
    .innerJoin(partnersTable, eq(partnersTable.id, agentProfilesTable.partnerId))
    .leftJoin(
      agentRegistrationsTable,
      eq(agentRegistrationsTable.id, agentProfilesTable.registrationId),
    )
    .where(eq(agentProfilesTable.userId, agentUserId))
    .limit(1);

  const missing: AgentAttachmentGateResult["missing"] = [];
  if (!agent?.individualNpn?.trim()) missing.push("npn");
  const states = [
    ...(agent?.legacyLicenseStates ?? []),
    ...profileLicenseStates(agent?.licenseNumbers),
  ];
  if (states.length === 0) missing.push("licenseState");

  const eoDate = agent?.eoExpirationDate
    ? new Date(agent.eoExpirationDate)
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!eoDate || Number.isNaN(eoDate.getTime()) || eoDate < today) {
    missing.push("currentEo");
  }

  return missing.length === 0
    ? { allowed: true }
    : {
        allowed: false,
        code: AGENT_ATTACHMENT_GATE_CODE,
        error: AGENT_ATTACHMENT_GATE_MESSAGE,
        missing,
      };
}