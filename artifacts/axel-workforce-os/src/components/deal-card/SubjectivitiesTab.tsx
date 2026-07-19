import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDealSubjectivities,
  useUpdateSubjectivity,
  getGetDealSubjectivitiesQueryKey,
  type DealSubjectivity,
} from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import AxelBadge from "@/components/ui/AxelBadge";
import { AlertTriangle, Check } from "lucide-react";

const ERROR_RED = "#ef4444";

const STATUS_COLOR: Record<string, string> = {
  OPEN: "gray",
  SATISFIED: "green",
  WAIVED: "yellow",
  NOT_APPLICABLE: "gray",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  SATISFIED: "Satisfied",
  WAIVED: "Waived",
  NOT_APPLICABLE: "N/A",
};

/**
 * §6A Bind Subjectivities Checklist — the documents that must be satisfied before
 * the carrier will bind. Generated automatically when a deal enters Bind Order.
 *
 * Item 9 (loss history) carries an auto-flag when the newest valued loss run falls
 * outside the carrier's 60-day valuation window; item 10 (broker fee) is tracked but
 * explicitly NON-BLOCKING per the spec.
 */
export default function SubjectivitiesTab({ dealId }: { dealId: string }) {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useGetDealSubjectivities(dealId);
  const updateItem = useUpdateSubjectivity();
  const [error, setError] = useState<string | null>(null);

  const setStatus = (item: DealSubjectivity, status: "OPEN" | "SATISFIED") => {
    setError(null);
    updateItem.mutate(
      { id: item.id, data: { status } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getGetDealSubjectivitiesQueryKey(dealId) }),
        onError: () => setError("Could not update that item. Please try again."),
      },
    );
  };

  if (isLoading) {
    return <p style={{ color: c.textMuted, fontSize: 14 }}>Loading checklist…</p>;
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: c.textMuted, fontSize: 15, margin: 0 }}>
          No bind subjectivities yet. The checklist is generated when the deal reaches
          <strong style={{ color: c.textPrimary }}> Bind Order</strong>.
        </p>
      </div>
    );
  }

  const blocking = items.filter((i) => i.isBlocking);
  const openBlocking = blocking.filter((i) => i.status === "OPEN").length;
  const satisfied = items.filter((i) => i.status === "SATISFIED").length;

  return (
    <div data-testid="tab-subjectivities">
      {/* SUMMARY */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: c.textPrimary, fontWeight: 600 }}>
          {satisfied} of {items.length} satisfied
        </span>
        <span style={{ color: c.borderColor }}>|</span>
        <span style={{ fontSize: 13, color: c.textMuted }}>
          {openBlocking} blocking {openBlocking === 1 ? "item" : "items"} outstanding
        </span>
      </div>

      {error && (
        <div style={{ border: `1px solid ${ERROR_RED}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <span data-testid="text-subjectivity-error" style={{ color: ERROR_RED, fontSize: 13.5 }}>
            {error}
          </span>
        </div>
      )}

      {/* ITEMS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...items]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => {
            const isSatisfied = item.status === "SATISFIED";
            return (
              <div
                key={item.id}
                data-testid={`subjectivity-${item.sortOrder}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${item.autoFlagReason ? ERROR_RED : c.borderColor}`,
                  background: c.inputBg,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: c.textMuted,
                    fontWeight: 600,
                    minWidth: 18,
                    paddingTop: 2,
                  }}
                >
                  {item.sortOrder}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, color: c.textPrimary, fontWeight: 500 }}>
                      {item.name}
                    </span>
                    <AxelBadge label={STATUS_LABEL[item.status] ?? item.status} color={STATUS_COLOR[item.status] ?? "gray"} />
                    {!item.isBlocking && (
                      <span style={{ fontSize: 11, color: c.textMuted, fontStyle: "italic" }}>
                        does not block binding
                      </span>
                    )}
                  </div>

                  {item.autoFlagReason && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6 }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: ERROR_RED, flexShrink: 0, marginTop: 1 }} />
                      <span data-testid={`subjectivity-flag-${item.sortOrder}`} style={{ fontSize: 12.5, color: ERROR_RED, lineHeight: 1.5 }}>
                        {item.autoFlagReason}
                      </span>
                    </div>
                  )}

                  {item.notes && !item.autoFlagReason && (
                    <p style={{ fontSize: 12, color: c.textMuted, margin: "4px 0 0", lineHeight: 1.5 }}>
                      {item.notes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  data-testid={`button-toggle-subjectivity-${item.sortOrder}`}
                  onClick={() => setStatus(item, isSatisfied ? "OPEN" : "SATISFIED")}
                  disabled={updateItem.isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: `1px solid ${isSatisfied ? c.borderColor : "var(--accent-primary)"}`,
                    background: "transparent",
                    color: isSatisfied ? c.textMuted : "var(--accent-primary)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: updateItem.isPending ? "default" : "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {isSatisfied ? "Reopen" : (<><Check style={{ width: 13, height: 13 }} />Mark satisfied</>)}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
