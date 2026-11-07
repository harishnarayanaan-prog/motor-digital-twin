// Live Electrical & Mechanical Monitoring Page with real-time Recharts
import { useTelemetryStore } from '../store/telemetryStore'
import { fmt1, fmt2, fmt3 } from '../utils/formatting'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-bold mb-3 text-neon tracking-widest">{title}</div>
}

function ValueRow({ label, value, unit, color = '#94a3b8' }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>
        {value}{unit ? <span style={{ fontSize: 10, color: '#475569', fontWeight: 400 }}> {unit}</span> : null}
      </span>
    </div>
  )
}

export function LiveMonitoringPage() {
  const { telemetry: t, history } = useTelemetryStore()

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="text-xs font-bold mb-4 text-neon tracking-widest">⚡ LIVE ELECTRICAL & MECHANICAL MONITORING</div>
      <div className="text-xs mb-4" style={{ color: '#475569' }}>⚠ All values are simulated. Sampling rate: 10 Hz</div>

      <div className="grid grid-cols-12 gap-4">

        {/* Electrical Panel */}
        <div className="col-span-3 flex flex-col gap-3">
          <div className="panel p-4">
            <SectionHeader title="⚡ PHASE VOLTAGES (V RMS)"/>
            <ValueRow label="Phase A (Va)" value={fmt1(t?.electrical.va)} unit="V" color="#3b82f6"/>
            <ValueRow label="Phase B (Vb)" value={fmt1(t?.electrical.vb)} unit="V" color="#22c55e"/>
            <ValueRow label="Phase C (Vc)" value={fmt1(t?.electrical.vc)} unit="V" color="#f59e0b"/>
            <ValueRow label="Line V (VLL)" value={fmt1(t?.electrical.v_line_to_line)} unit="V" color="#00d4ff"/>
          </div>
          <div className="panel p-4">
            <SectionHeader title="⚡ PHASE CURRENTS (A RMS)"/>
            <ValueRow label="Phase A (Ia)" value={fmt1(t?.electrical.ia)} unit="A" color="#3b82f6"/>
            <ValueRow label="Phase B (Ib)" value={fmt1(t?.electrical.ib)} unit="A" color="#22c55e"/>
            <ValueRow label="Phase C (Ic)" value={fmt1(t?.electrical.ic)} unit="A" color="#f59e0b"/>
            <ValueRow label="Line Current" value={fmt1(t?.electrical.i_line)} unit="A" color="#00d4ff"/>
          </div>
          <div className="panel p-4">
            <SectionHeader title="⚡ POWER & QUALITY"/>
            <ValueRow label="Active Power (P)" value={fmt3(t?.electrical.active_power_kw)} unit="kW" color="#8b5cf6"/>
            <ValueRow label="Reactive Power (Q)" value={fmt3(t?.electrical.reactive_power_kvar)} unit="kVAr" color="#06b6d4"/>
            <ValueRow label="Apparent Power (S)" value={fmt3(t?.electrical.apparent_power_kva)} unit="kVA" color="#94a3b8"/>
            <ValueRow label="Power Factor" value={fmt3(t?.electrical.power_factor)} color="#22c55e"/>
            <ValueRow label="Frequency" value={fmt1(t?.electrical.frequency_hz)} unit="Hz" color="#00d4ff"/>
            <ValueRow label="V Imbalance" value={fmt2(t?.electrical.voltage_imbalance_pct)} unit="%" color={
              (t?.electrical.voltage_imbalance_pct ?? 0) > 5 ? '#ef4444' :
              (t?.electrical.voltage_imbalance_pct ?? 0) > 2 ? '#f97316' : '#22c55e'
            }/>
          </div>
        </div>

        {/* Mechanical Panel */}
        <div className="col-span-3 flex flex-col gap-3">
          <div className="panel p-4">
            <SectionHeader title="⚙ SPEED & SLIP"/>
            <ValueRow label="Rotor Speed" value={Math.abs(t?.mechanical.rotor_speed_rpm ?? 0).toFixed(1)} unit="RPM" color="#00d4ff"/>
            <ValueRow label="Synchronous Ns" value={fmt1(t?.mechanical.target_synchronous_rpm)} unit="RPM" color="#94a3b8"/>
            <ValueRow label="Slip (s)" value={fmt3(t?.mechanical.slip)} color="#eab308"/>
            <ValueRow label="Slip (%)" value={fmt2(t?.mechanical.slip_pct)} unit="%" color="#eab308"/>
            <ValueRow label="Angular ω" value={fmt2(t?.mechanical.angular_velocity_rad_s)} unit="rad/s" color="#94a3b8"/>
            <ValueRow label="Acceleration" value={fmt1(t?.mechanical.acceleration_rad_s2)} unit="rad/s²" color="#64748b"/>
          </div>
          <div className="panel p-4">
            <SectionHeader title="⚙ TORQUE & POWER"/>
            <ValueRow label="Electromagnetic Te" value={fmt1(t?.mechanical.electromagnetic_torque_nm)} unit="Nm" color="#f59e0b"/>
            <ValueRow label="Load Torque TL" value={fmt1(t?.mechanical.load_torque_nm)} unit="Nm" color="#f97316"/>
            <ValueRow label="Rated Torque" value={fmt1(t?.mechanical.rated_torque_nm)} unit="Nm" color="#64748b"/>
            <ValueRow label="Load %" value={fmt1(t?.mechanical.load_percentage)} unit="%" color="#f97316"/>
            <ValueRow label="Mech. Power" value={fmt3(t?.mechanical.mechanical_power_kw)} unit="kW" color="#22c55e"/>
            <ValueRow label="Mech. Efficiency" value={fmt1(t?.energy.efficiency_pct)} unit="%" color="#22c55e"/>
          </div>
        </div>

        {/* Charts */}
        <div className="col-span-6 flex flex-col gap-3">
          {/* RPM & Torque vs Time */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>RPM & TORQUE — TIME SERIES</div>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={history} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="sim_time" tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => `${v.toFixed(0)}s`}/>
                <YAxis yAxisId="rpm" tick={{ fill: '#475569', fontSize: 9 }} />
                <YAxis yAxisId="torque" orientation="right" tick={{ fill: '#475569', fontSize: 9 }} />
                <Tooltip contentStyle={{ background: '#0d1424', border: '1px solid rgba(0,212,255,0.2)', fontSize: 10 }}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
                <Line yAxisId="rpm" type="monotone" dataKey="rpm" stroke="#00d4ff" strokeWidth={2} dot={false} name="RPM"/>
                <Line yAxisId="torque" type="monotone" dataKey="torque_nm" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Torque Nm"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Current & Power */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>CURRENT & ACTIVE POWER — TIME SERIES</div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={history} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-ia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="g-pw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="sim_time" tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => `${v.toFixed(0)}s`}/>
                <YAxis yAxisId="curr" tick={{ fill: '#475569', fontSize: 9 }}/>
                <YAxis yAxisId="pow" orientation="right" tick={{ fill: '#475569', fontSize: 9 }}/>
                <Tooltip contentStyle={{ background: '#0d1424', border: '1px solid rgba(0,212,255,0.2)', fontSize: 10 }}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
                <Area yAxisId="curr" type="monotone" dataKey="current_a" stroke="#3b82f6" fill="url(#g-ia)" strokeWidth={1.5} dot={false} name="Current A"/>
                <Area yAxisId="pow" type="monotone" dataKey="power_kw" stroke="#8b5cf6" fill="url(#g-pw)" strokeWidth={1.5} dot={false} name="Power kW"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Efficiency & Health */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>EFFICIENCY & HEALTH SCORE — TIME SERIES</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={history} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="sim_time" tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => `${v.toFixed(0)}s`}/>
                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }}/>
                <Tooltip contentStyle={{ background: '#0d1424', border: '1px solid rgba(0,212,255,0.2)', fontSize: 10 }}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
                <ReferenceLine y={85} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Min. Eff', fontSize: 9, fill: '#f97316' }}/>
                <Line type="monotone" dataKey="efficiency_pct" stroke="#22c55e" strokeWidth={2} dot={false} name="Efficiency %"/>
                <Line type="monotone" dataKey="health_score" stroke="#00d4ff" strokeWidth={1.5} dot={false} name="Health Score"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
