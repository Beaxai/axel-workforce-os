/**
 * Address lookup proxy — backs the "smart add" bar in the deal-card
 * Locations editor. Proxies the free US Census geocoder (no API key) so the
 * browser avoids CORS and we control the response shape. US addresses only;
 * the Census matcher wants a reasonably complete one-line address, so the
 * client debounces and the UI keeps a manual-entry fallback.
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const MAX_QUERY_LEN = 120;

// Lightweight per-user throttle: at most N lookups per window. In-memory is
// fine — this is a single-process dev/prod server and the limit is generous.
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();
function throttled(key: string): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now >= h.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 1000) for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
    return false;
  }
  h.count += 1;
  return h.count > MAX_PER_WINDOW;
}

type CensusMatch = {
  matchedAddress?: string;
  addressComponents?: { city?: string; state?: string; zip?: string };
};

router.get("/address-suggest", async (req, res) => {
  const q = String(req.query.q ?? "").trim().slice(0, MAX_QUERY_LEN);
  if (q.length < 4) {
    res.json({ suggestions: [] });
    return;
  }
  const userKey = String((req as unknown as { user?: { id?: string } }).user?.id ?? req.ip ?? "anon");
  if (throttled(userKey)) {
    res.status(429).json({ suggestions: [], error: "Too many lookups — slow down." });
    return;
  }
  try {
    const url = `${CENSUS_URL}?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const upstream = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!upstream.ok) {
      res.status(502).json({ suggestions: [], error: `Geocoder returned ${upstream.status}` });
      return;
    }
    const body = (await upstream.json()) as { result?: { addressMatches?: CensusMatch[] } };
    const matches = body.result?.addressMatches ?? [];
    const seen = new Set<string>();
    const suggestions = matches
      .map((m) => {
        const full = m.matchedAddress || "";
        const street1 = full.split(",")[0]?.trim() || "";
        return {
          label: full,
          street1,
          city: m.addressComponents?.city?.trim() || "",
          state: m.addressComponents?.state?.trim().toUpperCase() || "",
          zip: m.addressComponents?.zip?.trim() || "",
        };
      })
      .filter((s) => {
        if (!s.street1 || !s.state) return false;
        const key = s.label.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
    res.json({ suggestions });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    res.status(502).json({ suggestions: [], error: aborted ? "Geocoder timed out" : "Geocoder unavailable" });
  }
});

export default router;
