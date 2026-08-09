import './_group.css';
import { useEffect } from 'react';
import { AppShell } from './_shared/AppShell';
import { Check, ArrowLeft, DollarSign, ShieldCheck, AlertTriangle, Monitor, HeartPulse, Scale, Heart } from 'lucide-react';

const ACCENT = '#E91E8C';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = 'rgba(255,255,255,0.72)';
const TEXT_MUTED = 'rgba(255,255,255,0.48)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';
const BG = '#060608';

const WC_FEATURES = [
  'Pay-as-you-go billing available',
  'Competitive premium rates for construction',
  'Dedicated claims management team',
  'Specialised class code expertise',
  'Return-to-work program included',
];

const PEO_FEATURES = [
  "Workers' comp bundled with payroll and HR",
  'Access to Fortune 500-level employee benefits',
  'Dedicated HR compliance and handbook creation',
  'Streamlined onboarding and offboarding',
  'Risk management and safety implementation',
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

const PEO_SERVICES = [
  {
    icon: DollarSign,
    title: 'Payroll',
    items: ['Full Service Payroll Platform', 'Automated Payroll Processing', 'Direct Deposits', 'All Inclusive Payroll Tax Filing'],
  },
  {
    icon: ShieldCheck,
    title: 'HR & Compliance',
    items: ['State and Federal Compliance', 'EEOC Claims Management', 'Employee Handbook', 'Regulatory Guidance'],
  },
  {
    icon: AlertTriangle,
    title: 'Risk Management',
    items: ['Injury & Illness Prevention Programs', 'Safety Manuals', 'Employer & Employee Safety Training', 'Facility Inspections'],
  },
  {
    icon: Monitor,
    title: 'HR Platform Technology',
    items: ['Unified Platform', 'Electronic Onboarding', 'Time & Attendance', 'Employee Self Service Portal'],
  },
  {
    icon: HeartPulse,
    title: "Workers' Compensation",
    items: ['Medical Benefits', 'Disability Benefits', 'Vocational Rehabilitation', 'Return to Work Program', 'Superior Claims Handling'],
  },
  {
    icon: Scale,
    title: 'EPLI Insurance',
    items: ['Sexual Harassment', 'Wrongful Termination', 'Discrimination'],
  },
  {
    icon: Heart,
    title: 'Rich Benefits',
    items: ['Major Medical, Dental & Vision', 'Employee Wellness', 'Telemedicine', '401(k) Retirement Planning'],
  },
];

function CoverageCard({
  title,
  subtitle,
  eyebrow,
  badge,
  iconEl,
  features,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  badge?: string;
  iconEl: React.ReactNode;
  features: string[];
  ctaLabel: string;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 15,
        border: `1px solid ${BORDER}`,
        backdropFilter: 'blur(12px)',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
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
          {iconEl}
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
            {eyebrow || 'Coverage'}
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
          background: ACCENT,
          color: '#fff',
          fontFamily: 'var(--app-font-heading)',
          fontSize: 14,
          fontWeight: 400,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          height: 58,
        }}
      >
        {ctaLabel}
      </button>
      <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0, marginTop: 10, textAlign: 'center', letterSpacing: '0.04em' }}>
        Takes about 3 minutes
      </p>
    </div>
  );
}

