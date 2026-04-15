import { useEffect, useRef, useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";

interface HazometerProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
}

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
    pct <= 0.33 ? "#22c55e" : pct <= 0.55 ? "#eab308" : pct <= 0.75 ? "#f97316" : "#ef4444";

  const ticks = [0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50];

  let ratingLabel = "Excellent";
  let ratingColor = "#22c55e";
  if (value > 2.00) { ratingLabel = "Severe"; ratingColor = "#991b1b"; }
  else if (value > 1.50) { ratingLabel = "High Risk"; ratingColor = "#ef4444"; }
  else if (value > 1.20) { ratingLabel = "Elevated"; ratingColor = "#f97316"; }
  else if (value > 1.00) { ratingLabel = "Above Average"; ratingColor = "#eab308"; }
  else if (value >= 0.95) { ratingLabel = "Average"; ratingColor = "#a3a3a3"; }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`}>
        <defs>
          <filter id="haz-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="needle-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor={glowColor} floodOpacity="0.5" />
          </filter>
          <linearGradient id="green-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
          <linearGradient id="yellow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
          <linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="red-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        <path
          d={arcPath(arcStart, arcEnd, outerR, innerR)}
          fill={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"}
        />

        <path d={arcPath(arcStart, greenEnd, outerR, innerR)} fill="url(#green-grad)" opacity={0.85} />
        <path d={arcPath(greenEnd, yellowEnd, outerR, innerR)} fill="url(#yellow-grad)" opacity={0.85} />
        <path d={arcPath(yellowEnd, orangeEnd, outerR, innerR)} fill="url(#orange-grad)" opacity={0.85} />
        <path d={arcPath(orangeEnd, arcEnd, outerR, innerR)} fill="url(#red-grad)" opacity={0.85} />

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
                stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"}
                strokeWidth={1.5}
              />
              <text
                x={labelPos.x} y={labelPos.y}
                textAnchor="middle" dominantBaseline="middle"
                fill={textSecondary} fontSize={10} fontWeight={500}
                fontFamily="var(--app-font-sans)"
              >
                {tickVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBaseL.x},${needleBaseL.y} ${needleBaseR.x},${needleBaseR.y}`}
          fill={glowColor}
          filter="url(#needle-shadow)"
        />

        <circle cx={cx} cy={cy} r={10} fill={isDark ? "#1a1a26" : "#e4e4e7"} stroke={glowColor} strokeWidth={2.5} />

        <text
          x={cx} y={cy - 22}
          textAnchor="middle" dominantBaseline="middle"
          fill={textPrimary} fontSize={28} fontWeight={700}
          fontFamily="var(--app-font-sans)"
        >
          {value.toFixed(2)}
        </text>
      </svg>

      <div style={{ textAlign: "center", marginTop: -4 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: ratingColor,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {ratingLabel}
        </span>
      </div>
    </div>
  );
}
