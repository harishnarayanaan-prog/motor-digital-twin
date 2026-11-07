import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { OverviewPage } from './pages/OverviewPage'
import { DigitalTwinPage } from './pages/DigitalTwinPage'
import { LiveMonitoringPage } from './pages/LiveMonitoringPage'
import { MotorControlPage } from './pages/MotorControlPage'
import { VibrationPage } from './pages/VibrationPage'
import { ThermalPage } from './pages/ThermalPage'
import { PredictivePage } from './pages/PredictivePage'
import { FaultSimulatorPage } from './pages/FaultSimulatorPage'
import { EnergyPage } from './pages/EnergyPage'
import { AlertsPage } from './pages/AlertsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useTelemetryWS } from './hooks/useTelemetryWS'

export function AppContent() {
  // Initialize continuous WebSocket telemetry stream
  useTelemetryWS()

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200">
      <NavBar />
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/twin" element={<DigitalTwinPage />} />
        <Route path="/monitoring" element={<LiveMonitoringPage />} />
        <Route path="/control" element={<MotorControlPage />} />
        <Route path="/vibration" element={<VibrationPage />} />
        <Route path="/thermal" element={<ThermalPage />} />
        <Route path="/predictive" element={<PredictivePage />} />
        <Route path="/faults" element={<FaultSimulatorPage />} />
        <Route path="/energy" element={<EnergyPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
