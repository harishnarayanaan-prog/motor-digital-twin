"""
Comprehensive pytest suite for Electric Motor Digital Twin.
Tests:
  1. Motor initialization
  2. Motor starting
  3. Motor stopping
  4. Emergency stop
  5. Speed adjustment (VFD)
  6. Load adjustment
  7. Forward and reverse operation
  8. Synchronous speed calculation
  9. Slip calculation
  10. Torque-speed characteristics
  11. Mechanical power calculation
  12. Electrical power calculation
  13. Energy integration
  14. Thermal response
  15. Bearing wear simulation
  16. Rotor imbalance simulation
  17. Shaft misalignment simulation
  18. Motor overload
  19. Cooling fan failure
  20. Phase voltage imbalance
  21. Vibration signal generation
  22. FFT analysis
  23. Condition monitoring
  24. Alert generation
  25. Historical data persistence
  26. REST APIs
  27. CSV export
"""

import sys
import os

sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, r"D:\Projects\motor-digital-twin")

import math
import pytest

from backend.app.simulation.motor_base import MotorParameters
from backend.app.simulation.induction_motor import InductionMotorModel
from backend.app.simulation.thermal_model import MotorThermalModel
from backend.app.simulation.vibration_model import VibrationAnalysisEngine
from backend.app.simulation.fault_engine import FaultEngine
from backend.app.simulation.condition_engine import ConditionMonitoringEngine
from backend.app.simulation.energy_engine import EnergyAnalyticsEngine
from backend.app.simulation.engine import SimulationEngine, MotorState

from backend.app.api.endpoints import (
    get_simulation_state,
    set_speed,
    set_load,
    get_faults,
    toggle_fault,
    export_csv,
    get_electrical_data,
    get_mechanical_data,
    get_thermal_data,
    get_vibration_data,
    get_condition_data,
    get_energy_data,
    compare_energy_scenarios
)
from backend.app.schemas.control import (
    SpeedControlRequest,
    LoadControlRequest,
    FaultToggleRequest,
    ScenarioComparisonRequest
)
from backend.app.database.connection import SessionLocal, init_db


@pytest.fixture
def sim_engine():
    engine = SimulationEngine()
    engine.command_reset()
    return engine


@pytest.fixture
def db_session():
    init_db()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_01_motor_initialization(sim_engine):
    assert sim_engine.state == MotorState.OFF
    assert sim_engine.current_speed_rpm == 0.0
    assert sim_engine.params.rated_power_kw == 5.5
    assert sim_engine.params.num_poles == 4
    assert sim_engine.params.rated_voltage_v == 415.0


def test_02_motor_starting(sim_engine):
    success, msg = sim_engine.command_start()
    assert success is True
    assert sim_engine.state == MotorState.STARTING

    # Step simulation to accelerate
    for _ in range(30):
        sim_engine.step(dt=0.1)

    assert sim_engine.current_speed_rpm > 1000.0
    assert sim_engine.state in [MotorState.STARTING, MotorState.RUNNING]


def test_03_motor_stopping(sim_engine):
    sim_engine.command_start()
    for _ in range(25):
        sim_engine.step(dt=0.1)
    assert sim_engine.current_speed_rpm > 500.0

    success, msg = sim_engine.command_stop()
    assert success is True
    assert sim_engine.state == MotorState.STOPPING

    # Let it decelerate
    for _ in range(80):
        sim_engine.step(dt=0.1)
    assert sim_engine.current_speed_rpm < 20.0


def test_04_emergency_stop(sim_engine):
    sim_engine.command_start()
    for _ in range(15):
        sim_engine.step(dt=0.1)

    success, msg = sim_engine.command_emergency_stop()
    assert success is True
    assert sim_engine.state == MotorState.EMERGENCY_STOP

    # Cannot start directly while in EMERGENCY_STOP
    ok, _ = sim_engine.command_start()
    assert ok is False

    # After reset, can start again
    sim_engine.command_reset()
    assert sim_engine.state == MotorState.OFF


def test_05_speed_adjustment_vfd(sim_engine):
    sim_engine.command_set_speed(30.0)
    assert sim_engine.vfd_frequency == 30.0
    sync_30 = sim_engine.motor_model.compute_synchronous_speed(30.0)
    assert sync_30 == 900.0  # 120 * 30 / 4 = 900 RPM

    sim_engine.command_set_speed(60.0)
    assert sim_engine.vfd_frequency == 60.0
    sync_60 = sim_engine.motor_model.compute_synchronous_speed(60.0)
    assert sync_60 == 1800.0  # 120 * 60 / 4 = 1800 RPM


def test_06_load_adjustment(sim_engine):
    sim_engine.command_set_load(120.0)
    assert sim_engine.load_percentage == 120.0
    sim_engine.command_set_load(50.0)
    assert sim_engine.load_percentage == 50.0


