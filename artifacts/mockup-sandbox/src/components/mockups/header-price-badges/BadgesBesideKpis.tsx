/**
 * Variation A — WC + PEO mini badges sit LEFT OF the KPI cluster, on the
 * same top row. Both badges lead with ANNUAL figures. The quiet est-premium
 * pill is removed (the WC badge replaces it). WC-only comparison below.
 */
import { HeaderMock, MiniBadge, Page, QuietPremiumPill, Section } from "./_shared";

export default function BadgesBesideKpis() {
  return (
    <Page
      heading="A — Badges beside the KPI cluster"
      blurb="Both mini badges (WC + PEO) join the KPI row at the top right, ahead of LOCATIONS / EMPLOYEES / PAYROLL / EXMOD. Annual totals as headline figures. The quiet est-premium pill goes away — the WC badge replaces it."
    >
      <Section title="PEO deal" note="WC + PEO badges, annual figures">
        <HeaderMock
          besideKpis={
            <div style={{ display: "flex", gap: 10 }}>
              <MiniBadge value="$67,294" label="wc annual premium" />
              <MiniBadge value="$104,880" label="peo annual" />
            </div>
          }
        />
      </Section>

      <Section title="WC-only deal" note="single WC badge in the same slot">
        <HeaderMock
          peo={false}
          besideKpis={<MiniBadge value="$67,294" label="wc annual premium" />}
        />
      </Section>

      <Section title="Current behavior (reference)" note="quiet est-premium pill only">
        <HeaderMock peo={false} pillRow={<QuietPremiumPill />} />
      </Section>
    </Page>
  );
}
