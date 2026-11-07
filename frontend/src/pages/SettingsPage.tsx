// Settings & Motor Configuration Page
import { useState, useEffect } from 'react'
import { api } from '../services/api'

export function SettingsPage() {
  const [config, setConfig] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.getConfig().then(setConfig)
    api.getSettings().then(setSettings)
  }, [])

  const saveConfig = async () => {
    try {
      await api.updateConfig(config)
      setMsg('✓ Motor configuration saved successfully.')
    } catch (e: any) { setMsg(`✗ ${e.message}`) }
  }

  const saveSettings = async () => {
    try {
      await api.updateSettings(settings)
      setMsg('✓ Simulation settings applied.')
    } catch (e: any) { setMsg(`✗ ${e.message}`) }
  }

  if (!config || !settings) return (
    <div className="pt-[76px] p-8 text-neon text-sm">Loading configuration...</div>
  )

  const Field = ({ label, field, type = 'number', step = 0.01 }: any) => (
    <div className="mb-3">
      <div className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</div>
      <input type={type} step={step} value={config[field] ?? ''} className="text-xs p-2 w-full rounded"
        onChange={e => setConfig((p: any) => ({ ...p, [field]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
        style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', fontFamily: 'monospace' }}/>
    </div>
  )

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="text-xs font-bold mb-4 text-neon tracking-widest">⚙ SETTINGS — MOTOR CONFIG & SIMULATION</div>

      {msg && (
        <div className="mb-4 p-2 text-xs rounded" style={{
          background: msg.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.startsWith('✓') ? '#22c55e' : '#ef4444'
        }}>{msg}</div>
      )}

      <div className="grid grid-cols-12 gap-4">

        {/* Motor Parameters */}
        <div className="col-span-5 panel p-4">
          <div className="text-xs font-bold mb-4" style={{ color: '#64748b' }}>MOTOR NAMEPLATE PARAMETERS</div>
          <div className="text-xs mb-3 p-2 rounded" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)', color: '#475569' }}>
            Configurable demonstration values. Not manufacturer-certified specifications.
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Name" field="name" type="text"/>
            <Field label="Rated Power (kW)" field="rated_power_kw"/>
            <Field label="Rated Voltage (V LL)" field="rated_voltage_v" step={1}/>
            <Field label="Rated Frequency (Hz)" field="rated_frequency_hz" step={1}/>
            <Field label="Number of Poles" field="num_poles" step={2}/>
            <Field label="Rated Speed (RPM)" field="rated_speed_rpm" step={10}/>
            <Field label="Rated Power Factor" field="rated_power_factor"/>
            <Field label="Rated Efficiency (%)" field="rated_efficiency_pct"/>
            <Field label="Stator R1 (Ω)" field="r1"/>
            <Field label="Stator X1 (Ω)" field="x1"/>
            <Field label="Rotor R2' (Ω)" field="r2_prime"/>
            <Field label="Rotor X2' (Ω)" field="x2_prime"/>
            <Field label="Magnetizing Xm (Ω)" field="xm" step={1}/>
            <Field label="Core Rc (Ω)" field="rc" step={10}/>
            <Field label="Inertia J (kg·m²)" field="inertia_j" step={0.001}/>
            <Field label="Friction B (N·m·s/rad)" field="friction_b" step={0.0001}/>
          </div>
          <button className="btn btn-cyan w-full mt-2" onClick={saveConfig}>Save Motor Configuration</button>
        </div>

        {/* Simulation Settings */}
        <div className="col-span-4 panel p-4">
          <div className="text-xs font-bold mb-4" style={{ color: '#64748b' }}>SIMULATION SETTINGS</div>
          <div className="mb-3">
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>Simulation Speed Multiplier</div>
            <input type="number" step="0.1" min="0.1" max="5.0"
              value={settings.simulation_speed}
              onChange={e => setSettings((p: any) => ({ ...p, simulation_speed: parseFloat(e.target.value) }))}
              className="text-xs p-2 w-full rounded"
              style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', fontFamily: 'monospace' }}/>
          </div>
          <div className="mb-3">
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>Ambient Temperature (°C)</div>
            <input type="number" step="1" min="-20" max="60"
              value={settings.ambient_temperature}
              onChange={e => setSettings((p: any) => ({ ...p, ambient_temperature: parseFloat(e.target.value) }))}
              className="text-xs p-2 w-full rounded"
              style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#f97316', fontFamily: 'monospace' }}/>
          </div>
          <div className="mb-3">
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>Nominal Supply Voltage (V LL)</div>
            <input type="number" step="1" min="200" max="500"
              value={settings.supply_voltage_nominal}
              onChange={e => setSettings((p: any) => ({ ...p, supply_voltage: parseFloat(e.target.value) }))}
              className="text-xs p-2 w-full rounded"
              style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#3b82f6', fontFamily: 'monospace' }}/>
          </div>
          <div className="mb-3">
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>Random Seed (for reproducibility)</div>
            <input type="number" step="1"
              value={settings.random_seed}
              onChange={e => setSettings((p: any) => ({ ...p, random_seed: parseInt(e.target.value) }))}
              className="text-xs p-2 w-full rounded"
              style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#8b5cf6', fontFamily: 'monospace' }}/>
          </div>
          <div className="mb-4 flex items-center gap-2">
            <input type="checkbox" id="pause" checked={settings.is_paused}
              onChange={e => setSettings((p: any) => ({ ...p, is_paused: e.target.checked }))}
              style={{ accentColor: '#00d4ff' }}/>
            <label htmlFor="pause" className="text-xs" style={{ color: '#94a3b8' }}>Pause Simulation</label>
          </div>
          <button className="btn btn-cyan w-full" onClick={saveSettings}>Apply Simulation Settings</button>
        </div>

        {/* About */}
        <div className="col-span-3 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>ABOUT THIS PLATFORM</div>
            <div className="text-xs" style={{ color: '#475569', lineHeight: 1.7 }}>
              <div className="mb-2 text-neon font-bold">Electric Motor Digital Twin v2.0</div>
              <div className="mb-2">An intelligent induction motor simulation, condition monitoring, and predictive maintenance engineering platform.</div>
              <div className="mb-2">Technology stack:<br/>• Python FastAPI backend<br/>• Pydantic & SQLAlchemy<br/>• SQLite persistence<br/>• React + TypeScript frontend<br/>• Vite + Tailwind CSS<br/>• Three.js / React Three Fiber<br/>• Recharts visualizations<br/>• WebSocket real-time streaming</div>
              <div className="mb-2 p-2 rounded" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                DISCLAIMER: Educational simulation only. Not a certified motor protection, industrial control or safety system. All measurements are simulated.
              </div>
            </div>
          </div>
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>SYSTEM INFO</div>
            <div className="text-xs" style={{ color: '#475569', lineHeight: 1.8 }}>
              <div>Backend: <span style={{ color: '#00d4ff' }}>http://localhost:8000</span></div>
              <div>Docs: <span style={{ color: '#00d4ff' }}>http://localhost:8000/docs</span></div>
              <div>WebSocket: <span style={{ color: '#00d4ff' }}>ws://localhost:8000/ws/telemetry</span></div>
              <div>DB: <span style={{ color: '#94a3b8' }}>SQLite (motor_digital_twin.db)</span></div>
              <div>Sim Rate: <span style={{ color: '#94a3b8' }}>10 Hz</span></div>
              <div>Motor Model: <span style={{ color: '#94a3b8' }}>3-Phase SCIM (Thevenin Equiv.)</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
