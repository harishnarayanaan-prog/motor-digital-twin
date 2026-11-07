// Energy Analytics Page
import { useTelemetryStore } from '../store/telemetryStore'
import { fmt2, fmt3 } from '../utils/formatting'
import { useState } from 'react'
import { api } from '../services/api'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts'
import { Download } from 'lucide-react'

export function EnergyPage() {
  const { telemetry: t, history } = useTelemetryStore()
  const energy = t?.energy
  const [comparison, setComparison] = useState<any>(null)
  const [compInput, setCompInput] = useState({
    kw_a: 4.8, eff_a: 89.2, pf_a: 0.86, kw_b: 5.6, eff_b: 82.5, pf_b: 0.78, operating_hours: 4000.0, tariff: 0.14
  })

  const runComparison = () => {
    api.compareEnergy(compInput).then(setComparison).catch(console.error)
  }

  const lossPieData = energy ? [
    { name: 'Stator Cu Loss', value: energy.loss_breakdown_w.stator_copper_loss, color: '#3b82f6' },
    { name: 'Rotor Cu Loss', value: energy.loss_breakdown_w.rotor_copper_loss, color: '#8b5cf6' },
    { name: 'Core Iron Loss', value: energy.loss_breakdown_w.core_iron_loss, color: '#f59e0b' },
    { name: 'Friction/Wind.', value: energy.loss_breakdown_w.friction_windage_loss, color: '#ef4444' },
    { name: 'Stray Loss', value: energy.loss_breakdown_w.stray_load_loss, color: '#06b6d4' },
  ].filter(d => d.value > 0) : []

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold text-neon tracking-widest">⚡ ENERGY EFFICIENCY ANALYTICS</div>
        <a href={api.exportCSV('telemetry')} download>
          <button className="btn btn-cyan text-xs"><Download size={12}/> Export CSV</button>
        </a>
      </div>

      <div className="grid grid-cols-12 gap-4">

        {/* KPIs */}
        <div className="col-span-3 flex flex-col gap-3">
          {[
            { label: 'Input Power', val: fmt3(energy?.p_input_kw), unit: 'kW', color: '#8b5cf6' },
            { label: 'Mech. Output', val: fmt3(energy?.p_output_mech_kw), unit: 'kW', color: '#22c55e' },
            { label: 'Total Losses', val: fmt3(energy?.total_losses_kw), unit: 'kW', color: '#ef4444' },
            { label: 'Efficiency', val: fmt2(energy?.efficiency_pct), unit: '%', color: '#22c55e' },
            { label: 'Cumulative kWh', val: fmt2(energy?.cumulative_kwh), unit: 'kWh', color: '#00d4ff' },
            { label: 'Est. Total Cost', val: `$${(energy?.total_cost_usd ?? 0).toFixed(2)}`, unit: '', color: '#eab308' },
            { label: 'Hourly Cost', val: `$${(energy?.hourly_cost_rate_usd ?? 0).toFixed(3)}`, unit: '/hr', color: '#f97316' },
            { label: 'Tariff', val: `$${(energy?.tariff_per_kwh ?? 0).toFixed(3)}`, unit: '/kWh', color: '#64748b' },
          ].map(item => (
            <div key={item.label} className="panel p-3">
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: 'monospace',
                textShadow: `0 0 10px ${item.color}44` }}>
                {item.val}<span style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}> {item.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Loss Pie + Loss Breakdown */}
        <div className="col-span-3 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>LOSS BREAKDOWN (Watts)</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={lossPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                  paddingAngle={3} dataKey="value" nameKey="name">
                  {lossPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none"/>
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d1424', fontSize: 10 }}
                  formatter={(v: any) => [`${v.toFixed(1)} W`, '']}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
              </PieChart>
            </ResponsiveContainer>
            {lossPieData.map(d => (
              <div key={d.name} className="flex justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 8, height: 8, background: d.color, borderRadius: 2 }}/>
                  <span style={{ color: '#64748b' }}>{d.name}</span>
                </div>
                <span style={{ color: d.color, fontWeight: 700 }}>{d.value.toFixed(1)} W</span>
              </div>
            ))}
          </div>
        </div>

        {/* Power Trend Chart */}
        <div className="col-span-6 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>POWER & EFFICIENCY TREND</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-p" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="sim_time" tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={v => `${v.toFixed(0)}s`}/>
                <YAxis yAxisId="p" tick={{ fill: '#475569', fontSize: 8 }}/>
                <YAxis yAxisId="e" orientation="right" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }}/>
                <Tooltip contentStyle={{ background: '#0d1424', fontSize: 10 }}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
                <Area yAxisId="p" type="monotone" dataKey="power_kw" stroke="#8b5cf6" fill="url(#g-p)"
                  strokeWidth={2} dot={false} name="Power kW"/>
                <Area yAxisId="e" type="monotone" dataKey="efficiency_pct" stroke="#22c55e"
                  fill="none" strokeWidth={2} dot={false} name="Efficiency %"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario Comparison */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>SCENARIO COMPARISON (Healthy vs Faulty)</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {(['a', 'b'] as const).map(key => (
                <div key={key}>
                  <div className="text-xs font-bold mb-2" style={{ color: key === 'a' ? '#22c55e' : '#ef4444' }}>
                    Scenario {key.toUpperCase()} {key === 'a' ? '(Baseline)' : '(Degraded)'}
                  </div>
                  {[
                    { field: `kw_${key}`, label: 'Input Power kW', min: 0.5, max: 20 },
                    { field: `eff_${key}`, label: 'Efficiency %', min: 20, max: 97 },
                    { field: `pf_${key}`, label: 'Power Factor', min: 0.3, max: 0.99 },
                  ].map(({ field, label, min, max }) => (
                    <div key={field} className="mb-2">
                      <div className="text-xs mb-0.5" style={{ color: '#475569' }}>{label}</div>
                      <input type="number" step="0.01" min={min} max={max}
                        value={(compInput as any)[field]}
                        onChange={e => setCompInput(prev => ({ ...prev, [field]: parseFloat(e.target.value) }))}
                        className="text-xs p-1.5 w-full rounded" style={{
                          background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)',
                          color: '#00d4ff', fontFamily: 'monospace'
                        }}/>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Annual Operating Hours</div>
                <input type="number" value={compInput.operating_hours} className="text-xs p-1.5 w-full rounded"
                  onChange={e => setCompInput(p => ({ ...p, operating_hours: parseFloat(e.target.value) }))}
                  style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#94a3b8' }}/>
              </div>
              <div>
                <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Tariff $/kWh</div>
                <input type="number" step="0.01" value={compInput.tariff} className="text-xs p-1.5 w-full rounded"
                  onChange={e => setCompInput(p => ({ ...p, tariff: parseFloat(e.target.value) }))}
                  style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#94a3b8' }}/>
              </div>
            </div>
            <button className="btn btn-cyan w-full mb-4" onClick={runComparison}>Run Comparison</button>

            {comparison && (
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="panel p-3" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
                  <div className="font-bold mb-1" style={{ color: '#22c55e' }}>Scenario A (Baseline)</div>
                  <div>Input: <b>{comparison.scenario_a.input_power_kw} kW</b></div>
                  <div>Eff: <b>{comparison.scenario_a.efficiency_pct}%</b></div>
                  <div>Annual kWh: <b>{comparison.scenario_a.annual_kwh.toFixed(0)}</b></div>
                  <div>Annual Cost: <b style={{ color: '#22c55e' }}>${comparison.scenario_a.annual_cost_usd.toFixed(0)}</b></div>
                </div>
                <div className="panel p-3" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                  <div className="font-bold mb-1" style={{ color: '#ef4444' }}>Scenario B (Degraded)</div>
                  <div>Input: <b>{comparison.scenario_b.input_power_kw} kW</b></div>
                  <div>Eff: <b>{comparison.scenario_b.efficiency_pct}%</b></div>
                  <div>Annual kWh: <b>{comparison.scenario_b.annual_kwh.toFixed(0)}</b></div>
                  <div>Annual Cost: <b style={{ color: '#ef4444' }}>${comparison.scenario_b.annual_cost_usd.toFixed(0)}</b></div>
                </div>
                <div className="panel p-3" style={{ borderColor: 'rgba(249,115,22,0.3)' }}>
                  <div className="font-bold mb-1" style={{ color: '#f97316' }}>Difference (B - A)</div>
                  <div>Extra kWh: <b>{comparison.difference.annual_kwh_delta.toFixed(0)}</b></div>
                  <div>Extra Cost: <b style={{ color: '#ef4444' }}>${comparison.difference.annual_cost_delta_usd.toFixed(0)}</b></div>
                  <div>Eff Δ: <b>{comparison.difference.efficiency_delta_pct.toFixed(1)}%</b></div>
                  <div>Cost Increase: <b style={{ color: '#ef4444' }}>{comparison.difference.cost_increase_pct.toFixed(1)}%</b></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
