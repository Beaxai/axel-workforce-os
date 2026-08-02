import { useEffect, useRef } from "react";
import { X, Download } from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";

/**
 * Inline PDF preview — renders the document in an iframe so users can read it
 * without downloading. The API serves these PDFs with `Content-Disposition:
 * inline` and cookie auth, so a plain iframe src works.
 */
export default function PdfPreviewModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const c = useThemeColors();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes; focus lands on the close button and returns to the
  // previously focused element (the preview trigger) when the modal unmounts.
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prior?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${title}`}
      data-testid="modal-pdf-preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 100%)",
          height: "min(86vh, 1100px)",
          display: "flex",
          flexDirection: "column",
          background: c.cardBg,
          border: `1px solid ${c.borderColor}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${c.borderColor}`,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 13.5,
              fontWeight: 600,
              color: c.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
          <a
            href={url}
            download
            data-testid="button-preview-download"
            aria-label={`Download ${title}`}
            style={{ display: "inline-flex", padding: 6, color: "var(--accent-primary)" }}
          >
            <Download style={{ width: 16, height: 16 }} />
          </a>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            data-testid="button-preview-close"
            aria-label="Close preview"
            style={{
              display: "inline-flex",
              padding: 6,
              background: "transparent",
              border: "none",
              color: c.textMuted,
              cursor: "pointer",
            }}
          >
            <X style={{ width: 17, height: 17 }} />
          </button>
        </div>
        <iframe
          src={url}
          title={`Preview of ${title}`}
          style={{ flex: 1, width: "100%", border: "none", background: "#525659" }}
        />
      </div>
    </div>
  );
}
