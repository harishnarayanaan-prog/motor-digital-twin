# Electric Motor Digital Twin – System Architecture

## 1. System Overview

The **Electric Motor Digital Twin, Real-Time Condition Monitoring and Predictive Maintenance System** is an end-to-end, software-only industrial simulation platform modeling a 5.5 kW, 415 V, 4-pole three-phase squirrel-cage induction motor (SCIM). It runs entirely locally on Windows, macOS, or Linux without external hardware, microcontrollers, or cloud subscriptions.

```mermaid
graph TD
    subgraph Frontend ["Frontend (React 19 + TypeScript + Vite + Tailwind CSS)"]
        UI[Industrial SCADA Dashboard]
        R3F[3D Motor Digital Twin Canvas (Three.js / React Three Fiber)]
        Charts[Real-Time Recharts & FFT Oscilloscopes]
        Controls[Motor Controls & VFD Inverter Sliders]
        Store[Zustand Telemetry Store]
    end

    subgraph Backend ["Backend (FastAPI + Python 3)"]
        WS[WebSocket Manager (10 Hz Push & Bidirectional Control)]
        API[FastAPI REST API Routes]
        
        subgraph Engine ["Simulation Physics Engine"]
            IM[Induction Motor Equivalent Circuit & Dynamics RK4]
            TM[5-Node Lumped Thermal Network Model]
            VM[Vibration Signal Synthesis & Discrete FFT]
            FE[12-Mode Industrial Fault Injection Engine]
            CM[Condition Monitoring & Anomaly Evaluator]
            PM[Degradation & Remaining Useful Life Estimator]
            EE[Energy Analytics & Loss Segregation]
        end

        DB[(SQLite via SQLAlchemy ORM)]
    end

    UI --> Controls
    Controls -->|REST / WS Commands| API
    Controls -->|WS JSON| WS
    WS --> Store
    Store --> UI
    Store --> R3F
    Store --> Charts
    API --> Engine
    WS --> Engine
    Engine --> DB
```

## 2. Component Architecture

### A. Frontend Layer
- **Framework**: React 19 with TypeScript, bundled by Vite.
- **Styling**: Tailwind CSS with an industrial SCADA dark navy/charcoal palette (`#0a0f1e`), cyan neon accents (`#00d4ff`), and status indicator glow effects.
- **3D Visualization**: Three.js and `@react-three/fiber` rendering an accurate, multi-component industrial TEFC induction motor (Housing, Stator, Rotor with conducting bars, Shaft, Bearings, Cooling Fan, Terminal Box, Base). Dynamic rotation speed directly linked to backend RPM. Fault visual highlighting.
- **Charts**: Recharts rendering rolling real-time graphs, FFT frequency spectrums, time-domain waveforms, and power loss breakdowns.
- **State Management**: Zustand store receiving 10 Hz telemetry snapshots over WebSockets.

### B. Backend Simulation Engine
- **Induction Motor Equivalent Circuit**: Per-phase Thevenin equivalent model calculating developed electromagnetic torque $T_e$, input impedance, phase currents, active and reactive power, power factor, and slip.
- **Mechanical Dynamics Integration**: 4th-order Runge-Kutta (RK4) with adaptive sub-stepping solving $J \frac{d\omega}{dt} = T_e - T_L - B\omega$.
- **5-Node Lumped Thermal Network**: Conductive and convective heat transfer model across Stator Winding, Stator Core, Rotor, Bearings, and Housing, with shaft-speed-dependent convective cooling airflow ($h \propto \omega^{0.8}$).
- **Vibration Synthesis & FFT**: Generates physical time-domain radial vibration signals containing 1X rotational frequency, 2X misalignment harmonic, 2fe electrical vibration (100 Hz), bearing defect pass frequencies (BPFO, BPFI, BSF, FTF), and background Gaussian noise. Computes real-time FFT power spectra and ISO 10816-3 severity rating.
- **Fault Simulator Engine**: Manages 12 industrial fault conditions with adjustable severities (0.0 to 1.0).
- **Condition Monitoring & Predictive Maintenance**: Real-time anomaly rules, multi-component health indices, degradation tracking, and transparent Remaining Useful Life (RUL) estimation.
- **Energy Analytics**: Segregates losses (stator copper, rotor copper, core iron, friction/windage, stray load), integrates cumulative energy (kWh), and calculates operating costs with configurable tariffs.

### C. Database Layer
- **Engine**: SQLite with SQLAlchemy ORM.
- **Tables**: `motor_configs`, `telemetry_records`, `alerts`, `maintenance_records`, `simulation_sessions`.
