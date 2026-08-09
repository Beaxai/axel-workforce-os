import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatTileProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down';
}

export function StatTile({ label, value, trend, trendDirection = 'up' }: StatTileProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px',
    }}>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', margin: '0 0 8px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <p style={{ fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1, margin: 0 }}>
          {value}
        </p>
        {trend && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 500, color: trendDirection === 'up' ? '#22c55e' : '#ef4444' }}>
            {trendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
