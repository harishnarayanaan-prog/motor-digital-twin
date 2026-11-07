"""
Lumped-Parameter Multi-Node Thermal Network Simulation Model.
Simulates heat generation (copper, core, mechanical, bearing friction)
and dissipation via TEFC shaft-driven fan airflow.
"""

import math
from typing import Dict, Any


class MotorThermalModel:
    """
    5-Node Lumped Thermal Network:
      Node 1: Stator Winding (Tw)
      Node 2: Stator Core / Teeth (Ts)
      Node 3: Rotor Core & Cage (Tr)
      Node 4: Bearings (Tb - DE and NDE)
      Node 5: Motor Housing / Frame (Th)
      Ambient: Tamb
    """

    def __init__(self, ambient_temp: float = 25.0):
        self.ambient_temp = ambient_temp

        # Current temperatures in Celsius
        self.t_winding = ambient_temp
        self.t_stator = ambient_temp
        self.t_rotor = ambient_temp
        self.t_bearing_de = ambient_temp
        self.t_bearing_nde = ambient_temp
        self.t_housing = ambient_temp

        # Thermal Capacitances (J / K)
        self.c_winding = 2200.0
        self.c_stator = 6500.0
        self.c_rotor = 4500.0
        self.c_bearing = 950.0
        self.c_housing = 8500.0

        # Thermal Resistances (K / W)
        self.r_w_s = 0.08      # Winding to Stator core
        self.r_s_h = 0.05      # Stator core to Housing
        self.r_r_s = 0.15      # Rotor to Stator across airgap
        self.r_r_b = 0.22      # Rotor shaft to Bearings
        self.r_b_h = 0.12      # Bearings to Housing
        self.r_h_a_base = 0.18 # Housing to Ambient (natural convection)

        # Alarm Thresholds (Celsius)
        self.thresholds = {
            "winding_warning": 115.0,
            "winding_critical": 140.0,
            "bearing_warning": 75.0,
            "bearing_critical": 90.0,
            "housing_warning": 70.0,
            "housing_critical": 85.0,
            "rotor_warning": 120.0,
            "rotor_critical": 150.0
        }

    def reset(self, ambient_temp: float = None):
        if ambient_temp is not None:
            self.ambient_temp = ambient_temp
        self.t_winding = self.ambient_temp
        self.t_stator = self.ambient_temp
        self.t_rotor = self.ambient_temp
        self.t_bearing_de = self.ambient_temp
        self.t_bearing_nde = self.ambient_temp
        self.t_housing = self.ambient_temp

    def step(
        self,
        dt: float,
        speed_rpm: float,
        rated_speed_rpm: float,
        active_power_w: float,
        mech_power_w: float,
        stator_current: float,
        r1: float,
        r2_prime: float,
        slip: float,
        cooling_fan_fault: bool = False,
        fan_fault_severity: float = 0.0,
        bearing_fault_severity: float = 0.0,
        winding_fault_severity: float = 0.0
    ) -> Dict[str, Any]:
        """
        Advances the thermal model by dt seconds.
        """
        speed_ratio = max(0.0, min(1.5, abs(speed_rpm) / max(1.0, rated_speed_rpm)))

        # Fan airflow effectiveness
        if cooling_fan_fault:
            fan_airflow_factor = max(0.05, 1.0 - fan_fault_severity * 0.95)
        else:
            fan_airflow_factor = 1.0

        # Convective cooling resistance from housing to ambient
        # Forced convection improves with fan speed: R_eff = R_base / (1 + cooling_effectiveness * (speed_ratio^0.8))
        cooling_factor = 1.0 + 3.2 * fan_airflow_factor * (speed_ratio ** 0.8)
        r_h_a = self.r_h_a_base / max(0.2, cooling_factor)

        # Losses calculation (Heat sources)
        # 1. Stator copper losses (3 * I^2 * R1), modified by winding fault
        r1_temp_adjusted = r1 * (1.0 + 0.00393 * (self.t_winding - 20.0))
        p_cu_stator = 3.0 * (stator_current ** 2) * r1_temp_adjusted * (1.0 + winding_fault_severity * 0.8)

        # 2. Rotor copper losses (slip * airgap power)
        p_airgap = max(0.0, active_power_w - p_cu_stator)
        p_cu_rotor = max(0.0, p_airgap * abs(slip))

        # 3. Core losses (iron loss)
        p_core = max(20.0, 0.025 * active_power_w)

        # 4. Mechanical & friction losses
        p_mech_friction = max(10.0, 0.015 * mech_power_w * speed_ratio)

        # 5. Bearing friction losses (elevated by bearing wear)
        bearing_wear_heat = bearing_fault_severity * 180.0
        p_bearing_de = 15.0 * speed_ratio + bearing_wear_heat * 0.7
        p_bearing_nde = 12.0 * speed_ratio + bearing_wear_heat * 0.3

        # Sub-stepping for numerical stability if dt > 0.5s
        sub_steps = max(1, int(dt / 0.1))
        h = dt / sub_steps

        for _ in range(sub_steps):
            # Heat fluxes between nodes
            q_w_to_s = (self.t_winding - self.t_stator) / self.r_w_s
            q_s_to_h = (self.t_stator - self.t_housing) / self.r_s_h
            q_r_to_s = (self.t_rotor - self.t_stator) / self.r_r_s
            q_r_to_b = (self.t_rotor - self.t_bearing_de) / self.r_r_b
            q_b_to_h = (self.t_bearing_de - self.t_housing) / self.r_b_h
            q_h_to_a = (self.t_housing - self.ambient_temp) / r_h_a

            # Node temperature derivatives
            dt_w = (p_cu_stator - q_w_to_s) / self.c_winding
            dt_s = (p_core + q_w_to_s + q_r_to_s - q_s_to_h) / self.c_stator
            dt_r = (p_cu_rotor - q_r_to_s - q_r_to_b) / self.c_rotor
            dt_b_de = (p_bearing_de + q_r_to_b - q_b_to_h) / self.c_bearing
            dt_b_nde = (p_bearing_nde - (self.t_bearing_nde - self.t_housing) / self.r_b_h) / self.c_bearing
            dt_h = (q_s_to_h + q_b_to_h + (self.t_bearing_nde - self.t_housing) / self.r_b_h - q_h_to_a) / self.c_housing

            # Update temperatures
            self.t_winding += dt_w * h
            self.t_stator += dt_s * h
            self.t_rotor += dt_r * h
            self.t_bearing_de += dt_b_de * h
            self.t_bearing_nde += dt_b_nde * h
            self.t_housing += dt_h * h

            # Physical floor: cannot cool below ambient
            self.t_winding = max(self.ambient_temp, self.t_winding)
            self.t_stator = max(self.ambient_temp, self.t_stator)
            self.t_rotor = max(self.ambient_temp, self.t_rotor)
            self.t_bearing_de = max(self.ambient_temp, self.t_bearing_de)
            self.t_bearing_nde = max(self.ambient_temp, self.t_bearing_nde)
            self.t_housing = max(self.ambient_temp, self.t_housing)

        # Thermal alert checks
        alerts = []
        if self.t_winding >= self.thresholds["winding_critical"]:
            alerts.append({"type": "THERMAL_CRITICAL", "node": "Winding", "temp": self.t_winding, "level": "Critical"})
        elif self.t_winding >= self.thresholds["winding_warning"]:
            alerts.append({"type": "THERMAL_WARNING", "node": "Winding", "temp": self.t_winding, "level": "Warning"})

        if self.t_bearing_de >= self.thresholds["bearing_critical"]:
            alerts.append({"type": "BEARING_CRITICAL", "node": "DE Bearing", "temp": self.t_bearing_de, "level": "Critical"})
        elif self.t_bearing_de >= self.thresholds["bearing_warning"]:
            alerts.append({"type": "BEARING_WARNING", "node": "DE Bearing", "temp": self.t_bearing_de, "level": "Warning"})

        return {
            "t_winding": round(self.t_winding, 2),
            "t_stator": round(self.t_stator, 2),
            "t_rotor": round(self.t_rotor, 2),
            "t_bearing_de": round(self.t_bearing_de, 2),
            "t_bearing_nde": round(self.t_bearing_nde, 2),
            "t_bearing_avg": round((self.t_bearing_de + self.t_bearing_nde) / 2.0, 2),
            "t_housing": round(self.t_housing, 2),
            "ambient_temp": round(self.ambient_temp, 2),
            "p_cu_stator_w": round(p_cu_stator, 1),
            "p_cu_rotor_w": round(p_cu_rotor, 1),
            "p_core_w": round(p_core, 1),
            "p_losses_total_w": round(p_cu_stator + p_cu_rotor + p_core + p_mech_friction + p_bearing_de + p_bearing_nde, 1),
            "cooling_airflow_pct": round(fan_airflow_factor * speed_ratio * 100.0, 1),
            "alerts": alerts
        }
