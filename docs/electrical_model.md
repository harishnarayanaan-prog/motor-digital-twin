# Electrical Monitoring & Power Equations

## 1. Per-Phase Equivalent Impedance

The per-phase equivalent circuit contains stator impedance, magnetizing/core branch, and the rotor circuit referred to the stator:

$$Z_2'(s) = \frac{R_2'}{s} + j X_2'$$
$$Z_m = \frac{R_c \cdot j X_m}{R_c + j X_m}$$
$$Z_{parallel} = \frac{Z_m \cdot Z_2'(s)}{Z_m + Z_2'(s)}$$
$$Z_{in}(s) = (R_1 + j X_1) + Z_{parallel}$$

## 2. Terminal Voltages and Phase Currents

For a balanced Star (Y) connection with line-to-line supply voltage $V_{LL}$:
$$V_1 = \frac{V_{LL}}{\sqrt{3}}$$
$$I_{phase} = I_{line} = \frac{V_1}{|Z_{in}(s)|}$$
$$\phi = \arg(Z_{in}(s))$$
$$\text{Power Factor (PF)} = \cos\phi$$

### Unbalanced Voltages & Phase Loss
Under Phase Voltage Imbalance or single-phasing (phase loss), phase voltages are modified:
- Voltage Imbalance Factor: $\text{VUF} = \frac{\Delta V_{max}}{V_{avg}} \times 100\%$
- Negative sequence voltage causes negative sequence braking torque and elevated $I^2R$ copper losses.
- Phase loss: $V_c = 0$, causing remaining phases to draw excessive magnetizing and rotor currents.

## 3. Three-Phase Power Quantities

- **Active Input Power**:
  $$P_{in} = \sqrt{3} \cdot V_{LL} \cdot I_{line} \cdot \cos\phi \quad [\text{W}]$$
- **Reactive Power**:
  $$Q = \sqrt{3} \cdot V_{LL} \cdot I_{line} \cdot \sin\phi \quad [\text{VAr}]$$
- **Apparent Power**:
  $$S = \sqrt{3} \cdot V_{LL} \cdot I_{line} \quad [\text{VA}]$$
- **Mechanical Shaft Output Power**:
  $$P_{mech} = T_e \cdot \omega_m - B \omega_m^2 \quad [\text{W}]$$
- **Overall Machine Efficiency**:
  $$\eta = \frac{P_{mech}}{P_{in}} \times 100\%$$
- **Cumulative Energy Consumption**:
  $$E = \int_{0}^{t} P_{in}(\tau) d\tau \quad [\text{kWh}]$$
