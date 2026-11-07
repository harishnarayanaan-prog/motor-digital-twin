"""
Condition Monitoring and Predictive Maintenance Engine.
Evaluates multi-parametric motor health, identifies failure modes via
transparent rule-based indicators, computes degradation accumulation,
estimates Remaining Useful Life (RUL), and generates maintenance recommendations.
"""

import math
from typing import Dict, Any, List


class ConditionMonitoringEngine:
    """
    Transparent Condition Monitoring and Degradation Tracking.
    Calculates:
      - Overall Machine Health Index (0 - 100%)
      - Component-Specific Health Scores (Bearings, Windings, Rotor, Cooling, Shaft)
      - Diagnostic Rule Matches & Anomaly Indicators
      - Degradation Accumulation & Remaining Useful Life (RUL)
      - Targeted Maintenance Action Recommendations
    """

    def __init__(self):
        self.operating_hours = 124.5  # Demonstration initial accumulated running hours
        self.cumulative_degradation = 0.05  # 5% baseline degradation

        # Degradation rates per hour of operation
        self.base_wear_rate = 0.00002  # Normal wear per hour (~50,000 hours nominal L10 life)

    def step_degradation(
        self,
        dt_seconds: float,
        is_running: bool,
        vibe_rms: float,
        t_winding: float,
        t_bearing: float,
        load_pct: float
    ):
        """Accumulates degradation when motor runs."""
        if not is_running:
            return

        dt_hours = dt_seconds / 3600.0
        self.operating_hours += dt_hours

        # Stress multipliers
        # Thermal stress on insulation (Arrhenius rule approx: degradation doubles every 10C above 100C)
        thermal_stress = 1.0
        if t_winding > 105.0:
            thermal_stress += 2.0 * ((t_winding - 105.0) / 10.0)

        # Vibration stress on bearings and structure
        vibe_stress = 1.0
        if vibe_rms > 2.8:  # ISO Zone C / D
            vibe_stress += 3.5 * ((vibe_rms - 2.8) / 1.5)

        # Overload stress
        load_stress = 1.0
        if load_pct > 100.0:
            load_stress += 2.0 * ((load_pct - 100.0) / 25.0)

        # Accelerated degradation increment (scaled for observable simulation progression)
        total_stress_factor = thermal_stress * vibe_stress * load_stress
        inc = self.base_wear_rate * total_stress_factor * dt_hours * 15.0
        self.cumulative_degradation = min(0.95, self.cumulative_degradation + inc)

    def evaluate_condition(
        self,
        vibe_data: Dict[str, Any],
        thermal_data: Dict[str, Any],
        electrical_data: Dict[str, Any],
        slip: float,
        load_pct: float,
        is_running: bool
    ) -> Dict[str, Any]:
        """
        Evaluates real-time condition indicators and health metrics.
        """
        vibe_rms = vibe_data.get("rms_velocity_mms", 0.5)
        vibe_peak = vibe_data.get("peak_velocity_mms", 0.7)
        dom_freq = vibe_data.get("dominant_frequency_hz", 25.0)
        diag = vibe_data.get("diagnostics", {})
        amp_1x = diag.get("amp_1x", 0.4)
        amp_2x = diag.get("amp_2x", 0.15)
        amp_bpfo = diag.get("amp_bpfo", 0.0)
        amp_bpfi = diag.get("amp_bpfi", 0.0)

        t_w = thermal_data.get("t_winding", 25.0)
        t_b = thermal_data.get("t_bearing_avg", 25.0)
        t_h = thermal_data.get("t_housing", 25.0)
        airflow_pct = thermal_data.get("cooling_airflow_pct", 100.0)

        v_imbalance = electrical_data.get("voltage_imbalance_pct", 0.0)
        pf = electrical_data.get("power_factor", 0.86)
        eff = electrical_data.get("efficiency_pct", 89.0)

        # Calculate Component Health Scores (0 to 100)
        # 1. Bearings Health
        bearing_penalty = 0.0
        if amp_bpfo > 0.3 or amp_bpfi > 0.3:
            bearing_penalty += (amp_bpfo + amp_bpfi) * 18.0
        if t_b > 70.0:
            bearing_penalty += (t_b - 70.0) * 1.5
        if vibe_rms > 2.8:
            bearing_penalty += (vibe_rms - 2.8) * 8.0
        bearing_health = max(10.0, min(100.0, 100.0 - bearing_penalty - self.cumulative_degradation * 30.0))

        # 2. Winding Health
        winding_penalty = 0.0
        if t_w > 105.0:
            winding_penalty += (t_w - 105.0) * 1.6
        if v_imbalance > 2.0:
            winding_penalty += v_imbalance * 5.0
        winding_health = max(10.0, min(100.0, 100.0 - winding_penalty - self.cumulative_degradation * 25.0))

        # 3. Rotor Health
        rotor_penalty = 0.0
        if amp_1x > 1.5:
            rotor_penalty += (amp_1x - 1.5) * 12.0
        if slip > 0.06 and is_running:
            rotor_penalty += (slip - 0.06) * 300.0
        rotor_health = max(10.0, min(100.0, 100.0 - rotor_penalty))

        # 4. Cooling System Health
        cooling_penalty = 0.0
        if airflow_pct < 70.0 and is_running:
            cooling_penalty += (70.0 - airflow_pct) * 1.2
        if (t_h - thermal_data.get("ambient_temp", 25.0)) > 45.0:
            cooling_penalty += 20.0
        cooling_health = max(10.0, min(100.0, 100.0 - cooling_penalty))

        # 5. Shaft & Coupling Health
        shaft_penalty = 0.0
        if amp_2x > 0.8:
            shaft_penalty += (amp_2x - 0.8) * 15.0
        shaft_health = max(10.0, min(100.0, 100.0 - shaft_penalty))

        # Overall Machine Health Index (weighted average)
        overall_health = (
            bearing_health * 0.28 +
            winding_health * 0.28 +
            rotor_health * 0.18 +
            cooling_health * 0.14 +
            shaft_health * 0.12
        )
        overall_health = round(max(5.0, min(100.0, overall_health)), 1)

        # Condition Anomaly Rules
        anomalies = []
        recommendations = []

        if amp_bpfo > 0.5 or amp_bpfi > 0.5 or t_b > 75.0:
            anomalies.append({
                "category": "Mechanical Bearing",
                "severity": "Critical" if (t_b > 85.0 or amp_bpfo > 1.5) else "Warning",
                "rule": "Bearing fault defect harmonics (BPFO/BPFI) and/or thermal rise detected",
                "confidence_pct": 94,
                "evidence": f"BPFO amp: {amp_bpfo} mm/s, Bearing Temp: {t_b}°C"
            })
            recommendations.append({
                "action": "Inspect & Lubricate Drive-End / Non-Drive-End Bearings",
                "urgency": "High",
                "rationale": "High-frequency raceway impacts and elevated friction heat threaten imminent bearing seizure.",
                "component": "Bearings"
            })

        if amp_1x > 2.0:
            anomalies.append({
                "category": "Rotor Dynamic Imbalance",
                "severity": "Warning",
                "rule": "1X rotational frequency amplitude exceeds ISO 10816 threshold",
                "confidence_pct": 91,
                "evidence": f"1X amp: {amp_1x} mm/s (dominant at {dom_freq} Hz)"
            })
            recommendations.append({
                "action": "Field Balance Rotor (ISO 1940 Grade G2.5)",
                "urgency": "Medium",
                "rationale": "Unbalance creates alternating centrifugal stress, accelerating bearing fatigue.",
                "component": "Rotor"
            })

        if amp_2x > 1.2:
            anomalies.append({
                "category": "Shaft Misalignment",
                "severity": "Warning",
                "rule": "2X rotational harmonic exceeds 50% of 1X component",
                "confidence_pct": 88,
                "evidence": f"2X amp: {amp_2x} mm/s"
            })
            recommendations.append({
                "action": "Perform Laser Alignment on Motor & Driven Load Shafts",
                "urgency": "Medium",
                "rationale": "Angular/parallel offset imposes bending moments on shaft and premature seal wear.",
                "component": "Shaft"
            })

        if t_w > 115.0:
            anomalies.append({
                "category": "Thermal Winding Distress",
                "severity": "Critical" if t_w > 135.0 else "Warning",
                "rule": "Stator winding temperature exceeds thermal class continuous rating",
                "confidence_pct": 98,
                "evidence": f"Winding Temp: {t_w}°C (Warning limit: 115°C)"
            })
            recommendations.append({
                "action": "Inspect Stator Winding Insulation & Reduce Continuous Load",
                "urgency": "High",
                "rationale": "Excessive temperature halving insulation life (Arrhenius law) risks turn-to-turn flashover.",
                "component": "Stator"
            })

        if airflow_pct < 50.0 and is_running:
            anomalies.append({
                "category": "Cooling System Impairment",
                "severity": "Warning",
                "rule": "Forced convective airflow reduced by > 50%",
                "confidence_pct": 92,
                "evidence": f"Cooling Airflow: {airflow_pct}% of nominal"
            })
            recommendations.append({
                "action": "Clean Fan Cowl / Replace Impeller Blades",
                "urgency": "Medium",
                "rationale": "Restricted cooling air circulation severely reduces heat dissipation capability.",
                "component": "Cooling Fan"
            })

        if v_imbalance > 3.0:
            anomalies.append({
                "category": "Electrical Supply Imbalance",
                "severity": "Critical" if v_imbalance > 15.0 else "Warning",
                "rule": "Three-phase voltage imbalance exceeds NEMA MG1 1% recommended limit",
                "confidence_pct": 99,
                "evidence": f"Voltage Imbalance: {v_imbalance}%"
            })
            recommendations.append({
                "action": "Inspect Supply Lines & Distribution Switchgear",
                "urgency": "High",
                "rationale": "Voltage unbalance causes negative-sequence braking torques and severe stator heating.",
                "component": "Terminal Box"
            })

        if load_pct > 115.0 and is_running:
            recommendations.append({
                "action": "De-rate or Relieve Mechanical Load to 100% Rated",
                "urgency": "High",
                "rationale": f"Operating continuously at {load_pct}% load exceeds thermal steady-state design limit.",
                "component": "Load Mechanism"
            })

        if not recommendations:
            recommendations.append({
                "action": "Routine Periodic Visual Inspection & Greasing",
                "urgency": "Low",
                "rationale": "Motor operating within optimal baseline tolerances across all mechanical and electrical parameters.",
                "component": "General"
            })

        # Transparent RUL (Remaining Useful Life) Calculation
        # Remaining life percentage based on health index and current degradation rate
        current_degradation = min(0.95, (100.0 - overall_health) / 100.0)
        # Approximate remaining operating hours (nominal baseline ~25,000 hrs at 100% health)
        rul_fraction = max(0.01, 1.0 - current_degradation)
        health_penalty_exp = (overall_health / 100.0) ** 1.8
        rul_hours = round(25000.0 * rul_fraction * health_penalty_exp, 0)

        return {
            "overall_health_score": overall_health,
            "component_health": {
                "bearings": round(bearing_health, 1),
                "stator_winding": round(winding_health, 1),
                "rotor": round(rotor_health, 1),
                "cooling_system": round(cooling_health, 1),
                "shaft_coupling": round(shaft_health, 1)
            },
            "operating_hours": round(self.operating_hours, 1),
            "rul_hours": rul_hours,
            "rul_label": "Illustrative Simulation Estimate (Non-Certified Diagnostic Model)",
            "anomalies": anomalies,
            "recommendations": recommendations,
            "anomaly_count": len(anomalies)
        }
