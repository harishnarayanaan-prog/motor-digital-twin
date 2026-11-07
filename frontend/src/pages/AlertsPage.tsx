// Alerts Management Page
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { severityColor } from '../utils/formatting'
import { Download, CheckCircle, XCircle, Filter } from 'lucide-react'

export function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [filterSev, setFilterSev] = useState('')
  const [filterAck, setFilterAck] = useState<boolean | undefined>(undefined)

  const load = () => {
    const params: any = {}
    if (filterSev) params.severity = filterSev
    if (filterAck !== undefined) params.acknowledged = filterAck
    api.getAlerts(params).then(d => setAlerts(d.alerts)).catch(console.error)
  }

  useEffect(() => { load() }, [filterSev, filterAck])
  useEffect(() => {
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [filterSev, filterAck])

  const ack = async (id: string) => {
    await api.acknowledgeAlert(id)
    load()
  }
  const resolve = async (id: string) => {
    await api.resolveAlert(id)
    load()
  }

  const sevs = ['', 'Emergency', 'Critical', 'Warning', 'Info']

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold text-neon tracking-widest">🚨 ALERT MANAGEMENT</div>
        <div className="flex items-center gap-2">
          <a href={api.exportCSV('alerts')} download>
            <button className="btn btn-cyan text-xs"><Download size={12}/> Export Alerts</button>
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="panel p-3 mb-4 flex gap-3 items-center flex-wrap">
        <Filter size={12} style={{ color: '#64748b' }}/>
        <span className="text-xs" style={{ color: '#64748b' }}>Filter:</span>
        <div className="flex gap-1">
          {sevs.map(s => (
            <button key={s} onClick={() => setFilterSev(s)}
              className={`btn text-xs py-1 px-2.5 ${filterSev === s ? 'btn-cyan' : 'btn-gray'}`}>
              {s || 'All Levels'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setFilterAck(undefined)} className={`btn text-xs py-1 px-2.5 ${filterAck === undefined ? 'btn-cyan' : 'btn-gray'}`}>All</button>
          <button onClick={() => setFilterAck(false)} className={`btn text-xs py-1 px-2.5 ${filterAck === false ? 'btn-orange' : 'btn-gray'}`}>Unacknowledged</button>
          <button onClick={() => setFilterAck(true)} className={`btn text-xs py-1 px-2.5 ${filterAck === true ? 'btn-green' : 'btn-gray'}`}>Acknowledged</button>
        </div>
        <span className="text-xs ml-auto" style={{ color: '#64748b' }}>{alerts.length} alerts</span>
      </div>

      {/* Alert Count by Severity */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {['Emergency', 'Critical', 'Warning', 'Info', 'Normal'].map(s => {
          const count = alerts.filter(a => a.severity === s).length
          const col = severityColor(s)
          return (
            <div key={s} className="panel p-3 text-center">
              <div style={{ fontSize: 24, fontWeight: 800, color: col, fontFamily: 'monospace',
                textShadow: `0 0 10px ${col}44` }}>{count}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{s}</div>
            </div>
          )
        })}
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="panel p-6 text-center text-xs text-green-neon">✓ No matching alerts found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((a: any) => {
            const col = severityColor(a.severity)
            return (
              <div key={a.id} className={`panel p-4 ${a.resolved ? 'opacity-50' : ''}`}
                style={!a.resolved ? { borderColor: `${col}44`, boxShadow: `0 0 8px ${col}18` } : {}}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: col,
                        background: `${col}18`, border: `1px solid ${col}44`,
                        borderRadius: 3, padding: '1px 7px'
                      }}>{a.severity}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{a.id}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>{a.timestamp_str}</span>
                      {a.acknowledged && (
                        <span style={{ fontSize: 10, color: '#22c55e' }}>✓ Ack</span>
                      )}
                      {a.resolved && (
                        <span style={{ fontSize: 10, color: '#64748b' }}>✓ Resolved</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                      [{a.component}] {a.parameter}: {a.value} (Threshold: {a.threshold})
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{a.description}</div>
                    <div style={{ fontSize: 10, color: '#3b82f6' }}>→ {a.action}</div>
                  </div>
                  {!a.resolved && (
                    <div className="flex flex-col gap-1 ml-4 flex-shrink-0">
                      {!a.acknowledged && (
                        <button className="btn btn-orange text-xs py-1 px-3" onClick={() => ack(a.id)}>
                          <CheckCircle size={10}/> Ack
                        </button>
                      )}
                      <button className="btn btn-green text-xs py-1 px-3" onClick={() => resolve(a.id)}>
                        <XCircle size={10}/> Resolve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
