const BASE = process.env.API_URL || "http://localhost:8080/api";

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${testName} — ${detail}`);
    failed++;
  }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function run() {
  console.log("\n=== Rating Engine Tests ===\n");

  console.log("Test 1: Standard WC Quote (CA, 8810, $500k, EMod 1.0, Schedule 1.0, not PEO)");
  const t1 = await post("/rate/wc", {
    state: "CA", classCode: "8810", annualPayroll: 500000, eMod: 1.0, scheduleRating: 1.0, isPEO: false,
  });
  assert(t1.data.success === true, "Returns success", `got ${t1.data.success}`);
  assert(t1.data.data.result.wcPremium > 500, "Premium > $500", `got ${t1.data.data?.result?.wcPremium}`);
  const test1Premium = t1.data.data.result.wcPremium;
  console.log(`    Premium: $${test1Premium}\n`);

  console.log("Test 2: Minimum Premium Trigger ($1,000 payroll)");
  const t2 = await post("/rate/wc", {
    state: "CA", classCode: "8810", annualPayroll: 1000, eMod: 1.0, scheduleRating: 1.0, isPEO: false,
  });
  assert(t2.data.success === true, "Returns success", `got ${t2.data.success}`);
  assert(t2.data.data.result.wcPremium === 500, "Premium = $500 (minimum)", `got ${t2.data.data?.result?.wcPremium}`);
  assert(t2.data.data.calculation.minimumPremiumApplied === true, "Minimum premium flag set", `got ${t2.data.data?.calculation?.minimumPremiumApplied}`);
  console.log(`    Premium: $${t2.data.data.result.wcPremium}\n`);

  console.log("Test 3: PEO Discount (same as Test 1 but isPEO: true)");
  const t3 = await post("/rate/wc", {
    state: "CA", classCode: "8810", annualPayroll: 500000, eMod: 1.0, scheduleRating: 1.0, isPEO: true,
  });
  assert(t3.data.success === true, "Returns success", `got ${t3.data.success}`);
  const expectedPEO = Math.round(test1Premium * 0.90 * 100) / 100;
  assert(t3.data.data.result.wcPremium === expectedPEO, `Premium = ${expectedPEO} (test1 × 0.90)`, `got ${t3.data.data?.result?.wcPremium}`);
  assert(t3.data.data.calculation.peoDiscountApplied === true, "PEO discount flag set", `got ${t3.data.data?.calculation?.peoDiscountApplied}`);
  console.log(`    Premium: $${t3.data.data.result.wcPremium} (10% discount from $${test1Premium})\n`);

  console.log("Test 4: WFS PEPM ($500k payroll, 25 employees)");
  const t4 = await post("/rate/wfs", { annualPayroll: 500000, headcount: 25 });
  assert(t4.data.success === true, "Returns success", `got ${t4.data.success}`);
  assert(t4.data.data.result.monthlyWFSFee === 833.33, "Monthly WFS fee = $833.33", `got ${t4.data.data?.result?.monthlyWFSFee}`);
  assert(t4.data.data.result.pepm === 33.33, "PEPM = $33.33", `got ${t4.data.data?.result?.pepm}`);
  console.log(`    Monthly fee: $${t4.data.data.result.monthlyWFSFee}, PEPM: $${t4.data.data.result.pepm}\n`);

  console.log("Test 5: Invalid Class Code");
  const t5 = await post("/rate/wc", {
    state: "CA", classCode: "9999999", annualPayroll: 500000, eMod: 1.0, scheduleRating: 1.0, isPEO: false,
  });
  assert(t5.data.success === false, "Returns failure", `got ${t5.data.success}`);
  assert(t5.data.error.includes("No rate found"), "Error mentions no rate found", `got "${t5.data.error}"`);
  console.log(`    Error: ${t5.data.error}\n`);

  console.log("Test 6: Invalid EMod (5.0)");
  const t6 = await post("/rate/wc", {
    state: "CA", classCode: "8810", annualPayroll: 500000, eMod: 5.0, scheduleRating: 1.0, isPEO: false,
  });
  assert(t6.status === 400, "Returns 400", `got ${t6.status}`);
  assert(t6.data.success === false, "Returns failure", `got ${t6.data.success}`);
  assert(t6.data.error.includes("eMod"), "Error mentions eMod", `got "${t6.data.error}"`);
  console.log(`    Error: ${t6.data.error}\n`);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
