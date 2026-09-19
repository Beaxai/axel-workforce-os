import { useMemo, useState } from "react";
import "./conversation-first.css";
import { correspondence, held, markets } from "./_shared/mock-data";
import type { Message } from "./_shared/types";

const fmtTime = (message: Message) => {
  const value = message.receivedAt || message.sentAt;
  if (!value) return "just now";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
};

function ThreadMessage({ message }: { message: Message }) {
  const outbound = message.direction === "OUTBOUND";
  const initial = (message.from.name || message.from.email).split(/[\s@]/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("");
  return <article className={`cf-message ${outbound ? "outbound" : ""}`}>
    <div className={`cf-avatar ${outbound ? "out" : ""}`} aria-hidden="true">{initial}</div>
    <div className="cf-message-card">
      <div className="cf-message-meta"><span className="cf-sender">{message.from.name || "Axel placement team"}</span><time className="cf-time">{fmtTime(message)}</time></div>
      <div className="cf-email">{message.from.email}</div>
      {message.subject && <div className="cf-subject">{message.subject}</div>}
      <p className="cf-body">{message.bodyText}</p>
    </div>
  </article>;
}

export function ConversationFirst() {
  const [darkMode, setDarkMode] = useState(true);
  const [selected, setSelected] = useState("cornerstone");
  const [threads, setThreads] = useState(correspondence);
  const [verified, setVerified] = useState(false);
  const [heldVisible, setHeldVisible] = useState(true);
  const [originalOpen, setOriginalOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [emailMode, setEmailMode] = useState<"submission" | "followup">("submission");
  const market = markets.find((item) => item.dealMarketId === selected);
  const messages = useMemo(() => threads[selected] || [], [threads, selected]);
  const recipient = market?.assignedUnderwriter?.email || "submissions@peoplease.example";
  const marketName = market?.marketName || "Market";
  const showHeld = heldVisible && selected === "cornerstone";

  const addHeld = () => {
    if (!verified) return;
    setThreads((old) => ({ ...old, cornerstone: [...old.cornerstone, { ...held, id: "reviewed-held", isReleasable: false, bodyText: "Please use the revised employee count below before binding. I can confirm the schedule once sender identity is verified." }] }));
    setHeldVisible(false);
  };
  const sendPreview = () => {
    const body = reply.trim();
    if (!body) return;
    setThreads((old) => ({ ...old, [selected]: [...(old[selected] || []), { id: `local-${Date.now()}`, direction: "OUTBOUND", from: { name: "Axel placement team", email: "csa@axel.example" }, to: [recipient], subject: `RE: Northstar Fabrication — ${marketName}`, sentAt: new Date().toISOString(), bodyText: body, deliveryState: "local preview" }] }));
    setReply("");
  };
  const email = emailMode === "submission"
    ? { subject: "Northstar Fabrication — request for quote", facts: ["Effective Oct 1", "24 employees · $1.8m payroll", "Submission attached"], next: "Please reply with terms or any questions." }
    : { subject: "Northstar Fabrication — follow-up", facts: ["Effective Oct 1", "24 employees · $1.8m payroll", "Submission attached"], next: "Please reply with terms or any questions." };

  return <main className={`axel-cf ${darkMode ? "theme-dark" : ""}`}>
    <div className="cf-page">
      <div className="cf-topline">
        <div className="cf-brand"><i className="cf-mark" />Axel</div>
        <div className="cf-top-actions">
          <span className="cf-demo">Prototype · fictional data · no email sent</span>
          <button type="button" className="cf-theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-pressed={darkMode}>
            {darkMode ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>
      <section className="cf-overview" aria-labelledby="overview-title">
        <header className="cf-header">
          <div className="cf-eyebrow">Overview · market interaction</div>
          <div className="cf-titleline"><div><h1 id="overview-title">Northstar Fabrication</h1><p className="cf-deal-note">Workers’ compensation placement · October 1 effective</p></div><span className="cf-private">Private to trusted Axel staff</span></div>
        </header>
        <nav className="cf-markets" aria-label="Markets">
          {markets.map((item) => <button type="button" key={item.dealMarketId} onClick={() => setSelected(item.dealMarketId)} className={`cf-market ${selected === item.dealMarketId ? "is-active" : ""}`} aria-pressed={selected === item.dealMarketId}>{item.marketName}<small>{item.appetiteOutcome}</small></button>)}
        </nav>
        <div className="cf-conversation">
          <div className="cf-conversation-head"><h2>{marketName} conversation</h2><span className="cf-count">{messages.length} messages · staff-only thread</span></div>
          {messages.length ? messages.map((message) => <ThreadMessage key={message.id} message={message} />) : <p className="cf-body">No private correspondence yet. The draft below stays local to this prototype.</p>}
          {showHeld && <aside className="cf-held" aria-label="Held inbound message awaiting sender verification">
            <div className="cf-held-top"><div className="cf-held-icon">!</div><div><h3>Sender verification required</h3><p className="cf-held-note">A known-market reply is held in this private thread. It is visible only to trusted staff until verified.</p></div></div>
            <div className="cf-held-preview"><strong>M. Torres</strong> · mara.torres@cornerstone-review.example<br />“Please use the revised employee count below before binding.”</div>
            <label className="cf-verify"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} />I verified this sender is authorized for Cornerstone.</label>
            <button type="button" className="cf-add" disabled={!verified} onClick={addHeld}>Add to conversation</button>
          </aside>}
          <button type="button" className="cf-original" onClick={() => setOriginalOpen((open) => !open)} aria-expanded={originalOpen}>Show original</button>
          {originalOpen && <div className="cf-original-copy">Original headers and quoted history are hidden by default. This preview would retain them for trusted staff inspection without exposing the thread outside this market.</div>}
          <div className="cf-composer">
            <div className="cf-composer-to">Replying to <strong>{recipient}</strong></div>
            <textarea aria-label={`Reply to ${recipient}`} placeholder="Write a brief follow-up…" value={reply} onChange={(event) => setReply(event.target.value)} />
            <div className="cf-composer-footer"><span>Local preview only · no delivery</span><button type="button" className="cf-send" onClick={sendPreview}>Send preview</button></div>
          </div>
        </div>
      </section>
      <section className="cf-email-panel" aria-labelledby="email-preview-title">
        <header className="cf-email-head"><div><div className="cf-label">Actual recipient email preview</div><h2 id="email-preview-title">What {marketName} receives</h2></div><div className="cf-segment" aria-label="Email preview type"><button type="button" className={emailMode === "submission" ? "is-active" : ""} onClick={() => setEmailMode("submission")}>Submission</button><button type="button" className={emailMode === "followup" ? "is-active" : ""} onClick={() => setEmailMode("followup")}>Follow-up</button></div></header>
        <div className="cf-email-body">
          <div className="cf-email-route"><span>To</span><strong>{recipient}</strong><span>Subject</span><strong>{email.subject}</strong></div>
          <p className="cf-email-subject">{email.subject}</p>
          <p className="cf-email-copy">Hello {market?.assignedUnderwriter?.name?.split(" ")[0] || "team"},<br />Please quote Northstar Fabrication. We’ve attached the submission and would appreciate your terms or questions.</p>
          <div className="cf-facts">{email.facts.map((fact) => <span className="cf-fact" key={fact}>{fact}</span>)}</div>
          <div className="cf-next"><strong>Next action</strong>{email.next}</div>
        </div>
      </section>
    </div>
  </main>;
}

export default ConversationFirst;