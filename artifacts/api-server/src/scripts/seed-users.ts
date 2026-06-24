/**
 * Seed the eight role-based demo users with real credentials.
 *
 * Idempotent: re-running upserts each user, (re)sets their password credential,
 * and ensures a primary org_members row with the correct role.
 *
 * Password: SEED_USER_PASSWORD env var, or the documented default below.
 * Run with:  pnpm --filter @workspace/api-server run seed:users
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  usersTable,
  orgMembersTable,
  userCredentialsTable,
  userProfilesTable,
} from "@workspace/db";
import { hashPassword, PARTY_ROLES, type PartyRole } from "../lib/auth";

const AXEL_ORG = "00000000-0000-0000-0000-000000000001"; // Axel Workforce Solutions
const ACME_ORG = "a40fa7c6-bfb4-4b47-bb0a-ded23a0dc0d8"; // Acme Corp (employer)

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "Password123!";

interface SeedUser {
  firstName: string;
  lastName: string;
  email: string;
  role: PartyRole;
  orgId: string;
}

const SEED_USERS: SeedUser[] = [
  { firstName: "Sarah", lastName: "Mitchell", email: "sarah@axelwos.com", role: "ADMIN", orgId: AXEL_ORG },
  { firstName: "James", lastName: "Chen", email: "james@axelwos.com", role: "UNDERWRITER", orgId: AXEL_ORG },
  { firstName: "Maria", lastName: "Rodriguez", email: "maria@axelwos.com", role: "CSA", orgId: AXEL_ORG },
  { firstName: "Robert", lastName: "Banks", email: "robert@broker.com", role: "AGENT", orgId: AXEL_ORG },
  { firstName: "Lisa", lastName: "Thompson", email: "lisa@acmecorp.com", role: "EMPLOYER", orgId: ACME_ORG },
  { firstName: "David", lastName: "Park", email: "david@carrier.com", role: "CARRIER", orgId: AXEL_ORG },
  { firstName: "Karen", lastName: "White", email: "karen@peopartner.com", role: "PEO", orgId: AXEL_ORG },
  { firstName: "Mike", lastName: "Johnson", email: "mike@vendor.com", role: "VENDOR", orgId: AXEL_ORG },
];

async function upsertUser(seed: SeedUser): Promise<string> {
  const email = seed.email.toLowerCase().trim();
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing[0]) {
    await db
      .update(usersTable)
      .set({ firstName: seed.firstName, lastName: seed.lastName, status: "active" })
      .where(eq(usersTable.id, existing[0].id));
    return existing[0].id;
  }
  const [created] = await db
    .insert(usersTable)
    .values({ email, firstName: seed.firstName, lastName: seed.lastName, status: "active" })
    .returning();
  return created.id;
}

async function upsertCredential(userId: string, passwordHash: string) {
  const existing = await db
    .select()
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, userId));
  if (existing[0]) {
    await db
      .update(userCredentialsTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(userCredentialsTable.userId, userId));
  } else {
    await db.insert(userCredentialsTable).values({ userId, passwordHash });
  }
}

// Role-specific profile demo data. `role_metadata` is the single jsonb bag for
// fields with no first-class home (see user_profiles schema docs). AGENT
// agency/license/E&O lives here as a fallback when no agent_registration is
// linked by user_id; the book summary is always computed live from deals.
const ROLE_PROFILES: Record<PartyRole, { title: string; roleMetadata: Record<string, unknown> }> = {
  ADMIN: { title: "Platform Administrator", roleMetadata: { department: "Operations", territory: "National" } },
  UNDERWRITER: {
    title: "Senior Underwriter",
    roleMetadata: { carrier: "Trean", lines: ["WC"], states: ["CA", "TX", "NY"], verticals: ["Cannabis", "Staffing"] },
  },
  CSA: { title: "Client Success Associate", roleMetadata: { department: "Client Success", territory: "West" } },
  AGENT: {
    title: "Producing Agent",
    roleMetadata: {
      agencyName: "Banks Insurance Group",
      licenseNumbers: ["CA-0H12345"],
      statesLicensed: ["CA", "NV"],
      linesOfAuthority: ["P&C"],
      eoCarrier: "CNA",
      eoExpiration: "2026-12-31",
    },
  },
  EMPLOYER: { title: "HR Director", roleMetadata: {} },
  CARRIER: { title: "Carrier Representative", roleMetadata: { company: "Pacific Carrier", programs: ["WC"] } },
  PEO: { title: "PEO Partner Manager", roleMetadata: { company: "Karen PEO Partners", programs: ["ASO", "PEO"] } },
  VENDOR: { title: "Vendor Contact", roleMetadata: { company: "Johnson Vendor Co" } },
};

async function upsertProfile(userId: string, role: PartyRole) {
  const profile = ROLE_PROFILES[role];
  const existing = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  const values = {
    title: profile.title,
    timezone: "America/Los_Angeles",
    roleMetadata: profile.roleMetadata,
    updatedAt: new Date(),
  };
  if (existing[0]) {
    await db.update(userProfilesTable).set(values).where(eq(userProfilesTable.userId, userId));
  } else {
    await db.insert(userProfilesTable).values({ userId, ...values });
  }
}

async function upsertMembership(userId: string, role: PartyRole, orgId: string) {
  const existing = await db
    .select()
    .from(orgMembersTable)
    .where(eq(orgMembersTable.userId, userId));
  if (existing[0]) {
    await db
      .update(orgMembersTable)
      .set({ role, orgId, isPrimaryOrg: true })
      .where(eq(orgMembersTable.id, existing[0].id));
  } else {
    await db.insert(orgMembersTable).values({ userId, orgId, role, isPrimaryOrg: true });
  }
}

async function main() {
  if (!PARTY_ROLES.every((r) => SEED_USERS.some((u) => u.role === r))) {
    throw new Error("Seed list is missing one or more roles");
  }
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  for (const seed of SEED_USERS) {
    const userId = await upsertUser(seed);
    await upsertCredential(userId, passwordHash);
    await upsertMembership(userId, seed.role, seed.orgId);
    await upsertProfile(userId, seed.role);
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${seed.role.padEnd(12)} ${seed.email}`);
  }
  // eslint-disable-next-line no-console
  console.log(`\nSeeded ${SEED_USERS.length} users. Shared password: ${DEFAULT_PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
