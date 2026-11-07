"""
SQLAlchemy ORM models for telemetry, configs, alerts, maintenance, and sessions.
"""

import time
from sqlalchemy import Column, Integer, Float, String, Boolean, Text, DateTime
from .connection import Base


class MotorConfigEntity(Base):
    __tablename__ = "motor_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), default="Industrial 3-Phase Induction Motor")
    motor_type = Column(String(50), default="Squirrel-Cage Induction Motor")
    rated_power_kw = Column(Float, default=5.5)
    rated_voltage_v = Column(Float, default=415.0)
    rated_frequency_hz = Column(Float, default=50.0)
    num_poles = Column(Integer, default=4)
    rated_speed_rpm = Column(Float, default=1450.0)
    rated_power_factor = Column(Float, default=0.86)
    rated_efficiency_pct = Column(Float, default=89.5)
    connection = Column(String(20), default="Star")
    cooling_type = Column(String(30), default="TEFC")
    r1 = Column(Float, default=1.15)
    x1 = Column(Float, default=1.75)
    r2_prime = Column(Float, default=1.05)
    x2_prime = Column(Float, default=1.75)
    xm = Column(Float, default=48.0)
    rc = Column(Float, default=650.0)
    inertia_j = Column(Float, default=0.048)
    friction_b = Column(Float, default=0.0025)
    created_at = Column(Float, default=time.time)


class TelemetryRecordEntity(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(Float, default=time.time, index=True)
    sim_time = Column(Float)
    motor_state = Column(String(30))
    rpm = Column(Float)
    torque_nm = Column(Float)
    load_pct = Column(Float)
    current_line_a = Column(Float)
    voltage_vll = Column(Float)
    power_active_kw = Column(Float)
    power_factor = Column(Float)
    efficiency_pct = Column(Float)
    temp_winding = Column(Float)
    temp_stator = Column(Float)
    temp_rotor = Column(Float)
    temp_bearing_de = Column(Float)
    temp_housing = Column(Float)
    vibe_rms = Column(Float)
    vibe_peak = Column(Float)
    dominant_freq = Column(Float)
    health_score = Column(Float)
    cumulative_kwh = Column(Float)


class AlertEntity(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    timestamp = Column(Float, default=time.time)
    component = Column(String(50))
    parameter = Column(String(50))
    value = Column(String(50))
    threshold = Column(String(50))
    severity = Column(String(30))  # Info, Normal, Warning, Critical, Emergency
    description = Column(Text)
    action = Column(Text)
    acknowledged = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)


class MaintenanceRecordEntity(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(Float, default=time.time)
    title = Column(String(100))
    component = Column(String(50))
    maintenance_type = Column(String(50))  # Preventive, Corrective, Condition-Based
    technician = Column(String(100), default="Site Reliability Engineer")
    notes = Column(Text)
    status = Column(String(30), default="Completed")  # Scheduled, In Progress, Completed


class SimulationSessionEntity(Base):
    __tablename__ = "simulation_sessions"

    id = Column(String(50), primary_key=True, index=True)
    start_time = Column(Float, default=time.time)
    end_time = Column(Float, nullable=True)
    status = Column(String(30), default="Running")
    random_seed = Column(Integer, default=42)
    notes = Column(Text, nullable=True)
