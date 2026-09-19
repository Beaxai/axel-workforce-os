import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Mail,
  Paperclip,
  Reply,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { correspondence, held, markets } from "./_shared/mock-data";
import type { Message } from "./_shared/types";
import "./action-first.css";

type EmailMode = "Submission" | "Follow-up";

const dates: Record<string, string> = {
  "in-1": "Today, 3:24 PM",
  "out-1": "Today, 4:02 PM",
  "in-2": "Today, 2:40 PM",
};

function shortTime(message: Message) {
  return dates[message.id] || "Today";
}

export function ActionFirst() {
  const [selected, setSelected] = useState("cornerstone");
  const [mode, setMode] = useState<EmailMode>("Submission");
  const [composerOpen, setComposerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [verified, setVerified] = useState(false);
  const [approved, setApproved] = useState(false);

  const market = markets.find((item) => item.dealMarketId === selected) || markets[0];
  const messages = correspondence[selected] || [];
  const recipient = market.assignedUnderwriter?.email || "submissions@peoplease.example";
  const isCornerstone = selected === "cornerstone";
  const nextStep = isCornerstone
    ? "Send current loss runs to keep the indication moving."
    : selected === "decision"
      ? "Wait for underwriting to finish its initial review."
      : "Choose this market when you are ready to submit.";

  const subject = useMemo(
    () =>
      mode === "Submission"
        ? "Northstar Fabrication — submission"
        : "Northstar Fabrication — current loss runs",
    [mode],
  );

  const chooseMarket = (id: string) => {
    setSelected(id);
    setComposerOpen(false);
    setExpanded(null);
    setShowOriginal(false);
  };

  return (
    <main className="axel-af">
      <div className="af-canvas">
        <header className="af-header">
          <div>
            <div className="af-kicker"><span className="af-mark" /> AXEL / PLACEMENT DESK</div>
            <h1>Northstar Fabrication</h1>
          </div>
          <div className="af-local"><span /> Prototype · fictional data · no email sent</div>
        </header>

        <section className="af-workspace" aria-label="Market correspondence overview">
          <nav className="af-market-list" aria-label="Markets">
            <div className="af-list-label">Markets <span>3</span></div>
            {markets.map((item) => {
              const active = item.dealMarketId === selected;
              return (
                <button
                  className={`af-market ${active ? "is-active" : ""}`}
                  key={item.dealMarketId}
                  onClick={() => chooseMarket(item.dealMarketId)}
                  type="button"
                  aria-current={active ? "page" : undefined}
                >
                  <span className="af-market-dot" />
                  <span className="af-market-copy">
                    <strong>{item.marketName}</strong>
                    <small>{item.appetiteOutcome}</small>
                  </span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              );
            })}
            <div className="af-isolation"><ShieldCheck size={14} /> Private market threads</div>
          </nav>

          <section className="af-pane">
            <div className="af-pane-title">
              <div>
                <p>Market conversation</p>
                <h2>{market.marketName}</h2>
              </div>
              <span className={`af-state ${market.appetiteOutcome?.toLowerCase().replace(" ", "-")}`}>{market.appetiteOutcome}</span>
            </div>

            <article className="af-next-card">
              <div className="af-step-index">01</div>
              <div className="af-next-copy">
                <p>Next step</p>
                <h3>{nextStep}</h3>
                {isCornerstone && <span>Requested by Mara Torres · 3:24 PM</span>}
              </div>
              {isCornerstone && <button className="af-primary" type="button" onClick={() => setComposerOpen(true)}><Reply size={15} /> Reply</button>}
            </article>

            {isCornerstone && !approved && (
              <section className="af-review" aria-label="Private held mail review">
                <div className="af-review-icon"><Eye size={15} /></div>
                <div className="af-review-copy">
                  <strong>Private staff review</strong>
                  <p>Held reply from <b>{held.from.email}</b> matches Cornerstone, but the sender is not verified.</p>
                  <label className="af-check"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /> I verified this sender with Cornerstone.</label>
                </div>
                <button className="af-approve" disabled={!verified} type="button" onClick={() => setApproved(true)}>Approve to this market</button>
              </section>
            )}
            {isCornerstone && approved && <div className="af-approved"><ShieldCheck size={15} /> Sender verified. Held reply is now visible to trusted staff in this private thread.</div>}

            <div className="af-correspondence-head">
              <span>Correspondence</span>
              <small>{messages.length + (approved ? 1 : 0)} messages</small>
            </div>
            <div className="af-rows">
              {approved && (
                <MessageRow
                  message={held}
                  expanded={expanded === held.id}
                  onToggle={() => setExpanded(expanded === held.id ? null : held.id)}
                  heldMessage
                />
              )}
              {messages.slice().reverse().map((message, index) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  expanded={expanded === message.id}
                  onToggle={() => setExpanded(expanded === message.id ? null : message.id)}
                  latest={index === 1 && isCornerstone}
                />
              ))}
              {!messages.length && <div className="af-empty">No private correspondence yet.</div>}
            </div>

            {composerOpen && (
              <section className="af-composer" aria-label="Reply to market">
                <div className="af-composer-top"><strong>Reply to {market.marketName}</strong><button type="button" aria-label="Close reply composer" onClick={() => setComposerOpen(false)}><X size={16} /></button></div>
                <div className="af-recipient"><span>To</span><b>{recipient}</b></div>
                <textarea aria-label="Reply message" defaultValue="Attached are the current loss runs for Northstar Fabrication. Please let us know if you need anything else." />
                <div className="af-composer-actions"><button type="button" className="af-link-button"><Paperclip size={14} /> Add attachment</button><button type="button" className="af-primary" onClick={() => setComposerOpen(false)}><Send size={14} /> Queue reply</button></div>
              </section>
            )}

            <button className="af-original-toggle" type="button" onClick={() => setShowOriginal(!showOriginal)}><ChevronDown size={15} className={showOriginal ? "is-up" : ""} /> Show original</button>
            {showOriginal && <div className="af-original"><div><span>From</span>{messages[0]?.from.email || recipient}</div><div><span>To</span>submissions@axel.example</div><div><span>Subject</span>{messages[0]?.subject || "No original message"}</div><pre>{messages[0]?.bodyText || "Original email will appear here when received."}</pre></div>}
          </section>
        </section>

        <section className="af-email-preview" aria-label="Actual recipient email preview">
          <div className="af-preview-head">
            <div><p>Actual recipient email preview</p><h2>What {market.assignedUnderwriter?.name || "the market"} will receive</h2></div>
            <div className="af-tabs" role="tablist" aria-label="Email type">
              {(["Submission", "Follow-up"] as EmailMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} className={mode === item ? "is-selected" : ""} onClick={() => setMode(item)}>{item}</button>)}
            </div>
          </div>
          <div className="af-mail-paper">
            <div className="af-mail-meta"><span>To</span><b>{recipient}</b><span>Subject</span><b>{subject}</b></div>
            <div className="af-fact-strip"><span><b>1,142</b> employees</span><span><b>46%</b> manufacturing payroll</span><span><b>$6.8m</b> estimated payroll</span></div>
            <p>{mode === "Submission" ? "Please review Northstar Fabrication for an indication based on the attached census and payroll schedule." : "Attached are the current loss runs requested for Northstar Fabrication."}</p>
            <div className="af-next-line"><b>Next action:</b> {mode === "Submission" ? "Confirm whether this class mix fits your appetite." : "Let us know if the loss runs support an updated indication."}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MessageRow({ message, expanded, onToggle, latest, heldMessage }: { message: Message; expanded: boolean; onToggle: () => void; latest?: boolean; heldMessage?: boolean }) {
  return (
    <article className={`af-message ${expanded ? "is-expanded" : ""}`}>
      <button type="button" onClick={onToggle} className="af-message-button" aria-expanded={expanded}>
        <span className={`af-direction ${message.direction === "INBOUND" ? "inbound" : "outbound"}`}>{message.direction === "INBOUND" ? "IN" : "OUT"}</span>
        <span className="af-message-main"><b>{message.from.name || "Axel staff"}</b><small>{message.subject}</small></span>
        {latest && <span className="af-latest">Latest</span>}
        {heldMessage && <span className="af-latest">Verified</span>}
        <time>{shortTime(message)}</time><ChevronDown size={15} className={expanded ? "is-up" : ""} />
      </button>
      {expanded && <div className="af-message-body"><p>{message.bodyText}</p><button type="button">Show original email</button></div>}
    </article>
  );
}

export default ActionFirst;