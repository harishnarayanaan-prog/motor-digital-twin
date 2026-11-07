"""
Comprehensive FastAPI REST endpoints for the Electric Motor Digital Twin platform.
"""

import io
import csv
import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import (
    MotorConfigEntity,
    TelemetryRecordEntity,
    AlertEntity,
    MaintenanceRecordEntity
)
from ..schemas.control import (
    SpeedControlRequest,
    LoadControlRequest,
    DirectionControlRequest,
    FaultToggleRequest,
    SimulationSettingsRequest,
    MaintenanceRecordCreate,
    ScenarioComparisonRequest,
    GenericResponse
)
from ..simulation.motor_base import MotorParameters
from ..simulation.engine import SimulationEngine

router = APIRouter()

# Global Singleton Simulation Engine
global_engine = SimulationEngine()


def get_engine() -> SimulationEngine:
    return global_engine


# -----------------------------------------------------------------
# 1. Motor Operation Commands
# -----------------------------------------------------------------

@router.post("/simulation/start", response_model=GenericResponse)
def start_motor(engine: SimulationEngine = Depends(get_engine)):
    success, msg = engine.command_start()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return GenericResponse(success=True, message=msg, data={"state": engine.state.value})


@router.post("/simulation/stop", response_model=GenericResponse)
def stop_motor(engine: SimulationEngine = Depends(get_engine)):
    success, msg = engine.command_stop()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return GenericResponse(success=True, message=msg, data={"state": engine.state.value})


@router.post("/simulation/emergency-stop", response_model=GenericResponse)
def emergency_stop_motor(engine: SimulationEngine = Depends(get_engine)):
    success, msg = engine.command_emergency_stop()
    return GenericResponse(success=True, message=msg, data={"state": engine.state.value})


@router.post("/simulation/reset", response_model=GenericResponse)
def reset_motor(engine: SimulationEngine = Depends(get_engine)):
    success, msg = engine.command_reset()
    return GenericResponse(success=True, message=msg, data={"state": engine.state.value})


@router.post("/simulation/speed", response_model=GenericResponse)
def set_speed(req: SpeedControlRequest, engine: SimulationEngine = Depends(get_engine)):
    success, msg = engine.command_set_speed(req.frequency_hz)
    return GenericResponse(success=True, message=msg, data={"frequency_hz": engine.vfd_frequency})


@router.post("/simulation/load", response_model=GenericResponse)
def set_load(req: LoadControlRequest, engine: SimulationEngine = Depends(get_engine)):
    success, msg = engine.command_set_load(req.load_pct)
    return GenericResponse(success=True, message=msg, data={"load_pct": engine.load_percentage})


@router.post("/simulation/direction", response_model=GenericResponse)
def set_direction(req: DirectionControlRequest, engine: SimulationEngine = Depends(get_engine)):
    success, msg = engine.command_set_direction(req.direction)
    return GenericResponse(success=True, message=msg, data={"direction": "Forward" if engine.direction == 1 else "Reverse"})


# -----------------------------------------------------------------
# 2. Telemetry and Subsystem Data
# -----------------------------------------------------------------

@router.get("/simulation/state")
def get_simulation_state(engine: SimulationEngine = Depends(get_engine)):
    return engine.step(dt=0.0)


@router.get("/simulation/telemetry-history")
def get_telemetry_history(engine: SimulationEngine = Depends(get_engine)):
    return {
        "count": len(engine.telemetry_history),
        "history": engine.telemetry_history
    }


@router.get("/simulation/electrical")
def get_electrical_data(engine: SimulationEngine = Depends(get_engine)):
    state = engine.step(dt=0.0)
    return {
        "electrical": state["electrical"],
        "supply_frequency_hz": state["vfd_frequency_hz"],
        "state": state["state"]
    }


