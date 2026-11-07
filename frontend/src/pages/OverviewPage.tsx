// Overview Dashboard Page
import { useTelemetryStore } from '../store/telemetryStore'
import { MetricCard } from '../components/MetricCard'
import { HealthGauge } from '../components/HealthGauge'
import { Motor3D } from '../motor-3d/Motor3D'
import { fmt1, fmt2, stateColor, stateLabel, isoZoneColor } from '../utils/formatting'
import { api } from '../services/api'
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area
} from 'recharts'
import { Zap, Thermometer, Activity, AlertTriangle } from 'lucide-react'

function MiniChart({ data, dataKey, color, unit }: { data: any[]; dataKey: string; color: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={55}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5}
          fill={`url(#grad-${dataKey})`} dot={false} />
        <Tooltip contentStyle={{ background: '#0d1424', border: 'none', fontSize: 10 }}
          formatter={(v: any) => [`${Number(v).toFixed(1)}${unit ?? ''}`, dataKey]} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function OverviewPage() {
  const { telemetry, history, connected } = useTelemetryStore()
  const t = telemetry

  const handleStart = () => api.start().catch(console.error)
  const handleStop = () => api.stop().catch(console.error)
  const handleEStop = () => api.emergencyStop().catch(console.error)
  const handleReset = () => api.reset().catch(console.error)

  return (
    <div className="grid-bg flex h-screen pt-[76px]" style={{ background: '#0a0f1e' }}>
      {/* LEFT SIDEBAR */}
      <div className="w-64 flex-shrink-0 overflow-y-auto p-3 flex flex-col gap-3"
           style={{ borderRight: '1px solid rgba(0,212,255,0.1)' }}>

        {/* Motor Status */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>MOTOR STATUS</div>
          <div className="flex items-center gap-2 mb-2">
            <div className="status-dot" style={{ background: stateColor(t?.state ?? 'OFF') }} />
            <span style={{ color: stateColor(t?.state ?? 'OFF'), fontWeight: 700, fontSize: 11 }}>
              {stateLabel(t?.state ?? 'OFF')}
            </span>
          </div>
          <div className="text-xs mb-1" style={{ color: '#475569' }}>
            Direction: <span style={{ color: '#94a3b8' }}>{t?.direction ?? '—'}</span>
          </div>
          <div className="text-xs mb-1" style={{ color: '#475569' }}>
            VFD Freq: <span style={{ color: '#00d4ff' }}>{fmt1(t?.vfd_frequency_hz)} Hz</span>
          </div>
          <div className="text-xs mb-3" style={{ color: '#475569' }}>
            Sim Time: <span style={{ color: '#94a3b8' }}>{fmt1(t?.sim_time)}s</span>
          </div>
          {/* Quick Controls */}
          <div className="grid grid-cols-2 gap-1.5">
            <button className="btn btn-green text-[10px] py-1.5" onClick={handleStart}>▶ START</button>
            <button className="btn btn-orange text-[10px] py-1.5" onClick={handleStop}>■ STOP</button>
            <button className="btn btn-red text-[10px] py-1.5 col-span-2" onClick={handleEStop}>⛔ E-STOP</button>
            <button className="btn btn-gray text-[10px] py-1.5 col-span-2" onClick={handleReset}>↺ RESET</button>
          </div>
        </div>

        {/* Electrical */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>
            <Zap size={10} className="inline mr-1" />ELECTRICAL
          </div>
          <MetricCard label="Speed" value={Math.abs(t?.mechanical.rotor_speed_rpm ?? 0).toFixed(0)} unit="RPM" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Current (Line)" value={fmt1(t?.electrical.i_line)} unit="A" color="#3b82f6" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Active Power" value={fmt2(t?.electrical.active_power_kw)} unit="kW" color="#8b5cf6" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Power Factor" value={fmt2(t?.electrical.power_factor)} color="#06b6d4" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Efficiency" value={fmt1(t?.energy.efficiency_pct)} unit="%" color="#22c55e" size="sm"/>
        </div>

        {/* Mechanical */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>
            <Activity size={10} className="inline mr-1"/>MECHANICAL
          </div>
          <MetricCard label="Slip" value={fmt2(t?.mechanical.slip_pct)} unit="%" color="#94a3b8" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Torque" value={fmt1(t?.mechanical.electromagnetic_torque_nm)} unit="Nm" color="#f59e0b" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Mech. Power" value={fmt2(t?.mechanical.mechanical_power_kw)} unit="kW" color="#8b5cf6" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Load" value={fmt1(t?.mechanical.load_percentage)} unit="%" color="#f97316" size="sm"/>
        </div>

        {/* Energy */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>⚡ ENERGY</div>
          <MetricCard label="Cumulative" value={fmt2(t?.energy.cumulative_kwh)} unit="kWh" color="#22c55e" size="sm"/>
          <div className="mt-1.5"/>
          <MetricCard label="Est. Cost" value={`$${(t?.energy.total_cost_usd ?? 0).toFixed(2)}`} color="#eab308" size="sm"/>
        </div>

        {/* RPM History */}
        <div className="panel p-3">
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>RPM TREND</div>
          <MiniChart data={history} dataKey="rpm" color="#00d4ff" unit=" RPM"/>
        </div>
        <div className="panel p-3">
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>WINDING TEMP TREND</div>
          <MiniChart data={history} dataKey="temp_winding" color="#f97316" unit="°C"/>
        </div>
      </div>

      {/* CENTER: 3D MOTOR */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Simulated disclaimer */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 4, padding: '3px 12px', fontSize: 10, color: '#fca5a5'
        }}>
          ⚠ ALL DISPLAYED VALUES ARE SIMULATED — EDUCATIONAL PLATFORM ONLY
        </div>
        {!connected && (
          <div style={{
            position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 4, padding: '4px 12px', fontSize: 10, color: '#ef4444'
          }}>
            🔴 NOT CONNECTED TO BACKEND — Start the backend first
          </div>
        )}
        <Motor3D />
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-64 flex-shrink-0 overflow-y-auto p-3 flex flex-col gap-3"
           style={{ borderLeft: '1px solid rgba(0,212,255,0.1)' }}>

        {/* Health */}
        <div className="panel p-3 flex flex-col items-center">
          <div className="text-xs font-bold mb-2 self-start" style={{ color: '#64748b', letterSpacing: '0.08em' }}>MOTOR HEALTH</div>
          <HealthGauge score={t?.condition.overall_health_score ?? 100} size={110} label="Overall Health"/>
          <div className="text-xs mt-1" style={{ color: '#475569' }}>
            RUL: <span style={{ color: '#94a3b8' }}>{(t?.condition.rul_hours ?? 0).toFixed(0)} hrs (est.)</span>
          </div>
        </div>

        {/* Component Health */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>COMPONENT HEALTH</div>
          {t && Object.entries(t.condition.component_health).map(([comp, score]) => {
            const col = score >= 85 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'
            return (
              <div key={comp} className="mb-1.5">
                <div className="flex justify-between text-xs mb-0.5">
                  <span style={{ color: '#94a3b8' }}>{comp.replace('_', ' ').toUpperCase()}</span>
                  <span style={{ color: col, fontWeight: 700 }}>{score.toFixed(0)}%</span>
                </div>
                <div style={{ background: '#1e293b', borderRadius: 2, height: 4 }}>
                  <div style={{ background: col, width: `${score}%`, height: 4, borderRadius: 2,
                    transition: 'width 0.5s', boxShadow: `0 0 6px ${col}` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Thermal */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>
            <Thermometer size={10} className="inline mr-1"/>THERMAL
          </div>
          {[
            { label: 'Winding', val: t?.thermal.t_winding, warn: 115, crit: 140 },
            { label: 'Bearing', val: t?.thermal.t_bearing_avg, warn: 75, crit: 90 },
            { label: 'Rotor', val: t?.thermal.t_rotor, warn: 120, crit: 150 },
            { label: 'Housing', val: t?.thermal.t_housing, warn: 70, crit: 85 },
          ].map(({ label, val, warn, crit }) => {
            const v = val ?? 25
            const col = v >= crit ? '#ef4444' : v >= warn ? '#f97316' : '#22c55e'
            return (
              <div key={label} className="flex justify-between text-xs mb-1">
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ color: col, fontWeight: 700 }}>{v.toFixed(1)}°C</span>
              </div>
            )
          })}
          <div className="flex justify-between text-xs mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#64748b' }}>Airflow</span>
            <span style={{ color: '#3b82f6' }}>{fmt1(t?.thermal.cooling_airflow_pct)}%</span>
          </div>
        </div>

        {/* Vibration */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>VIBRATION</div>
          <MetricCard label="RMS" value={fmt2(t?.vibration.rms_velocity_mms)} unit="mm/s" color="#eab308" size="sm"
            badge={{ text: t?.vibration.iso_severity_zone.split(' ')[1] ?? 'A', color: isoZoneColor(t?.vibration.iso_severity_zone ?? '') }}/>
          <div className="mt-1.5"/>
          <div className="text-xs" style={{ color: isoZoneColor(t?.vibration.iso_severity_zone ?? '') }}>
            {t?.vibration.iso_severity_zone ?? '—'}
          </div>
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>
            Dominant: <span style={{ color: '#94a3b8' }}>{fmt1(t?.vibration.dominant_frequency_hz)} Hz</span>
          </div>
        </div>

        {/* Active Faults */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#64748b', letterSpacing: '0.08em' }}>
            <AlertTriangle size={10} />ACTIVE FAULTS
          </div>
          {(t?.active_faults ?? []).length === 0 ? (
            <div className="text-xs text-green-neon">✓ No active faults</div>
          ) : (
            <div className="flex flex-col gap-1">
              {t!.active_faults.map(f => (
                <div key={f} style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3, padding: '3px 7px' }}>
                  ⚠ {f.replace(/_/g, ' ').toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="panel p-3">
          <div className="text-xs font-bold mb-2" style={{ color: '#64748b', letterSpacing: '0.08em' }}>RECOMMENDATIONS</div>
          {(t?.condition.recommendations ?? []).slice(0, 3).map((r, i) => (
            <div key={i} className="text-xs mb-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ color: r.urgency === 'High' ? '#ef4444' : r.urgency === 'Medium' ? '#f97316' : '#22c55e', fontWeight: 700, fontSize: 10 }}>
                [{r.urgency.toUpperCase()}]
              </div>
              <div style={{ color: '#94a3b8' }}>{r.action}</div>
              <div style={{ color: '#475569', marginTop: 1 }}>{r.component}</div>
            </div>
          ))}
        </div>

        {/* Vibration mini history */}
        <div className="panel p-3">
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>VIBE RMS TREND</div>
          <MiniChart data={history} dataKey="vibe_rms" color="#eab308" unit=" mm/s"/>
        </div>
      </div>
    </div>
  )
}
