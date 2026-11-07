// Shared helper: color by health score
export function healthColor(score: number): string {
  if (score >= 85) return '#22c55e'
  if (score >= 65) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function severityColor(sev: string): string {
  switch (sev?.toLowerCase()) {
    case 'critical': case 'emergency': return '#ef4444'
    case 'warning':  return '#f97316'
    case 'info':     return '#3b82f6'
    default:         return '#22c55e'
  }
}

export function isoZoneColor(zone: string): string {
  if (zone.includes('Zone A')) return '#22c55e'
  if (zone.includes('Zone B')) return '#eab308'
  if (zone.includes('Zone C')) return '#f97316'
  return '#ef4444'
}

export function fmt1(n: number | undefined | null): string {
  if (n == null) return '—'
  return n.toFixed(1)
}

export function fmt2(n: number | undefined | null): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

export function fmt3(n: number | undefined | null): string {
  if (n == null) return '—'
  return n.toFixed(3)
}

export function stateColor(state: string): string {
  switch (state) {
    case 'RUNNING':   return '#22c55e'
    case 'STARTING':  return '#3b82f6'
    case 'STOPPING':  return '#eab308'
    case 'OVERLOADED':return '#f97316'
    case 'FAULT':
    case 'EMERGENCY_STOP': return '#ef4444'
    default:          return '#64748b'
  }
}

export function stateLabel(state: string): string {
  switch (state) {
    case 'OFF':            return '■ OFFLINE'
    case 'RUNNING':        return '▶ RUNNING'
    case 'STARTING':       return '◀ STARTING'
    case 'STOPPING':       return '◀ STOPPING'
    case 'OVERLOADED':     return '⚠ OVERLOADED'
    case 'FAULT':          return '✕ FAULT TRIP'
    case 'EMERGENCY_STOP': return '⛔ E-STOP'
    default:               return state
  }
}
