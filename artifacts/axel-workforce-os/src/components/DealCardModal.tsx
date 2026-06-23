/**
 * Phase 4C — Deal Card collaboration hub entry point.
 *
 * The deal card was rebuilt as a decomposed hub under `components/deal-card/`
 * (DealCardShell + OverviewTab, SubmissionTab, SectionEditorOverlay,
 * ReRateBanner, PricingRail, plus supporting tabs). This
 * file preserves the public contract that the rest of the app depends on:
 *   - `<DealCardModal dealId isOpen onClose onDealUpdated />`
 *   - `openDealCard(dealId)` — dispatches the `open-deal-card` window event
 *   - `<GlobalDealCardHost />` — listens for that event and renders the card
 */
import { useEffect, useState } from "react";
import DealCardShell from "@/components/deal-card/DealCardShell";

interface DealCardModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onDealUpdated?: () => void;
}

export default function DealCardModal(props: DealCardModalProps) {
  return <DealCardShell {...props} />;
}

export function openDealCard(dealId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("open-deal-card", { detail: { dealId } }));
}

export function GlobalDealCardHost() {
  const [dealId, setDealId] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.dealId) setDealId(detail.dealId);
    };
    window.addEventListener("open-deal-card", handler);
    return () => window.removeEventListener("open-deal-card", handler);
  }, []);
  return (
    <DealCardModal
      dealId={dealId || ""}
      isOpen={!!dealId}
      onClose={() => setDealId(null)}
    />
  );
}
