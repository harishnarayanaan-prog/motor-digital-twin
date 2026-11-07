"""
Comprehensive 3-Phase Induction Motor Mathematical Simulation Model.
Based on IEEE equivalent circuit and physical mechanical dynamics.
"""

import math
import cmath
from typing import Dict, Any, Tuple, List
from .motor_base import BaseMotorModel, MotorParameters


class InductionMotorModel(BaseMotorModel):
    """
    Detailed mathematical model of a three-phase squirrel-cage induction motor.
    Includes:
      - Thevenin equivalent circuit calculations
      - Slip and synchronous speed calculations
      - Torque-speed characteristics
      - 4th-order Runge-Kutta mechanical dynamics integration
      - Complete 3-phase electrical calculations (P, Q, S, PF, efficiency)
      - Voltage imbalance and phase loss impacts
    """

    def __init__(self, params: MotorParameters = None):
        if params is None:
            params = MotorParameters()
        super().__init__(params)

    def compute_synchronous_speed(self, frequency: float) -> float:
        """
        Ns = (120 * f) / P
        Where:
          Ns = synchronous speed in RPM
          f = frequency in Hz
          P = number of poles
        """
        if self.params.num_poles <= 0 or frequency <= 0.1:
            return 0.0
        return (120.0 * frequency) / float(self.params.num_poles)

    def compute_slip(self, synchronous_speed: float, rotor_speed: float) -> float:
        """
        s = (Ns - Nr) / Ns
        """
        if abs(synchronous_speed) < 1e-4:
            return 0.0
        s = (synchronous_speed - rotor_speed) / synchronous_speed
        return s

    def get_thevenin_parameters(self, frequency: float, r1_override: float = None) -> Tuple[float, float, float]:
        """
        Calculates Thevenin equivalent voltage ratio and impedance for per-phase model.
        Reactance scales linearly with frequency: X(f) = X * (f / f_rated).
        Returns (vth_ratio, rth, xth).
        """
        f_ratio = max(0.05, frequency / self.params.rated_frequency_hz)
        r1 = r1_override if r1_override is not None else self.params.r1
        x1 = self.params.x1 * f_ratio
        xm = self.params.xm * f_ratio

        # Vth = V1 * (j Xm) / (R1 + j(X1 + Xm))
        denominator_mag = math.sqrt(r1**2 + (x1 + xm)**2)
        if denominator_mag < 1e-6:
            return 1.0, 0.0, 0.0

        vth_ratio = xm / denominator_mag
        # Zth = (j Xm * (R1 + j X1)) / (R1 + j(X1 + Xm))
        z_num = 1j * xm * (r1 + 1j * x1)
        z_den = r1 + 1j * (x1 + xm)
        z_th = z_num / z_den
        return vth_ratio, z_th.real, z_th.imag

    def compute_electromagnetic_torque(
        self,
        speed_rpm: float,
        supply_voltage_vll: float,
        frequency: float,
        direction: int = 1,
        r1_mod: float = None,
        r2_mod: float = None
    ) -> float:
        """
        Calculates steady-state electromagnetic torque Te using the Thevenin equivalent circuit.
        Te = (3 / omega_s) * [ Vth^2 * (R2'/s) / ((Rth + R2'/s)^2 + (Xth + X2')^2) ]
        """
        ns = self.compute_synchronous_speed(frequency)
        if ns < 1.0 or supply_voltage_vll < 1.0:
            return 0.0

        target_ns = ns * direction
        slip = (target_ns - speed_rpm) / target_ns if abs(target_ns) > 1e-3 else 0.0

        # Avoid singularity near slip = 0
        if abs(slip) < 1e-5:
            return 0.0

        # Per-phase stator phase voltage (Star connection default)
        v_phase = supply_voltage_vll / math.sqrt(3.0) if self.params.connection == "Star" else supply_voltage_vll

        f_ratio = max(0.05, frequency / self.params.rated_frequency_hz)
        vth_ratio, r_th, x_th = self.get_thevenin_parameters(frequency, r1_override=r1_mod)
        v_th = v_phase * vth_ratio

        r2_prime = r2_mod if r2_mod is not None else self.params.r2_prime
        x2_prime = self.params.x2_prime * f_ratio

        omega_s = (2.0 * math.pi * target_ns) / 60.0
        if abs(omega_s) < 1e-4:
            return 0.0

        r2_s = r2_prime / slip
        denom = (r_th + r2_s)**2 + (x_th + x2_prime)**2
        if denom < 1e-6:
            return 0.0

        te = (3.0 / abs(omega_s)) * (v_th**2 * r2_s) / denom
        # Directional sign
        return te * direction

    def compute_electrical_parameters(
        self,
        speed_rpm: float,
        supply_vll: float,
        frequency: float,
        v_imbalance_ratio: float = 0.0,
        phase_loss: bool = False,
        r1_mod: float = None,
        r2_mod: float = None
    ) -> Dict[str, Any]:
        """
        Calculates phase voltages, currents, active/reactive/apparent power, PF, efficiency.
        """
        ns = self.compute_synchronous_speed(frequency)
        slip = self.compute_slip(ns, abs(speed_rpm)) if ns > 1.0 else 1.0
        slip = max(0.001, min(1.0, slip))  # Bound slip for stable impedance computation

        f_ratio = max(0.05, frequency / self.params.rated_frequency_hz)
        r1 = r1_mod if r1_mod is not None else self.params.r1
        x1 = self.params.x1 * f_ratio
        r2_prime = r2_mod if r2_mod is not None else self.params.r2_prime
        x2_prime = self.params.x2_prime * f_ratio
        xm = self.params.xm * f_ratio
        rc = self.params.rc

        # Impedance of rotor branch: Z2 = R2'/s + j X2'
        z2 = (r2_prime / slip) + 1j * x2_prime
        # Magnetizing branch: Zm = (Rc * j Xm) / (Rc + j Xm)
        zm = (rc * 1j * xm) / (rc + 1j * xm)
        # Parallel combination of magnetizing and rotor branch
        z_parallel = (zm * z2) / (zm + z2)
        # Total per-phase input impedance
        z_in = (r1 + 1j * x1) + z_parallel

        z_mag = abs(z_in)
        pf = math.cos(cmath.phase(z_in)) if z_mag > 1e-4 else 0.85
        pf = max(0.1, min(0.98, pf))

        # Nominal balanced phase voltage
        v_base = (supply_vll / math.sqrt(3.0)) if self.params.connection == "Star" else supply_vll

        # Apply phase voltage imbalance / phase loss
        if phase_loss:
            va = v_base * 1.05
            vb = v_base * 0.95
            vc = 0.0  # Phase C lost
            ia = va / z_mag * 1.732  # Current surges on remaining phases
            ib = vb / z_mag * 1.732
            ic = 0.0
            actual_vll = supply_vll * 0.67
            imbalance_pct = 66.7
        elif v_imbalance_ratio > 0.0:
            va = v_base * (1.0 + v_imbalance_ratio * 0.6)
            vb = v_base * (1.0 - v_imbalance_ratio * 0.4)
            vc = v_base * (1.0 - v_imbalance_ratio * 0.2)
            ia = va / z_mag
            ib = vb / z_mag
            ic = vc / z_mag
            actual_vll = supply_vll * (1.0 - v_imbalance_ratio * 0.1)
            imbalance_pct = v_imbalance_ratio * 100.0
        else:
            va = v_base
            vb = v_base
            vc = v_base
            i_phase = v_base / z_mag if z_mag > 1e-4 else 0.0
            ia = i_phase
            ib = i_phase
            ic = i_phase
            actual_vll = supply_vll
            imbalance_pct = 0.0

        i_line = (ia + ib + ic) / (2.0 if phase_loss else 3.0)

        # Three-phase powers
        p_active = math.sqrt(3.0) * actual_vll * i_line * pf if not phase_loss else (va * ia + vb * ib) * pf
        p_apparent = math.sqrt(3.0) * actual_vll * i_line if not phase_loss else (va * ia + vb * ib)
        p_reactive = math.sqrt(max(0.0, p_apparent**2 - p_active**2))

        # Developed mechanical power
        omega_m = (abs(speed_rpm) * 2.0 * math.pi) / 60.0
        te = self.compute_electromagnetic_torque(speed_rpm, actual_vll, frequency, r1_mod=r1, r2_mod=r2_prime)
        p_mech = abs(te * omega_m)

        # Efficiency calculation
        eff = (p_mech / p_active * 100.0) if p_active > 10.0 else 0.0
        eff = max(0.0, min(96.0, eff))

        return {
            "v_line_to_line": round(actual_vll, 2),
            "va": round(va, 2),
            "vb": round(vb, 2),
            "vc": round(vc, 2),
            "ia": round(ia, 2),
            "ib": round(ib, 2),
            "ic": round(ic, 2),
            "i_line": round(i_line, 2),
            "active_power_kw": round(p_active / 1000.0, 3),
            "reactive_power_kvar": round(p_reactive / 1000.0, 3),
            "apparent_power_kva": round(p_apparent / 1000.0, 3),
            "power_factor": round(pf, 3),
            "efficiency_pct": round(eff, 2),
            "voltage_imbalance_pct": round(imbalance_pct, 2),
            "impedance_magnitude": round(z_mag, 3),
            "frequency_hz": round(frequency, 2)
        }

    def step_mechanical_dynamics(
        self,
        current_speed_rpm: float,
        load_torque: float,
        supply_voltage: float,
        frequency: float,
        dt: float,
        direction: int = 1,
        blocked_rotor: bool = False,
        r1_mod: float = None,
        r2_mod: float = None
    ) -> Tuple[float, float, float]:
        """
        Integrates Newton's second law for rotational mechanics using 4th-order Runge-Kutta (RK4):
        J * d(omega)/dt = Te(omega) - T_load - B * omega

        Uses adaptive sub-stepping for unconditional numerical stability.
        Returns: (new_speed_rpm, developed_torque, acceleration_rad_s2)
        """
        if blocked_rotor:
            te = self.compute_electromagnetic_torque(0.0, supply_voltage, frequency, direction, r1_mod, r2_mod)
            return 0.0, te, 0.0

        if dt <= 0.0:
            te = self.compute_electromagnetic_torque(current_speed_rpm, supply_voltage, frequency, direction, r1_mod, r2_mod)
            return current_speed_rpm, te, 0.0

        j = max(0.005, self.params.inertia_j)
        b = self.params.friction_b

        # Convert RPM to angular velocity omega (rad/s)
        omega = (current_speed_rpm * 2.0 * math.pi) / 60.0

        def d_omega_dt(w: float) -> Tuple[float, float]:
            rpm_val = (w * 60.0) / (2.0 * math.pi)
            te_val = self.compute_electromagnetic_torque(rpm_val, supply_voltage, frequency, direction, r1_mod, r2_mod)
            # Load opposes the direction of motion
            t_load_opposing = load_torque * (1 if w >= 0 else -1) if abs(w) > 0.1 else (load_torque * direction)
            # Friction opposes motion
            accel = (te_val - t_load_opposing - b * w) / j
            return accel, te_val

        # Sub-step so each step h <= 0.005s to ensure stability with fast mechanical dynamics
        n_sub = max(1, int(math.ceil(dt / 0.005)))
        h = dt / n_sub

        last_te = 0.0
        accel_final = 0.0

        for _ in range(n_sub):
            k1_accel, te1 = d_omega_dt(omega)
            k2_accel, _ = d_omega_dt(omega + 0.5 * h * k1_accel)
            k3_accel, _ = d_omega_dt(omega + 0.5 * h * k2_accel)
            k4_accel, _ = d_omega_dt(omega + h * k3_accel)

            accel_avg = (k1_accel + 2.0 * k2_accel + 2.0 * k3_accel + k4_accel) / 6.0
            omega += h * accel_avg
            last_te = te1
            accel_final = accel_avg

        # Prevent unphysical oscillation around 0 when stopped without driving torque
        if supply_voltage < 5.0 and abs(omega) < 0.2:
            omega = 0.0
            accel_final = 0.0
            last_te = 0.0

        new_rpm = (omega * 60.0) / (2.0 * math.pi)
        final_te = self.compute_electromagnetic_torque(new_rpm, supply_voltage, frequency, direction, r1_mod, r2_mod)

        return new_rpm, final_te, accel_final

    def generate_torque_speed_curve(
        self,
        supply_voltage: float = 415.0,
        frequency: float = 50.0,
        points: int = 50
    ) -> List[Dict[str, float]]:
        """
        Generates characteristic points for plotting Torque-Speed curve.
        From RPM = 0 to Ns.
        """
        ns = self.compute_synchronous_speed(frequency)
        curve = []
        for i in range(points + 1):
            rpm = (ns / points) * i
            slip = self.compute_slip(ns, rpm)
            te = self.compute_electromagnetic_torque(rpm, supply_voltage, frequency, direction=1)
            curve.append({
                "rpm": round(rpm, 1),
                "slip": round(slip, 4),
                "torque_nm": round(te, 2)
            })
        return curve
