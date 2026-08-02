/**
 * Variation B — WC + PEO mini badges REPLACE the quiet est-premium pill in
 * the right-aligned row under the KPI cluster. PEO badge leads with PEPM
 * (per-employee-per-month) as its headline figure. WC-only comparison below.
 */
import { HeaderMock, MiniBadge, Page, QuietPremiumPill, Section } from "./_shared";

export default function BadgesReplacePill() {
  return (
    <Page
      heading="B — Badges replace the quiet premium pill"
      blurb="The two mini badges take the est-premium pill's slot under the KPI cluster, keeping the top row unchanged. The PEO badge headlines PEPM ($182 /ee/mo) instead of the annual total — the number brokers quote in conversation."
    >
      <Section title="PEO deal" note="WC annual + PEO PEPM headline">
        <HeaderMock
          pillRow={
            <div style={{ display: "flex", gap: 10 }}>
              <MiniBadge value="$67,294" label="wc annual premium" />
              <MiniBadge value="$182" sub="/ee/mo" label="peo per employee" />
            </div>
          }
        />
      </Section>

      <Section title="PEO deal — annual alternative" note="same placement, PEO annual total instead of PEPM">
        <HeaderMock
          pillRow={
            <div style={{ display: "flex", gap: 10 }}>
              <MiniBadge value="$67,294" label="wc annual premium" />
              <MiniBadge value="$104,880" label="peo annual" />
            </div>
          }
        />
      </Section>

      <Section title="WC-only deal" note="single WC badge in the pill slot">
        <HeaderMock peo={false} pillRow={<MiniBadge value="$67,294" label="wc annual premium" />} />
      </Section>

      <Section title="Current behavior (reference)" note="quiet est-premium pill only">
        <HeaderMock peo={false} pillRow={<QuietPremiumPill />} />
      </Section>
    </Page>
  );
}
