"""
Base abstract class for electric motor models.
Designed to allow extension to BLDC, PMSM, or DC motors in future versions.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
from pydantic import BaseModel, Field


class MotorParameters(BaseModel):
    name: str = "Industrial 3-Phase Induction Motor"
    motor_type: str = "Squirrel-Cage Induction Motor"
    rated_power_kw: float = Field(5.5, description="Rated power in kW")
    rated_voltage_v: float = Field(415.0, description="Rated line-to-line voltage (V RMS)")
    rated_frequency_hz: float = Field(50.0, description="Supply frequency (Hz)")
    num_poles: int = Field(4, description="Number of poles")
    rated_speed_rpm: float = Field(1450.0, description="Rated mechanical speed (RPM)")
    rated_power_factor: float = Field(0.86, description="Rated power factor")
    rated_efficiency_pct: float = Field(89.5, description="Rated efficiency (%)")
    connection: str = Field("Star", description="Connection type: Star or Delta")
    cooling_type: str = Field("TEFC", description="Totally Enclosed Fan Cooled")
    
    # Equivalent Circuit Parameters (Per phase, referred to stator)
    r1: float = Field(1.15, description="Stator resistance (Ohms)")
    x1: float = Field(1.75, description="Stator leakage reactance (Ohms)")
    r2_prime: float = Field(1.05, description="Rotor resistance referred to stator (Ohms)")
    x2_prime: float = Field(1.75, description="Rotor leakage reactance referred to stator (Ohms)")
    xm: float = Field(48.0, description="Magnetizing reactance (Ohms)")
    rc: float = Field(650.0, description="Core loss resistance (Ohms)")
    
    # Mechanical Parameters
    inertia_j: float = Field(0.048, description="Total moment of inertia (kg*m^2)")
    friction_b: float = Field(0.0025, description="Viscous friction coefficient (N*m*s/rad)")
    
    # Bearing Parameters (6206 Deep Groove Ball Bearing typical)
    bearing_pitch_diameter_mm: float = Field(46.0, description="Bearing pitch diameter (mm)")
    bearing_ball_diameter_mm: float = Field(9.5, description="Ball diameter (mm)")
    bearing_num_balls: int = Field(9, description="Number of balls")
    bearing_contact_angle_deg: float = Field(0.0, description="Contact angle (degrees)")


class BaseMotorModel(ABC):
    """Abstract base class for all motor simulation models."""

    def __init__(self, params: MotorParameters):
        self.params = params

    @abstractmethod
    def compute_synchronous_speed(self, frequency: float) -> float:
        """Calculate synchronous speed in RPM."""
        pass

    @abstractmethod
    def compute_slip(self, synchronous_speed: float, rotor_speed: float) -> float:
        """Calculate slip s."""
        pass

    @abstractmethod
    def compute_electromagnetic_torque(self, speed_rpm: float, supply_voltage: float, frequency: float) -> float:
        """Calculate developed electromagnetic torque (N*m)."""
        pass

    @abstractmethod
    def step_mechanical_dynamics(
        self,
        current_speed_rpm: float,
        load_torque: float,
        supply_voltage: float,
        frequency: float,
        dt: float,
        direction: int
    ) -> Tuple[float, float, float]:
        """
        Integrates J * d(omega)/dt = Te - Tload - B*omega
        Returns (new_speed_rpm, developed_torque, acceleration_rad_s2).
        """
        pass
