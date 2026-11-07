"""
Pydantic Request and Response Schemas for Motor Control and Simulation APIs.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SpeedControlRequest(BaseModel):
    frequency_hz: float = Field(..., ge=10.0, le=65.0, description="VFD supply frequency (10.0 - 65.0 Hz)")


class LoadControlRequest(BaseModel):
    load_pct: float = Field(..., ge=0.0, le=150.0, description="Mechanical load percentage (0.0 - 150.0%)")


class DirectionControlRequest(BaseModel):
    direction: str = Field(..., description="'Forward' or 'Reverse'")


class FaultToggleRequest(BaseModel):
    fault_id: str
    is_active: bool
    severity: Optional[float] = Field(None, ge=0.0, le=1.0)


class SimulationSettingsRequest(BaseModel):
    simulation_speed: Optional[float] = Field(None, ge=0.1, le=5.0)
    ambient_temperature: Optional[float] = Field(None, ge=-20.0, le=60.0)
    supply_voltage: Optional[float] = Field(None, ge=200.0, le=500.0)
    random_seed: Optional[int] = None
    is_paused: Optional[bool] = None


class MaintenanceRecordCreate(BaseModel):
    title: str
    component: str
    maintenance_type: str = "Condition-Based"
    technician: str = "Lead Electrical Engineer"
    notes: str
    status: str = "Completed"


class ScenarioComparisonRequest(BaseModel):
    kw_a: float = 4.8
    eff_a: float = 89.2
    pf_a: float = 0.86
    kw_b: float = 5.6
    eff_b: float = 82.5
    pf_b: float = 0.78
    operating_hours: float = 4000.0
    tariff: float = 0.14


class GenericResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
