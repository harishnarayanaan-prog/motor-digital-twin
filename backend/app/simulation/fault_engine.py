"""
Fault Simulation Engine.
Manages the 12 industrial fault modes, their activation states, severities,
affected 3D components, and their physical parameter impacts on the mathematical models.
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field


class FaultDefinition(BaseModel):
    id: str
    name: str
    affected_component: str
    description: str
    is_active: bool = False
    severity: float = Field(0.5, ge=0.0, le=1.0, description="Severity 0.0 to 1.0")
    parameters_affected: List[str]


class FaultEngine:
    """
    Coordinates 12 industrial fault conditions.
    Provides modifiers for electrical, mechanical, thermal, and vibration engines.
    """

    def __init__(self):
        self.faults: Dict[str, FaultDefinition] = {
            "bearing_wear": FaultDefinition(
                id="bearing_wear",
                name="Bearing Degradation / Wear",
                affected_component="Bearings",
                description="Spalling or flaking on outer/inner raceway surfaces causing BPFO/BPFI vibration spikes and elevated bearing temperature.",
                parameters_affected=["vibration_bpfo", "vibration_bpfi", "t_bearing_de", "bearing_health"]
            ),
            "rotor_imbalance": FaultDefinition(
                id="rotor_imbalance",
                name="Rotor Dynamic Imbalance",
                affected_component="Rotor",
                description="Mass eccentricity on rotor producing high 1X rotational vibration and alternating dynamic bearing load.",
                parameters_affected=["vibration_1x", "rotor_health"]
            ),
            "shaft_misalignment": FaultDefinition(
                id="shaft_misalignment",
                name="Shaft Angular / Parallel Misalignment",
                affected_component="Shaft",
                description="Angular or parallel offset between motor shaft and load coupling, manifesting as 2X rotational harmonic and axial stress.",
                parameters_affected=["vibration_2x", "shaft_health", "coupling_stress"]
            ),
            "motor_overload": FaultDefinition(
                id="motor_overload",
                name="Mechanical Overload",
                affected_component="Stator",
                description="Mechanical load exceeding rated capacity (110%-150%), causing elevated slip, high stator current, and accelerated winding heating.",
                parameters_affected=["load_torque", "current_draw", "t_winding", "slip"]
            ),
            "cooling_fan_failure": FaultDefinition(
                id="cooling_fan_failure",
                name="Cooling Fan Impeller Failure",
                affected_component="Cooling Fan",
                description="Broken or clogged fan cowl causing severe reduction in forced convective airflow, leading to rapid motor overheat.",
                parameters_affected=["cooling_airflow", "t_winding", "t_stator", "t_housing"]
            ),
            "winding_overheating": FaultDefinition(
                id="winding_overheating",
                name="Stator Winding Thermal Deterioration",
                affected_component="Stator",
                description="Insulation degradation and elevated winding resistance leading to increased copper loss and thermal distress.",
                parameters_affected=["r1_resistance", "t_winding", "winding_health"]
            ),
            "phase_voltage_imbalance": FaultDefinition(
                id="phase_voltage_imbalance",
                name="Phase Voltage Imbalance",
                affected_component="Terminal Box",
                description="Unbalanced utility supply voltages inducing negative sequence currents, torque ripple, and 2fe electrical vibration.",
                parameters_affected=["voltage_imbalance", "current_imbalance", "vibration_2fe"]
            ),
            "phase_loss": FaultDefinition(
                id="phase_loss",
                name="Single-Phasing (Phase Loss)",
                affected_component="Terminal Box",
                description="Complete open circuit on one power supply phase; remaining phases draw excessive currents and motor produces severe pulsating torque.",
                parameters_affected=["phase_c_voltage", "phase_currents", "slip"]
            ),
            "supply_under_voltage": FaultDefinition(
                id="supply_under_voltage",
                name="Supply Under-Voltage (< 90% Rated)",
                affected_component="Terminal Box",
                description="Sub-nominal line voltage requiring higher current draw to maintain load torque, leading to elevated I2R losses and higher slip.",
                parameters_affected=["supply_voltage", "current_draw", "slip"]
            ),
            "supply_over_voltage": FaultDefinition(
                id="supply_over_voltage",
                name="Supply Over-Voltage (> 110% Rated)",
                affected_component="Terminal Box",
                description="Line voltage significantly exceeding nominal rating, pushing magnetic core into saturation and increasing iron core losses.",
                parameters_affected=["supply_voltage", "core_loss", "power_factor"]
            ),
            "excessive_vibration": FaultDefinition(
                id="excessive_vibration",
                name="Structural Looseness / Resonance",
                affected_component="Mounting Base",
                description="Loose foundation hold-down bolts or structural resonance generating broadband vibration and sub-harmonic chatter.",
                parameters_affected=["vibration_sub_harmonics", "vibration_rms", "mounting_health"]
            ),
            "mechanical_blockage": FaultDefinition(
                id="mechanical_blockage",
                name="Mechanical Blockage / Locked Rotor",
                affected_component="Shaft",
                description="Complete mechanical seizure or jam of driven equipment; motor stalls immediately and draws locked-rotor starting current.",
                parameters_affected=["rotor_speed_rpm", "locked_rotor_current", "t_winding"]
            )
        }

    def set_fault(self, fault_id: str, is_active: bool, severity: float = None) -> bool:
        if fault_id not in self.faults:
            return False
        self.faults[fault_id].is_active = is_active
        if severity is not None:
            self.faults[fault_id].severity = max(0.0, min(1.0, severity))
        return True

    def reset_all_faults(self):
        for f in self.faults.values():
            f.is_active = False
            f.severity = 0.5

    def get_all_faults(self) -> List[Dict[str, Any]]:
        return [f.model_dump() for f in self.faults.values()]

    def get_active_fault_ids(self) -> List[str]:
        return [k for k, v in self.faults.items() if v.is_active]

    def get_affected_components(self) -> List[str]:
        """Returns list of 3D motor component names currently affected by active faults."""
        comps = set()
        for f in self.faults.values():
            if f.is_active:
                comps.add(f.affected_component)
        return list(comps)

    def compute_modifiers(self, base_supply_vll: float, base_r1: float) -> Dict[str, Any]:
        """
        Computes dynamic simulation modifiers applied to electrical, mechanical,
        thermal, and vibration engines.
        """
        # Active fault checks
        f_bearing = self.faults["bearing_wear"]
        f_imbalance = self.faults["rotor_imbalance"]
        f_misalignment = self.faults["shaft_misalignment"]
        f_overload = self.faults["motor_overload"]
        f_fan = self.faults["cooling_fan_failure"]
        f_winding = self.faults["winding_overheating"]
        f_v_imbalance = self.faults["phase_voltage_imbalance"]
        f_phase_loss = self.faults["phase_loss"]
        f_under_v = self.faults["supply_under_voltage"]
        f_over_v = self.faults["supply_over_voltage"]
        f_looseness = self.faults["excessive_vibration"]
        f_blockage = self.faults["mechanical_blockage"]

        # Voltage modifier
        effective_vll = base_supply_vll
        if f_under_v.is_active:
            # Drop voltage by 15% to 30%
            effective_vll *= (1.0 - 0.15 - 0.15 * f_under_v.severity)
        elif f_over_v.is_active:
            # Increase voltage by 10% to 25%
            effective_vll *= (1.0 + 0.10 + 0.15 * f_over_v.severity)

        # Resistance modifier
        effective_r1 = base_r1
        if f_winding.is_active:
            effective_r1 *= (1.0 + 0.4 * f_winding.severity)

        # Load modifier
        extra_load_multiplier = 1.0
        if f_overload.is_active:
            extra_load_multiplier = 1.1 + 0.5 * f_overload.severity  # 110% to 160%

        return {
            "effective_vll": effective_vll,
            "effective_r1": effective_r1,
            "extra_load_multiplier": extra_load_multiplier,
            "is_blocked_rotor": f_blockage.is_active,
            "is_phase_loss": f_phase_loss.is_active,
            "voltage_imbalance_ratio": (0.05 + 0.20 * f_v_imbalance.severity) if f_v_imbalance.is_active else 0.0,
            "fan_fault_active": f_fan.is_active,
            "fan_fault_severity": f_fan.severity if f_fan.is_active else 0.0,
            "bearing_fault_severity": f_bearing.severity if f_bearing.is_active else 0.0,
            "imbalance_fault_severity": f_imbalance.severity if f_imbalance.is_active else 0.0,
            "misalignment_fault_severity": f_misalignment.severity if f_misalignment.is_active else 0.0,
            "looseness_fault_severity": f_looseness.severity if f_looseness.is_active else 0.0,
            "winding_fault_severity": f_winding.severity if f_winding.is_active else 0.0
        }
