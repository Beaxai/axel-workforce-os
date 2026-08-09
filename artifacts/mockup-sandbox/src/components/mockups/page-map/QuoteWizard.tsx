import './_group.css';
import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Building2, User, Phone, Globe, MapPin, ChevronDown } from 'lucide-react';

const ACCENT = '#E91E8C';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = 'rgba(255,255,255,0.72)';
const TEXT_MUTED = 'rgba(255,255,255,0.48)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = 'rgba(255,255,255,0.04)';
const INPUT_BORDER = 'rgba(255,255,255,0.1)';

const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;

const STEP_LABELS = [
  'Business Details',
  'Company Info',
  'Experience Rating',
  'General Information',
  'Indication Ready',
];

function FormField({
  label,
  required,
  children,
  colSpan = 1,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <div style={{ gridColumn: `span ${colSpan}` }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 7,
          fontFamily: 'var(--app-font-heading)',
        }}
      >
        {label}
        {required && <span style={{ color: ACCENT, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ placeholder, value, icon }: { placeholder?: string; value?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: TEXT_MUTED,
            pointerEvents: 'none',
          }}
        >
          {icon}
        </div>
      )}
      <input
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        readOnly
        style={{
          width: '100%',
          padding: icon ? '12px 14px 12px 38px' : '12px 14px',
          borderRadius: 8,
          border: `1px solid ${INPUT_BORDER}`,
          background: INPUT_BG,
          color: value ? TEXT_SECONDARY : TEXT_MUTED,
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'var(--app-font-sans)',
        }}
      />
    </div>
  );
}

