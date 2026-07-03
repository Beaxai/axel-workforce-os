/**
 * DealHeaderMap — black/grey minimalist US map rendered as the Deal Card
 * header background, with glowing location markers + per-location employee
 * counts.
 *
 * Basemap: us-atlas `states-albers-10m.json` (pre-projected to a 975×610
 * Albers-USA frame), so the states never need runtime projection. Markers are
 * lat/lng projected with the matching `geoAlbersUsa().scale(1300)
 * .translate([487.5, 305])` projection. The viewBox is fit to the marker
 * bounding box (with padding and a minimum span) so the map is "zoomed in
 * just enough" to show every submitted location; `preserveAspectRatio` meet
 * lets the surrounding states fill the wide header naturally.
 *
 * Grey/black literals here are intentional map artwork (per the header-map
 * design brief), branched on theme — not UI surface colors.
 */
import { useMemo } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-albers-10m.json";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { GeoMarker } from "@/lib/geo";

/* ---- static basemap (computed once at module load) ---- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topo = statesTopo as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statesFc = feature(topo, topo.objects.states) as any;
const albersPath = geoPath();
const STATE_PATHS: string[] = statesFc.features
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map((f: any) => albersPath(f))
  .filter((d: string | null): d is string => !!d);

/** Marker projection matching the pre-projected us-atlas albers frame. */
const project = geoAlbersUsa().scale(1300).translate([487.5, 305]);

/** Full-frame viewBox of the pre-projected atlas. */
const FULL: [number, number, number, number] = [0, 0, 975, 610];
/** Approx rendered header size (px) — used to keep glyphs a constant apparent size. */
const PX_W = 1000;
const PX_H = 158;

interface Props {
  markers: GeoMarker[];
}

export default function DealHeaderMap({ markers }: Props) {
  const c = useThemeColors();

  const { vb, pts, k } = useMemo(() => {
    const projected = markers
      .map((m) => ({ xy: project([m.lng, m.lat]), employees: m.employees }))
      .filter((p): p is { xy: [number, number]; employees: number } => !!p.xy);

    if (projected.length === 0) {
      return { vb: FULL, pts: projected, k: Math.max(FULL[2] / PX_W, FULL[3] / PX_H) };
    }

    const xs = projected.map((p) => p.xy[0]);
    const ys = projected.map((p) => p.xy[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const pad = Math.max(32, Math.max(spanX, spanY) * 0.35);
    // Minimum span ≈ state-level zoom, so a single-location deal still shows
    // recognizable surrounding geography instead of a blank close-up.
    const w = Math.max(spanX + pad * 2, 170);
    let h = Math.max(spanY + pad * 2, 68);
    const cx = (minX + maxX) / 2;
    let cy = (minY + maxY) / 2;
    // Map-units-per-CSS-px at the "meet" scale — glyph sizes multiply by this
    // so dots/chips render at a constant apparent size at any zoom.
    let unitsPerPx = Math.max(w / PX_W, h / PX_H);
    // Reserve headroom above the top marker so its employee chip (which sits
    // ~34px above the dot) never clips at the header's top edge.
    const headroom = 36 * unitsPerPx;
    h += headroom;
    cy -= headroom / 2;
    unitsPerPx = Math.max(w / PX_W, h / PX_H);
    const box: [number, number, number, number] = [cx - w / 2, cy - h / 2, w, h];
    return { vb: box, pts: projected, k: unitsPerPx };
  }, [markers]);

  const land = c.isDark ? "#212129" : "#e3e3e9";
  const border = c.isDark ? "#383843" : "#cdcdd6";
  const dot = c.isDark ? "#ffffff" : "#17171d";
  const haloOpacity = c.isDark ? 0.55 : 0.3;
  const chipBg = c.isDark ? "rgba(8,8,12,0.72)" : "rgba(255,255,255,0.88)";
  const chipBorder = c.isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)";
  const chipText = c.isDark ? "#ffffff" : "#17171d";

  return (
    <svg
      viewBox={vb.join(" ")}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <filter id="deal-map-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation={5 * k} />
        </filter>
      </defs>
      <g>
        {STATE_PATHS.map((d, i) => (
          <path key={i} d={d} fill={land} stroke={border} strokeWidth={0.9 * k} strokeLinejoin="round" />
        ))}
      </g>
      {pts.map((p, i) => {
        const [x, y] = p.xy;
        const label = p.employees > 0 ? p.employees.toLocaleString() : null;
        const chipH = 19 * k;
        const chipW = label ? (label.length * 6.6 + 26) * k : 0;
        const chipY = y - 13 * k; // bottom edge of chip sits above the dot
        const midY = chipY - chipH / 2;
        const iconX = x - chipW / 2 + 10 * k;
        return (
          <g key={i}>
            {/* glow halo + solid dot */}
            <circle cx={x} cy={y} r={9 * k} fill={dot} opacity={haloOpacity} filter="url(#deal-map-glow)" />
            <circle cx={x} cy={y} r={4.4 * k} fill={dot} stroke={c.isDark ? "rgba(255,255,255,0.85)" : "rgba(23,23,29,0.85)"} strokeWidth={1.2 * k} />
            {label && (
              <g>
                <rect
                  x={x - chipW / 2}
                  y={chipY - chipH}
                  width={chipW}
                  height={chipH}
                  rx={chipH / 2}
                  fill={chipBg}
                  stroke={chipBorder}
                  strokeWidth={0.8 * k}
                />
                {/* tiny person glyph: head + shoulders */}
                <circle cx={iconX} cy={midY - 2.6 * k} r={2.1 * k} fill={chipText} />
                <path
                  d={`M ${iconX - 3.4 * k} ${midY + 4.4 * k} a ${3.4 * k} ${3.4 * k} 0 0 1 ${6.8 * k} 0 Z`}
                  fill={chipText}
                />
                <text
                  x={iconX + 6 * k}
                  y={midY}
                  fill={chipText}
                  fontSize={10.5 * k}
                  fontWeight={700}
                  dominantBaseline="central"
                  fontFamily="var(--app-font-sans)"
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
