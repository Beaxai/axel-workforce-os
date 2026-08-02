/**
 * SEC-1 verification harness — proves multi-tenant scoping isolates tenants.
 *
 * Seeds a broker agency (1 BROKER + 2 AGENTs), a foreign agency, a client
 * (employer) org and a carrier org, wires deals to each, then asserts
 * `visibleDealCondition` returns exactly the row set the SEC-1 matrix allows
 * for every actor shape. Runs inside ONE transaction and ROLLS BACK — zero
 * permanent rows on any environment.
 *
 * Run:  pnpm --filter @workspace/api-server exec tsx src/scripts/verify-scope.ts
 * Exit: 0 = all checks passed, 1 = at least one failed.
 */
import {
  db,
  contactsTable,
  dealsTable,
  accountsTable,
  organizationsTable,
  orgMembersTable,
  quotesTable,
  usersTable,
} from "@workspace/db";
import { and, inArray, isNull } from "drizzle-orm";
import {
  canSeeAccount,
  canSeeDeal,
  dealOwnershipForActor,
  visibleAccountCondition,
  visibleContactCondition,
  visibleDealCondition,
  visibleDealIds,
  type Actor,
  type Dbc,
} from "../lib/scope";

type Result = { name: string; pass: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
}

/** Sentinel thrown to force the verification transaction to roll back. */
class Rollback extends Error {}

/** The deal ids the condition admits, as a sorted array (empty = sees nothing). */
async function visibleIds(actor: Actor, tx: Dbc): Promise<string[]> {
  const cond = await visibleDealCondition(actor, tx);
  if (cond === null) return ["<ALL>"];
  const rows = await tx.select({ id: dealsTable.id }).from(dealsTable).where(cond);
  return rows.map((r) => r.id).sort();
}

const same = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

