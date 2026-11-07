// Reusable KPI Metric Card
interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  color?: string
  sub?: string
  size?: 'sm' | 'md' | 'lg'
  badge?: { text: string; color: string }
}

export function MetricCard({ label, value, unit, color = '#00d4ff', sub, size = 'md', badge }: MetricCardProps) {
  const fontSize = size === 'lg' ? 28 : size === 'sm' ? 16 : 22
  return (
    <div className="panel p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        {badge && (
          <span style={{ fontSize: 9, color: badge.color, border: `1px solid ${badge.color}`, borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span style={{ fontSize, fontWeight: 700, color, fontFamily: 'monospace', textShadow: `0 0 10px ${color}44` }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 11, color: '#475569' }}>{unit}</span>}
      </div>
      {sub && <span style={{ fontSize: 10, color: '#475569' }}>{sub}</span>}
    </div>
  )
}
