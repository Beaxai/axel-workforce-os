/**
 * Lightweight geo helpers for the Deal Card header map.
 *
 * Locations submitted with a quote only carry `state` + `zip`, so we resolve
 * coordinates in two tiers:
 *   1. ZIP → lat/lng via the free zippopotam.us API (cached per session).
 *   2. Fallback to a built-in state-centroid table when the ZIP is missing,
 *      malformed, or the lookup fails (offline-safe).
 * Markers that land on identical coordinates (e.g. two locations known only
 * at state level) are deterministically fanned out so both stay visible.
 */

export interface GeoMarkerClassCode {
  code: string;
  description?: string;
  ft: number;
  pt: number;
  payroll?: number;
}

export interface GeoMarker {
  lng: number;
  lat: number;
  employees: number;
  /** Human label for the location, e.g. "CA 95521". */
  label?: string;
  /** Employee types (WC class codes) at this location, for the marker popup. */
  classCodes?: GeoMarkerClassCode[];
  /** Index of this location in the source workforce profile (for edits). */
  locationIndex?: number;
}

/** Approximate visual centroids for US states, [lng, lat]. */
export const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [-86.79, 32.81], AK: [-152.40, 64.20], AZ: [-111.66, 34.29], AR: [-92.44, 34.90],
  CA: [-119.68, 36.12], CO: [-105.31, 39.06], CT: [-72.76, 41.60], DE: [-75.51, 39.00],
  DC: [-77.03, 38.90], FL: [-81.69, 27.77], GA: [-83.64, 33.04], HI: [-157.50, 20.80],
  ID: [-114.48, 44.24], IL: [-88.99, 40.35], IN: [-86.26, 39.85], IA: [-93.21, 42.01],
  KS: [-96.73, 38.53], KY: [-84.67, 37.67], LA: [-91.87, 31.17], ME: [-69.38, 45.37],
  MD: [-76.80, 39.06], MA: [-71.53, 42.23], MI: [-84.54, 43.33], MN: [-93.90, 45.69],
  MS: [-89.68, 32.74], MO: [-92.29, 38.46], MT: [-110.45, 46.92], NE: [-98.27, 41.13],
  NV: [-117.06, 38.31], NH: [-71.56, 43.45], NJ: [-74.52, 40.30], NM: [-106.25, 34.84],
  NY: [-75.50, 42.95], NC: [-79.81, 35.63], ND: [-99.78, 47.53], OH: [-82.76, 40.39],
  OK: [-96.93, 35.57], OR: [-120.57, 44.57], PA: [-77.21, 40.88], RI: [-71.51, 41.68],
  SC: [-80.95, 33.86], SD: [-99.44, 44.30], TN: [-86.69, 35.75], TX: [-98.56, 31.05],
  UT: [-111.86, 39.32], VT: [-72.71, 44.05], VA: [-78.17, 37.77], WA: [-120.74, 47.40],
  WV: [-80.62, 38.65], WI: [-89.62, 44.62], WY: [-107.55, 42.99],
};

export function stateCentroid(state?: string | null): [number, number] | null {
  if (!state) return null;
  return STATE_CENTROIDS[state.trim().toUpperCase()] ?? null;
}

/** Session cache so re-opening a deal card never re-fetches the same ZIP. */
const zipCache = new Map<string, [number, number] | null>();

/** Resolve a US ZIP to [lng, lat] via zippopotam.us. Null on any failure. */
export async function zipToLngLat(zip?: string | null): Promise<[number, number] | null> {
  const z = String(zip ?? "").trim().slice(0, 5);
  if (!/^\d{5}$/.test(z)) return null;
  if (zipCache.has(z)) return zipCache.get(z) ?? null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${z}`);
    if (!res.ok) {
      zipCache.set(z, null);
      return null;
    }
    const data: unknown = await res.json();
    const place = (data as { places?: Array<{ longitude?: string; latitude?: string }> })?.places?.[0];
    const lng = Number(place?.longitude);
    const lat = Number(place?.latitude);
    if (!isFinite(lng) || !isFinite(lat)) {
      zipCache.set(z, null);
      return null;
    }
    const pt: [number, number] = [lng, lat];
    zipCache.set(z, pt);
    return pt;
  } catch {
    zipCache.set(z, null);
    return null;
  }
}

/**
 * Fan out markers that share (nearly) identical coordinates so overlapping
 * dots stay individually visible. Deterministic golden-angle spiral.
 */
export function spreadDuplicates(points: GeoMarker[]): GeoMarker[] {
  const seen = new Map<string, number>();
  return points.map((p) => {
    const key = `${p.lng.toFixed(2)},${p.lat.toFixed(2)}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (n === 0) return p;
    const angle = (n * 137.5 * Math.PI) / 180;
    const r = 0.35 + 0.15 * n; // degrees — small, stays inside the state
    return { ...p, lng: p.lng + r * Math.cos(angle), lat: p.lat + r * Math.sin(angle) };
  });
}
