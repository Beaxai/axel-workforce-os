interface AxelBadgeProps {
  label: string;
  color?: string;
  bgOpacity?: number;
}

const COLOR_MAP: Record<string, string> = {
  pink: "#E91E8C",
  purple: "#7C3AED",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  gray: "#6b7280",
};

export default function AxelBadge({ label, color = "gray", bgOpacity = 0.15 }: AxelBadgeProps) {
  const resolved = COLOR_MAP[color] || color;

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "12px",
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: "9999px",
        background: `${resolved}${Math.round(bgOpacity * 255).toString(16).padStart(2, "0")}`,
        color: resolved,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
