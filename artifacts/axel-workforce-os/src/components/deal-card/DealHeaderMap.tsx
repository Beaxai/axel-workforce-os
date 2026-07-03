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
import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-albers-10m.json";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { GeoMarker } from "@/lib/geo";

/** Pixel-space info handed to onMarkerClick — position of the clicked dot
 * relative to the map container, plus the container's rendered size so the
 * caller can clamp its popup within bounds. */
export interface MarkerClickInfo {
  x: number;
  y: number;
  /** Viewport (fixed-positioning) coordinates of the clicked dot. */
  clientX: number;
  clientY: number;
  containerW: number;
  containerH: number;
}

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
const PX_H = 240;

interface Props {
  markers: GeoMarker[];
  /** Marker click → location detail popup (handled by the parent). */
  onMarkerClick?: (marker: GeoMarker, info: MarkerClickInfo) => void;
  /** Click on empty map space (used to dismiss the popup). */
  onBackgroundClick?: () => void;
}

export default function DealHeaderMap({ markers, onMarkerClick, onBackgroundClick }: Props) {
  const c = useThemeColors();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  /** Map-units → container-px for a marker, honoring xMidYMid meet. */
  const toPx = (x: number, y: number): MarkerClickInfo | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const [vx, vy, vw, vh] = vbRef.current;
    const scale = Math.min(rect.width / vw, rect.height / vh);
    const px = (x - vx) * scale + (rect.width - vw * scale) / 2;
    const py = (y - vy) * scale + (rect.height - vh * scale) / 2;
    return {
      x: px,
      y: py,
      clientX: rect.left + px,
      clientY: rect.top + py,
      containerW: rect.width,
      containerH: rect.height,
    };
  };
  const vbRef = useRef<[number, number, number, number]>(FULL);

  const { vb, pts, k } = useMemo(() => {
    const projected = markers
      .map((m) => ({ xy: project([m.lng, m.lat]), marker: m }))
      .filter((p): p is { xy: [number, number]; marker: GeoMarker } => !!p.xy);

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
    const pad = Math.max(40, Math.max(spanX, spanY) * 0.45);
    // Minimum span ≈ state-level zoom, so a single-location deal still shows
    // recognizable surrounding geography instead of a blank close-up.
    const w = Math.max(spanX + pad * 2, 190);
    let h = Math.max(spanY + pad * 2, 76);
    const cx = (minX + maxX) / 2;
    let cy = (minY + maxY) / 2;
    // Map-units-per-CSS-px at the "meet" scale — glyph sizes multiply by this
    // so dots/chips render at a constant apparent size at any zoom.
    let unitsPerPx = Math.max(w / PX_W, h / PX_H);
    // Reserve headroom above the top marker so its employee chip (which sits
    // ~34px above the dot) never clips at the header's top edge, and footroom
    // below the bottom marker so dots never sit under the milestone tracker
    // band pinned to the bottom of the header (~60px tall incl. labels).
    const headroom = 36 * unitsPerPx;
    const footroom = 68 * unitsPerPx;
    h += headroom + footroom;
    cy += (footroom - headroom) / 2;
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

  vbRef.current = vb;

  return (
    <svg
      ref={svgRef}
      viewBox={vb.join(" ")}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
      onClick={onBackgroundClick}
      role="img"
      aria-label="Map of submitted locations"
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
        const label = p.marker.employees > 0 ? p.marker.employees.toLocaleString() : null;
        const isHover = hovered === i;
        const chipH = 19 * k;
        const chipW = label ? (label.length * 6.6 + 26) * k : 0;
        const chipY = y - 16 * k; // bottom edge of chip sits above the dot
        const midY = chipY - chipH / 2;
        const iconX = x - chipW / 2 + 10 * k;
        const clickable = !!onMarkerClick;
        const openPopup = () => {
          const info = toPx(x, y);
          if (info && onMarkerClick) onMarkerClick(p.marker, info);
        };
        const handleClick = clickable
          ? (e: ReactMouseEvent) => {
              e.stopPropagation();
              openPopup();
            }
          : undefined;
        return (
          <g
            key={i}
            onClick={handleClick}
            onKeyDown={
              clickable
                ? (e: ReactKeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      openPopup();
                    }
                  }
                : undefined
            }
            tabIndex={clickable ? 0 : undefined}
            onMouseEnter={clickable ? () => setHovered(i) : undefined}
            onMouseLeave={clickable ? () => setHovered((h) => (h === i ? null : h)) : undefined}
            style={clickable ? { cursor: "pointer" } : undefined}
            role={clickable ? "button" : undefined}
            aria-label={clickable ? `Location ${p.marker.label ?? i + 1}: ${p.marker.employees} employees` : undefined}
          >
            {/* generous invisible hit area so the dot is easy to click */}
            {clickable && <circle cx={x} cy={y} r={20 * k} fill="transparent" />}
            {/* glow halo + solid dot — enlarges slightly on hover */}
            <circle cx={x} cy={y} r={(isHover ? 15 : 13) * k} fill={dot} opacity={isHover ? Math.min(haloOpacity + 0.2, 0.85) : haloOpacity} filter="url(#deal-map-glow)" />
            <circle cx={x} cy={y} r={(isHover ? 8 : 7) * k} fill={dot} stroke={c.isDark ? "rgba(255,255,255,0.85)" : "rgba(23,23,29,0.85)"} strokeWidth={1.4 * k} />
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
