import { z } from "zod/v4";

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

const identitySchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    email: emailSchema,
  })
  .strict();

const ownerSchema = identitySchema
  .extend({
    ownershipPct: z.number().finite().min(0).max(100),
  })
  .strict();

const packetPlanInputSchema = z
  .object({
    principal: identitySchema,
    owners: z.array(ownerSchema).min(1),
    countersigner: identitySchema,
    decision: z.enum(["pending", "approved", "declined"]),
    packetSignedAt: z.date().nullable(),
    callCompletedAt: z.date().nullable(),
  })
  .strict()
  .superRefine((input, context) => {
    const ownerIds = new Set<string>();
    const ownerEmails = new Set<string>();
    let ownershipTotal = 0;

    for (const [index, owner] of input.owners.entries()) {
      ownershipTotal += owner.ownershipPct;
      if (ownerIds.has(owner.id)) {
        context.addIssue({
          code: "custom",
          path: ["owners", index, "id"],
          message: "Owner IDs must be unique",
        });
      }
      ownerIds.add(owner.id);

      if (ownerEmails.has(owner.email)) {
        context.addIssue({
          code: "custom",
          path: ["owners", index, "email"],
          message: "Distinct owners cannot share an email address",
        });
      }
      ownerEmails.add(owner.email);
    }

    if (ownershipTotal > 100) {
      context.addIssue({
        code: "custom",
        path: ["owners"],
        message: "Owner percentages cannot total more than 100",
      });
    }

    if (
      input.countersigner.email === input.principal.email ||
      ownerEmails.has(input.countersigner.email)
    ) {
      context.addIssue({
        code: "custom",
        path: ["countersigner", "email"],
        message: "Countersigner email cannot overlap a producer email",
      });
    }
  });

export const REQUIRED_PACKET_ASSET_TYPES = [
  "appointment_application",
  "national_producer_agreement",
  "exhibit_a",
  "cfpb_summary",
  "w9",
  "ach_authorization",
] as const;

const assetTypeSchema = z.enum(REQUIRED_PACKET_ASSET_TYPES);

const sourceAssetSchema = z
  .object({
    type: assetTypeSchema,
    approvedRevision: z.string().trim().min(1),
    storageKey: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) => !/^https?:\/\//i.test(value) && !value.startsWith("//"),
        "storageKey must be an opaque private object key, not a URL",
      ),
  })
  .strict();

