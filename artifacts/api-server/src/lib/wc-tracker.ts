/**
 * P5-WC — Curtis's WC Implementation Tracker (State Doc v2.4 §6D).
 * The four phases are system-owned: admins may add tasks around them but cannot
 * delete or rename them. Code targets them via these stable keys.
 */
export const WC_TEMPLATE_NAME = "WC Implementation Tracker";

export const WC_PHASE_KEYS = {
  CARRIER_ACCEPTANCE: "WC_PHASE_CARRIER_ACCEPTANCE",
  POLICY_ISSUANCE: "WC_PHASE_POLICY_ISSUANCE",
  KIT_DELIVERY: "WC_PHASE_KIT_DELIVERY",
  BILLING_SETUP: "WC_PHASE_BILLING_SETUP",
} as const;

export const WC_TASK_KEYS = {
  CARRIER_ACCEPTANCE: "WC_TASK_CARRIER_ACCEPTANCE",
  POLICY_ISSUANCE: "WC_TASK_POLICY_ISSUANCE",
  KIT_DELIVERY: "WC_TASK_KIT_DELIVERY",
  BILLING_SETUP: "WC_TASK_BILLING_SETUP",
} as const;
