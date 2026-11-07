"""
Central Simulation Engine and Industrial State Machine.
Orchestrates the mathematical motor model, electrical, mechanical, thermal,
vibration, fault, condition monitoring, and energy subsystems.
"""

import math
import time
import uuid
from typing import Dict, Any, List, Optional
from enum import Enum

from .motor_base import MotorParameters
from .induction_motor import InductionMotorModel
from .thermal_model import MotorThermalModel
from .vibration_model import VibrationAnalysisEngine
from .fault_engine import FaultEngine
from .condition_engine import ConditionMonitoringEngine
from .energy_engine import EnergyAnalyticsEngine


class MotorState(str, Enum):
    OFF = "OFF"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    STOPPING = "STOPPING"
    OVERLOADED = "OVERLOADED"
    FAULT = "FAULT"
    EMERGENCY_STOP = "EMERGENCY_STOP"


class SimulationEngine:
    """
    Complete synchronized physics and digital twin engine.
    Runs real-time updates and maintains persistent telemetry state.
    """

    def __init__(self, params: MotorParameters = None):
        self.params = params if params is not None else MotorParameters()

        # Subsystems
        self.motor_model = InductionMotorModel(self.params)
        self.thermal_model = MotorThermalModel(ambient_temp=25.0)
        self.vibration_engine = VibrationAnalysisEngine()
        self.fault_engine = FaultEngine()
        self.condition_engine = ConditionMonitoringEngine()
        self.energy_engine = EnergyAnalyticsEngine()

        # State Machine
        self.state = MotorState.OFF
        self.direction = 1  # 1 = Forward, -1 = Reverse

        # Operating setpoints
        self.supply_vll_nominal = self.params.rated_voltage_v  # 415.0 V
        self.vfd_frequency = self.params.rated_frequency_hz  # 50.0 Hz
        self.load_percentage = 75.0  # Default 75% load
        self.ambient_temperature = 25.0

        # Dynamics state
        self.current_speed_rpm = 0.0
        self.developed_torque_nm = 0.0
        self.acceleration_rad_s2 = 0.0
        self.sim_time = 0.0
        self.is_paused = False
        self.simulation_speed = 1.0
        self.random_seed = 42

        # Telemetry history buffer for fast querying
        self.telemetry_history: List[Dict[str, Any]] = []
        self.max_history_len = 300

        # Centralized Alert Store
        self.alerts: List[Dict[str, Any]] = []

        # Rated torque calculation
        omega_rated = (self.params.rated_speed_rpm * 2.0 * math.pi) / 60.0
        self.rated_torque_nm = (self.params.rated_power_kw * 1000.0) / max(1.0, omega_rated)

    def set_parameters(self, new_params: MotorParameters):
        self.params = new_params
        self.motor_model = InductionMotorModel(self.params)
        omega_rated = (self.params.rated_speed_rpm * 2.0 * math.pi) / 60.0
        self.rated_torque_nm = (self.params.rated_power_kw * 1000.0) / max(1.0, omega_rated)

    # -------------------------------------------------------------
    # Control Commands
    # -------------------------------------------------------------

    def command_start(self) -> Tuple[bool, str]:
        if self.state in [MotorState.RUNNING, MotorState.STARTING]:
            return False, "Motor is already running or starting."
        if self.state == MotorState.EMERGENCY_STOP:
            return False, "Emergency stop is active. Reset first."
        if self.state == MotorState.FAULT:
            return False, "Active critical fault trip. Clear faults and reset first."

        self.state = MotorState.STARTING
        return True, "Motor starting sequence initiated."

    def command_stop(self) -> Tuple[bool, str]:
        if self.state in [MotorState.OFF, MotorState.STOPPING]:
            return False, "Motor is already stopped or stopping."
        self.state = MotorState.STOPPING
        return True, "Controlled motor stop sequence initiated."

    def command_emergency_stop(self) -> Tuple[bool, str]:
        self.state = MotorState.EMERGENCY_STOP
        self.add_alert(
            component="Motor Control",
            parameter="E-STOP",
            value="ACTIVE",
            threshold="N/A",
            severity="Emergency",
            description="Emergency Stop button triggered by operator. Power severed immediately.",
            action="Inspect mechanical system and reset E-STOP relay before restarting."
        )
        return True, "EMERGENCY STOP executed. Power severed immediately."

    def command_reset(self) -> Tuple[bool, str]:
        self.state = MotorState.OFF
        # Clear unresolved emergency trips
        return True, "Simulation state reset to OFF. Ready for start."

    def command_set_speed(self, frequency_hz: float) -> Tuple[bool, str]:
        freq = max(10.0, min(65.0, frequency_hz))
        self.vfd_frequency = freq
        return True, f"VFD frequency set to {freq:.1f} Hz."

    def command_set_load(self, load_pct: float) -> Tuple[bool, str]:
        lp = max(0.0, min(150.0, load_pct))
        self.load_percentage = lp
        return True, f"Mechanical load set to {lp:.1f}%."

    def command_set_direction(self, direction: str) -> Tuple[bool, str]:
        dir_val = 1 if direction.lower() in ["forward", "fwd", "1"] else -1
        if self.state in [MotorState.STARTING, MotorState.RUNNING] and dir_val != self.direction:
            # Reversal while running: motor decelerates and accelerates in reverse
            self.direction = dir_val
            return True, f"Reversing motor rotation to {'Forward' if dir_val == 1 else 'Reverse'}."
        self.direction = dir_val
        return True, f"Direction set to {'Forward' if dir_val == 1 else 'Reverse'}."

    def command_set_ambient_temp(self, temp_c: float):
        self.ambient_temperature = temp_c
        self.thermal_model.ambient_temp = temp_c

    # -------------------------------------------------------------
    # Simulation Step Update
    # -------------------------------------------------------------

    def step(self, dt: float = 0.1) -> Dict[str, Any]:
        """
        Executes one simulation time step (dt seconds).
        Synchronizes all electrical, mechanical, thermal, vibration, and condition modules.
        """
        effective_dt = dt * self.simulation_speed
        self.sim_time += effective_dt

        # 1. Evaluate Fault Modifiers
        fault_mods = self.fault_engine.compute_modifiers(
            base_supply_vll=self.supply_vll_nominal,
            base_r1=self.params.r1
        )

        # 2. Determine Terminal Voltage based on State
        if self.state in [MotorState.OFF, MotorState.EMERGENCY_STOP, MotorState.STOPPING]:
            applied_voltage = 0.0
        else:
            applied_voltage = fault_mods["effective_vll"]

        # 3. Calculate Mechanical Load Torque
        base_load_nm = (self.load_percentage / 100.0) * self.rated_torque_nm
        effective_load_nm = base_load_nm * fault_mods["extra_load_multiplier"]

        # 4. Mechanical Dynamics Step
        is_blocked = fault_mods["is_blocked_rotor"]
        new_rpm, dev_te, accel = self.motor_model.step_mechanical_dynamics(
            current_speed_rpm=self.current_speed_rpm,
            load_torque=effective_load_nm,
            supply_voltage=applied_voltage,
            frequency=self.vfd_frequency,
            dt=effective_dt,
            direction=self.direction,
            blocked_rotor=is_blocked,
            r1_mod=fault_mods["effective_r1"]
        )
        self.current_speed_rpm = new_rpm
        self.developed_torque_nm = dev_te
        self.acceleration_rad_s2 = accel

        # 5. State Machine Auto-Transitions
        sync_speed = self.motor_model.compute_synchronous_speed(self.vfd_frequency)
        abs_rpm = abs(self.current_speed_rpm)

        if self.state == MotorState.STARTING:
            if abs_rpm >= 0.85 * sync_speed:
                self.state = MotorState.RUNNING
        elif self.state == MotorState.STOPPING:
            if abs_rpm < 5.0:
                self.current_speed_rpm = 0.0
                self.state = MotorState.OFF
        elif self.state == MotorState.RUNNING:
            if self.load_percentage > 115.0 or fault_mods["extra_load_multiplier"] > 1.2:
                self.state = MotorState.OVERLOADED
        elif self.state == MotorState.OVERLOADED:
            if self.load_percentage <= 105.0 and fault_mods["extra_load_multiplier"] <= 1.1:
                self.state = MotorState.RUNNING

        if is_blocked and self.state not in [MotorState.OFF, MotorState.EMERGENCY_STOP]:
            self.state = MotorState.FAULT

        # 6. Electrical Calculations
        slip = self.motor_model.compute_slip(sync_speed, abs_rpm)
        elec_data = self.motor_model.compute_electrical_parameters(
            speed_rpm=self.current_speed_rpm,
            supply_vll=applied_voltage,
            frequency=self.vfd_frequency,
            v_imbalance_ratio=fault_mods["voltage_imbalance_ratio"],
            phase_loss=fault_mods["is_phase_loss"],
            r1_mod=fault_mods["effective_r1"]
        )

        # 7. Mechanical Output Calculations
        omega_m = (abs_rpm * 2.0 * math.pi) / 60.0
        p_mech_kw = abs(dev_te * omega_m) / 1000.0

        # 8. Thermal Model Step
        thermal_data = self.thermal_model.step(
            dt=effective_dt,
            speed_rpm=self.current_speed_rpm,
            rated_speed_rpm=self.params.rated_speed_rpm,
            active_power_w=elec_data["active_power_kw"] * 1000.0,
            mech_power_w=p_mech_kw * 1000.0,
            stator_current=elec_data["i_line"],
            r1=self.params.r1,
            r2_prime=self.params.r2_prime,
            slip=slip,
            cooling_fan_fault=fault_mods["fan_fault_active"],
            fan_fault_severity=fault_mods["fan_fault_severity"],
            bearing_fault_severity=fault_mods["bearing_fault_severity"],
            winding_fault_severity=fault_mods["winding_fault_severity"]
        )

        # 9. Vibration Signal and FFT Analysis Step
        vibe_data = self.vibration_engine.generate_vibration_data(
            speed_rpm=self.current_speed_rpm,
            supply_freq_hz=self.vfd_frequency,
            load_pct=self.load_percentage,
            imbalance_severity=fault_mods["imbalance_fault_severity"],
            misalignment_severity=fault_mods["misalignment_fault_severity"],
            bearing_wear_severity=fault_mods["bearing_fault_severity"],
            looseness_severity=fault_mods["looseness_fault_severity"],
            electrical_imbalance_severity=fault_mods["voltage_imbalance_ratio"],
            random_seed=None
        )

        # 10. Condition Monitoring & Predictive Degradation Step
        is_motor_running = (self.state in [MotorState.RUNNING, MotorState.STARTING, MotorState.OVERLOADED])
        self.condition_engine.step_degradation(
            dt_seconds=effective_dt,
            is_running=is_motor_running,
            vibe_rms=vibe_data["rms_velocity_mms"],
            t_winding=thermal_data["t_winding"],
            t_bearing=thermal_data["t_bearing_avg"],
            load_pct=self.load_percentage
        )
        cond_data = self.condition_engine.evaluate_condition(
            vibe_data=vibe_data,
            thermal_data=thermal_data,
            electrical_data=elec_data,
            slip=slip,
            load_pct=self.load_percentage,
            is_running=is_motor_running
        )

        # 11. Energy Analytics & Loss Integration Step
        if is_motor_running:
            self.energy_engine.step_energy(
                p_active_kw=elec_data["active_power_kw"],
                dt_seconds=effective_dt
            )
        energy_data = self.energy_engine.compute_loss_breakdown(
            p_active_kw=elec_data["active_power_kw"],
            p_mech_kw=p_mech_kw,
            p_cu_stator_w=thermal_data["p_cu_stator_w"],
            p_cu_rotor_w=thermal_data["p_cu_rotor_w"],
            p_core_w=thermal_data["p_core_w"]
        )

        # 12. Check and Trigger Alerts
        self._evaluate_telemetry_alerts(elec_data, thermal_data, vibe_data, slip)

        # 13. Construct Comprehensive Telemetry Snapshot
        snapshot = {
            "timestamp": time.time(),
            "sim_time": round(self.sim_time, 2),
            "state": self.state.value,
            "direction": "Forward" if self.direction == 1 else "Reverse",
            "direction_value": self.direction,
            "is_running": is_motor_running,
            "mechanical": {
                "rotor_speed_rpm": round(self.current_speed_rpm, 1),
                "target_synchronous_rpm": round(sync_speed, 1),
                "slip": round(slip, 4),
                "slip_pct": round(slip * 100.0, 2),
                "electromagnetic_torque_nm": round(self.developed_torque_nm, 2),
                "load_torque_nm": round(effective_load_nm, 2),
                "rated_torque_nm": round(self.rated_torque_nm, 2),
                "load_percentage": round(self.load_percentage, 1),
                "angular_velocity_rad_s": round(omega_m, 2),
                "acceleration_rad_s2": round(self.acceleration_rad_s2, 2),
                "mechanical_power_kw": round(p_mech_kw, 3)
            },
            "electrical": elec_data,
            "thermal": thermal_data,
            "vibration": vibe_data,
            "condition": cond_data,
            "energy": energy_data,
            "active_faults": self.fault_engine.get_active_fault_ids(),
            "affected_3d_components": self.fault_engine.get_affected_components(),
            "vfd_frequency_hz": round(self.vfd_frequency, 1)
        }

        # Store in rolling history buffer
        self.telemetry_history.append({
            "timestamp": snapshot["timestamp"],
            "sim_time": snapshot["sim_time"],
            "rpm": snapshot["mechanical"]["rotor_speed_rpm"],
            "torque_nm": snapshot["mechanical"]["electromagnetic_torque_nm"],
            "current_a": snapshot["electrical"]["i_line"],
            "power_kw": snapshot["electrical"]["active_power_kw"],
            "temp_winding": snapshot["thermal"]["t_winding"],
            "temp_bearing": snapshot["thermal"]["t_bearing_avg"],
            "vibe_rms": snapshot["vibration"]["rms_velocity_mms"],
            "health_score": snapshot["condition"]["overall_health_score"],
            "efficiency_pct": snapshot["energy"]["efficiency_pct"]
        })
        if len(self.telemetry_history) > self.max_history_len:
            self.telemetry_history.pop(0)

        return snapshot

    # -------------------------------------------------------------
    # Alerts Management
    # -------------------------------------------------------------

    def add_alert(
        self,
        component: str,
        parameter: str,
        value: Any,
        threshold: Any,
        severity: str,
        description: str,
        action: str
    ):
        # Prevent spamming identical active alert within last 5 seconds
        now = time.time()
        for a in self.alerts:
            if not a["resolved"] and a["component"] == component and a["parameter"] == parameter and (now - a["timestamp"]) < 6.0:
                return

        alert_record = {
            "id": f"ALT-{uuid.uuid4().hex[:6].upper()}",
            "timestamp": now,
            "timestamp_str": time.strftime("%H:%M:%S", time.localtime(now)),
            "component": component,
            "parameter": parameter,
            "value": str(value),
            "threshold": str(threshold),
            "severity": severity,  # Info, Normal, Warning, Critical, Emergency
            "description": description,
            "action": action,
            "acknowledged": False,
            "resolved": False
        }
        self.alerts.insert(0, alert_record)
        # Limit alert storage to 100 items
        if len(self.alerts) > 100:
            self.alerts.pop()

    def acknowledge_alert(self, alert_id: str) -> bool:
        for a in self.alerts:
            if a["id"] == alert_id:
                a["acknowledged"] = True
                return True
        return False

    def resolve_alert(self, alert_id: str) -> bool:
        for a in self.alerts:
            if a["id"] == alert_id:
                a["resolved"] = True
                return True
        return False

    def _evaluate_telemetry_alerts(
        self,
        elec: Dict[str, Any],
        thermal: Dict[str, Any],
        vibe: Dict[str, Any],
        slip: float
    ):
        # 1. Thermal Alerts
        tw = thermal["t_winding"]
        if tw >= self.thermal_model.thresholds["winding_critical"]:
            self.add_alert(
                component="Stator Winding",
                parameter="Temperature",
                value=f"{tw}°C",
                threshold="140.0°C",
                severity="Critical",
                description="Stator winding temperature dangerously high. Thermal insulation breakdown imminent.",
                action="Immediately reduce mechanical load or initiate controlled shutdown."
            )
        elif tw >= self.thermal_model.thresholds["winding_warning"]:
            self.add_alert(
                component="Stator Winding",
                parameter="Temperature",
                value=f"{tw}°C",
                threshold="115.0°C",
                severity="Warning",
                description="Stator winding temperature elevated above Class F continuous threshold.",
                action="Verify fan ventilation airflow and monitor winding temperature rise rate."
            )

        tb = thermal["t_bearing_avg"]
        if tb >= self.thermal_model.thresholds["bearing_critical"]:
            self.add_alert(
                component="Bearings",
                parameter="Bearing Temp",
                value=f"{tb}°C",
                threshold="90.0°C",
                severity="Critical",
                description="Bearing temperature critical. Risk of lubricant breakdown and bearing seizure.",
                action="Stop motor and inspect bearing lubrication and raceway surfaces."
            )

        # 2. Vibration Alerts
        v_rms = vibe["rms_velocity_mms"]
        if v_rms >= 4.5:
            self.add_alert(
                component="Mounting & Bearings",
                parameter="Vibration RMS",
                value=f"{v_rms} mm/s",
                threshold="4.5 mm/s (ISO Zone D)",
                severity="Critical",
                description="Vibration velocity exceeds ISO 10816 Zone D boundary. Severe damage likely.",
                action="Trip motor and conduct spectral vibration diagnostic to isolate fault."
            )
        elif v_rms >= 2.8:
            self.add_alert(
                component="Mounting & Bearings",
                parameter="Vibration RMS",
                value=f"{v_rms} mm/s",
                threshold="2.8 mm/s (ISO Zone C)",
                severity="Warning",
                description="Vibration in ISO 10816 Zone C (Unsatisfactory for continuous operation).",
                action="Schedule maintenance inspection for alignment, balance, or bearing wear."
            )

        # 3. Voltage Imbalance Alerts
        v_imb = elec["voltage_imbalance_pct"]
        if v_imb > 5.0:
            self.add_alert(
                component="Terminal Box",
                parameter="Voltage Imbalance",
                value=f"{v_imb}%",
                threshold="5.0%",
                severity="Critical",
                description="Severe utility phase voltage unbalance inducing negative sequence rotor currents.",
                action="Inspect electrical line supply fuses and contactor contacts."
            )
        elif v_imb > 2.0:
            self.add_alert(
                component="Terminal Box",
                parameter="Voltage Imbalance",
                value=f"{v_imb}%",
                threshold="2.0%",
                severity="Warning",
                description="Phase voltage imbalance exceeds standard NEMA recommended tolerance.",
                action="Check phase loads on local supply transformer."
            )

        # 4. Overload Alert
        if self.state == MotorState.OVERLOADED:
            self.add_alert(
                component="Stator & Rotor",
                parameter="Load Percentage",
                value=f"{self.load_percentage}%",
                threshold="100.0%",
                severity="Warning",
                description="Motor operating beyond rated thermal capacity. Overload condition active.",
                action="Reduce driven machinery load to 100% rated capacity or lower."
            )
