import { useRef, useState } from "react";
import { Calculator, CheckCircle2, ClipboardList, FileText, Folder, LayoutDashboard, Moon, Shield, Star, Sun, X } from "lucide-react";
import "./folder-tabs.css";

type Market = { id: string; label: string; contact: string; state: string; unread?: boolean; sender: string; initials: string; message: string };
const markets: Market[] = [
  { id: "general", label: "General", contact: "Axel deal team", state: "Internal", sender: "Mara Liu", initials: "ML", message: "Updated payroll support is attached to the submission record. Please keep routing notes here for the whole team." },
  { id: "cornerstone", label: "Cornerstone (Demo)", contact: "Nia Patel · Underwriting", state: "Quote received", unread: true, sender: "Nia Patel", initials: "NP", message: "We can support the primary class mix. The indication is ready for staff review after the loss-run clarification." },
  { id: "decision", label: "Decision HR", contact: "Rafael Ortiz · Market contact", state: "Matched", sender: "Rafael Ortiz", initials: "RO", message: "Decision HR has matched the appetite profile. We are reviewing the requested effective date." },
  { id: "peoplease", label: "Peoplease", contact: "Submissions desk", state: "Submitted", unread: true, sender: "Peoplease Desk", initials: "PD", message: "Submission received. An underwriter will follow up if further documentation is required." },
  { id: "axel", label: "Axel Keep", contact: "Internal placement", state: "Retained", sender: "Alex Kim", initials: "AK", message: "Keeping Axel as a placement option while external markets finish their review." },
];

export function FolderTabs() {
  const [active, setActive] = useState("cornerstone");
  const [selected, setSelected] = useState("decision");
  const [light, setLight] = useState(false);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const market = markets.find((item) => item.id === active) ?? markets[0];
  const moveTab = (next: number) => { const index = (next + markets.length) % markets.length; setActive(markets[index].id); refs.current[index]?.focus(); };
  const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") { event.preventDefault(); moveTab(index + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); moveTab(index - 1); }
    if (event.key === "Home") { event.preventDefault(); moveTab(0); }
    if (event.key === "End") { event.preventDefault(); moveTab(markets.length - 1); }
  };
  return <main className={`folder-tabs-prototype${light ? " light" : ""}`}>
    <div className="mtp-backdrop"><section className="mtp-dialog" aria-label="Deal dialog prototype">
      <header className="mtp-header">
        <div className="mtp-topline"><span className="prototype-chip">Prototype · folder tabs</span><button className="theme-switch" onClick={() => setLight((value) => !value)} aria-label={`Switch to ${light ? "dark" : "light"} theme`}>{light ? <Moon size={15} /> : <Sun size={15} />}</button></div>
        <div className="mtp-identity"><div className="mtp-company"><Star className="mtp-star" /><div><h1>Northstar Fabrication</h1><span>Workers’ Compensation · Internal staff view</span></div></div><div className="mtp-kpis"><div className="mtp-kpi"><small>Locations</small><strong>3</strong></div><div className="mtp-kpi"><small>Employees</small><strong>84</strong></div><div className="mtp-kpi"><small>Payroll</small><strong>$4.8M</strong></div><button className="mtp-close" aria-label="Close dialog"><X size={17} /></button></div></div>
        <div className="mtp-phase"><span className="done">Intake</span><span className="done">Submission</span><span className="current">Market</span><span>Proposal</span><span>Bind</span><span>Policy</span></div>
      </header>
      <div className="mtp-body">
        <nav className="mtp-nav" aria-label="Deal sections">{[[LayoutDashboard,"Overview"],[ClipboardList,"Submission"],[Shield,"Subjectivities"],[Folder,"Documents"],[Calculator,"Quote"],[FileText,"Policy"]].map(([Icon,label], index) => { const I = Icon as typeof LayoutDashboard; return <button key={String(label)} className={index === 0 ? "active" : ""}><I /><span>{String(label)}</span></button>; })}</nav>
        <section className="mtp-main">
          <div className="market-tabs" role="tablist" aria-label="Market correspondence folders">{markets.map((item, index) => <button ref={(node) => { refs.current[index] = node; }} key={item.id} role="tab" id={`market-tab-${item.id}`} aria-selected={active === item.id} aria-controls={`market-panel-${item.id}`} tabIndex={active === item.id ? 0 : -1} className="market-tab" onClick={() => setActive(item.id)} onKeyDown={(event) => onTabKey(event, index)}>{item.label}{item.unread && <i className="unread" aria-label="Unread" />}</button>)}</div>
          <div className="market-panel" role="tabpanel" id={`market-panel-${market.id}`} aria-labelledby={`market-tab-${market.id}`}>
            <div className="market-toolbar"><div className="toolbar-left"><span className="market-name">{market.label}</span><span className={`status-pill ${market.state === "Matched" ? "matched" : ""}`}>{market.state}</span><span className="toolbar-contact">UW contact · {market.contact}</span></div><button className={`select-market ${selected === market.id ? "selected" : ""}`} onClick={() => setSelected(market.id)}>{selected === market.id ? "Selected placement" : "Select market"}</button></div>
            <div className="feed-head"><h2>{market.id === "general" ? "Deal correspondence" : "Market correspondence"}</h2><span>Overview</span></div>
            <article className="message"><div className={`avatar ${market.id === "cornerstone" ? "pink" : ""}`}>{market.initials}</div><div><div className="message-meta"><strong>{market.sender}</strong><span className="verified"><CheckCircle2 /> verified sender</span><time>10:42 AM</time></div><p>{market.message}</p></div></article>
            <article className="message"><div className="avatar">AT</div><div><div className="message-meta"><strong>Axel Team</strong><span className="verified"><CheckCircle2 /> internal</span><time>9:18 AM</time></div><p>Broker contact details and supplemental notes have been reviewed for this market thread.</p></div></article>
            <label className="approval"><input type="checkbox" /> I have reviewed this correspondence for local approval.</label>
          </div>
        </section>
        <aside className="mtp-rail"><div className="pricing-title">Pricing & decision</div><div className="pricing-card"><label>WC annual premium</label><strong>$87,540</strong><p>Cornerstone indication</p></div><div className="pricing-card"><label>Workforce services</label><strong>$5,284 <small>/ mo</small></strong><p>84 enrolled employees</p></div><button className="rail-button">Review quote</button></aside>
      </div>
    </section></div>
  </main>;
}
export default FolderTabs;