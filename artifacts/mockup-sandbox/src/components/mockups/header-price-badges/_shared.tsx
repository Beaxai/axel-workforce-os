/**
 * Shared scaffold for the "small PEO + WC price badges" header mockups.
 * Recreates the deal-card 248px map header (dark theme) faithfully:
 * identity block + pills, deal-team avatars, KPI cluster, milestone tracker,
 * and the current quiet est-premium pill — plus a MiniBadge that is a
 * scaled-down version of the indication screen's premium badge
 * (pink glowing 2px border, dark inner card, floating neon shield,
 * white value, thin divider, small lowercase label).
 */
import type { CSSProperties, ReactNode } from "react";
import { Star, X, MapPin, Users, Banknote, Gauge } from "lucide-react";
import shieldIcon from "./shield.png";

export const PINK = "#E91E8C";
const HDR_GREY = "#9b9ba4";

/* ---------- Mini premium badge ---------- */

export function MiniBadge({
  value,
  label,
  sub,
  width = 132,
}: {
  value: string;
  label: string;
  sub?: string;
  width?: number;
}) {
  return (
    <div style={{ position: "relative", paddingTop: 17, width, flexShrink: 0 }}>
      <img
        src={shieldIcon}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 32,
          height: "auto",
          zIndex: 2,
          pointerEvents: "none",
          filter: "drop-shadow(0 4px 12px rgba(233,30,140,0.5))",
        }}
      />
      <div
        style={{
          borderRadius: 12,
          padding: 1.5,
          background: PINK,
          boxShadow: "0 0 18px rgba(233,30,140,0.38)",
        }}
      >
        <div
          style={{
            borderRadius: 10.5,
            background: "#0a0a12",
            padding: "16px 8px 8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {value}
            {sub && (
              <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginLeft: 2 }}>{sub}</span>
            )}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "7px auto", maxWidth: 84 }} />
          <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Header scaffold pieces ---------- */

const MAP_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Ccircle cx='3' cy='3' r='1.1' fill='%23ffffff' fill-opacity='0.13'/%3E%3C/svg%3E")`;

function Avatars() {
  const people = ["SJ", "MC", "AR"];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {people.map((p, i) => (
        <div
          key={p}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "2px solid #060608",
            background: "rgba(255,255,255,0.13)",
            color: "rgba(255,255,255,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            marginLeft: i === 0 ? 0 : -8,
            zIndex: people.length - i,
            position: "relative",
          }}
        >
          {p}
        </div>
      ))}
    </div>
  );
}

function Pill({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 9999,
        background: accent ? "rgba(233,30,140,0.15)" : "rgba(255,255,255,0.06)",
        color: accent ? PINK : HDR_GREY,
        border: `1px solid ${accent ? "rgba(233,30,140,0.15)" : "rgba(255,255,255,0.1)"}`,
        fontWeight: accent ? 600 : 400,
        letterSpacing: accent ? "0.03em" : undefined,
        textTransform: accent ? "uppercase" : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function KpiCluster() {
  const kpis = [
    { label: "LOCATIONS", Icon: MapPin, value: "2", pink: true },
    { label: "EMPLOYEES", Icon: Users, value: "48", pink: true },
    { label: "PAYROLL", Icon: Banknote, value: "$3.2M", pink: true },
    { label: "EXMOD", Icon: Gauge, value: "0.92", pink: false },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", columnGap: 26 }}>
      {kpis.map(({ label, Icon, value, pink }) => (
        <div key={label} style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: 10, letterSpacing: "0.08em", fontWeight: 600, color: HDR_GREY, textTransform: "uppercase" }}>
            <Icon style={{ width: 13, height: 13, color: HDR_GREY }} />
            {label}
          </div>
          {label === "EXMOD" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginTop: 3, color: "#fff", textShadow: "0 0 14px rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00D68F", boxShadow: "0 0 8px #00D68F55", marginTop: 3 }} />
            </div>
          ) : (
            <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginTop: 3, color: pink ? PINK : "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</div>
          )}
        </div>
      ))}
      <X style={{ width: 18, height: 18, color: HDR_GREY, marginTop: 1 }} />
    </div>
  );
}