@router.get("/simulation/mechanical")
def get_mechanical_data(engine: SimulationEngine = Depends(get_engine)):
    state = engine.step(dt=0.0)
    torque_speed_curve = engine.motor_model.generate_torque_speed_curve(
        supply_voltage=state["electrical"]["v_line_to_line"],
        frequency=state["vfd_frequency_hz"],
        points=60
    )
    return {
        "mechanical": state["mechanical"],
        "torque_speed_curve": torque_speed_curve,
        "operating_point": {
            "rpm": state["mechanical"]["rotor_speed_rpm"],
            "torque_nm": state["mechanical"]["electromagnetic_torque_nm"]
        }
    }


@router.get("/simulation/thermal")
def get_thermal_data(engine: SimulationEngine = Depends(get_engine)):
    state = engine.step(dt=0.0)
    return {
        "thermal": state["thermal"],
        "thresholds": engine.thermal_model.thresholds,
        "state": state["state"]
    }


@router.get("/simulation/vibration")
def get_vibration_data(engine: SimulationEngine = Depends(get_engine)):
    state = engine.step(dt=0.0)
    return {
        "vibration": state["vibration"],
        "iso_severity": state["vibration"]["iso_severity_zone"],
        "state": state["state"]
    }


@router.get("/simulation/condition")
def get_condition_data(engine: SimulationEngine = Depends(get_engine)):
    state = engine.step(dt=0.0)
    return state["condition"]


@router.get("/simulation/energy")
def get_energy_data(engine: SimulationEngine = Depends(get_engine)):
    state = engine.step(dt=0.0)
    return state["energy"]


@router.post("/simulation/energy/compare")
def compare_energy_scenarios(req: ScenarioComparisonRequest, engine: SimulationEngine = Depends(get_engine)):
    comparison = engine.energy_engine.compare_scenarios(
        kw_a=req.kw_a,
        eff_a=req.eff_a,
        pf_a=req.pf_a,
        kw_b=req.kw_b,
        eff_b=req.eff_b,
        pf_b=req.pf_b,
        operating_hours_year=req.operating_hours,
        tariff=req.tariff
    )
    return comparison


# -----------------------------------------------------------------
# 3. Fault Simulator
# -----------------------------------------------------------------

@router.get("/simulation/faults")
def get_faults(engine: SimulationEngine = Depends(get_engine)):
    return {
        "faults": engine.fault_engine.get_all_faults(),
        "active_fault_ids": engine.fault_engine.get_active_fault_ids(),
        "affected_components": engine.fault_engine.get_affected_components()
    }


@router.post("/simulation/faults/toggle", response_model=GenericResponse)
def toggle_fault(req: FaultToggleRequest, engine: SimulationEngine = Depends(get_engine)):
    ok = engine.fault_engine.set_fault(req.fault_id, req.is_active, req.severity)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Fault '{req.fault_id}' not found.")
    action_str = "activated" if req.is_active else "deactivated"
    return GenericResponse(
        success=True,
        message=f"Fault '{req.fault_id}' {action_str}.",
        data={"active_faults": engine.fault_engine.get_active_fault_ids()}
    )


@router.post("/simulation/faults/reset", response_model=GenericResponse)
def reset_all_faults(engine: SimulationEngine = Depends(get_engine)):
    engine.fault_engine.reset_all_faults()
    return GenericResponse(success=True, message="All faults cleared.")


# -----------------------------------------------------------------
# 4. Motor Configuration & Simulation Settings
# -----------------------------------------------------------------

@router.get("/simulation/config")
def get_motor_config(engine: SimulationEngine = Depends(get_engine)):
    return engine.params.model_dump()