async function main() {
  const stamp = Date.now();
  const mail = (tag: string) => `sec1-${tag}-${stamp}@verify.invalid`;

  try {
    await db.transaction(async (tx) => {
      // ---- seed: two agencies, one client org, one carrier org ---------------
      const [brokerOrg, foreignOrg, clientOrg, carrierOrg] = await tx
        .insert(organizationsTable)
        .values([
          { name: `SEC1 Broker Agency ${stamp}`, type: "AGENCY" },
          { name: `SEC1 Foreign Agency ${stamp}`, type: "AGENCY" },
          { name: `SEC1 Client Co ${stamp}`, type: "EMPLOYER" },
          { name: `SEC1 Carrier ${stamp}`, type: "CARRIER" },
        ])
        .returning({ id: organizationsTable.id });

      const [broker, agentA, agentB, foreignAgent, employerUser] = await tx
        .insert(usersTable)
        .values([
          { email: mail("broker"), firstName: "Bree", lastName: "Broker" },
          { email: mail("agent-a"), firstName: "Ann", lastName: "Agent" },
          { email: mail("agent-b"), firstName: "Bob", lastName: "Agent" },
          { email: mail("foreign"), firstName: "Fay", lastName: "Foreign" },
          { email: mail("employer"), firstName: "Emp", lastName: "Owner" },
        ])
        .returning({ id: usersTable.id });

      await tx.insert(orgMembersTable).values([
        { userId: broker!.id, orgId: brokerOrg!.id, role: "BROKER" },
        { userId: agentA!.id, orgId: brokerOrg!.id, role: "AGENT" },
        { userId: agentB!.id, orgId: brokerOrg!.id, role: "AGENT" },
        { userId: foreignAgent!.id, orgId: foreignOrg!.id, role: "AGENT" },
        { userId: employerUser!.id, orgId: clientOrg!.id, role: "EMPLOYER" },
      ]);

      const [account, accountForeign] = await tx
        .insert(accountsTable)
        .values([{ businessName: `SEC1 Account ${stamp}` }, { businessName: `SEC1 Foreign Account ${stamp}` }])
        .returning({ id: accountsTable.id });

      const [dealA1, dealA2, dealForeign] = await tx
        .insert(dealsTable)
        .values([
          {
            referenceCode: `SEC1-A1-${stamp}`,
            businessName: "Agent A's deal (for the client org)",
            accountId: account!.id,
            producingAgentId: agentA!.id,
            orgId: clientOrg!.id,
          },
          {
            referenceCode: `SEC1-A2-${stamp}`,
            businessName: "Agent B's deal (same agency)",
            accountId: account!.id,
            producingAgentId: agentB!.id,
          },
          {
            referenceCode: `SEC1-F1-${stamp}`,
            businessName: "Foreign agency's deal",
            accountId: accountForeign!.id,
            producingAgentId: foreignAgent!.id,
          },
        ])
        .returning({ id: dealsTable.id });

      // ---- actors (shape mirrors resolveActor output) ------------------------
      const admin: Actor = { id: broker!.id, role: "ADMIN", orgIds: [] };
      const csa: Actor = { id: broker!.id, role: "CSA", orgIds: [] };
      const uw: Actor = { id: broker!.id, role: "UNDERWRITER", orgIds: [] };
      const actorAgentA: Actor = { id: agentA!.id, role: "AGENT", orgIds: [brokerOrg!.id] };
      const actorBroker: Actor = { id: broker!.id, role: "AGENT", orgIds: [brokerOrg!.id] };
      const actorForeign: Actor = { id: foreignAgent!.id, role: "AGENT", orgIds: [foreignOrg!.id] };
      const actorEmployer: Actor = { id: employerUser!.id, role: "EMPLOYER", orgIds: [clientOrg!.id] };
      const actorEmployerNoOrg: Actor = { id: employerUser!.id, role: "EMPLOYER", orgIds: [] };
      const actorCarrier: Actor = { id: broker!.id, role: "CARRIER", orgIds: [carrierOrg!.id] };
      const actorUnknown: Actor = { id: broker!.id, role: "SOMETHING_NEW", orgIds: [brokerOrg!.id] };

      // ---- the matrix --------------------------------------------------------
      check(
        "internal actors (ADMIN/CSA/UNDERWRITER) → null (see-all) condition",
        (await visibleDealCondition(admin, tx)) === null &&
          (await visibleDealCondition(csa, tx)) === null &&
          (await visibleDealCondition(uw, tx)) === null,
      );

      const agentSees = await visibleIds(actorAgentA, tx);
      check(
        "AGENT sees exactly their own produced deals",
        same(agentSees, [dealA1!.id]),
        `got ${agentSees.length} rows`,
      );

      const brokerSees = await visibleIds(actorBroker, tx);
      check(
        "BROKER sees every deal produced by any agent in their org, no others",
        same(brokerSees, [dealA1!.id, dealA2!.id]),
        `got ${brokerSees.length} rows`,
      );

      const foreignSees = await visibleIds(actorForeign, tx);
      check(
        "foreign agent sees 0 of the other agency's deals",
        same(foreignSees, [dealForeign!.id]) &&
          !foreignSees.includes(dealA1!.id) &&
          !foreignSees.includes(dealA2!.id),
        `got ${foreignSees.length} rows`,
      );

      const employerSees = await visibleIds(actorEmployer, tx);
      check(
        "EMPLOYER sees only deals where org_id = their org",
        same(employerSees, [dealA1!.id]),
        `got ${employerSees.length} rows`,
      );

      check("EMPLOYER with no org membership sees nothing (fail closed)", same(await visibleIds(actorEmployerNoOrg, tx), []));
      check("CARRIER sees nothing (fail closed pending carrier spec)", same(await visibleIds(actorCarrier, tx), []));
      check("unknown role sees nothing (fail closed)", same(await visibleIds(actorUnknown, tx), []));

      const idsForAgent = await visibleDealIds(actorAgentA, tx);
      check(
        "visibleDealIds mirrors the condition (child-table scoping input)",
        idsForAgent !== null && same(idsForAgent, [dealA1!.id]),
      );
      check("visibleDealIds → null for internal (no filtering)", (await visibleDealIds(admin, tx)) === null);

      // ---- Task 2: the deals-list composition (archived filter AND scope) ----
      // Seeded LAST so the raw-condition checks above keep their expected sets.
      const [archivedDeal] = await tx
        .insert(dealsTable)
        .values({
          referenceCode: `SEC1-A1X-${stamp}`,
          businessName: "Agent A's ARCHIVED deal",
          accountId: account!.id,
          producingAgentId: agentA!.id,
          archivedAt: new Date(),
        })
        .returning({ id: dealsTable.id });

      const listFor = async (actor: Actor) => {
        const cond = await visibleDealCondition(actor, tx);
        const where = cond ? and(isNull(dealsTable.archivedAt), cond) : isNull(dealsTable.archivedAt);
        return (await tx.select({ id: dealsTable.id }).from(dealsTable).where(where)).map((r) => r.id);
      };

      const agentList = await listFor(actorAgentA);
      check(
        "deals list composition: agent sees own non-archived deals only",
        same(agentList, [dealA1!.id]) && !agentList.includes(archivedDeal!.id),
        `got ${agentList.length} rows`,
      );
      const foreignList = await listFor(actorForeign);
      check(
        "deals list composition: foreign agent sees 0 of the other agency's book",
        same(foreignList, [dealForeign!.id]),
        `got ${foreignList.length} rows`,
      );

      // ---- Task 3: contacts (org match OR parent-deal match) -----------------
      const [contactClientOrg, contactOnDealA1, contactForeignDeal] = await tx
        .insert(contactsTable)
        .values([
          { firstName: "Cora", lastName: "ClientOrg", orgId: clientOrg!.id },
          { firstName: "Dana", lastName: "OnDealA1", dealId: dealA1!.id },
          { firstName: "Fern", lastName: "ForeignDeal", dealId: dealForeign!.id },
        ])
        .returning({ id: contactsTable.id });

      const contactsFor = async (actor: Actor) => {
        const cond = await visibleContactCondition(actor, tx);
        if (cond === null) return ["<ALL>"];
        return (await tx.select({ id: contactsTable.id }).from(contactsTable).where(cond))
          .map((r) => r.id)
          .sort();
      };

      check("contacts: internal → see all", same(await contactsFor(admin), ["<ALL>"]));
      const agentContacts = await contactsFor(actorAgentA);
      check(
        "contacts: agent sees contacts on their own deals only",
        same(agentContacts, [contactOnDealA1!.id]),
        `got ${agentContacts.length} rows`,
      );
      const employerContacts = await contactsFor(actorEmployer);
      check(
        "contacts: employer sees own-org contacts + contacts on their org's deals",
        same(employerContacts, [contactClientOrg!.id, contactOnDealA1!.id]),
        `got ${employerContacts.length} rows`,
      );
      const foreignContacts = await contactsFor(actorForeign);
      check(
        "contacts: foreign agent sees none of the other tenants' contacts",
        same(foreignContacts, [contactForeignDeal!.id]),
        `got ${foreignContacts.length} rows`,
      );
      check("contacts: carrier sees nothing (fail closed)", same(await contactsFor(actorCarrier), []));

      // ---- Task 4: parent-deal guard + child-table list composition ----------
      check(
        "canSeeDeal: agent → own deal yes, foreign deal no",
        (await canSeeDeal(actorAgentA, dealA1!.id, tx)) === true &&
          (await canSeeDeal(actorAgentA, dealForeign!.id, tx)) === false,
      );
      check(
        "canSeeDeal: employer → org's deal yes; carrier → no (fail closed)",
        (await canSeeDeal(actorEmployer, dealA1!.id, tx)) === true &&
          (await canSeeDeal(actorCarrier, dealA1!.id, tx)) === false,
      );
      check("canSeeDeal: internal → any deal", (await canSeeDeal(admin, dealForeign!.id, tx)) === true);
      check(
        "canSeeDeal: null dealId is fail-closed for externals, open for internal",
        (await canSeeDeal(actorAgentA, null, tx)) === false && (await canSeeDeal(admin, null, tx)) === true,
      );

      const [quoteA1, quoteForeign] = await tx
        .insert(quotesTable)
        .values([{ dealId: dealA1!.id }, { dealId: dealForeign!.id }])
        .returning({ id: quotesTable.id });

      const quotesFor = async (actor: Actor) => {
        const dealIds = await visibleDealIds(actor, tx);
        if (dealIds === null) return ["<ALL>"];
        if (dealIds.length === 0) return [];
        return (
          await tx.select({ id: quotesTable.id }).from(quotesTable).where(inArray(quotesTable.dealId, dealIds))
        )
          .map((r) => r.id)
          .sort();
      };

      const agentQuotes = await quotesFor(actorAgentA);
      check(
        "quotes list composition: agent sees only quotes on their deals",
        same(agentQuotes, [quoteA1!.id]) && !agentQuotes.includes(quoteForeign!.id),
        `got ${agentQuotes.length} rows`,
      );
      check("quotes list composition: carrier sees zero quotes (fail closed)", same(await quotesFor(actorCarrier), []));

      // ---- Task 5: accounts (visible iff ≥1 visible deal) --------------------
      const accountsFor = async (actor: Actor) => {
        const cond = await visibleAccountCondition(actor, tx);
        if (cond === null) return ["<ALL>"];
        return (await tx.select({ id: accountsTable.id }).from(accountsTable).where(cond))
          .map((r) => r.id)
          .sort();
      };

      check("accounts: internal → see all", same(await accountsFor(admin), ["<ALL>"]));
      const agentAccounts = await accountsFor(actorAgentA);
      check(
        "accounts: agent sees only accounts carrying their deals",
        same(agentAccounts, [account!.id]) && !agentAccounts.includes(accountForeign!.id),
        `got ${agentAccounts.length} rows`,
      );
      const foreignAccounts = await accountsFor(actorForeign);
      check(
        "accounts: foreign agent sees only their own account",
        same(foreignAccounts, [accountForeign!.id]),
        `got ${foreignAccounts.length} rows`,
      );
      check("accounts: carrier sees zero accounts (fail closed)", same(await accountsFor(actorCarrier), []));
      check(
        "canSeeAccount: agent → own yes, foreign no",
        (await canSeeAccount(actorAgentA, account!.id, tx)) === true &&
          (await canSeeAccount(actorAgentA, accountForeign!.id, tx)) === false,
      );

      // ---- Task 6: ownership stamping at deal creation -----------------------
      const stampAgent = dealOwnershipForActor(actorAgentA);
      check(
        "ownership stamp: agent → producing_agent_id = self, no org",
        stampAgent.producingAgentId === agentA!.id && stampAgent.orgId === undefined,
      );
      const stampEmployer = dealOwnershipForActor(actorEmployer);
      check(
        "ownership stamp: employer → org_id = their org, no agent",
        stampEmployer.orgId === clientOrg!.id && stampEmployer.producingAgentId === undefined,
      );
      check(
        "ownership stamp: internal → nothing (ownership assigned explicitly)",
        Object.keys(dealOwnershipForActor(admin)).length === 0,
      );

      const [stamped] = await tx
        .insert(dealsTable)
        .values({
          referenceCode: `SEC1-NEW-${stamp}`,
          businessName: "Freshly created by Agent A",
          accountId: account!.id,
          ...dealOwnershipForActor(actorAgentA),
        })
        .returning({ id: dealsTable.id });
      check(
        "created deal: immediately visible to its producing agent, invisible to a foreign agent",
        (await canSeeDeal(actorAgentA, stamped!.id, tx)) === true &&
          (await canSeeDeal(actorForeign, stamped!.id, tx)) === false,
      );

      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }

  // ---- report -------------------------------------------------------------
  let failed = 0;
  for (const r of results) {
    const mark = r.pass ? "PASS" : "FAIL";
    if (!r.pass) failed++;
    console.log(`[${mark}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed (all rows rolled back)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
