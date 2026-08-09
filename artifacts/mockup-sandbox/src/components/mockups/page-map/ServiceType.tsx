import './_group.css';
import { useEffect } from 'react';
import { AppShell } from './_shared/AppShell';
import { Check, ArrowLeft, ArrowRight, ShieldCheck, Heart, Monitor } from 'lucide-react';

const ACCENT = '#E91E8C';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = 'rgba(255,255,255,0.72)';
const TEXT_MUTED = 'rgba(255,255,255,0.48)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';

const TOTAL_STEPS = 19;
const CURRENT_STEP = 2;

const WC_FEATURES = [
  'Competitive premium rates',
  'Pay-as-you-go billing available',
  'Dedicated claims management',
  'Construction class code expertise',
  'Return-to-work program',
];

const PEO_FEATURES = [
  "Workers' comp bundled with payroll and HR administration",
  'Access to Fortune 500-level employee benefits',
  'Dedicated HR compliance support and handbook creation',
  'Streamlined onboarding and offboarding processes',
  'Risk management and safety program implementation',
  'Single point of contact for all workforce needs',
];

const ASO_FEATURES = [
  'Superior HR management platform',
  'Full-service payroll & tax filing',
  'HR administration & compliance',
  'Benefits administration',
  'Time & attendance',
  'Employee handbook & policies',
  'You keep your own WC policy',
];

interface CardProps {
  title: string;
  subtitle: string;
  eyebrow: string;
  badge?: string;
  icon: React.ReactNode;
  features: string[];
  selected?: boolean;
  onSelect: () => void;
}

function CoverageCard({ title, subtitle, eyebrow, badge, icon, features, selected, onSelect }: CardProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? 'rgba(233,30,140,0.06)' : CARD_BG,
        borderRadius: 15,
        border: `1.5px solid ${selected ? ACCENT : BORDER}`,
        backdropFilter: 'blur(12px)',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        position: 'relative',
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 24,
            height: 24,
            borderRadius: 999,
            background: ACCENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check style={{ width: 13, height: 13, color: '#fff' }} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: 'var(--app-font-heading)',
              fontSize: 11,
              fontWeight: 200,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: ACCENT,
              margin: 0,
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </p>
          <h3
            style={{
              fontFamily: 'var(--app-font-heading)',
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: TEXT_PRIMARY,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h3>
          <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0, marginTop: 3 }}>{subtitle}</p>
        </div>
        {badge && (
          <span
            style={{
              alignSelf: 'flex-start',
              fontFamily: 'var(--app-font-heading)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 999,
              background: ACCENT,
              color: '#fff',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Features */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {features.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Check style={{ width: 17, height: 17, color: ACCENT, flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 14, color: TEXT_SECONDARY, lineHeight: 1.55 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        style={{
          width: '100%',
          padding: '16px 28px',
          borderRadius: 12,
          border: 'none',
          background: selected ? ACCENT : 'rgba(255,255,255,0.08)',
          color: '#fff',
          fontFamily: 'var(--app-font-heading)',
          fontSize: 14,
          fontWeight: 400,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          height: 56,
          transition: 'background 0.15s',
        }}
      >
        {selected ? 'Selected' : 'Start Submission'}
      </button>
      <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0, marginTop: 10, textAlign: 'center' }}>
        Takes about 3 minutes
      </p>
    </div>
  );
}

export function ServiceType() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // In the mockup, WC is pre-selected
  const selected = 'WC';

  const progressPct = (CURRENT_STEP / TOTAL_STEPS) * 100;

  return (
    <AppShell activeNav="Marketplace">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 56px)' }}>
        {/* Progress bar */}
        <div
          style={{
            height: 3,
            background: 'rgba(255,255,255,0.06)',
            width: '100%',
            borderRadius: 2,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: ACCENT,
              borderRadius: 2,
              transition: 'width 0.3s',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ACCENT,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Service Type
          </span>
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </span>
        </div>

        {/* Heading */}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--app-font-heading)',
              fontSize: 28,
              fontWeight: 300,
              color: TEXT_PRIMARY,
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.2,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Construction — Select Coverage Type
          </h1>
          <p
            style={{
              fontSize: 15,
              color: TEXT_MUTED,
              margin: 0,
              marginBottom: 36,
              textAlign: 'center',
            }}
          >
            Choose the program that best fits your client's needs.
          </p>

          {/* Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
            }}
          >
            <CoverageCard
              title="WorkShield"
              subtitle="Traditional Workers' Compensation"
              eyebrow="Coverage"
              icon={
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #7C3AED, #E91E8C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck style={{ width: 19, height: 19, color: '#fff' }} />
                </div>
              }
              features={WC_FEATURES}
              selected={selected === 'WC'}
              onSelect={() => {}}
            />
            <CoverageCard
              title="WorkPlus OS"
              subtitle="Elite Workforce Management Program"
              eyebrow="Program"
              badge="ASO"
              icon={
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'rgba(124,58,237,0.2)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Monitor style={{ width: 19, height: 19, color: '#7C3AED' }} />
                </div>
              }
              features={ASO_FEATURES}
              selected={false}
              onSelect={() => {}}
            />
            <CoverageCard
              title="Workforce Solution"
              subtitle="Premier PEO Bundle"
              eyebrow="Program"
              icon={
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #E91E8C, #7C3AED)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Heart style={{ width: 19, height: 19, color: '#fff' }} />
                </div>
              }
              features={PEO_FEATURES}
              selected={false}
              onSelect={() => {}}
            />
          </div>
        </div>

        {/* Nav buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 0',
            marginTop: 40,
          }}
        >
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 24,
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: TEXT_PRIMARY,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              height: 44,
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Back
          </button>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 24,
              border: 'none',
              background: ACCENT,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              height: 44,
            }}
          >
            Continue
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