@router.post("/simulation/config", response_model=GenericResponse)
def update_motor_config(new_params: MotorParameters, engine: SimulationEngine = Depends(get_engine), db: Session = Depends(get_db)):
    engine.set_parameters(new_params)
    # Save to SQLite database
    entity = MotorConfigEntity(
        name=new_params.name,
        motor_type=new_params.motor_type,
        rated_power_kw=new_params.rated_power_kw,
        rated_voltage_v=new_params.rated_voltage_v,
        rated_frequency_hz=new_params.rated_frequency_hz,
        num_poles=new_params.num_poles,
        rated_speed_rpm=new_params.rated_speed_rpm,
        rated_power_factor=new_params.rated_power_factor,
        rated_efficiency_pct=new_params.rated_efficiency_pct,
        connection=new_params.connection,
        r1=new_params.r1,
        x1=new_params.x1,
        r2_prime=new_params.r2_prime,
        x2_prime=new_params.x2_prime,
        xm=new_params.xm,
        rc=new_params.rc,
        inertia_j=new_params.inertia_j,
        friction_b=new_params.friction_b
    )
    db.add(entity)
    db.commit()
    return GenericResponse(success=True, message="Motor parameters updated successfully.", data=engine.params.model_dump())


@router.get("/simulation/settings")
def get_simulation_settings(engine: SimulationEngine = Depends(get_engine)):
    return {
        "simulation_speed": engine.simulation_speed,
        "ambient_temperature": engine.ambient_temperature,
        "supply_voltage_nominal": engine.supply_vll_nominal,
        "is_paused": engine.is_paused,
        "random_seed": engine.random_seed
    }


@router.post("/simulation/settings", response_model=GenericResponse)
def update_simulation_settings(req: SimulationSettingsRequest, engine: SimulationEngine = Depends(get_engine)):
    if req.simulation_speed is not None:
        engine.simulation_speed = req.simulation_speed
    if req.ambient_temperature is not None:
        engine.command_set_ambient_temp(req.ambient_temperature)
    if req.supply_voltage is not None:
        engine.supply_vll_nominal = req.supply_voltage
    if req.is_paused is not None:
        engine.is_paused = req.is_paused
    if req.random_seed is not None:
        engine.random_seed = req.random_seed

    return GenericResponse(success=True, message="Simulation settings applied.")


# -----------------------------------------------------------------
# 5. Alerts Management
# -----------------------------------------------------------------

@router.get("/alerts")
def get_alerts(
    severity: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    engine: SimulationEngine = Depends(get_engine)
):
    results = engine.alerts
    if severity:
        results = [a for a in results if a["severity"].lower() == severity.lower()]
    if acknowledged is not None:
        results = [a for a in results if a["acknowledged"] == acknowledged]
    return {
        "total": len(results),
        "alerts": results
    }


