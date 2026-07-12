/**
 * Axel Workforce OS — automated demo video recorder.
 *
 * Drives the RUNNING app through the 10-beat demo flow and records a video
 * (.webm) of the actual UI, including the P4 pipeline changes. Silent by design;
 * an on-screen caption banner + a synthetic cursor make each beat self-explanatory.
 *
 * Run against the live local app (Replit dev server). Configure via env:
 *   DEMO_BASE_URL   base URL of the running app        (default http://localhost:80)
 *   DEMO_EMAIL      admin login                         (default sarah@axelwos.com)
 *   DEMO_PASSWORD   admin password                      (default Password123!)
 *   DEMO_OUT        output dir for the video            (default ./docs/demo/out)
 *   DEMO_CHROMIUM   chromium executable path            (default: `command -v chromium`)
 *
 *   node docs/demo/record-demo.mjs
 *
 * Selector notes (verified against the real DOM):
 * - Pipeline columns: 10 divs with inline style min-width:280px; header holds
 *   <span>{num}</span><span>{label}</span>. No data-* attrs.
 * - Deal cards: div[draggable="true"], onClick opens the deal-card modal.
 * - Drag&drop is native HTML5 (dataTransfer "text/plain" = dealId). We dispatch
 *   synthetic DragEvents (React 18 root listeners pick them up) so the drop is
 *   deterministic even when the Bound column starts off-screen.
 * - Dropping on BOUND opens a confirm modal ("Confirm Bind" / "Cancel"); the
 *   server 409 surfaces via window.alert — we capture the dialog and re-show
 *   the reason in the caption banner (native alerts aren't captured on video).
 * - Bound-rejection deal: "Emerald Coast Cultivation (TEST)" (DL-MR3XTDPF) in
 *   New Lead — submission 4/6 sections complete, so PATCH stage=BOUND is a
 *   deterministic 409.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = (process.env.DEMO_BASE_URL || "http://localhost:80").replace(/\/$/, "");
const EMAIL = process.env.DEMO_EMAIL || "sarah@axelwos.com";
const PASSWORD = process.env.DEMO_PASSWORD || "Password123!";
const OUT = process.env.DEMO_OUT || "./docs/demo/out";
const CHROME =
  process.env.DEMO_CHROMIUM ||
  (() => {
    try { return execSync("command -v chromium").toString().trim(); } catch { return undefined; }
  })();

// The deal used for the Bound-rejection beat. Must NOT be bind-ready.
const REJECT_DEAL = "Emerald Coast Cultivation (TEST)";

// Injected on every page: a synthetic cursor that follows real mouse events, a
// click ripple, and a bottom caption banner — so the silent video reads clearly.
const INIT = `
  (() => {
    let pendingCaption = null;
    window.__demoCaption = (t) => { pendingCaption = t; };
    const install = () => {
      if (!document.body) { requestAnimationFrame(install); return; }
      try {
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
    document.body.appendChild(style);
    const cur = document.createElement('div'); cur.id='demo-cursor'; cur.style.left='720px'; cur.style.top='450px'; document.body.appendChild(cur);
    const cap = document.createElement('div'); cap.id='demo-cap'; document.body.appendChild(cap);
    window.__demoCaption = (t) => { cap.textContent = t; cap.classList.add('on'); };
    if (pendingCaption) window.__demoCaption(pendingCaption);
    addEventListener('mousemove', e => { cur.style.left=e.clientX+'px'; cur.style.top=e.clientY+'px'; }, true);
    addEventListener('mousedown', e => { const r=document.createElement('div'); r.className='demo-ripple';
      r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; document.body.appendChild(r);
      setTimeout(()=>r.remove(),500); }, true);
      } catch (e) { /* overlay is cosmetic — never break the page */ }
    };
    install();
  })();