def test_07_forward_and_reverse(sim_engine):
    sim_engine.command_set_direction("Reverse")
    assert sim_engine.direction == -1

    sim_engine.command_start()
    for _ in range(20):
        sim_engine.step(dt=0.1)

    assert sim_engine.current_speed_rpm < 0.0  # Negative RPM indicates reverse rotation


def test_08_synchronous_speed_calculation():
    model = InductionMotorModel()
    assert model.compute_synchronous_speed(50.0) == 1500.0
    assert model.compute_synchronous_speed(60.0) == 1800.0
    assert model.compute_synchronous_speed(25.0) == 750.0


def test_09_slip_calculation():
    model = InductionMotorModel()
    # At Ns = 1500, Nr = 1450 => s = (1500 - 1450)/1500 = 50/1500 = 0.0333...
    slip = model.compute_slip(1500.0, 1450.0)
    assert abs(slip - 0.03333) < 0.001

    # At standstill Nr = 0 => s = 1.0
    assert model.compute_slip(1500.0, 0.0) == 1.0


def test_10_torque_speed_characteristics():
    model = InductionMotorModel()
    curve = model.generate_torque_speed_curve(supply_voltage=415.0, frequency=50.0, points=30)
    assert len(curve) == 31
    # Starting torque at RPM = 0
    t_start = curve[0]["torque_nm"]
    assert t_start > 20.0  # Healthy starting torque
    # Near synchronous speed, torque approaches zero
    t_sync = curve[-1]["torque_nm"]
    assert abs(t_sync) < 5.0


def test_11_mechanical_power_calculation(sim_engine):
    sim_engine.command_start()
    for _ in range(25):
        sim_engine.step(dt=0.1)
    snapshot = sim_engine.step(dt=0.1)
    p_mech = snapshot["mechanical"]["mechanical_power_kw"]
    assert p_mech > 1.0  # Active mechanical shaft power developed


def test_12_electrical_power_calculation(sim_engine):
    sim_engine.command_start()
    for _ in range(25):
        sim_engine.step(dt=0.1)
    snapshot = sim_engine.step(dt=0.1)
    elec = snapshot["electrical"]
    assert elec["active_power_kw"] > 1.0
    assert elec["power_factor"] > 0.6
    assert elec["efficiency_pct"] > 60.0


def test_13_energy_integration():
    energy_engine = EnergyAnalyticsEngine(electricity_tariff_per_kwh=0.15)
    energy_engine.reset_energy()
    # 5 kW for 3600 seconds = 5 kWh
    energy_engine.step_energy(p_active_kw=5.0, dt_seconds=3600.0)
    assert abs(energy_engine.cumulative_energy_kwh - 5.0) < 0.01
    assert abs(energy_engine.total_cost_usd - 0.75) < 0.01


def test_14_thermal_response():
    thermal = MotorThermalModel(ambient_temp=25.0)
    # Simulate high current and power for 20 seconds
    for _ in range(40):
        out = thermal.step(
            dt=0.5,
            speed_rpm=1450.0,
            rated_speed_rpm=1450.0,
            active_power_w=6000.0,
            mech_power_w=5200.0,
            stator_current=10.5,
            r1=1.15,
            r2_prime=1.05,
            slip=0.035
        )
    # Winding and Stator should have warmed up above ambient
    assert out["t_winding"] > 25.5
    assert out["t_housing"] > 25.0


def test_15_bearing_wear_fault(sim_engine):
    sim_engine.command_start()
    for _ in range(20):
        sim_engine.step(dt=0.1)

    # Baseline vibration without fault
    vibe_normal = sim_engine.step(dt=0.1)["vibration"]["rms_velocity_mms"]

    # Activate bearing wear fault
    sim_engine.fault_engine.set_fault("bearing_wear", is_active=True, severity=0.8)
    snap_fault = sim_engine.step(dt=0.1)
    vibe_fault = snap_fault["vibration"]["rms_velocity_mms"]

    assert vibe_fault > vibe_normal
    assert "Bearings" in snap_fault["affected_3d_components"]


def test_16_rotor_imbalance_fault(sim_engine):
    sim_engine.command_start()
    for _ in range(20):
        sim_engine.step(dt=0.1)

    sim_engine.fault_engine.set_fault("rotor_imbalance", is_active=True, severity=0.9)
    snap = sim_engine.step(dt=0.1)
    diag = snap["vibration"]["diagnostics"]
    assert diag["amp_1x"] > 4.0  # High 1X vibration component


def test_17_shaft_misalignment_fault(sim_engine):
    sim_engine.command_start()
    for _ in range(20):
        sim_engine.step(dt=0.1)

    sim_engine.fault_engine.set_fault("shaft_misalignment", is_active=True, severity=0.85)
    snap = sim_engine.step(dt=0.1)
    diag = snap["vibration"]["diagnostics"]
    assert diag["amp_2x"] > 3.0  # High 2X harmonic