@router.post("/alerts/{alert_id}/acknowledge", response_model=GenericResponse)
def acknowledge_alert(alert_id: str, engine: SimulationEngine = Depends(get_engine)):
    ok = engine.acknowledge_alert(alert_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert ID not found.")
    return GenericResponse(success=True, message=f"Alert '{alert_id}' acknowledged.")


@router.post("/alerts/{alert_id}/resolve", response_model=GenericResponse)
def resolve_alert(alert_id: str, engine: SimulationEngine = Depends(get_engine)):
    ok = engine.resolve_alert(alert_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert ID not found.")
    return GenericResponse(success=True, message=f"Alert '{alert_id}' marked as resolved.")


# -----------------------------------------------------------------
# 6. Maintenance Records
# -----------------------------------------------------------------

@router.get("/maintenance")
def get_maintenance_records(db: Session = Depends(get_db)):
    records = db.query(MaintenanceRecordEntity).order_by(MaintenanceRecordEntity.timestamp.desc()).all()
    # If empty, insert realistic demonstration seed records
    if not records:
        seed_records = [
            MaintenanceRecordEntity(
                timestamp=time.time() - 86400 * 12,
                title="6-Month Comprehensive Vibration & Thermographic Audit",
                component="Bearings & Stator",
                maintenance_type="Condition-Based",
                technician="M. Vance (Vibration Analyst Cat II)",
                notes="Baseline overall vibration measured 1.18 mm/s RMS. Baseline winding temperature 72°C under 85% load. Grease replenished.",
                status="Completed"
            ),
            MaintenanceRecordEntity(
                timestamp=time.time() - 86400 * 45,
                title="Drive-End Bearing Re-lubrication (Mobil Polyrex EM)",
                component="Bearings",
                maintenance_type="Preventive",
                technician="R. Sharma (Mechanical Tech)",
                notes="Injected 15 grams high-temperature polyurea grease to DE and NDE bearing cavities. Cleaned grease relief ports.",
                status="Completed"
            ),
            MaintenanceRecordEntity(
                timestamp=time.time() - 86400 * 90,
                title="Laser Shaft Alignment Verification",
                component="Shaft",
                maintenance_type="Corrective",
                technician="T. Kovacs (Alignment Specialist)",
                notes="Corrected 0.12 mm parallel offset between motor shaft and dynamometer coupling using precision shims.",
                status="Completed"
            )
        ]
        for r in seed_records:
            db.add(r)
        db.commit()
        records = db.query(MaintenanceRecordEntity).order_by(MaintenanceRecordEntity.timestamp.desc()).all()

    return [
        {
            "id": r.id,
            "timestamp": r.timestamp,
            "date_str": time.strftime("%Y-%m-%d %H:%M", time.localtime(r.timestamp)),
            "title": r.title,
            "component": r.component,
            "maintenance_type": r.maintenance_type,
            "technician": r.technician,
            "notes": r.notes,
            "status": r.status
        }
        for r in records
    ]


@router.post("/maintenance", response_model=GenericResponse)
def add_maintenance_record(req: MaintenanceRecordCreate, db: Session = Depends(get_db)):
    rec = MaintenanceRecordEntity(
        title=req.title,
        component=req.component,
        maintenance_type=req.maintenance_type,
        technician=req.technician,
        notes=req.notes,
        status=req.status
    )
    db.add(rec)
    db.commit()
    return GenericResponse(success=True, message="Maintenance record created successfully.", data={"id": rec.id})


# -----------------------------------------------------------------
# 7. CSV Export
# -----------------------------------------------------------------

@router.get("/export/csv")
def export_csv(
    data_type: str = Query("telemetry", description="'telemetry', 'alerts', or 'maintenance'"),
    engine: SimulationEngine = Depends(get_engine),
    db: Session = Depends(get_db)
):
    output = io.StringIO()
    writer = csv.writer(output)

    if data_type == "alerts":
        writer.writerow(["Alert ID", "Timestamp", "Component", "Parameter", "Value", "Threshold", "Severity", "Description", "Acknowledged", "Resolved"])
        for a in engine.alerts:
            writer.writerow([
                a["id"],
                a["timestamp_str"],
                a["component"],
                a["parameter"],
                a["value"],
                a["threshold"],
                a["severity"],
                a["description"],
                a["acknowledged"],
                a["resolved"]
            ])
        filename = "motor_alerts.csv"

    elif data_type == "maintenance":
        writer.writerow(["ID", "Date", "Title", "Component", "Type", "Technician", "Status", "Notes"])
        records = db.query(MaintenanceRecordEntity).all()
        for r in records:
            writer.writerow([
                r.id,
                time.strftime("%Y-%m-%d %H:%M", time.localtime(r.timestamp)),
                r.title,
                r.component,
                r.maintenance_type,
                r.technician,
                r.status,
                r.notes
            ])
        filename = "motor_maintenance.csv"

    else:
        # Default: telemetry history
        writer.writerow(["Timestamp", "SimTime", "RPM", "Torque_Nm", "Current_A", "Power_kW", "TempWinding_C", "TempBearing_C", "VibeRMS_mms", "HealthScore", "EfficiencyPct"])
        for t in engine.telemetry_history:
            writer.writerow([
                t["timestamp"],
                t["sim_time"],
                t["rpm"],
                t["torque_nm"],
                t["current_a"],
                t["power_kw"],
                t["temp_winding"],
                t["temp_bearing"],
                t["vibe_rms"],
                t["health_score"],
                t["efficiency_pct"]
            ])
        filename = "motor_telemetry_history.csv"

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
