// Typed REST API service for all backend endpoints
const API = '/api'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}

export const api = {
  // Motor Control
  start:        () => req<any>('POST', '/simulation/start'),
  stop:         () => req<any>('POST', '/simulation/stop'),
  emergencyStop:() => req<any>('POST', '/simulation/emergency-stop'),
  reset:        () => req<any>('POST', '/simulation/reset'),
  setSpeed:     (frequency_hz: number) => req<any>('POST', '/simulation/speed', { frequency_hz }),
  setLoad:      (load_pct: number) => req<any>('POST', '/simulation/load', { load_pct }),
  setDirection: (direction: string) => req<any>('POST', '/simulation/direction', { direction }),

  // Telemetry
  getState:     () => req<any>('GET', '/simulation/state'),
  getHistory:   () => req<any>('GET', '/simulation/telemetry-history'),
  getElectrical:() => req<any>('GET', '/simulation/electrical'),
  getMechanical:() => req<any>('GET', '/simulation/mechanical'),
  getThermal:   () => req<any>('GET', '/simulation/thermal'),
  getVibration: () => req<any>('GET', '/simulation/vibration'),
  getCondition: () => req<any>('GET', '/simulation/condition'),
  getEnergy:    () => req<any>('GET', '/simulation/energy'),

  // Faults
  getFaults:    () => req<any>('GET', '/simulation/faults'),
  toggleFault:  (fault_id: string, is_active: boolean, severity?: number) =>
    req<any>('POST', '/simulation/faults/toggle', { fault_id, is_active, severity }),
  resetFaults:  () => req<any>('POST', '/simulation/faults/reset'),

  // Settings & Config
  getConfig:    () => req<any>('GET', '/simulation/config'),
  updateConfig: (params: any) => req<any>('POST', '/simulation/config', params),
  getSettings:  () => req<any>('GET', '/simulation/settings'),
  updateSettings:(settings: any) => req<any>('POST', '/simulation/settings', settings),

  // Alerts
  getAlerts:   (params?: { severity?: string; acknowledged?: boolean }) => {
    const q = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined).map(([k,v]) => [k, String(v)]))
    ).toString() : ''
    return req<any>('GET', `/alerts${q}`)
  },
  acknowledgeAlert: (id: string) => req<any>('POST', `/alerts/${id}/acknowledge`),
  resolveAlert:     (id: string) => req<any>('POST', `/alerts/${id}/resolve`),

  // Maintenance
  getMaintenance:  () => req<any>('GET', '/maintenance'),
  addMaintenance:  (data: any) => req<any>('POST', '/maintenance', data),

  // Energy comparison
  compareEnergy: (data: any) => req<any>('POST', '/simulation/energy/compare', data),

  // Export
  exportCSV: (data_type: string) => `${API}/export/csv?data_type=${data_type}`,
}
