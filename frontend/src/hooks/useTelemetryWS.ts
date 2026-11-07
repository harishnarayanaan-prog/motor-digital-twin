// WebSocket hook with auto-reconnect for real-time telemetry
import { useEffect, useRef, useCallback } from 'react'
import { useTelemetryStore, type TelemetrySnapshot } from '../store/telemetryStore'

const WS_URL = 'ws://localhost:8000/ws/telemetry'
const RECONNECT_DELAY_MS = 2500

export function useTelemetryWS() {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setTelemetry, pushHistory, setConnected, setConnectionError } = useTelemetryStore()

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return
    try {
      ws.current = new WebSocket(WS_URL)

      ws.current.onopen = () => {
        setConnected(true)
        setConnectionError(null)
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      }

      ws.current.onmessage = (ev) => {
        try {
          const data: TelemetrySnapshot = JSON.parse(ev.data)
          setTelemetry(data)
          // append to rolling chart history
          pushHistory({
            timestamp: data.timestamp,
            sim_time: data.sim_time,
            rpm: data.mechanical.rotor_speed_rpm,
            torque_nm: data.mechanical.electromagnetic_torque_nm,
            current_a: data.electrical.i_line,
            power_kw: data.electrical.active_power_kw,
            temp_winding: data.thermal.t_winding,
            temp_bearing: data.thermal.t_bearing_avg,
            vibe_rms: data.vibration.rms_velocity_mms,
            health_score: data.condition.overall_health_score,
            efficiency_pct: data.energy.efficiency_pct,
          })
        } catch (_) {}
      }

      ws.current.onclose = () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.current.onerror = () => {
        setConnectionError('WebSocket connection failed – retrying…')
        ws.current?.close()
      }
    } catch (err) {
      setConnectionError('Cannot connect to backend server.')
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }, [setConnected, setConnectionError, setTelemetry, pushHistory])

  // Send a command over the WebSocket
  const sendCommand = useCallback((msg: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  return { sendCommand }
}
