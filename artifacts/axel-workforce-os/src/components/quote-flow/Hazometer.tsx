import { useEffect, useRef, useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";

interface HazometerProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
}

const NEON_GREEN = "#39ff14";
const NEON_YELLOW = "#fff01f";
const NEON_ORANGE = "#ff6e27";
const NEON_RED = "#ff073a";
const NEON_CRIMSON = "#cc0022";
const FONT = "'Source Sans 3', var(--app-font-sans), system-ui, sans-serif";

export default function Hazometer({ value, min = 0.50, max = 2.50, size = 260 }: HazometerProps) {
  const { isDark, textPrimary, textSecondary } = useThemeColors();
  const [animatedAngle, setAnimatedAngle] = useState(-135);
  const rafRef = useRef<number>(0);

  const clamped = Math.min(Math.max(value, min), max);
  const pct = (clamped - min) / (max - min);
  const targetAngle = -135 + pct * 270;

  useEffect(() => {
    const startAngle = animatedAngle;
    const diff = targetAngle - startAngle;
    const duration = 800;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedAngle(startAngle + diff * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetAngle]);

  const cx = size / 2;
  const cy = size / 2 + 10;
  const outerR = size / 2 - 16;
  const innerR = outerR - 24;

  function polarToCart(angleDeg: number, r: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, r1: number, r2: number) {
    const s1 = polarToCart(startDeg, r1);
    const e1 = polarToCart(endDeg, r1);
    const s2 = polarToCart(endDeg, r2);
    const e2 = polarToCart(startDeg, r2);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M${s1.x},${s1.y} A${r1},${r1} 0 ${large} 1 ${e1.x},${e1.y} L${s2.x},${s2.y} A${r2},${r2} 0 ${large} 0 ${e2.x},${e2.y} Z`;
  }

  const arcStart = -225;
  const arcEnd = arcStart + 270;
  const greenEnd = arcStart + 270 * 0.33;
  const yellowEnd = arcStart + 270 * 0.55;
  const orangeEnd = arcStart + 270 * 0.75;

  const needleAngle = animatedAngle - 90;
  const needleLen = outerR - 6;
  const needleTip = polarToCart(needleAngle, needleLen);
  const needleBaseL = polarToCart(needleAngle - 90, 5);
  const needleBaseR = polarToCart(needleAngle + 90, 5);

  const glowColor =
    pct <= 0.33 ? NEON_GREEN : pct <= 0.55 ? NEON_YELLOW : pct <= 0.75 ? NEON_ORANGE : NEON_RED;

  const ticks = [0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50];

  let ratingLabel = "Excellent";
  let ratingColor = NEON_GREEN;
  if (value > 2.00) { ratingLabel = "Severe"; ratingColor = NEON_CRIMSON; }
  else if (value > 1.50) { ratingLabel = "High Risk"; ratingColor = NEON_RED; }
  else if (value > 1.20) { ratingLabel = "Elevated"; ratingColor = NEON_ORANGE; }
  else if (value > 1.00) { ratingLabel = "Above Average"; ratingColor = NEON_YELLOW; }
  else if (value >= 0.95) { ratingLabel = "Average"; ratingColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"; }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT }}>
      <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`}>
        <defs>
          <filter id="haz-neon-glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="haz-arc-glow-green">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={NEON_GREEN} floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="haz-arc-glow-yellow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={NEON_YELLOW} floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="haz-arc-glow-orange">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={NEON_ORANGE} floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="haz-arc-glow-red">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={NEON_RED} floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="needle-neon">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={glowColor} floodOpacity="0.7" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="neon-green-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={NEON_GREEN} />
            <stop offset="100%" stopColor="#7dff6a" />
          </linearGradient>
          <linearGradient id="neon-yellow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={NEON_YELLOW} />
            <stop offset="100%" stopColor="#ffe566" />
          </linearGradient>
          <linearGradient id="neon-orange-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={NEON_ORANGE} />
            <stop offset="100%" stopColor="#ff9a5c" />
          </linearGradient>
          <linearGradient id="neon-red-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={NEON_RED} />
            <stop offset="100%" stopColor="#ff4d6a" />
          </linearGradient>
        </defs>

        <path
          d={arcPath(arcStart, arcEnd, outerR, innerR)}
          fill={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"}
        />

        <path d={arcPath(arcStart, greenEnd, outerR, innerR)} fill="url(#neon-green-grad)" opacity={0.9} filter="url(#haz-arc-glow-green)" />
        <path d={arcPath(greenEnd, yellowEnd, outerR, innerR)} fill="url(#neon-yellow-grad)" opacity={0.9} filter="url(#haz-arc-glow-yellow)" />
        <path d={arcPath(yellowEnd, orangeEnd, outerR, innerR)} fill="url(#neon-orange-grad)" opacity={0.9} filter="url(#haz-arc-glow-orange)" />
        <path d={arcPath(orangeEnd, arcEnd, outerR, innerR)} fill="url(#neon-red-grad)" opacity={0.9} filter="url(#haz-arc-glow-red)" />

        {ticks.map((tickVal) => {
          const tickPct = (tickVal - min) / (max - min);
          const tickAngleDeg = -225 + tickPct * 270;
          const outer = polarToCart(tickAngleDeg, outerR + 2);
          const inner = polarToCart(tickAngleDeg, outerR + 10);
          const labelPos = polarToCart(tickAngleDeg, outerR + 22);
          return (
            <g key={tickVal}>
              <line
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)"}
                strokeWidth={1.5}
              />
              <text
                x={labelPos.x} y={labelPos.y}
                textAnchor="middle" dominantBaseline="middle"
                fill={textSecondary} fontSize={10} fontWeight={600}
                fontFamily={FONT}
              >
                {tickVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBaseL.x},${needleBaseL.y} ${needleBaseR.x},${needleBaseR.y}`}
          fill={glowColor}
          filter="url(#needle-neon)"
        />

        <circle cx={cx} cy={cy} r={10} fill={isDark ? "#0a0a12" : "#e4e4e7"} stroke={glowColor} strokeWidth={2.5} filter="url(#haz-neon-glow)" />

        <text
          x={cx} y={cy - 22}
          textAnchor="middle" dominantBaseline="middle"
          fill={textPrimary} fontSize={28} fontWeight={700}
          fontFamily={FONT}
        >
          {value.toFixed(2)}
        </text>
      </svg>

      <div style={{ textAlign: "center", marginTop: -4 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: ratingColor,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontFamily: FONT,
            textShadow: isDark ? `0 0 8px ${ratingColor}40` : "none",
          }}
        >
          {ratingLabel}
        </span>
      </div>
    </div>
  );
}
