import './_group.css';
import { useState, useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const VERTICALS = [
  { name: 'Ambulances & Emergency Transport', slug: 'ambulances-emergency-transport', image: '/__mockup/images/verticals/ambulances.jpg' },
  { name: 'Cannabis',                         slug: 'cannabis',                         image: '/__mockup/images/verticals/cannabis.jpg' },
  { name: 'Construction',                     slug: 'construction',                     image: '/__mockup/images/verticals/construction.jpg' },
  { name: 'Waste Management',                 slug: 'waste-management',                 image: '/__mockup/images/verticals/waste-management.jpg' },
  { name: 'Healthcare',                       slug: 'healthcare',                       image: '/__mockup/images/verticals/healthcare.jpg' },
  { name: 'High-Risk',                        slug: 'high-risk',                        image: '/__mockup/images/verticals/high-risk.jpg' },
  { name: 'Restaurants & Hospitality',        slug: 'restaurants-hospitality',          image: '/__mockup/images/verticals/restaurants.jpg' },
  { name: 'Manufacturing',                    slug: 'manufacturing',                    image: '/__mockup/images/verticals/manufacturing.jpg' },
  { name: 'Staffing',                         slug: 'staffing',                         image: '/__mockup/images/verticals/staffing.jpg' },
  { name: 'Transportation & Logistics',       slug: 'transportation-logistics',          image: '/__mockup/images/verticals/transportation.jpg' },
  { name: 'Retail',                           slug: 'retail',                           image: '/__mockup/images/verticals/retail.jpg' },
  { name: 'All Other Industries',             slug: 'all-other-industries',             image: '/__mockup/images/verticals/all-other-industries.jpg' },
];

export function Marketplace() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const textPrimary = '#fff';
  const textMuted   = 'rgba(255,255,255,0.48)';

  return (
    <AppShell activeNav="Marketplace">
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: 20, textAlign: 'center', flexShrink: 0 }}>
          <p style={{
            fontFamily: 'var(--app-font-heading)', fontSize: 12, fontWeight: 200,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'var(--accent-primary)', margin: '0 0 8px',
          }}>
            Marketplace
          </p>
          <h1 style={{
            fontFamily: 'var(--app-font-heading)', fontSize: 32, fontWeight: 300,
            letterSpacing: '0.02em', textTransform: 'uppercase', color: textPrimary,
            margin: '0 0 6px',
          }}>
            Solutions for businesses in every sector
          </h1>
          <p style={{ fontSize: 14, color: textMuted, margin: 0 }}>
            Explore our coverage verticals and find the right solutions for your clients.
          </p>
        </div>

        {/* Grid */}
        <div className="marketplace-grid">
          {VERTICALS.map((v) => {
            const isHovered = hoveredSlug === v.slug;
            return (
              <div
                key={v.slug}
                onMouseEnter={() => setHoveredSlug(v.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
                style={{
                  position: 'relative', width: '100%', height: '100%', minHeight: '140px',
                  borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#0e0e14',
                  transition: 'transform 0.25s ease',
                  transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                }}
              >
                <img
                  src={v.image}
                  alt={v.name}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center',
                    filter: isHovered ? 'grayscale(0) brightness(0.9)' : 'grayscale(1) brightness(0.55)',
                    transition: 'filter 0.4s ease',
                  }}
                />
                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.20) 55%, transparent 100%)',
                }} />
                {/* Content */}
                <div style={{ position: 'absolute', bottom: 48, left: 20, right: 20 }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}>
                    {v.name}
                  </p>
                </div>
                {/* CTA button */}
                <button
                  type="button"
                  style={{
                    position: 'absolute', bottom: 10, left: 14, right: 14,
                    padding: '8px 12px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: isHovered ? 'var(--accent-primary)' : 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(8px)', color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.25s ease',
                    boxShadow: isHovered ? '0 6px 18px rgba(233,30,140,0.35)' : 'none',
                  }}
                >
                  Start Submission →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
