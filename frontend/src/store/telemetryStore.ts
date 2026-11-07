// Global WebSocket Telemetry Store using Zustand
import { create } from 'zustand'

export interface ThermalData {
  t_winding: number
  t_stator: number
  t_rotor: number
  t_bearing_de: number
  t_bearing_nde: number
  t_bearing_avg: number
  t_housing: number
  ambient_temp: number
  p_cu_stator_w: number
  p_cu_rotor_w: number
  p_core_w: number
  p_losses_total_w: number
  cooling_airflow_pct: number
  alerts: Array<{ type: string; node: string; temp: number; level: string }>
}

export interface ElectricalData {
  v_line_to_line: number
  va: number; vb: number; vc: number
  ia: number; ib: number; ic: number
  i_line: number
  active_power_kw: number
  reactive_power_kvar: number
  apparent_power_kva: number
  power_factor: number
  efficiency_pct: number
  voltage_imbalance_pct: number
  impedance_magnitude: number
  frequency_hz: number
}

export interface MechanicalData {
  rotor_speed_rpm: number
  target_synchronous_rpm: number
  slip: number
  slip_pct: number
  electromagnetic_torque_nm: number
  load_torque_nm: number
  rated_torque_nm: number
  load_percentage: number
  angular_velocity_rad_s: number
  acceleration_rad_s2: number
  mechanical_power_kw: number
}

export interface VibrationData {
  rms_velocity_mms: number
  peak_velocity_mms: number
  crest_factor: number
  dominant_frequency_hz: number
  iso_severity_zone: string
  iso_class: string
  waveform: number[]
  fft_spectrum: Array<{ freq: number; amp: number }>
  frequencies: { fr: number; bpfo: number; bpfi: number; bsf: number; ftf: number }
  diagnostics: { amp_1x: number; amp_2x: number; amp_2fe: number; amp_bpfo: number; amp_bpfi: number }
}

export interface ConditionData {
  overall_health_score: number
  component_health: {
    bearings: number
    stator_winding: number
    rotor: number
    cooling_system: number
    shaft_coupling: number
  }
  operating_hours: number
  rul_hours: number
  rul_label: string
  anomalies: Array<{ category: string; severity: string; rule: string; confidence_pct: number; evidence: string }>
  recommendations: Array<{ action: string; urgency: string; rationale: string; component: string }>
  anomaly_count: number
}

export interface EnergyData {
  p_input_kw: number
  p_output_mech_kw: number
  total_losses_kw: number
  efficiency_pct: number
  loss_breakdown_w: {
    stator_copper_loss: number
    rotor_copper_loss: number
    core_iron_loss: number
    friction_windage_loss: number
    stray_load_loss: number
  }
  cumulative_kwh: number
  total_cost_usd: number
  hourly_cost_rate_usd: number
  tariff_per_kwh: number
}

export interface TelemetrySnapshot {
  timestamp: number
  sim_time: number
  state: string
  direction: string
  direction_value: number
  is_running: boolean
  mechanical: MechanicalData
  electrical: ElectricalData
  thermal: ThermalData
  vibration: VibrationData
  condition: ConditionData
  energy: EnergyData
  active_faults: string[]
  affected_3d_components: string[]
  vfd_frequency_hz: number
}

export interface HistoryPoint {
  timestamp: number
  sim_time: number
  rpm: number
  torque_nm: number
  current_a: number
  power_kw: number
  temp_winding: number
  temp_bearing: number
  vibe_rms: number
  health_score: number
  efficiency_pct: number
}

interface TelemetryStore {
  telemetry: TelemetrySnapshot | null
  history: HistoryPoint[]
  connected: boolean
  connectionError: string | null
  setTelemetry: (t: TelemetrySnapshot) => void
  pushHistory: (h: HistoryPoint) => void
  setConnected: (c: boolean) => void
  setConnectionError: (e: string | null) => void
}

const DEFAULT_HISTORY_LEN = 120

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  telemetry: null,
  history: [],
  connected: false,
  connectionError: null,
  setTelemetry: (t) => set({ telemetry: t }),
  pushHistory: (h) =>
    set((state) => ({
      history: [...state.history.slice(-DEFAULT_HISTORY_LEN + 1), h],
    })),
  setConnected: (c) => set({ connected: c }),
  setConnectionError: (e) => set({ connectionError: e }),
}))
