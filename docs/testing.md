# Testing Methodology & Automated Verification

## 1. Test Suite Structure

Automated tests are implemented using **Pytest** for backend physics, models, and endpoints.

```
tests/
  backend/
    test_motor_simulation.py
```

## 2. Tested Capabilities (26 Verification Points)

| # | Test Function | Verified Behavior |
| :--- | :--- | :--- |
| **01** | `test_01_motor_initialization` | Verifies default state (OFF), zero initial speed, and 5.5 kW / 415 V nameplate parameters. |
| **02** | `test_02_motor_starting` | Verifies state transition to STARTING and acceleration to rated speed range. |
| **03** | `test_03_motor_stopping` | Verifies controlled deceleration under friction and transition back to OFF. |
| **04** | `test_04_emergency_stop` | Verifies immediate safety cutoff, lockout of restart without RESET, and trip clearance. |
| **05** | `test_05_speed_adjustment_vfd` | Verifies VFD frequency changes (30 Hz and 60 Hz) and corresponding synchronous speed shifts (900 RPM and 1800 RPM). |
| **06** | `test_06_load_adjustment` | Verifies mechanical load torque changes from part load to overload. |
| **07** | `test_07_forward_and_reverse` | Verifies directional reversal and negative RPM representation for reverse rotation. |
| **08** | `test_08_synchronous_speed_calculation` | Validates kinematic formula $N_s = 120 f / P$ at 25 Hz, 50 Hz, and 60 Hz. |
| **09** | `test_09_slip_calculation` | Validates slip calculation at rated speed ($s \approx 0.0333$) and standstill ($s = 1.0$). |
| **10** | `test_10_torque_speed_characteristics` | Generates 31-point torque-speed curve; checks starting torque and zero torque at $N_s$. |
| **11** | `test_11_mechanical_power_calculation` | Validates developed mechanical shaft power $P_{mech} = T_e \cdot \omega_m$. |
| **12** | `test_12_electrical_power_calculation` | Validates 3-phase active power, power factor, and operating efficiency. |
| **13** | `test_13_energy_integration` | Validates numerical integration of power over time ($5 \text{ kW} \times 1 \text{ hr} = 5 \text{ kWh}$). |
| **14** | `test_14_thermal_response` | Validates temperature rise across winding and housing nodes under load. |
| **15** | `test_15_bearing_wear_fault` | Verifies elevated vibration RMS and 3D visual tagging of "Bearings" on fault activation. |
| **16** | `test_16_rotor_imbalance_fault` | Verifies dominant 1X vibration amplitude surge ($> 4 \text{ mm/s}$). |
| **17** | `test_17_shaft_misalignment_fault` | Verifies 2X rotational harmonic peak elevation. |
| **18** | `test_18_motor_overload` | Verifies OVERLOADED state transition at 140% load torque. |
| **19** | `test_19_cooling_fan_failure` | Verifies airflow factor drops below 10%. |
| **20** | `test_20_phase_voltage_imbalance` | Verifies voltage unbalance detection ($> 5\%$). |
| **21** | `test_21_vibration_signal_generation` | Validates synthesis of time-domain waveform array. |
| **22** | `test_22_fft_analysis` | Validates discrete FFT frequency spectrum computation. |
| **23** | `test_23_condition_monitoring` | Validates overall machine health score and component health metrics. |
| **24** | `test_24_alert_generation` | Validates alert generation, threshold checking, and acknowledgement. |
| **25** | `test_25_rest_apis` | Validates REST API schemas and state responses. |
| **26** | `test_26_csv_export` | Validates CSV generation for historical telemetry. |

## 3. Running the Test Suite

```bash
cd motor-digital-twin
python -m pytest tests/backend -v
```
