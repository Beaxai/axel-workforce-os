/**
 * Provenance: extracted from Axel Workforce OS:
 * MarketCorrespondenceView.tsx, MarketRoutingPanel.tsx, HeldMessageItem.tsx,
 * OverviewTab.tsx and src/index.css / lib/use-theme-colors.ts.
 * Sandbox data is fictional and local only: Northstar Fabrication.
 */
import { useState } from "react";
import "./_group.css";
import { AlertCircle, MailWarning } from "lucide-react";
import { MarketRoutingPanel } from "./_shared/MarketRoutingPanel";
import { MarketCorrespondenceView } from "./_shared/MarketCorrespondenceView";
import { HeldMessageItem } from "./_shared/HeldMessageItem";
import { correspondence, held, markets } from "./_shared/mock-data";
import type { Message } from "./_shared/types";
import { c } from "./_shared/types";
export function Current() {
  const [selected, setSelected] = useState("cornerstone"); const [threads, setThreads] = useState(correspondence); const [heldVisible, setHeldVisible] = useState(true); const market = markets.find(m => m.dealMarketId === selected);
  const add = (m: Message) => setThreads(old => ({ ...old, [selected]: [...(old[selected] || []), m] }));
  const release = () => { setThreads(old => ({ ...old, cornerstone: [...old.cornerstone, { ...held, id: "released-1", candidate: undefined, isReleasable: false }] })); setHeldVisible(false); setSelected("cornerstone"); };
  return <main className="market-mail-current"><section className="market-mail-shell"><div style={{ marginBottom: 18 }}><div style={{ fontSize: 11, color: c.textMuted, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>Overview · Market correspondence</div><div style={{ marginTop: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><h1 style={{ fontSize: 18, margin: 0, color: c.textPrimary }}>Northstar Fabrication</h1><span style={{ fontSize: 11, color: c.textSecondary }}>Internal staff view</span></div></div><MarketRoutingPanel selected={selected} onSelect={setSelected} />{heldVisible && <section style={{ marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: c.textPrimary, marginBottom: 8 }}><MailWarning size={15} color="var(--accent-support)" /> Held for review</div><HeldMessageItem message={held} onRelease={release} /></section>}<div style={{ borderTop: `1px solid ${c.borderColor}`, paddingTop: 16 }}>{market ? <MarketCorrespondenceView marketName={market.marketName} contact={market.assignedUnderwriter?.email || "submissions@peoplease.example"} messages={threads[selected] || []} onAdd={add} /> : <div style={{ padding: 20, color: c.textMuted }}><AlertCircle size={16} /> Select a market to view correspondence.</div>}</div></section></main>;
}
export default Current;