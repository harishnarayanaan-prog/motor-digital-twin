// Thermal Monitoring Page
import { useTelemetryStore } from '../store/telemetryStore'
import { fmt1, fmt2 } from '../utils/formatting'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

function ThermalBar({ label, temp, warn, crit, ambient }: {
  label: string; temp: number; warn: number; crit: number; ambient: number
}) {
  const range = crit - ambient
  const pct = Math.min(100, Math.max(0, ((temp - ambient) / range) * 100))
  const color = temp >= crit ? '#ef4444' : temp >= warn ? '#f97316' : '#22c55e'

  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#94a3b8' }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>{temp.toFixed(1)}°C</span>
      </div>
      <div className="relative" style={{ background: '#1e293b', borderRadius: 4, height: 12 }}>
        {/* Warning line */}
        <div style={{
          position: 'absolute', left: `${((warn - ambient) / range) * 100}%`,
          top: 0, height: '100%', width: 1, background: '#f97316', opacity: 0.7
        }}/>
        {/* Critical line */}
        <div style={{
          position: 'absolute', left: `${((crit - ambient) / range) * 100}%`,
          top: 0, height: '100%', width: 1, background: '#ef4444', opacity: 0.7
        }}/>
        <div style={{
          background: color, width: `${pct}%`, height: 12, borderRadius: 4,
          transition: 'width 0.5s, background 0.3s',
          boxShadow: `0 0 8px ${color}66`
        }}/>
      </div>
      <div className="flex justify-between text-xs mt-0.5" style={{ color: '#475569' }}>
        <span>{ambient.toFixed(0)}°C</span>
        <span style={{ color: '#f97316' }}>⚠{warn.toFixed(0)}°C</span>
        <span style={{ color: '#ef4444' }}>✕{crit.toFixed(0)}°C</span>
      </div>
    </div>
  )
}

export function ThermalPage() {
  const { telemetry: t, history } = useTelemetryStore()
  const th = t?.thermal
  const ambient = th?.ambient_temp ?? 25

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="text-xs font-bold mb-4 text-neon tracking-widest">🌡 THERMAL MONITORING — 5-NODE MODEL</div>

      <div className="grid grid-cols-12 gap-4">

        {/* Temperature Bars */}
        <div className="col-span-4 panel p-4">
          <div className="text-xs font-bold mb-4" style={{ color: '#64748b' }}>TEMPERATURE NODES</div>
          <ThermalBar label="Stator Winding (Tw)" temp={th?.t_winding ?? ambient} warn={115} crit={140} ambient={ambient}/>
          <ThermalBar label="Stator Core (Ts)" temp={th?.t_stator ?? ambient} warn={110} crit={135} ambient={ambient}/>
          <ThermalBar label="Rotor (Tr)" temp={th?.t_rotor ?? ambient} warn={120} crit={150} ambient={ambient}/>
          <ThermalBar label="Drive-End Bearing" temp={th?.t_bearing_de ?? ambient} warn={75} crit={90} ambient={ambient}/>
          <ThermalBar label="NDE Bearing" temp={th?.t_bearing_nde ?? ambient} warn={75} crit={90} ambient={ambient}/>
          <ThermalBar label="Motor Housing" temp={th?.t_housing ?? ambient} warn={70} crit={85} ambient={ambient}/>

          {/* Losses */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>HEAT SOURCES (W)</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Stator Cu: <span style={{ color: '#3b82f6', fontWeight: 700 }}>{fmt1(th?.p_cu_stator_w)}</span></div>
              <div>Rotor Cu: <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{fmt1(th?.p_cu_rotor_w)}</span></div>
              <div>Core Iron: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{fmt1(th?.p_core_w)}</span></div>
              <div>Total Loss: <span style={{ color: '#ef4444', fontWeight: 700 }}>{fmt1(th?.p_losses_total_w)}</span></div>
            </div>
            <div className="mt-2">
              Cooling Airflow: <span style={{ color: '#00d4ff', fontWeight: 700 }}>{fmt1(th?.cooling_airflow_pct)}%</span>
            </div>
          </div>
        </div>

        {/* Thermal History Chart */}
        <div className="col-span-8 flex flex-col gap-4">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>TEMPERATURE TRENDS — TIME SERIES (°C)</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={history} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="sim_time" tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={v => `${v.toFixed(0)}s`}/>
                <YAxis tick={{ fill: '#475569', fontSize: 8 }}/>
                <Tooltip contentStyle={{ background: '#0d1424', fontSize: 10 }}
                  formatter={(v: any) => [`${v.toFixed(1)}°C`, '']}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
                <ReferenceLine y={115} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Winding Warn', fontSize: 9, fill: '#f97316' }}/>
                <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Winding Crit', fontSize: 9, fill: '#ef4444' }}/>
                <Line type="monotone" dataKey="temp_winding" stroke="#f97316" strokeWidth={2} dot={false} name="Winding °C"/>
                <Line type="monotone" dataKey="temp_bearing" stroke="#ef4444" strokeWidth={2} dot={false} name="Bearing °C"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Thermal alerts */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>THERMAL ALERTS</div>
            {(th?.alerts ?? []).length === 0 ? (
              <div className="text-xs text-green-neon">✓ All thermal parameters within safe limits.</div>
            ) : (
              th!.alerts.map((a, i) => (
                <div key={i} className="mb-2 p-2 rounded text-xs" style={{
                  background: a.level === 'Critical' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.08)',
                  border: `1px solid ${a.level === 'Critical' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`
                }}>
                  <span style={{ color: a.level === 'Critical' ? '#ef4444' : '#f97316', fontWeight: 700 }}>
                    [{a.level}] {a.node}:
                  </span> {a.temp.toFixed(1)}°C
                </div>
              ))
            )}
          </div>

          {/* Thermal model explanation */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>THERMAL MODEL DESCRIPTION</div>
            <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.7 }}>
              Implements a 5-node lumped-parameter thermal network. Heat sources: stator copper loss (I²R₁),
              rotor copper loss (slip × airgap power), core iron loss, bearing friction. Cooling modeled as
              forced convection from shaft-driven fan proportional to rotor speed^0.8. Thermal mass (capacitance)
              and inter-node resistances produce realistic dynamic temperature rise and cooling transients.
              Thermal derating activates at winding temperature &gt; thermal class threshold.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