function SelectInput({ placeholder, value }: { placeholder?: string; value?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        style={{
          width: '100%',
          padding: '12px 36px 12px 14px',
          borderRadius: 8,
          border: `1px solid ${INPUT_BORDER}`,
          background: INPUT_BG,
          color: value ? TEXT_SECONDARY : TEXT_MUTED,
          fontSize: 14,
          outline: 'none',
          appearance: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--app-font-sans)',
        }}
      >
        <option value="">{placeholder}</option>
        {value && <option value={value} selected>{value}</option>}
      </select>
      <ChevronDown
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 15,
          height: 15,
          color: TEXT_MUTED,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function FormSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        padding: 28,
        marginBottom: 20,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h3
          style={{
            fontFamily: 'var(--app-font-heading)',
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: TEXT_PRIMARY,
            margin: 0,
            marginBottom: subtitle ? 4 : 0,
          }}
        >
          {title}
        </h3>
        {subtitle && <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function QuoteWizard() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const progressPct = (CURRENT_STEP / TOTAL_STEPS) * 100;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060608',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: '0 40px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(6,6,8,0.95)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo area */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #7C3AED, #E91E8C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--app-font-heading)' }}>A</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--app-font-heading)',
              fontSize: 14,
              fontWeight: 300,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TEXT_PRIMARY,
            }}
          >
            Axel
          </span>
          <span style={{ color: BORDER, margin: '0 8px' }}>|</span>
          <span
            style={{
              fontFamily: 'var(--app-font-heading)',
              fontSize: 12,
              fontWeight: 200,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: TEXT_MUTED,
            }}
          >
            Quote Wizard — Construction
          </span>
        </div>
        <span style={{ fontSize: 12, color: TEXT_MUTED }}>
          Draft saved <span style={{ color: 'rgba(34,197,94,0.8)' }}>●</span>
        </span>
      </div>

      {/* Progress */}
      <div style={{ padding: '0 40px' }}>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
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

        {/* Step pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            marginBottom: 0,
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {STEP_LABELS.map((label, i) => {
              const step = i + 1;
              const isActive = step === CURRENT_STEP;
              const isPast = step < CURRENT_STEP;
              return (
                <div
                  key={step}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: isActive ? 'rgba(233,30,140,0.12)' : isPast ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: isActive ? ACCENT : isPast ? 'rgba(233,30,140,0.4)' : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {step}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? ACCENT : isPast ? TEXT_SECONDARY : TEXT_MUTED,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 12, color: TEXT_MUTED, whiteSpace: 'nowrap' }}>
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '28px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Step heading */}
          <div style={{ marginBottom: 28 }}>
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
              Step 2 — Company Information
            </p>
            <h1
              style={{
                fontFamily: 'var(--app-font-heading)',
                fontSize: 26,
                fontWeight: 300,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: TEXT_PRIMARY,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Tell us about the business
            </h1>
            <p style={{ fontSize: 14, color: TEXT_MUTED, margin: 0, marginTop: 6 }}>
              This information will be used to generate your indication quote.
            </p>
          </div>

          {/* Coverage Effective Date */}
          <FormSection title="Coverage Effective Date" subtitle="When would you like this coverage to begin?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Coverage Effective Date" required>
                <TextInput value="01/01/2026" />
              </FormField>
            </div>
          </FormSection>

          {/* Business Details */}
          <FormSection title="Business Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Legal Business Name" required>
                <TextInput
                  value="Apex Construction Group LLC"
                  icon={<Building2 style={{ width: 15, height: 15 }} />}
                />
              </FormField>
              <FormField label="DBA">
                <TextInput placeholder="Doing business as" />
              </FormField>
              <FormField label="FEIN / Tax ID" required>
                <TextInput value="82-1047593" placeholder="XX-XXXXXXX" />
              </FormField>
              <FormField label="Entity Type" required>
                <SelectInput value="LLC" placeholder="Select entity type" />
              </FormField>
              <FormField label="Years in Business" required>
                <SelectInput value="6-10 years" placeholder="Select..." />
              </FormField>
              <FormField label="Business State" required>
                <SelectInput value="Texas" placeholder="Primary state" />
              </FormField>
            </div>
          </FormSection>

          {/* Primary Location */}
          <FormSection
            title="Primary Location Address"
            subtitle="This will be used as your first location for the workforce profile."
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
              <FormField label="Street Address" required>
                <TextInput
                  value="4821 Industrial Pkwy"
                  icon={<MapPin style={{ width: 15, height: 15 }} />}
                />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <FormField label="City" required>
                <TextInput value="Houston" />
              </FormField>
              <FormField label="State" required>
                <SelectInput value="TX" placeholder="State" />
              </FormField>
              <FormField label="ZIP Code" required>
                <TextInput value="77002" placeholder="ZIP" />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Number of Locations" required>
                <SelectInput value="3" placeholder="Select..." />
              </FormField>
            </div>
          </FormSection>

          {/* Primary Contact */}
          <FormSection title="Primary Contact">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Contact Name" required>
                <TextInput
                  value="Marcus Williams"
                  icon={<User style={{ width: 15, height: 15 }} />}
                />
              </FormField>
              <FormField label="Contact Email" required>
                <TextInput value="m.williams@apexconstruction.com" />
              </FormField>
              <FormField label="Contact Phone" required>
                <TextInput
                  value="(713) 555-0142"
                  icon={<Phone style={{ width: 15, height: 15 }} />}
                />
              </FormField>
              <FormField label="Website">
                <TextInput
                  value="https://apexconstruction.com"
                  icon={<Globe style={{ width: 15, height: 15 }} />}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Owners & Officers */}
          <FormSection title="Owners & Officers">
            {/* Owner row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 1fr 80px',
                gap: 12,
                alignItems: 'end',
                padding: 14,
                borderRadius: 8,
                border: '1px solid rgba(233,30,140,0.15)',
                background: 'rgba(233,30,140,0.02)',
                marginBottom: 10,
              }}
            >
              <FormField label="First Name">
                <TextInput value="Marcus" />
              </FormField>
              <FormField label="Last Name">
                <TextInput value="Williams" />
              </FormField>
              <FormField label="Own %">
                <TextInput value="65%" />
              </FormField>
              <FormField label="Duties">
                <TextInput value="President / CEO" />
              </FormField>
              <FormField label="Exc / Inc">
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '12px 8px',
                    borderRadius: 8,
                    border: '1px solid rgba(233,30,140,0.3)',
                    background: 'rgba(233,30,140,0.12)',
                    color: ACCENT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Inc
                </button>
              </FormField>
            </div>

            {/* Second owner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 1fr 80px',
                gap: 12,
                alignItems: 'end',
                padding: 14,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                marginBottom: 14,
              }}
            >
              <FormField label="">
                <TextInput value="Sandra" />
              </FormField>
              <FormField label="">
                <TextInput value="Williams" />
              </FormField>
              <FormField label="">
                <TextInput value="35%" />
              </FormField>
              <FormField label="">
                <TextInput value="CFO / Finance" />
              </FormField>
              <FormField label="">
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '12px 8px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: TEXT_MUTED,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Exc
                </button>
              </FormField>
            </div>

            {/* Add owner */}
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 8,
                border: `1px dashed ${BORDER}`,
                background: 'transparent',
                color: TEXT_MUTED,
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              + Add Owner / Officer
            </button>
          </FormSection>

          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 16,
              paddingBottom: 40,
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: TEXT_MUTED }}>
                <span style={{ color: 'rgba(34,197,94,0.8)', marginRight: 5 }}>●</span>
                Draft saved
              </span>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 28px',
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
        </div>
      </div>
    </div>
  );
}
