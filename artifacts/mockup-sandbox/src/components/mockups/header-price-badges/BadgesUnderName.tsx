/**
 * Variation C — WC + PEO mini badges sit UNDER the business name and pills,
 * inside the identity block on the left. Quiet est-premium pill removed.
 * WC-only comparison below.
 */
import { HeaderMock, MiniBadge, Page, QuietPremiumPill, Section } from "./_shared";

export default function BadgesUnderName() {
  return (
    <Page
      heading="C — Badges under the business name"
      blurb="The two mini badges anchor the identity block, directly under the name and pills — prices read first, left-to-right, before the KPIs. Annual totals as headline figures; the quiet est-premium pill goes away."
    >
      <Section title="PEO deal" note="WC + PEO badges under the name">
        <HeaderMock
          underName={
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <MiniBadge value="$67,294" label="wc annual premium" />
              <MiniBadge value="$104,880" label="peo annual" />
            </div>
          }
        />
      </Section>

      <Section title="WC-only deal" note="single WC badge under the name">
        <HeaderMock
          peo={false}
          underName={
            <div style={{ display: "flex", marginTop: 12 }}>
              <MiniBadge value="$67,294" label="wc annual premium" />
            </div>
          }
        />
      </Section>

      <Section title="Current behavior (reference)" note="quiet est-premium pill only">
        <HeaderMock peo={false} pillRow={<QuietPremiumPill />} />
      </Section>
    </Page>
  );
}
