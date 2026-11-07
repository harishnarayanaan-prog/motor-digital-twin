"""
Energy Efficiency and Loss Segregation Analytics Engine.
Calculates power flows, segregates losses (stator copper, rotor copper, core, friction, stray),
integrates energy consumption (kWh), estimates electricity costs with configurable tariffs,
and computes comparative operational scenarios.
"""

from typing import Dict, Any


class EnergyAnalyticsEngine:
    """
    Computes real-time energy metrics and operating cost projections.
    """

    def __init__(self, electricity_tariff_per_kwh: float = 0.14):
        self.tariff_per_kwh = electricity_tariff_per_kwh
        self.cumulative_energy_kwh = 14.85  # Demonstration initial accumulated kWh
        self.total_cost_usd = self.cumulative_energy_kwh * self.tariff_per_kwh

    def reset_energy(self):
        self.cumulative_energy_kwh = 0.0
        self.total_cost_usd = 0.0

    def step_energy(self, p_active_kw: float, dt_seconds: float):
        """Integrates electrical power consumption over time dt."""
        energy_step_kwh = (p_active_kw * dt_seconds) / 3600.0
        self.cumulative_energy_kwh += energy_step_kwh
        self.total_cost_usd = self.cumulative_energy_kwh * self.tariff_per_kwh

    def compute_loss_breakdown(
        self,
        p_active_kw: float,
        p_mech_kw: float,
        p_cu_stator_w: float,
        p_cu_rotor_w: float,
        p_core_w: float
    ) -> Dict[str, Any]:
        """
        Segregates motor losses into standard physical categories:
          - Stator Copper Loss (Pcu1)
          - Rotor Copper Loss (Pcu2)
          - Iron / Core Loss (Pfe)
          - Mechanical Friction & Windage (Pfw)
          - Stray Load Losses (Pstray)
        """
        p_active_w = p_active_kw * 1000.0
        p_mech_w = p_mech_kw * 1000.0
        total_loss_w = max(0.0, p_active_w - p_mech_w)

        # Stray load loss estimation (typical standard IEEE 112 allowance ~1.2% - 1.8% of input power)
        p_stray_w = min(total_loss_w * 0.15, 0.015 * p_active_w)
        # Mechanical friction loss
        p_friction_w = max(0.0, total_loss_w - (p_cu_stator_w + p_cu_rotor_w + p_core_w + p_stray_w))

        eff_pct = (p_mech_w / p_active_w * 100.0) if p_active_w > 10.0 else 0.0
        hourly_cost = p_active_kw * self.tariff_per_kwh

        return {
            "p_input_kw": round(p_active_kw, 3),
            "p_output_mech_kw": round(p_mech_kw, 3),
            "total_losses_kw": round(total_loss_w / 1000.0, 3),
            "efficiency_pct": round(min(97.0, max(0.0, eff_pct)), 2),
            "loss_breakdown_w": {
                "stator_copper_loss": round(p_cu_stator_w, 1),
                "rotor_copper_loss": round(p_cu_rotor_w, 1),
                "core_iron_loss": round(p_core_w, 1),
                "friction_windage_loss": round(p_friction_w, 1),
                "stray_load_loss": round(p_stray_w, 1)
            },
            "cumulative_kwh": round(self.cumulative_energy_kwh, 4),
            "total_cost_usd": round(self.total_cost_usd, 3),
            "hourly_cost_rate_usd": round(hourly_cost, 3),
            "tariff_per_kwh": round(self.tariff_per_kwh, 3)
        }

    @staticmethod
    def compare_scenarios(
        kw_a: float,
        eff_a: float,
        pf_a: float,
        kw_b: float,
        eff_b: float,
        pf_b: float,
        operating_hours_year: float = 4000.0,
        tariff: float = 0.14
    ) -> Dict[str, Any]:
        """
        Compares two operating conditions (e.g. Healthy vs Faulty, or Full Load vs Part Load).
        Calculates direct energy and financial difference based on physics equations.
        """
        annual_kwh_a = kw_a * operating_hours_year
        annual_kwh_b = kw_b * operating_hours_year
        annual_cost_a = annual_kwh_a * tariff
        annual_cost_b = annual_kwh_b * tariff

        kwh_diff = annual_kwh_b - annual_kwh_a
        cost_diff = annual_cost_b - annual_cost_a

        return {
            "scenario_a": {
                "input_power_kw": round(kw_a, 2),
                "efficiency_pct": round(eff_a, 2),
                "power_factor": round(pf_a, 3),
                "annual_kwh": round(annual_kwh_a, 1),
                "annual_cost_usd": round(annual_cost_a, 2)
            },
            "scenario_b": {
                "input_power_kw": round(kw_b, 2),
                "efficiency_pct": round(eff_b, 2),
                "power_factor": round(pf_b, 3),
                "annual_kwh": round(annual_kwh_b, 1),
                "annual_cost_usd": round(annual_cost_b, 2)
            },
            "difference": {
                "annual_kwh_delta": round(kwh_diff, 1),
                "annual_cost_delta_usd": round(cost_diff, 2),
                "efficiency_delta_pct": round(eff_b - eff_a, 2),
                "cost_increase_pct": round((cost_diff / annual_cost_a * 100.0) if annual_cost_a > 0 else 0.0, 2)
            }
        }
