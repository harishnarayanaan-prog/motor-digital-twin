// Health Score Gauge ring component
interface HealthGaugeProps {
  score: number
  size?: number
  label?: string
}

function healthColor(s: number) {
  if (s >= 85) return '#22c55e'
  if (s >= 65) return '#eab308'
  if (s >= 40) return '#f97316'
  return '#ef4444'
}

export function HealthGauge({ score, size = 90, label = 'Health' }: HealthGaugeProps) {
  const r = (size - 12) / 2
  const circumference = 2 * Math.PI * r
  const dash = (score / 100) * circumference
  const color = healthColor(score)

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8}/>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: size > 70 ? 18 : 13, fontWeight: 700, color, fontFamily: 'monospace' }}>
            {score.toFixed(0)}
          </span>
          <span style={{ fontSize: 9, color: '#64748b' }}>%</span>
        </div>
      </div>
      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}
