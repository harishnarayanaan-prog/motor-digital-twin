// 3D Motor Digital Twin Page (full-screen)
import { Motor3D } from '../motor-3d/Motor3D'
import { useTelemetryStore } from '../store/telemetryStore'
import { fmt1, fmt2, stateColor, stateLabel } from '../utils/formatting'

export function DigitalTwinPage() {
  const { telemetry: t } = useTelemetryStore()
  return (
    <div className="pt-[76px] h-screen flex flex-col" style={{ background: '#060b18' }}>
      <div style={{
        position: 'absolute', top: 80, left: 10, right: 10, zIndex: 20,
        display: 'flex', gap: 8, flexWrap: 'wrap', pointerEvents: 'none'
      }}>
        {/* Status chips */}
        {[
          { label: 'STATE', val: stateLabel(t?.state ?? 'OFF'), color: stateColor(t?.state ?? 'OFF') },
          { label: 'SPEED', val: `${Math.abs(t?.mechanical.rotor_speed_rpm ?? 0).toFixed(0)} RPM`, color: '#00d4ff' },
          { label: 'TEMP', val: `${t?.thermal.t_winding.toFixed(1) ?? '—'}°C`, color: '#f97316' },
          { label: 'CURRENT', val: `${fmt1(t?.electrical.i_line)} A`, color: '#3b82f6' },
          { label: 'HEALTH', val: `${t?.condition.overall_health_score.toFixed(0) ?? '—'}%`, color: '#22c55e' },
          { label: 'VIBE', val: `${fmt2(t?.vibration.rms_velocity_mms)} mm/s`, color: '#eab308' },
        ].map(chip => (
          <div key={chip.label} style={{
            background: 'rgba(10,15,30,0.9)', border: `1px solid ${chip.color}44`,
            borderRadius: 5, padding: '4px 10px', fontSize: 10, color: '#475569',
            pointerEvents: 'none', backdropFilter: 'blur(8px)'
          }}>
            <span style={{ color: '#475569' }}>{chip.label} </span>
            <span style={{ color: chip.color, fontWeight: 700, fontFamily: 'monospace' }}>{chip.val}</span>
          </div>
        ))}
        {(t?.active_faults ?? []).length > 0 && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 5, padding: '4px 10px', fontSize: 10, color: '#ef4444', fontWeight: 700
          }}>
            ⚠ ACTIVE FAULTS: {t!.active_faults.map(f => f.replace(/_/g, ' ').toUpperCase()).join(' | ')}
          </div>
        )}
      </div>
      <div className="flex-1 relative">
        <Motor3D />
      </div>
    </div>
  )
}
