import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { CorrespondenceCapabilities } from "./types";
import HeldReviewContent from "./HeldReviewContent";

interface HeldCorrespondenceDialogProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  capabilities: CorrespondenceCapabilities | null;
}

/** Retained for callers needing a dialog; the Overview uses the same review inline. */
export default function HeldCorrespondenceDialog({ dealId, isOpen, onClose, capabilities }: HeldCorrespondenceDialogProps) {
  const c = useThemeColors();
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={{ maxWidth: 700, maxHeight: "85vh", overflowY: "auto", background: c.bg, border: `1px solid ${c.borderColor}` }}>
        <DialogHeader>
          <DialogTitle>Held Correspondence</DialogTitle>
          <DialogDescription>Review held inbound mail for this deal.</DialogDescription>
        </DialogHeader>
        {isOpen && <HeldReviewContent key={dealId} dealId={dealId} enabled={!!capabilities?.market.canReviewHeld} />}
      </DialogContent>
    </Dialog>
  );
}