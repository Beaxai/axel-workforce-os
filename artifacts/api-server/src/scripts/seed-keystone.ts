/**
 * One-off seed: broker Gershom Polanco (AGENT) + Keystone Construction deal.
 *
 * Creates (idempotently, keyed on email / business name):
 *  - user gershom@polancobrokerage.com with headshot avatar + login credential
 *  - Keystone Construction account + INDICATION-stage deal (WC + full PEO)
 *  - quote with a 2-location workforce profile (CT + upstate NY, 40 employees)
 *  - a submission activity entry attributed to Gershom
 *
 * Run with: pnpm --filter @workspace/api-server exec tsx src/scripts/seed-keystone.ts
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
  accountsTable,
  dealsTable,
  quotesTable,
  activityLogTable,
} from "@workspace/db";
import { hashPassword } from "../lib/auth";

const AXEL_ORG = "00000000-0000-0000-0000-000000000001"; // Axel Workforce Solutions
const PASSWORD = process.env.SEED_USER_PASSWORD || "Password123!";

const EMAIL = "gershom@polancobrokerage.com";
const BUSINESS = "Keystone Construction";

// Two-location workforce profile: everything needed to build a house from the
// ground up — office staff, sitework, foundation, framing, roofing, MEP trades
// and finish work. 40 employees total, ~$3.0M payroll.
const WORKFORCE_PROFILE = {
  eMod: 1.0,
  isPEO: true,
  scheduleRating: 1.0,
  locations: [
    {
      state: "CT",
      zip: "06103", // Hartford, CT
      classCodes: [
        { classCode: "8810", description: "Clerical Office Employees", fullTimeEmployees: 2, partTimeEmployees: 0, annualPayroll: 130000 },
        { classCode: "6217", description: "Excavation & Land Grading", fullTimeEmployees: 3, partTimeEmployees: 0, annualPayroll: 240000 },
        { classCode: "5022", description: "Masonry & Foundation Work", fullTimeEmployees: 3, partTimeEmployees: 0, annualPayroll: 225000 },
        { classCode: "5645", description: "Carpentry — Detached Dwellings", fullTimeEmployees: 7, partTimeEmployees: 0, annualPayroll: 525000 },
        { classCode: "5551", description: "Roofing — All Kinds", fullTimeEmployees: 3, partTimeEmployees: 0, annualPayroll: 240000 },
        { classCode: "5190", description: "Electrical Wiring — Within Buildings", fullTimeEmployees: 2, partTimeEmployees: 0, annualPayroll: 170000 },
      ],
    },
    {
      state: "NY",
      zip: "12207", // Albany, NY (upstate)
      classCodes: [
        { classCode: "8810", description: "Clerical Office Employees", fullTimeEmployees: 2, partTimeEmployees: 0, annualPayroll: 125000 },
        { classCode: "5645", description: "Carpentry — Detached Dwellings", fullTimeEmployees: 6, partTimeEmployees: 0, annualPayroll: 450000 },
        { classCode: "5183", description: "Plumbing NOC & Drivers", fullTimeEmployees: 3, partTimeEmployees: 0, annualPayroll: 255000 },
        { classCode: "5537", description: "HVAC Installation & Service", fullTimeEmployees: 3, partTimeEmployees: 0, annualPayroll: 250000 },
        { classCode: "5474", description: "Painting & Decorating NOC", fullTimeEmployees: 4, partTimeEmployees: 0, annualPayroll: 260000 },
        { classCode: "5221", description: "Concrete Work — Flatwork/Driveways", fullTimeEmployees: 2, partTimeEmployees: 0, annualPayroll: 150000 },
      ],
    },
  ],
};

function profileTotals() {
  let payroll = 0;
  let headcount = 0;
  for (const loc of WORKFORCE_PROFILE.locations) {
    for (const cc of loc.classCodes) {
      payroll += cc.annualPayroll;
      headcount += cc.fullTimeEmployees + cc.partTimeEmployees;
    }
  }
  return { payroll, headcount };
}

async function main() {
  const { payroll, headcount } = profileTotals();
  console.log(`Profile totals: ${headcount} employees, $${payroll.toLocaleString()} payroll`);

  // --- 1. Broker user -------------------------------------------------------
  let [gershom] = await db.select().from(usersTable).where(eq(usersTable.email, EMAIL));
  if (!gershom) {
    [gershom] = await db
      .insert(usersTable)
      .values({
        email: EMAIL,
        firstName: "Gershom",
        lastName: "Polanco",
        status: "active",
        avatarUrl: "/images/avatars/gershom_polanco.jpg",
      })
      .returning();
    console.log("Created user", gershom.id);
  } else {
    await db
      .update(usersTable)
      .set({ avatarUrl: "/images/avatars/gershom_polanco.jpg", status: "active" })
      .where(eq(usersTable.id, gershom.id));
    console.log("User exists", gershom.id);
  }

  const passwordHash = await hashPassword(PASSWORD);
  const [cred] = await db.select().from(userCredentialsTable).where(eq(userCredentialsTable.userId, gershom.id));
  if (cred) {
    await db.update(userCredentialsTable).set({ passwordHash, updatedAt: new Date() }).where(eq(userCredentialsTable.userId, gershom.id));
  } else {
    await db.insert(userCredentialsTable).values({ userId: gershom.id, passwordHash });
  }

  const [membership] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, gershom.id));
  if (!membership) {
    await db.insert(orgMembersTable).values({ userId: gershom.id, orgId: AXEL_ORG, role: "AGENT", isPrimaryOrg: true });
  }

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, gershom.id));
  if (!profile) {
    await db.insert(userProfilesTable).values({
      userId: gershom.id,
      title: "Broker, Polanco Brokerage Group",
      roleMetadata: { agency: "Polanco Brokerage Group", licensedStates: ["CT", "NY"] },
    });
  }

  // --- 2. Account -----------------------------------------------------------
  let [account] = await db.select().from(accountsTable).where(eq(accountsTable.businessName, BUSINESS));
  if (!account) {
    [account] = await db
      .insert(accountsTable)
      .values({
        businessName: BUSINESS,
        legalName: "Keystone Construction LLC",
        vertical: "Construction",
        state: "CT",
        annualPayroll: String(payroll),
        headcount,
        primaryContact: "Gershom Polanco (Broker)",
        contactEmail: EMAIL,
        entityType: "LLC",
        productType: "PEO",
        clientStage: "Prospect",
        notes: "Residential general contractor — full ground-up home builds across Hartford CT and the Albany NY area. Interested in workers' comp + full PEO workforce solution. Submitted by broker Gershom Polanco.",
      })
      .returning();
    console.log("Created account", account.id);
  }

  // --- 3. Deal (INDICATION) -------------------------------------------------
  const existingDeals = await db.select().from(dealsTable).where(eq(dealsTable.businessName, BUSINESS));
  let deal = existingDeals[0];
  if (!deal) {
    const ref = `DL-${Date.now().toString(36).toUpperCase()}`;
    [deal] = await db
      .insert(dealsTable)
      .values({
        referenceCode: ref,
        accountId: account.id,
        orgId: AXEL_ORG,
        businessName: BUSINESS,
        stage: "INDICATION",
        productType: "PEO",
        vertical: "Construction",
        verticalId: "construction",
        state: "CT",
        employeeCountFt: headcount,
        employeeCountPt: 0,
        annualPayroll: String(payroll),
        emod: "1.000",
        multipleLocations: true,
        numberOfLocations: 2,
        multipleStates: true,
        statesOfOperation: ["CT", "NY"],
        entityType: "LLC",
        yearsInBusiness: 12,
        descriptionOfOperations:
          "Residential general contractor performing full ground-up home construction: excavation, foundations, framing, roofing, electrical, plumbing, HVAC, concrete flatwork and finish painting. Two crews — Hartford, CT and Albany, NY (upstate). Seeking workers' compensation coverage plus a full PEO workforce solution.",
        producingAgentId: gershom.id,
        metadata: { submittedBy: "broker", brokerName: "Gershom Polanco", interest: ["WC", "PEO"] },
      })
      .returning();
    console.log("Created deal", deal.id, ref);
  } else {
    console.log("Deal exists", deal.id);
  }

  // --- 4. Quote with workforce profile --------------------------------------
  const [existingQuote] = await db.select().from(quotesTable).where(eq(quotesTable.dealId, deal.id));
  if (!existingQuote) {
    const [quote] = await db
      .insert(quotesTable)
      .values({
        dealId: deal.id,
        phase: "INDICATION",
        status: "DRAFT",
        state: "CT",
        annualPayroll: String(payroll),
        headcount,
        eMod: "1.00",
        scheduleRating: "1.00",
        isPeo: true,
        workforceProfile: WORKFORCE_PROFILE,
      })
      .returning();
    console.log("Created quote", quote.id);
  }

  // --- 5. Submission activity attributed to Gershom --------------------------
  const acts = await db.select().from(activityLogTable).where(eq(activityLogTable.dealId, deal.id));
  if (acts.length === 0) {
    await db.insert(activityLogTable).values({
      dealId: deal.id,
      entityType: "deal",
      entityId: deal.id,
      eventType: "submission_submitted",
      description: "Submission received from broker Gershom Polanco — Keystone Construction (WC + full PEO workforce solution, 40 employees across Hartford CT and Albany NY).",
      createdBy: gershom.id,
      metadata: { userId: gershom.id, userName: "Gershom Polanco", role: "AGENT" },
    });
    console.log("Logged submission activity");
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
