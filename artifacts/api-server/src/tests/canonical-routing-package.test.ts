import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cannabisApplicationAnswersSchema,
  routableCannabisApplicationAnswersSchema,
} from "@workspace/cannabis-application";
import {
  buildCanonicalRatingInput,
  findCanonicalIndicationMismatches,
  hashCanonicalApplicationAnswers,
} from "../lib/canonical-routing-package.js";

const generalAnswers = Object.fromEntries(
  Array.from({ length: 24 }, (_, index) => [
    `q${index + 1}_placeholder`,
    "no",
  ]),
);

function makeAnswers() {
  return cannabisApplicationAnswersSchema.parse({
    legalBusinessName: "Canonical Routing Fixture",
    fein: "12-3456789",
    entityType: "LLC",
    businessStreetAddress: "100 Main Street",
    businessCity: "Los Angeles",
    businessState: "CA",
    businessZip: "90001",
    primaryContactName: "Test Contact",
    contactEmail: "canonical@example.test",
    contactPhone: "555-555-0100",
    primaryClassOfBusiness: "Clerical",
    totalEmployeesAll: "3",
    annualPayroll: "150000",
    experienceModifier: "1.05",
    locations: [
      {
        loc: "1",
        streetAddress: "100 Main Street",
        suite: "",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
      },
    ],
    classCodes: [
      {
        loc: "1",
        classCode: "8810",
        description: "Clerical",
        fullTime: "3",
        partTime: "",
        annualPayroll: "150000",
      },
    ],
    signatoryName: "Test Contact",
    signatoryDate: "2026-08-22",
    q1_aircraftWatercraft: "no",
    q2_hazardousMaterial: "no",
    q3_undergroundOrAbove15ft: "no",
    q4_workOnWater: "no",
    q5_otherBusiness: "no",
    q6_subcontractorsUsed: "no",
    q7_workSubletWithoutCoi: "no",
    q8_writtenSafetyProgram: "yes",
    q9_groupTransportation: "no",
    q10_employeesUnder16OrOver60: "no",
    q11_seasonalEmployees: "no",
    q12_volunteerLabor: "no",
    q13_employeesWithHandicaps: "no",
    q14_outOfStateTravel: "no",
    q15_athleticTeamsSponsored: "no",
    q16_physicalsRequired: "yes",
    q17_otherInsurance: "no",
    q18_priorCoverageDeclined: "no",
    q19_employeeHealthPlans: "yes",
    q20_workForOtherBusinesses: "no",
    q21_leasedEmployees: "no",
    q22_workFromHome: "no",
    q23_taxLiensOrBankruptcy: "no",
    q24_unpaidWcPremium: "no",
    ...generalAnswers,
  });
}

describe("canonical routing package", () => {
  it("derives the rated units and modifiers from the validated application", () => {
    const answers = makeAnswers();
    assert.equal(
      routableCannabisApplicationAnswersSchema.safeParse(answers).success,
      true,
    );
    const ratingInput = buildCanonicalRatingInput(answers, {
      productLane: "WC",
      effectiveDate: "2026-09-01",
      vertical: "Cannabis",
      scheduleRating: 0.95,
      applicationSnapshotHash: hashCanonicalApplicationAnswers(answers),
    });
    assert.deepEqual(ratingInput.states, ["CA"]);
    assert.deepEqual(ratingInput.classCodes, ["8810"]);
    assert.deepEqual(ratingInput.ratingUnits, [
      { state: "CA", classCode: "8810", annualPayroll: 150000 },
    ]);
    assert.equal(ratingInput.annualPayroll, 150000);
    assert.equal(ratingInput.headcount, 3);
    assert.equal(ratingInput.eMod, 1.05);
  });

  it("rejects divergent indication state, class, payroll, headcount, and eMod facts", () => {
    const answers = makeAnswers();
    const mismatches = findCanonicalIndicationMismatches(answers, {
      statesOfOperation: ["TX"],
      totalPayroll: 200000,
      totalEmployees: 4,
      experienceMod: 1.2,
      workforceProfile: {
        locations: [
          {
            state: "TX",
            classCodes: [
              { classCode: "5183", annualPayroll: 200000 },
            ],
          },
        ],
      },
    });
    assert.deepEqual(mismatches.sort(), [
      "experienceMod",
      "statesOfOperation",
      "totalEmployees",
      "totalPayroll",
      "workforceProfile locations/class codes/payroll",
    ]);
  });
});