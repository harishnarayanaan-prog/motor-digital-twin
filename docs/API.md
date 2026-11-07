# REST & WebSocket API Documentation

## Base URL
- **REST Endpoints**: `http://localhost:8000/api`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **Interactive ReDoc**: `http://localhost:8000/redoc`
- **WebSocket Telemetry Stream**: `ws://localhost:8000/ws/telemetry`

---

## 1. Motor Operation Commands

### `POST /api/simulation/start`
Starts motor acceleration towards target speed under applied voltage.
- **Response**: `{"success": true, "message": "Motor starting sequence initiated.", "data": {"state": "STARTING"}}`

### `POST /api/simulation/stop`
Initiates controlled decelerating shutdown.
- **Response**: `{"success": true, "message": "Controlled motor stop sequence initiated.", "data": {"state": "STOPPING"}}`

### `POST /api/simulation/emergency-stop`
Immediate safety trip; cuts all electrical excitation instantly.
- **Response**: `{"success": true, "message": "EMERGENCY STOP executed. Power severed immediately.", "data": {"state": "EMERGENCY_STOP"}}`

### `POST /api/simulation/reset`
Resets motor state from FAULT or EMERGENCY_STOP to OFF.
- **Response**: `{"success": true, "message": "Simulation state reset to OFF. Ready for start."}`

### `POST /api/simulation/speed`
Sets VFD inverter target supply frequency (10.0 Hz to 65.0 Hz).
- **Body**: `{"frequency_hz": 48.5}`

### `POST /api/simulation/load`
Adjusts mechanical load torque from 0% to 150% rated load.
- **Body**: `{"load_pct": 85.0}`

### `POST /api/simulation/direction`
Sets rotation direction ("Forward" or "Reverse").
- **Body**: `{"direction": "Reverse"}`

---

## 2. Telemetry & Subsystem Queries

- `GET /api/simulation/state`: Full real-time telemetry snapshot (mechanical, electrical, thermal, vibration, condition, energy).
- `GET /api/simulation/telemetry-history`: Rolling 300-point time-series history for charts.
- `GET /api/simulation/electrical`: 3-phase voltages, currents, active/reactive power, PF, imbalance.
- `GET /api/simulation/mechanical`: Shaft speed, synchronous RPM, slip, torque, power, and full torque-speed characteristic curve.
- `GET /api/simulation/thermal`: 5-node temperatures, losses breakdown, airflow percentage, alarm levels.
- `GET /api/simulation/vibration`: Time-domain waveform (128 pts), FFT spectrum (0–600 Hz), bearing frequencies, ISO zone.
- `GET /api/simulation/condition`: Component health scores, anomaly rules, recommendations, RUL estimate.
- `GET /api/simulation/energy`: Instantaneous power, loss segregation (Watts), cumulative kWh, cost.
- `POST /api/simulation/energy/compare`: Comparative economic analysis between Scenario A and Scenario B.

---

## 3. Fault Simulator

- `GET /api/simulation/faults`: List of 12 faults, descriptions, active states, and severities.
- `POST /api/simulation/faults/toggle`: Activate/deactivate a fault. Body: `{"fault_id": "bearing_wear", "is_active": true, "severity": 0.8}`
- `POST /api/simulation/faults/reset`: Clear all active faults.

---

## 4. Alerts & Maintenance Records

- `GET /api/alerts`: Query active and historical alerts (supports `?severity=Critical` and `?acknowledged=false`).
- `POST /api/alerts/{id}/acknowledge`: Mark alert acknowledged.
- `POST /api/alerts/{id}/resolve`: Mark alert resolved.
- `GET /api/maintenance`: List logged maintenance events.
- `POST /api/maintenance`: Create maintenance record.
- `GET /api/export/csv?data_type=telemetry|alerts|maintenance`: Export data directly as CSV.

---

## 5. WebSocket Telemetry Protocol

Connect to `ws://localhost:8000/ws/telemetry`.
- **Server broadcasts**: Continuous 10 Hz JSON telemetry snapshots.
- **Client commands**: Send JSON commands over WebSocket:
  ```json
  {"type": "start"}
  {"type": "stop"}
  {"type": "emergency_stop"}
  {"type": "reset"}
  {"type": "speed", "frequency": 45.0}
  {"type": "load", "load_pct": 90.0}
  {"type": "direction", "direction": "Forward"}
  ```
