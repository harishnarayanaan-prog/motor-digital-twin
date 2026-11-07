// Fault Simulator Page
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useTelemetryStore } from '../store/telemetryStore'

interface Fault {
  id: string; name: string; affected_component: string; description: string
  is_active: boolean; severity: number; parameters_affected: string[]
}

export function FaultSimulatorPage() {
  const [faults, setFaults] = useState<Fault[]>([])
  const [msg, setMsg] = useState('')
  const { telemetry: t } = useTelemetryStore()

  const loadFaults = () => api.getFaults().then(d => setFaults(d.faults)).catch(console.error)

  useEffect(() => { loadFaults() }, [])

  const toggle = async (id: string, currentActive: boolean) => {
    try {
      const f = faults.find(x => x.id === id)!
      await api.toggleFault(id, !currentActive, f.severity)
      setMsg(`Fault '${id}' ${!currentActive ? 'ACTIVATED' : 'DEACTIVATED'}`)
      loadFaults()
    } catch (e: any) { setMsg(`Error: ${e.message}`) }
  }

  const setSeverity = async (id: string, sev: number) => {
    setFaults(prev => prev.map(f => f.id === id ? { ...f, severity: sev } : f))
    if (faults.find(x => x.id === id)?.is_active) {
      await api.toggleFault(id, true, sev).catch(console.error)
    }
  }

  const resetAll = async () => {
    await api.resetFaults()
    setMsg('All faults cleared')
    loadFaults()
  }

  const faultColors: Record<string, string> = {
    bearing_wear: '#f97316', rotor_imbalance: '#eab308', shaft_misalignment: '#3b82f6',
    motor_overload: '#ef4444', cooling_fan_failure: '#8b5cf6', winding_overheating: '#dc2626',
    phase_voltage_imbalance: '#06b6d4', phase_loss: '#ef4444', supply_under_voltage: '#f59e0b',
    supply_over_voltage: '#a855f7', excessive_vibration: '#f97316', mechanical_blockage: '#ef4444',
  }

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold text-neon tracking-widest">⚠ FAULT INJECTION SIMULATOR</div>
          <div className="text-xs mt-1" style={{ color: '#475569' }}>
            Activating faults modifies the mathematical motor model in real-time. For educational purposes.
          </div>
        </div>
        <button className="btn btn-orange" onClick={resetAll}>⟳ Clear All Faults</button>
      </div>

      {msg && (
        <div className="mb-4 p-2 text-xs rounded" style={{
          background: msg.includes('ACTIVATED') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${msg.includes('ACTIVATED') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          color: msg.includes('ACTIVATED') ? '#ef4444' : '#22c55e'
        }}>
          {msg}
        </div>
      )}

      {/* Active Fault Indicators */}
      <div className="mb-4 panel p-3 flex flex-wrap gap-2">
        <span className="text-xs" style={{ color: '#64748b' }}>Active Faults:</span>
        {t?.active_faults.length === 0 ? (
          <span className="text-xs text-green-neon">✓ None</span>
        ) : t?.active_faults.map(f => (
          <span key={f} style={{
            fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3, padding: '1px 7px', fontWeight: 700
          }}>{f.replace(/_/g, ' ').toUpperCase()}</span>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        {faults.map(fault => {
          const col = faultColors[fault.id] ?? '#64748b'
          return (
            <div key={fault.id} className={`col-span-6 panel p-4 ${fault.is_active ? 'panel-critical' : ''}`}
              style={fault.is_active ? { borderColor: `${col}66`, boxShadow: `0 0 12px ${col}22` } : {}}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: fault.is_active ? col : '#94a3b8' }}>
                    {fault.is_active && '⚠ '}{fault.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                    Component: <span style={{ color: '#64748b' }}>{fault.affected_component}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(fault.id, fault.is_active)}
                  className={`btn text-xs py-1.5 px-3 ${fault.is_active ? 'btn-red' : 'btn-gray'}`}
                  style={fault.is_active ? { borderColor: col, color: col } : {}}>
                  {fault.is_active ? '■ ACTIVE' : '▶ INJECT'}
                </button>
              </div>

              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
                {fault.description}
              </div>

              {/* Severity Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#475569' }}>Severity</span>
                  <span style={{ color: col, fontWeight: 700 }}>{(fault.severity * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min={0.1} max={1.0} step={0.05} value={fault.severity}
                  onChange={e => setSeverity(fault.id, parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: col }}
                  disabled={!fault.is_active}
                />
              </div>

              {/* Affected parameters */}
              <div className="mt-2 flex flex-wrap gap-1">
                {fault.parameters_affected.map(p => (
                  <span key={p} style={{
                    fontSize: 9, color: '#475569', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '1px 5px'
                  }}>{p}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Fault Impact Display */}
      {t && t.active_faults.length > 0 && (
        <div className="mt-4 panel p-4">
          <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>REAL-TIME FAULT IMPACT ON SIMULATED MEASUREMENTS</div>
          <div className="grid grid-cols-6 gap-3 text-xs">
            <div><span style={{ color: '#475569' }}>RPM</span><br/><span style={{ color: '#00d4ff', fontWeight: 700 }}>{Math.abs(t.mechanical.rotor_speed_rpm).toFixed(1)}</span></div>
            <div><span style={{ color: '#475569' }}>Torque Nm</span><br/><span style={{ color: '#f59e0b', fontWeight: 700 }}>{t.mechanical.electromagnetic_torque_nm.toFixed(1)}</span></div>
            <div><span style={{ color: '#475569' }}>Current A</span><br/><span style={{ color: '#3b82f6', fontWeight: 700 }}>{t.electrical.i_line.toFixed(1)}</span></div>
            <div><span style={{ color: '#475569' }}>Winding °C</span><br/><span style={{ color: '#f97316', fontWeight: 700 }}>{t.thermal.t_winding.toFixed(1)}</span></div>
            <div><span style={{ color: '#475569' }}>Vibe RMS</span><br/><span style={{ color: '#eab308', fontWeight: 700 }}>{t.vibration.rms_velocity_mms.toFixed(2)} mm/s</span></div>
            <div><span style={{ color: '#475569' }}>V Imbalance</span><br/><span style={{ color: '#ef4444', fontWeight: 700 }}>{t.electrical.voltage_imbalance_pct.toFixed(1)}%</span></div>
          </div>
          <div className="mt-2 text-xs" style={{ color: '#ef4444' }}>
            ⚠ Affected 3D Components: {t.affected_3d_components.join(', ') || '—'}
          </div>
        </div>
      )}
    </div>
  )
}
