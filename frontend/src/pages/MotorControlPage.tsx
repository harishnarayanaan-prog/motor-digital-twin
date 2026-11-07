// Motor Control Page – full VFD, load, direction, state machine controls
import { useState } from 'react'
import { useTelemetryStore } from '../store/telemetryStore'
import { api } from '../services/api'
import { MetricCard } from '../components/MetricCard'
import { fmt1, fmt2, stateColor, stateLabel } from '../utils/formatting'
import { Zap, RotateCcw, RotateCw, AlertOctagon, Square, Play } from 'lucide-react'

export function MotorControlPage() {
  const { telemetry } = useTelemetryStore()
  const t = telemetry

  const [freqInput, setFreqInput] = useState(50.0)
  const [loadInput, setLoadInput] = useState(75.0)
  const [msg, setMsg] = useState('')

  const send = (fn: () => Promise<any>, label: string) => {
    fn()
      .then(r => setMsg(`✓ ${label}: ${r.message ?? 'OK'}`))
      .catch(e => setMsg(`✗ Error: ${e.message}`))
  }

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="text-xs font-bold mb-4 text-neon tracking-widest">⚡ MOTOR CONTROL PANEL</div>

      <div className="grid grid-cols-12 gap-4">
        {/* Motor State & Commands */}
        <div className="col-span-4 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>OPERATING STATE</div>
            <div className="flex items-center gap-2 mb-4">
              <div className="status-dot" style={{ background: stateColor(t?.state ?? 'OFF'), width: 12, height: 12 }}/>
              <span style={{ color: stateColor(t?.state ?? 'OFF'), fontSize: 18, fontWeight: 800, fontFamily: 'monospace' }}>
                {stateLabel(t?.state ?? 'OFF')}
              </span>
            </div>

            {/* Primary Controls */}
            <div className="grid grid-cols-1 gap-2">
              <button className="btn btn-green py-3 text-sm"
                onClick={() => send(api.start, 'START')}>
                <Play size={16}/> START MOTOR
              </button>
              <button className="btn btn-orange py-2.5"
                onClick={() => send(api.stop, 'STOP')}>
                <Square size={14}/> CONTROLLED STOP
              </button>
              <button className="btn btn-red py-3 text-sm"
                onClick={() => send(api.emergencyStop, 'E-STOP')}>
                <AlertOctagon size={16}/> EMERGENCY STOP
              </button>
              <button className="btn btn-gray py-2"
                onClick={() => send(api.reset, 'RESET')}>
                ↺ RESET / CLEAR TRIP
              </button>
            </div>

            {msg && (
              <div className="mt-3 p-2 text-xs rounded" style={{
                background: msg.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${msg.startsWith('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: msg.startsWith('✓') ? '#22c55e' : '#ef4444'
              }}>
                {msg}
              </div>
            )}
          </div>

          {/* Direction Control */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>ROTATION DIRECTION</div>
            <div className="flex gap-2">
              <button className={`btn flex-1 py-2.5 ${t?.direction === 'Forward' ? 'btn-cyan' : 'btn-gray'}`}
                onClick={() => send(() => api.setDirection('Forward'), 'Direction Forward')}>
                <RotateCw size={14}/> FORWARD
              </button>
              <button className={`btn flex-1 py-2.5 ${t?.direction === 'Reverse' ? 'btn-orange' : 'btn-gray'}`}
                onClick={() => send(() => api.setDirection('Reverse'), 'Direction Reverse')}>
                <RotateCcw size={14}/> REVERSE
              </button>
            </div>
            <div className="text-xs mt-2" style={{ color: '#475569' }}>
              Current: <span style={{ color: '#00d4ff', fontWeight: 700 }}>{t?.direction ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* VFD Speed Control */}
        <div className="col-span-4 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-1" style={{ color: '#64748b' }}>
              <Zap size={10} className="inline mr-1"/>VFD FREQUENCY CONTROL
            </div>
            <div className="text-xs mb-3" style={{ color: '#475569' }}>
              Adjusts synchronous speed via Variable Frequency Drive simulation.
            </div>
            <div className="text-center mb-3">
              <span style={{ fontSize: 42, fontWeight: 800, color: '#00d4ff', fontFamily: 'monospace',
                textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>
                {freqInput.toFixed(1)}
              </span>
              <span style={{ fontSize: 16, color: '#475569' }}> Hz</span>
            </div>
            <input type="range" min={10} max={65} step={0.5} value={freqInput}
              onChange={e => setFreqInput(parseFloat(e.target.value))}
              className="w-full mb-3"
              style={{ accentColor: '#00d4ff' }}
            />
            <div className="flex justify-between text-xs mb-3" style={{ color: '#475569' }}>
              <span>10 Hz ({Math.round(120*10/4)} RPM)</span>
              <span>65 Hz ({Math.round(120*65/4)} RPM)</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {[25, 40, 50].map(f => (
                <button key={f} className="btn btn-cyan text-xs py-1.5"
                  onClick={() => { setFreqInput(f); send(() => api.setSpeed(f), `Speed ${f}Hz`) }}>
                  {f} Hz
                </button>
              ))}
            </div>
            <button className="btn btn-cyan w-full py-2.5"
              onClick={() => send(() => api.setSpeed(freqInput), `Speed ${freqInput}Hz`)}>
              Apply VFD Frequency
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="panel p-2">
                <div style={{ color: '#475569' }}>Sync Speed</div>
                <div style={{ color: '#00d4ff', fontWeight: 700 }}>{Math.round(120*freqInput/4)} RPM</div>
              </div>
              <div className="panel p-2">
                <div style={{ color: '#475569' }}>Actual Speed</div>
                <div style={{ color: '#3b82f6', fontWeight: 700 }}>{Math.abs(t?.mechanical.rotor_speed_rpm ?? 0).toFixed(0)} RPM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Load Control */}
        <div className="col-span-4 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-1" style={{ color: '#64748b' }}>MECHANICAL LOAD CONTROL</div>
            <div className="text-xs mb-3" style={{ color: '#475569' }}>
              Simulates driven machinery load (conveyor, pump, fan, etc.). Affects torque, slip, current, temperature.
            </div>
            <div className="text-center mb-3">
              <span style={{
                fontSize: 42, fontWeight: 800, fontFamily: 'monospace',
                color: loadInput > 115 ? '#ef4444' : loadInput > 100 ? '#f97316' : '#22c55e',
                textShadow: `0 0 20px ${loadInput > 115 ? 'rgba(239,68,68,0.5)' : loadInput > 100 ? 'rgba(249,115,22,0.5)' : 'rgba(34,197,94,0.3)'}`
              }}>
                {loadInput.toFixed(0)}
              </span>
              <span style={{ fontSize: 16, color: '#475569' }}> %</span>
            </div>
            <input type="range" min={0} max={150} step={1} value={loadInput}
              onChange={e => setLoadInput(parseFloat(e.target.value))}
              className="w-full mb-3"
              style={{ accentColor: loadInput > 115 ? '#ef4444' : loadInput > 100 ? '#f97316' : '#22c55e' }}
            />
            <div className="flex justify-between text-xs mb-3" style={{ color: '#475569' }}>
              <span>0% (No Load)</span>
              <span>100% (Rated)</span>
              <span style={{ color: '#ef4444' }}>150% (Overload)</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[25, 50, 75, 100].map(l => (
                <button key={l} className="btn btn-gray text-xs py-1.5"
                  onClick={() => { setLoadInput(l); send(() => api.setLoad(l), `Load ${l}%`) }}>
                  {l}%
                </button>
              ))}
            </div>
            <button className="btn btn-orange w-full py-2.5"
              onClick={() => send(() => api.setLoad(loadInput), `Load ${loadInput}%`)}>
              Apply Load
            </button>
            {loadInput > 115 && (
              <div className="mt-2 text-xs text-center" style={{ color: '#ef4444' }}>
                ⚠ OVERLOAD ZONE — Accelerates thermal degradation
              </div>
            )}
          </div>

          {/* Live Measurements */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>REAL-TIME RESPONSE</div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Speed" value={Math.abs(t?.mechanical.rotor_speed_rpm ?? 0).toFixed(0)} unit="RPM" size="sm"/>
              <MetricCard label="Slip" value={fmt2(t?.mechanical.slip_pct)} unit="%" color="#94a3b8" size="sm"/>
              <MetricCard label="Torque" value={fmt1(t?.mechanical.electromagnetic_torque_nm)} unit="Nm" color="#f59e0b" size="sm"/>
              <MetricCard label="Current" value={fmt1(t?.electrical.i_line)} unit="A" color="#3b82f6" size="sm"/>
              <MetricCard label="Power In" value={fmt2(t?.electrical.active_power_kw)} unit="kW" color="#8b5cf6" size="sm"/>
              <MetricCard label="Efficiency" value={fmt1(t?.energy.efficiency_pct)} unit="%" color="#22c55e" size="sm"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