export function VerticalDetail() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <AppShell activeNav="Marketplace">
      <div style={{ width: '100%' }}>
        {/* Back link */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: TEXT_MUTED,
            fontSize: 12,
            fontFamily: 'var(--app-font-heading)',
            fontWeight: 300,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 20,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to marketplace
        </div>

        {/* Hero */}
        <div
          style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 32,
            height: 320,
            background: 'linear-gradient(135deg, #1a0a2e 0%, #0e1a14 50%, #0e0e14 100%)',
          }}
        >
          {/* Simulated construction site atmosphere with gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(233,30,140,0.15) 60%, rgba(0,0,0,0.5) 100%)',
            }}
          />
          {/* Grid pattern overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Construction icon cluster */}
          <div
            style={{
              position: 'absolute',
              right: 60,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 20,
              opacity: 0.15,
            }}
          >
            {[80, 120, 60, 100].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 24,
                  height: h,
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: 3,
                  alignSelf: 'flex-end',
                }}
              />
            ))}
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
              padding: '32px 36px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--app-font-heading)',
                fontSize: 11,
                fontWeight: 200,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: ACCENT,
                margin: 0,
                marginBottom: 10,
              }}
            >
              Marketplace
            </p>
            <h1
              style={{
                fontFamily: 'var(--app-font-heading)',
                fontSize: 38,
                fontWeight: 300,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                color: '#fff',
                margin: 0,
                lineHeight: 1.1,
                textShadow: '0 1px 6px rgba(0,0,0,0.45)',
              }}
            >
              Construction
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', margin: 0, marginTop: 10, maxWidth: 640, lineHeight: 1.5 }}>
              Specialised workforce solutions for general contractors, specialty trades, and construction firms of all sizes.
            </p>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 15, color: TEXT_SECONDARY, lineHeight: 1.75, margin: 0, marginBottom: 36, maxWidth: 880 }}>
          Construction employers face unique workforce challenges — seasonal fluctuations, multi-state operations, complex class codes, and elevated risk profiles. Axel provides purpose-built workers' compensation and PEO solutions that give construction operators competitive rates, streamlined compliance, and dedicated claims expertise so you can focus on building.
        </p>

        {/* Coverage Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            marginBottom: 56,
          }}
        >
          <CoverageCard
            title="WorkShield"
            subtitle="Traditional Workers' Compensation"
            eyebrow="Coverage"
            iconEl={
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #7C3AED, #E91E8C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck style={{ width: 20, height: 20, color: '#fff' }} />
              </div>
            }
            features={WC_FEATURES}
            ctaLabel="Start Submission"
          />
          <CoverageCard
            title="Workforce Solution"
            subtitle="Premier PEO Bundle"
            eyebrow="Program"
            iconEl={
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #E91E8C, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart style={{ width: 20, height: 20, color: '#fff' }} />
              </div>
            }
            features={PEO_FEATURES}
            ctaLabel="Start Submission"
          />
          <CoverageCard
            title="WorkPlus OS"
            subtitle="Elite Workforce Management"
            eyebrow="Program"
            badge="ASO"
            iconEl={
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Monitor style={{ width: 20, height: 20, color: '#7C3AED' }} />
              </div>
            }
            features={ASO_FEATURES}
            ctaLabel="Get ASO Quote"
          />
        </div>

        {/* Program Offering Section */}
        <section>
          <p
            style={{
              fontFamily: 'var(--app-font-heading)',
              fontSize: 11,
              fontWeight: 200,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: ACCENT,
              margin: 0,
              marginBottom: 8,
            }}
          >
            What's included in a PEO?
          </p>
          <h2
            style={{
              fontFamily: 'var(--app-font-heading)',
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: TEXT_PRIMARY,
              margin: 0,
              marginBottom: 8,
            }}
          >
            Program Offering
          </h2>
          <p style={{ fontSize: 14, color: TEXT_MUTED, margin: 0, marginBottom: 24, maxWidth: 640, lineHeight: 1.6 }}>
            Everything your construction operation needs, bundled under one roof.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {PEO_SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.title}
                  style={{
                    background: CARD_BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    backdropFilter: 'blur(12px)',
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: 'rgba(233,30,140,0.10)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: 17, height: 17, color: ACCENT }} />
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--app-font-heading)',
                        fontSize: 12,
                        fontWeight: 400,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: TEXT_PRIMARY,
                        margin: 0,
                      }}
                    >
                      {svc.title}
                    </h3>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {svc.items.map((item) => (
                      <li
                        key={item}
                        style={{ fontSize: 13, color: TEXT_SECONDARY, paddingLeft: 13, position: 'relative', lineHeight: 1.5 }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 7,
                            width: 4,
                            height: 4,
                            borderRadius: 999,
                            background: ACCENT,
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
