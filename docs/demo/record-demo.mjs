/**
 * Axel Workforce OS — automated demo video recorder.
 *
 * Drives the RUNNING app through the 10-beat demo flow and records a video
 * (.webm) of the actual UI, including the P4 pipeline changes. Silent by design;
 * an on-screen caption banner + a synthetic cursor make each beat self-explanatory.
 *
 * Run against the live local app (Replit dev server). Configure via env:
 *   DEMO_BASE_URL   base URL of the running app        (default http://localhost:5173)
 *   DEMO_EMAIL      admin login                         (default sarah@axelwos.com)
 *   DEMO_PASSWORD   admin password                      (default Password123!)
 *   DEMO_OUT        output dir for the video            (default ./docs/demo/out)
 *
 *   node docs/demo/record-demo.mjs
 *
 * NOTE FOR REPLIT: selectors below are best-effort (authored without DOM access).
 * Adapt each one to the real DOM so every beat succeeds — especially the
 * drag-to-Bound (beat 3) and open-deal-card (beat 5). Keep the try/catch guards so
 * the recording never aborts. Report the final video path when done.
 */
import { chromium } from "playwright";

const BASE = (process.env.DEMO_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const EMAIL = process.env.DEMO_EMAIL || "sarah@axelwos.com";
const PASSWORD = process.env.DEMO_PASSWORD || "Password123!";
const OUT = process.env.DEMO_OUT || "./docs/demo/out";

// Injected on every page: a synthetic cursor that follows real mouse events, a
// click ripple, and a bottom caption banner — so the silent video reads clearly.
const INIT = `
  (() => {
    const style = document.createElement('style');
    style.textContent = \`
      #demo-cursor{position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;
        border-radius:50%;border:2px solid #E91E8C;background:rgba(233,30,140,.25);pointer-events:none;
        transition:transform .05s linear;box-shadow:0 0 12px rgba(233,30,140,.6)}
      .demo-ripple{position:fixed;z-index:2147483646;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;
        background:rgba(233,30,140,.5);pointer-events:none;animation:demoR .5s ease-out forwards}
      @keyframes demoR{to{transform:scale(5);opacity:0}}
      #demo-cap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:2147483647;
        max-width:80vw;padding:12px 22px;border-radius:12px;pointer-events:none;
        font:600 16px/1.4 Inter,system-ui,sans-serif;color:#fff;text-align:center;
        background:linear-gradient(135deg,rgba(124,58,237,.95),rgba(233,30,140,.95));
        box-shadow:0 12px 40px rgba(0,0,0,.5);opacity:0;transition:opacity .3s}
      #demo-cap.on{opacity:1}
    \`;
    document.documentElement.appendChild(style);
    const cur = document.createElement('div'); cur.id='demo-cursor'; document.documentElement.appendChild(cur);
    const cap = document.createElement('div'); cap.id='demo-cap'; document.documentElement.appendChild(cap);
    window.__demoCaption = (t) => { cap.textContent = t; cap.classList.add('on'); };
    addEventListener('mousemove', e => { cur.style.left=e.clientX+'px'; cur.style.top=e.clientY+'px'; }, true);
    addEventListener('mousedown', e => { const r=document.createElement('div'); r.className='demo-ripple';
      r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; document.documentElement.appendChild(r);
      setTimeout(()=>r.remove(),500); }, true);
  })();
`;

async function main() {
  const browser = await chromium.launch({ slowMo: 350 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  await context.addInitScript(INIT);
  const page = await context.newPage();

  const cap = async (t, ms = 2600) => {
    try { await page.evaluate((x) => window.__demoCaption && window.__demoCaption(x), t); } catch {}
    await page.waitForTimeout(ms);
  };
  const beat = async (label, fn) => {
    try { await fn(); } catch (e) { console.warn(`⚠ beat "${label}" partial:`, e.message); }
  };
  const goto = async (path) => { await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {}); await page.waitForTimeout(900); };

  // 1 — Sign in
  await beat("login", async () => {
    await goto("/login");
    await cap("Signing in as Admin", 1800);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    await cap("Admin dashboard — role-based home screen");
  });

  // 2 — Pipeline: 10 stages
  await beat("pipeline", async () => {
    await goto("/pipeline");
    await cap("NEW in P4 — the 10-stage pipeline (State Document funnel)", 3200);
    // pan across the board to show all 10 columns
    await page.mouse.move(1200, 400);
    await page.evaluate(() => { const s = document.scrollingElement || document.body; }).catch(() => {});
    await page.mouse.wheel(600, 0).catch(() => {});
    await page.waitForTimeout(1600);
    await page.mouse.wheel(-600, 0).catch(() => {});
    await page.waitForTimeout(1000);
  });

  // 3 — Bound gate (best-effort drag; Replit: wire to real card + Bound column)
  await beat("bound-gate", async () => {
    await cap("Try to bind a deal that isn't ready…", 2400);
    const card = page.locator('[data-deal-card], [data-testid="deal-card"]').first();
    const bound = page.locator('[data-stage="BOUND"], :text("Bound")').first();
    if (await card.count()) {
      await card.dragTo(bound).catch(() => {});
      await page.waitForTimeout(800);
      // confirm the "Move to Bound?" dialog if present
      await page.click('button:has-text("Confirm"), button:has-text("Move")').catch(() => {});
      await page.waitForTimeout(1200);
      await cap("Server blocks it — submission incomplete. The card snaps back.", 3200);
    }
  });

  // 4 — Lost off-board
  await beat("lost", async () => {
    await page.click('button:has-text("Show Lost")').catch(() => {});
    await page.waitForTimeout(1000);
    await cap("Lost is an OUTCOME, off the board — it remembers its stage", 3200);
    await page.click('button:has-text("Hide Lost")').catch(() => {});
    await page.waitForTimeout(800);
  });

  // 5 — Deal card
  await beat("deal-card", async () => {
    const card = page.locator('[data-deal-card], [data-testid="deal-card"]').first();
    if (await card.count()) {
      await cap("Open a deal — the submission & collaboration hub", 2200);
      await card.click().catch(() => {});
      await page.waitForTimeout(1600);
      await page.click('button:has-text("Submission"), [role="tab"]:has-text("Submission")').catch(() => {});
      await page.waitForTimeout(2000);
      await cap("Six editable sections, completeness, Approve / Decline, re-rate flag", 3200);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(800);
    }
  });

  // 6 — Accounts
  await beat("accounts", async () => {
    await goto("/accounts");
    await cap("Accounts — Leads, Prospects, Clients", 3000);
    await page.mouse.wheel(0, 300).catch(() => {});
    await page.waitForTimeout(1200);
    await page.mouse.wheel(0, -300).catch(() => {});
  });

  // 7 — Marketplace / rating
  await beat("marketplace", async () => {
    await goto("/marketplace");
    await cap("Marketplace — instant price indication off ~25k real rates", 3200);
    await page.mouse.wheel(0, 400).catch(() => {});
    await page.waitForTimeout(1400);
    await page.mouse.wheel(0, -400).catch(() => {});
  });

  // 8 — User management
  await beat("users", async () => {
    await goto("/admin/users");
    await cap("User management — real accounts, roles, status, last login", 3200);
    await page.waitForTimeout(1000);
  });

  // 9 — Close
  await beat("close", async () => {
    await goto("/pipeline");
    await cap("Live today: quote → rate → proposal → pipeline → bind. Next: wholesale email hub, onboarding, billing.", 4200);
  });

  await page.waitForTimeout(800);
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) console.log("\n✅ Demo video saved:", await video.path());
  else console.log("\n⚠ No video captured — check recordVideo config.");
}

main().catch((e) => { console.error("record-demo failed:", e); process.exit(1); });
