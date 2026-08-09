interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