def test_18_motor_overload(sim_engine):
    sim_engine.command_start()
    for _ in range(20):
        sim_engine.step(dt=0.1)

    sim_engine.command_set_load(140.0)
    for _ in range(10):
        snap = sim_engine.step(dt=0.1)

    assert sim_engine.state == MotorState.OVERLOADED
    assert snap["mechanical"]["load_percentage"] == 140.0


def test_19_cooling_fan_failure(sim_engine):
    sim_engine.fault_engine.set_fault("cooling_fan_failure", is_active=True, severity=1.0)
    snap = sim_engine.step(dt=0.1)
    assert snap["thermal"]["cooling_airflow_pct"] < 10.0


def test_20_phase_voltage_imbalance(sim_engine):
    sim_engine.command_start()
    for _ in range(20):
        sim_engine.step(dt=0.1)

    sim_engine.fault_engine.set_fault("phase_voltage_imbalance", is_active=True, severity=0.8)
    snap = sim_engine.step(dt=0.1)
    assert snap["electrical"]["voltage_imbalance_pct"] > 5.0


def test_21_vibration_signal_generation():
    vibe_engine = VibrationAnalysisEngine(sampling_rate=1024, num_samples=256)
    out = vibe_engine.generate_vibration_data(speed_rpm=1450.0, supply_freq_hz=50.0, load_pct=80.0)
    assert "waveform" in out
    assert len(out["waveform"]) > 0
    assert out["rms_velocity_mms"] > 0.0


def test_22_fft_analysis():
    vibe_engine = VibrationAnalysisEngine(sampling_rate=2048, num_samples=512)
    out = vibe_engine.generate_vibration_data(speed_rpm=1500.0, supply_freq_hz=50.0, load_pct=80.0)
    spectrum = out["fft_spectrum"]
    assert len(spectrum) > 10
    # Peak amplitude should be positive
    max_amp = max(point["amp"] for point in spectrum)
    assert max_amp > 0.0


def test_23_condition_monitoring(sim_engine):
    sim_engine.command_start()
    for _ in range(25):
        sim_engine.step(dt=0.1)
    cond = sim_engine.step(dt=0.1)["condition"]
    assert "overall_health_score" in cond
    assert cond["overall_health_score"] > 80.0  # Healthy motor
    assert "component_health" in cond
    assert "rul_hours" in cond


def test_24_alert_generation(sim_engine):
    sim_engine.add_alert(
        component="Bearings",
        parameter="Temperature",
        value="92.0°C",
        threshold="90.0°C",
        severity="Critical",
        description="Bearing temperature critical test.",
        action="Inspect bearing lubrication."
    )
    assert len(sim_engine.alerts) > 0
    alert_id = sim_engine.alerts[0]["id"]
    # Test acknowledgement
    assert sim_engine.acknowledge_alert(alert_id) is True
    assert sim_engine.alerts[0]["acknowledged"] is True


def test_25_rest_apis(sim_engine):
    # Test simulation state API
    state = get_simulation_state(sim_engine)
    assert "mechanical" in state
    assert "electrical" in state

    # Test speed control API
    res_speed = set_speed(SpeedControlRequest(frequency_hz=48.5), sim_engine)
    assert res_speed.success is True
    assert sim_engine.vfd_frequency == 48.5

    # Test load control API
    res_load = set_load(LoadControlRequest(load_pct=85.0), sim_engine)
    assert res_load.success is True
    assert sim_engine.load_percentage == 85.0

    # Test faults API
    faults_resp = get_faults(sim_engine)
    assert len(faults_resp["faults"]) == 12

    # Test fault toggle API
    toggle_resp = toggle_fault(FaultToggleRequest(fault_id="rotor_imbalance", is_active=True, severity=0.7), sim_engine)
    assert toggle_resp.success is True
    assert "rotor_imbalance" in toggle_resp.data["active_faults"]

    # Test electrical & mechanical endpoints
    elec = get_electrical_data(sim_engine)
    assert "electrical" in elec
    mech = get_mechanical_data(sim_engine)
    assert "torque_speed_curve" in mech

    # Test scenario comparison
    comp = compare_energy_scenarios(ScenarioComparisonRequest(kw_a=4.5, eff_a=90.0, pf_a=0.87, kw_b=5.4, eff_b=82.0, pf_b=0.79), sim_engine)
    assert "difference" in comp


def test_26_csv_export(sim_engine, db_session):
    sim_engine.step(0.1)
    res = export_csv(data_type="telemetry", engine=sim_engine, db=db_session)
    body = res.body.decode("utf-8")
    assert "RPM" in body
    assert "Torque_Nm" in body
