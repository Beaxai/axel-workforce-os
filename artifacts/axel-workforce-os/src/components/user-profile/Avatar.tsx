import { useEffect, useState, type CSSProperties } from "react";
import { avatarInitials } from "@/lib/avatar";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export default function Avatar({ name, avatarUrl, size = 40, className, style, title }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [avatarUrl]);

  return (
    <span
      className={className}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent-primary-soft)",
        color: "var(--accent-primary)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
        fontSize: Math.max(10, Math.round(size * 0.34)),
        fontWeight: 700,
        ...style,
      }}
    >
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={`${name} profile photo`}
          onError={() => setImageFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span role="img" aria-label={`${name} profile photo placeholder`}>
          <span aria-hidden="true">{avatarInitials(name)}</span>
        </span>
      )}
    </span>
  );
}