const readinessInputSchema = z
  .object({
    sourceAssets: z.array(sourceAssetSchema),
    providerConfirmations: z
      .object({
        ownerDocumentVisibility: z.boolean(),
        externalApprovalHold: z.boolean(),
        reminderEveryThreeDays: z.boolean(),
      })
      .strict(),
    authorizedTestRecipients: z
      .object({
        principal: z.boolean(),
        additionalOwner: z.boolean(),
        countersigner: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type PacketPlanInput = z.input<typeof packetPlanInputSchema>;
export type PacketReadinessInput = z.input<typeof readinessInputSchema>;
export type PacketAssetType = (typeof REQUIRED_PACKET_ASSET_TYPES)[number];
export type PacketDocumentType =
  | PacketAssetType
  | "exhibit_a";
export type PacketRecipientRole = "principal" | "owner" | "countersigner";

export interface PacketRecipient {
  ref: string;
  role: PacketRecipientRole;
  identityId: string;
  name: string;
  email: string;
  ownerId?: string;
}

export interface PlannedDocument {
  ref: string;
  type: PacketDocumentType;
  sourceAssetType: PacketAssetType;
  ownerId?: string;
  readRecipientRefs: string[];
  signRecipientRefs: string[];
  readOnly: boolean;
}

export type PacketReadinessReason =
  | `missing_asset:${PacketAssetType}`
  | "duplicate_asset"
  | "owner_visibility_unverified"
  | "external_approval_hold_unverified"
  | "reminder_frequency_unverified"
  | "authorized_test_recipients_missing";

export interface PacketReadiness {
  ready: boolean;
  reasons: PacketReadinessReason[];
}

export interface CountersignerReleaseGate {
  eligible: boolean;
  reasons: Array<
    | "decision_pending"
    | "decision_declined"
    | "producer_packet_unsigned"
    | "call_incomplete"
    | "provider_policy_unverified"
  >;
}

export interface ProducerAppointmentPacketPlan {
  policyKind: "desired_policy_only";
  dispatchEnabled: false;
  recipients: PacketRecipient[];
  documents: PlannedDocument[];
  readiness: PacketReadiness;
  countersignerRelease: CountersignerReleaseGate;
}

export function checkPacketReadiness(input: PacketReadinessInput): PacketReadiness {
  const parsed = readinessInputSchema.parse(input);
  const reasons: PacketReadinessReason[] = [];
  const presentAssets = new Set<PacketAssetType>();

  for (const asset of parsed.sourceAssets) {
    if (presentAssets.has(asset.type) && !reasons.includes("duplicate_asset")) {
      reasons.push("duplicate_asset");
    }
    presentAssets.add(asset.type);
  }

  for (const type of REQUIRED_PACKET_ASSET_TYPES) {
    if (!presentAssets.has(type)) reasons.push(`missing_asset:${type}`);
  }
  if (!parsed.providerConfirmations.ownerDocumentVisibility) {
    reasons.push("owner_visibility_unverified");
  }
  if (!parsed.providerConfirmations.externalApprovalHold) {
    reasons.push("external_approval_hold_unverified");
  }
  if (!parsed.providerConfirmations.reminderEveryThreeDays) {
    reasons.push("reminder_frequency_unverified");
  }
  if (
    !parsed.authorizedTestRecipients.principal ||
    !parsed.authorizedTestRecipients.additionalOwner ||
    !parsed.authorizedTestRecipients.countersigner
  ) {
    reasons.push("authorized_test_recipients_missing");
  }

  return { ready: reasons.length === 0, reasons };
}

function countersignerGate(
  input: z.output<typeof packetPlanInputSchema>,
  readiness: PacketReadiness,
): CountersignerReleaseGate {
  const reasons: CountersignerReleaseGate["reasons"] = [];
  if (input.decision === "pending") reasons.push("decision_pending");
  if (input.decision === "declined") reasons.push("decision_declined");
  if (!input.packetSignedAt) reasons.push("producer_packet_unsigned");
  if (!input.callCompletedAt) reasons.push("call_incomplete");
  if (!readiness.ready) reasons.push("provider_policy_unverified");
  return { eligible: reasons.length === 0, reasons };
}

export function buildProducerAppointmentPacketPlan(
  input: PacketPlanInput,
  readinessInput: PacketReadinessInput,
): ProducerAppointmentPacketPlan {
  const parsed = packetPlanInputSchema.parse(input);
  const readiness = checkPacketReadiness(readinessInput);
  const principalRef = "recipient:principal";
  const countersignerRef = "recipient:countersigner";
  const qualifyingOwners = parsed.owners.filter(
    (owner) => owner.ownershipPct >= 10,
  );

  const recipients: PacketRecipient[] = [
    {
      ref: principalRef,
      role: "principal",
      identityId: parsed.principal.id,
      name: parsed.principal.name,
      email: parsed.principal.email,
    },
  ];
  const ownerRecipientRefs = new Map<string, string>();

  for (const owner of qualifyingOwners) {
    const isPrincipal = owner.email === parsed.principal.email;
    if (isPrincipal) {
      ownerRecipientRefs.set(owner.id, principalRef);
      continue;
    }
    const ref = `recipient:owner:${owner.id}`;
    ownerRecipientRefs.set(owner.id, ref);
    recipients.push({
      ref,
      role: "owner",
      identityId: owner.id,
      name: owner.name,
      email: owner.email,
      ownerId: owner.id,
    });
  }

  recipients.push({
    ref: countersignerRef,
    role: "countersigner",
    identityId: parsed.countersigner.id,
    name: parsed.countersigner.name,
    email: parsed.countersigner.email,
  });

  const producerSummaryReaders = [
    principalRef,
    ...recipients
      .filter((recipient) => recipient.role === "owner")
      .map((recipient) => recipient.ref),
    countersignerRef,
  ];
  const documents: PlannedDocument[] = [
    {
      ref: "document:appointment_application",
      type: "appointment_application",
      sourceAssetType: "appointment_application",
      readRecipientRefs: [principalRef],
      signRecipientRefs: [principalRef],
      readOnly: false,
    },
    {
      ref: "document:national_producer_agreement",
      type: "national_producer_agreement",
      sourceAssetType: "national_producer_agreement",
      readRecipientRefs: [principalRef, countersignerRef],
      signRecipientRefs: [principalRef, countersignerRef],
      readOnly: false,
    },
    ...qualifyingOwners.map((owner): PlannedDocument => {
      const recipientRef = ownerRecipientRefs.get(owner.id);
      if (!recipientRef) throw new Error(`Missing recipient for owner ${owner.id}`);
      return {
        ref: `document:exhibit_a:${owner.id}`,
        type: "exhibit_a",
        sourceAssetType: "exhibit_a",
        ownerId: owner.id,
        readRecipientRefs: [recipientRef],
        signRecipientRefs: [recipientRef],
        readOnly: false,
      };
    }),
    {
      ref: "document:cfpb_summary",
      type: "cfpb_summary",
      sourceAssetType: "cfpb_summary",
      readRecipientRefs: producerSummaryReaders,
      signRecipientRefs: [],
      readOnly: true,
    },
    {
      ref: "document:w9",
      type: "w9",
      sourceAssetType: "w9",
      readRecipientRefs: [principalRef],
      signRecipientRefs: [principalRef],
      readOnly: false,
    },
    {
      ref: "document:ach_authorization",
      type: "ach_authorization",
      sourceAssetType: "ach_authorization",
      readRecipientRefs: [principalRef],
      signRecipientRefs: [principalRef],
      readOnly: false,
    },
  ];

  return {
    policyKind: "desired_policy_only",
    dispatchEnabled: false,
    recipients,
    documents,
    readiness,
    countersignerRelease: countersignerGate(parsed, readiness),
  };
}