`;

async function main() {
  const browser = await chromium.launch({ slowMo: 120, executablePath: CHROME });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  await context.addInitScript(INIT);
  const page = await context.newPage();

  // Capture window.alert() text (the server's bind-rejection reason) — native
  // dialogs are not part of the recorded frame, so we replay it as a caption.
  let lastDialog = "";
  page.on("dialog", async (d) => {
    lastDialog = d.message();
    await d.dismiss().catch(() => {});
  });

  const cap = async (t, ms = 2600) => {
    try { await page.evaluate((x) => window.__demoCaption && window.__demoCaption(x), t); } catch {}
    await page.waitForTimeout(ms);
  };
  const beat = async (label, fn) => {
    try { await fn(); console.log(`✔ beat "${label}"`); }
    catch (e) { console.warn(`⚠ beat "${label}" partial:`, e.message); }
  };
  const goto = async (path) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(600);
  };
  // Smooth-pan the kanban board (columns live in a horizontal scroll container).
  const panBoard = async (left) => {
    await page.evaluate((x) => {
      const col = [...document.querySelectorAll("div")].find((d) => d.style.minWidth === "280px");
      const board = col && col.parentElement;
      if (board) board.scrollTo({ left: x, behavior: "smooth" });
    }, left).catch(() => {});
  };

  // 1 — Sign in
  await beat("login", async () => {
    await goto("/login");
    await cap("Signing in as Admin", 1300);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
    await cap("Admin dashboard — role-based home screen", 2200);
  });

  // 2 — Pipeline: 8 operational stages
  await beat("pipeline", async () => {
    await goto("/pipeline");
    await page.waitForSelector('div[draggable="true"]', { timeout: 15000 });
    await cap("The 8-stage operational pipeline", 2400);
    await page.mouse.move(720, 450);
    await panBoard(4000);            // pan to the far right (Bound, Client)
    await page.waitForTimeout(1800);
    await panBoard(0);               // and back
    await page.waitForTimeout(1200);
  });

  // 3 — Bound gate: drag a NOT-bind-ready deal onto Bound → server 409 → snap back
  await beat("bound-gate", async () => {
    await cap("Try to bind a deal that isn't ready…", 1800);

    // Start the native-HTML5 drag from the target card (React root listeners
    // receive dispatched DragEvents; DataTransfer carries the deal id).
    const started = await page.evaluate((name) => {
      const card = [...document.querySelectorAll('div[draggable="true"]')]
        .find((el) => (el.textContent || "").includes(name));
      if (!card) return false;
      card.scrollIntoView({ block: "center", inline: "nearest" });
      const dt = new DataTransfer();
      window.__demoDrag = { dt };
      card.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }));
      const r = card.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, REJECT_DEAL);
    if (!started) throw new Error(`card "${REJECT_DEAL}" not found`);

    // Visual: glide the cursor right while the board pans to Bound. IMPORTANT:
    // move only (no mouse.down/up) — a real button press over a draggable card
    // starts a second, REAL HTML5 drag whose drop would actually move the deal.
    await page.mouse.move(started.x, started.y);
    await page.waitForTimeout(400);
    await panBoard(4000);
    for (let i = 0; i <= 8; i++) {
      await page.mouse.move(started.x + ((1300 - started.x) * i) / 8, 380, { steps: 4 });
      await page.waitForTimeout(90);
    }

    // Deterministic drop on the Bound column.
    const dropped = await page.evaluate(() => {
      const dt = window.__demoDrag && window.__demoDrag.dt;
      if (!dt) return false;
      const col = [...document.querySelectorAll("div")]
        .filter((d) => d.style.minWidth === "280px")
        .find((c) => [...c.querySelectorAll("span")].some((s) => s.textContent.trim() === "Bound"));
      if (!col) return false;
      col.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
      col.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      return true;
    });
    if (!dropped) throw new Error("Bound column not found for drop");
    await page.waitForTimeout(900);

    // "Move to Bound?" confirm modal → Confirm Bind → server rejects with 409.
    await cap("Confirm the move — the SERVER owns the bind gate", 1500);
    await page.click('button:has-text("Confirm Bind")', { timeout: 6000 });
    await page.waitForTimeout(1500); // alert fires + is dismissed by the handler
    const reason = lastDialog || "Not bind-ready — submission incomplete.";
    await cap(`❌ Server blocks it: ${reason}`, 3800);
    await panBoard(0);
    await page.waitForTimeout(1000);
    await cap("The card snaps back — no partial binds, ever.", 2400);

    // Safety net: this beat RELIES on the server rejecting the bind (409). If
    // fixture state ever drifts and the bind actually succeeds, revert it
    // immediately so a demo run never permanently moves the deal.
    const revertedId = await page.evaluate(async (name) => {
      const r = await fetch("/api/deals", { credentials: "include" });
      if (!r.ok) return null;
      const body = await r.json();
      const deals = Array.isArray(body) ? body : body.deals || [];
      const hit = deals.find(
        (d) => (d.businessName || d.business_name || "").includes(name) && d.stage === "BOUND"
      );
      if (!hit) return null;
      await fetch(`/api/deals/${hit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stage: "NEW_LEAD" }),
      });
      return hit.id;
    }, REJECT_DEAL);
    if (revertedId) console.warn(`⚠ bind unexpectedly SUCCEEDED for ${revertedId} — reverted to NEW_LEAD. Re-check the fixture (should stay 4/6 complete).`);
  });

  // 4 — Lost off-board
  await beat("lost", async () => {
    await page.click('button:has-text("Show Lost")', { timeout: 6000 });
    await page.waitForTimeout(1000);
    await cap("Lost is an OUTCOME, off the board — it remembers its stage", 2600);
    await page.click('button:has-text("Hide Lost")', { timeout: 6000 });
    await page.waitForTimeout(800);
  });

  // 5 — Deal card
  await beat("deal-card", async () => {
    const card = page.locator('div[draggable="true"]', { hasText: REJECT_DEAL }).first();
    await cap("Open a deal — the submission & collaboration hub", 1600);
    await card.click();
    await page.waitForTimeout(1400);
    await page.click('button:has-text("Submission")', { timeout: 6000 });
    await page.waitForTimeout(1400);
    await cap("Six editable sections, completeness, Approve / Decline, re-rate flag", 2800);
    // Close: the shell's X is a lucide icon; fall back to clicking the overlay edge.
    const closed = await page.locator("svg.lucide-x").first().click({ timeout: 3000 }).then(() => true).catch(() => false);
    if (!closed) await page.mouse.click(20, 450);
    await page.waitForTimeout(900);
  });

  // 6 — Accounts
  await beat("accounts", async () => {
    await goto("/accounts");
    await cap("Accounts — Leads, Prospects, Clients", 2400);
    await page.mouse.move(720, 500);
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(1200);
    await page.mouse.wheel(0, -350);
  });

  // 7 — Marketplace / rating
  await beat("marketplace", async () => {
    await goto("/marketplace");
    await cap("Marketplace — instant price indication off ~25k real rates", 2600);
    await page.mouse.move(720, 500);
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(1400);
    await page.mouse.wheel(0, -420);
  });

  // 8 — User management
  await beat("users", async () => {
    await goto("/admin/users");
    await cap("User management — real accounts, roles, status, last login", 2600);
    await page.waitForTimeout(1000);
  });

  // 9 — Close
  await beat("close", async () => {
    await goto("/pipeline");
    await cap("Live today: quote → rate → proposal → pipeline → bind. Next: wholesale email hub, onboarding, billing.", 3600);
  });

  await page.waitForTimeout(800);
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) console.log("\n✅ Demo video saved:", await video.path());
  else console.log("\n⚠ No video captured — check recordVideo config.");
}

main().catch((e) => { console.error("record-demo failed:", e); process.exit(1); });
