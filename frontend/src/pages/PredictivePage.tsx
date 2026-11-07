// Predictive Maintenance Page
import { useTelemetryStore } from '../store/telemetryStore'
import { HealthGauge } from '../components/HealthGauge'
import { healthColor } from '../utils/formatting'
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export function PredictivePage() {
  const { telemetry: t, history } = useTelemetryStore()
  const cond = t?.condition
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    api.getMaintenance().then(setMaintenanceRecords).catch(console.error)
  }, [])

  const addRecord = async () => {
    if (!newTitle.trim()) return
    await api.addMaintenance({
      title: newTitle,
      component: 'General',
      maintenance_type: 'Condition-Based',
      notes: newNote,
      status: 'Completed'
    })
    setNewTitle(''); setNewNote('')
    api.getMaintenance().then(setMaintenanceRecords).catch(console.error)
  }

  const urgencyColor = (u: string) => u === 'High' ? '#ef4444' : u === 'Medium' ? '#f97316' : '#22c55e'

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="text-xs font-bold mb-4 text-neon tracking-widest">🔮 PREDICTIVE MAINTENANCE MODULE</div>
      <div className="text-xs mb-4" style={{ color: '#475569' }}>
        ⚠ Health scores and RUL estimates are simulation-derived indicators only. Not validated industrial diagnostic models.
      </div>

      <div className="grid grid-cols-12 gap-4">

        {/* Health Gauges */}
        <div className="col-span-4">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>COMPONENT HEALTH SCORES</div>
            <div className="flex flex-wrap justify-center gap-6">
              <HealthGauge score={cond?.overall_health_score ?? 100} size={110} label="Overall"/>
              {cond && Object.entries(cond.component_health).map(([comp, score]) => (
                <HealthGauge key={comp} score={score} size={72}
                  label={comp.replace('_', ' ').replace(/(\w)(\w*)/g, (_, f, r) => f.toUpperCase() + r)}/>
              ))}
            </div>
            <div className="mt-4 text-xs text-center" style={{ color: '#475569' }}>
              Operating Hours: <span style={{ color: '#94a3b8', fontWeight: 700 }}>{cond?.operating_hours.toFixed(1) ?? '—'} hrs</span>
            </div>
            <div className="text-xs text-center" style={{ color: '#475569' }}>
              Estimated RUL: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{cond?.rul_hours.toFixed(0) ?? '—'} hrs</span>
            </div>
            <div className="text-xs text-center mt-1" style={{ color: '#475569' }}>
              {cond?.rul_label}
            </div>
          </div>

          {/* Health History */}
          <div className="panel p-4 mt-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>HEALTH SCORE TREND</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={history} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="sim_time" tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={v => `${v.toFixed(0)}s`}/>
                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }}/>
                <Tooltip contentStyle={{ background: '#0d1424', fontSize: 9 }}/>
                <Line type="monotone" dataKey="health_score" stroke="#22c55e" strokeWidth={2} dot={false} name="Health %"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anomalies & Recommendations */}
        <div className="col-span-4 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>
              ANOMALY INDICATORS ({cond?.anomaly_count ?? 0} detected)
            </div>
            {(cond?.anomalies ?? []).length === 0 ? (
              <div className="text-xs text-green-neon">✓ No anomalies detected. All parameters within normal thresholds.</div>
            ) : (
              cond!.anomalies.map((a, i) => (
                <div key={i} className="mb-3 p-3 rounded" style={{
                  background: a.severity === 'Critical' ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)',
                  border: `1px solid ${a.severity === 'Critical' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`
                }}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 11, fontWeight: 700, color: a.severity === 'Critical' ? '#ef4444' : '#f97316' }}>
                      {a.severity}: {a.category}
                    </span>
                    <span style={{ fontSize: 10, color: '#22c55e' }}>
                      {a.confidence_pct}% match
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{a.rule}</div>
                  <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{a.evidence}</div>
                </div>
              ))
            )}
          </div>

          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>MAINTENANCE RECOMMENDATIONS</div>
            {(cond?.recommendations ?? []).map((r, i) => (
              <div key={i} className="mb-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 10, fontWeight: 700, color: urgencyColor(r.urgency),
                    background: `${urgencyColor(r.urgency)}18`, border: `1px solid ${urgencyColor(r.urgency)}44`,
                    borderRadius: 3, padding: '1px 6px' }}>
                    {r.urgency.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{r.component}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{r.action}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{r.rationale}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance History */}
        <div className="col-span-4 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>MAINTENANCE LOG</div>
            <div className="flex flex-col gap-1 mb-3">
              <input className="text-xs p-2 rounded w-full" value={newTitle}
                onChange={e => setNewTitle(e.target.value)} placeholder="Activity title..."
                style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#94a3b8' }}/>
              <textarea className="text-xs p-2 rounded w-full" value={newNote} rows={2}
                onChange={e => setNewNote(e.target.value)} placeholder="Notes / observations..."
                style={{ background: '#1e293b', border: '1px solid rgba(0,212,255,0.2)', color: '#94a3b8', resize: 'none' }}/>
              <button className="btn btn-cyan w-full text-xs py-2" onClick={addRecord}>+ Log Activity</button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 400 }}>
              {maintenanceRecords.map((r: any) => (
                <div key={r.id} className="panel p-3">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{r.title}</span>
                    <span style={{ fontSize: 9, color: '#475569' }}>{r.date_str}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#475569' }}>
                    <span style={{ color: '#64748b' }}>{r.component}</span> · {r.maintenance_type} · {r.technician}
                  </div>
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{r.notes}</div>
                  <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>✓ {r.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