export function QuietPremiumPill({ value = "$67,294" }: { value?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 9999,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(233,30,140,0.6)" }} />
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: HDR_GREY }}>Est. Premium</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function Tracker() {
  const phases = ["Intake", "Indication", "Submission", "Quote", "Bind Order", "Live"];
  const active = 1;
  return (
    <div style={{ display: "flex", padding: "6px 18px 14px" }}>
      {phases.map((p, i) => (
        <div key={p} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
          {i > 0 && (
            <div style={{ position: "absolute", top: 5, right: "50%", width: "100%", height: 1.5, background: i <= active ? PINK : "rgba(255,255,255,0.16)" }} />
          )}
          <div
            style={{
              width: i === active ? 11 : 9,
              height: i === active ? 11 : 9,
              borderRadius: "50%",
              background: i < active ? PINK : i === active ? "#fff" : "rgba(255,255,255,0.25)",
              boxShadow: i === active ? "0 0 10px rgba(255,255,255,0.65), 0 0 0 4px rgba(255,255,255,0.10)" : "none",
              zIndex: 1,
              marginTop: i === active ? -1 : 0,
            }}
          />
          <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: i === active ? "#fff" : HDR_GREY }}>{p}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The full 248px header. Slots:
 *  - underName: rendered under the pills, inside the identity block
 *  - besideKpis: rendered to the LEFT of the KPI cluster (same row)
 *  - pillRow: rendered in the right-aligned row under the KPIs
 *             (where the quiet est-premium pill currently sits)
 */
export function HeaderMock({
  businessName = "Emerald Coast Cultivation",
  peo = true,
  underName,
  besideKpis,
  pillRow,
}: {
  businessName?: string;
  peo?: boolean;
  underName?: ReactNode;
  besideKpis?: ReactNode;
  pillRow?: ReactNode;
}) {
  const shell: CSSProperties = {
    position: "relative",
    minHeight: 248,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0b0b0f",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.09)",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#fff",
  };
  return (
    <div style={shell}>
      {/* map artwork stand-in + legibility gradients */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: MAP_BG }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 80% at 68% 45%, rgba(233,30,140,0.10), transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(6,6,8,0.9) 0%, rgba(6,6,8,0.55) 42%, rgba(6,6,8,0.06) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(6,6,8,0.82) 0%, rgba(6,6,8,0.38) 26%, rgba(6,6,8,0) 46%)" }} />
      {/* a couple of map markers */}
      <div style={{ position: "absolute", top: 96, left: "58%", width: 22, height: 22, borderRadius: "50%", background: "rgba(233,30,140,0.28)", border: `1.5px solid ${PINK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>32</div>
      <div style={{ position: "absolute", top: 64, left: "76%", width: 20, height: 20, borderRadius: "50%", background: "rgba(233,30,140,0.28)", border: `1.5px solid ${PINK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>16</div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 18px 0" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Star style={{ width: 18, height: 18, color: HDR_GREY, flexShrink: 0 }} />
            <div style={{ fontSize: 18, fontWeight: 600, whiteSpace: "nowrap" }}>{businessName}</div>
            <Avatars />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <Pill>Cannabis</Pill>
            <Pill>{peo ? "PEO" : "WC"}</Pill>
            <Pill accent>Effective 10/1/2026</Pill>
          </div>
          {underName}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
          {besideKpis}
          <KpiCluster />
        </div>
      </div>

      {pillRow && (
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "flex-end", padding: "10px 44px 0 18px" }}>
          {pillRow}
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, marginTop: "auto" }}>
        <Tracker />
      </div>
    </div>
  );
}

/* ---------- Presentation chrome ---------- */

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: PINK }}>{title}</span>
        {note && <span style={{ fontSize: 12, color: "#9b9ba4" }}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

export function Page({ heading, blurb, children }: { heading: string; blurb: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#060608", padding: "36px 28px 60px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>{heading}</h1>
          <p style={{ color: "#9b9ba4", fontSize: 13.5, margin: "6px 0 0", lineHeight: 1.5, maxWidth: 720 }}>{blurb}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
