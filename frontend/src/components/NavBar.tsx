// Top Navigation Bar
import { NavLink, useLocation } from 'react-router-dom'
import { useTelemetryStore } from '../store/telemetryStore'
import { stateColor, stateLabel } from '../utils/formatting'
import { Activity, Maximize2 } from 'lucide-react'
import { useState, useEffect } from 'react'

const PAGES = [
  { path: '/',                label: 'Overview' },
  { path: '/twin',            label: 'Digital Twin' },
  { path: '/monitoring',      label: 'Live Monitoring' },
  { path: '/control',         label: 'Motor Control' },
  { path: '/vibration',       label: 'Vibration' },
  { path: '/thermal',         label: 'Thermal' },
  { path: '/predictive',      label: 'Predictive' },
  { path: '/faults',          label: 'Fault Simulator' },
  { path: '/energy',          label: 'Energy' },
  { path: '/alerts',          label: 'Alerts' },
  { path: '/settings',        label: 'Settings' },
]

export function NavBar() {
  const { telemetry, connected } = useTelemetryStore()
  const state = telemetry?.state ?? 'OFF'
  const [clock, setClock] = useState('')

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col"
         style={{ background: 'rgba(10,15,30,0.97)', borderBottom: '1px solid rgba(0,212,255,0.15)' }}>
      {/* Top status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs"
           style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-center gap-4">
          <span className="text-neon font-bold text-sm tracking-widest">⚡ MOTOR DIGITAL TWIN</span>
          <span style={{ color: '#64748b' }}>v2.0 | Sim Platform</span>
        </div>
        <div className="flex items-center gap-6">
          {/* Motor State */}
          <span style={{ color: stateColor(state), fontWeight: 700, fontSize: 11 }}>
            {stateLabel(state)}
          </span>
          {/* WebSocket Connection */}
          <div className="flex items-center gap-1.5">
            <div className="status-dot" style={{ background: connected ? '#22c55e' : '#ef4444' }}/>
            <span style={{ color: connected ? '#22c55e' : '#ef4444', fontSize: 10 }}>
              {connected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>
          {/* Sim time */}
          {telemetry && (
            <span style={{ color: '#64748b' }}>
              <Activity size={10} style={{ display: 'inline', marginRight: 4 }}/>
              {telemetry.sim_time.toFixed(1)}s
            </span>
          )}
          {/* System Clock */}
          <span style={{ color: '#94a3b8' }}>{clock}</span>
          {/* Fullscreen */}
          <button onClick={() => document.documentElement.requestFullscreen?.()}
                  className="btn-gray btn" style={{ padding: '2px 8px', fontSize: 10 }}>
            <Maximize2 size={10}/>
          </button>
        </div>
      </div>
      {/* Navigation links */}
      <div className="flex overflow-x-auto px-2" style={{ scrollbarWidth: 'none' }}>
        {PAGES.map(p => (
          <NavLink key={p.path} to={p.path} end={p.path === '/'}>
            {({ isActive }) => (
              <span className={`inline-block px-4 py-2.5 text-xs font-semibold tracking-wide cursor-pointer whitespace-nowrap transition-all ${isActive ? 'tab-active' : 'tab-inactive'}`}>
                {p.label}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
