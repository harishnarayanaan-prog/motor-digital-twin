# Three-Phase Induction Motor Mathematical Model

## 1. Physical Demonstration Motor Specification

The default simulated machine is a high-performance industrial totally enclosed fan-cooled (TEFC) three-phase squirrel-cage induction motor (SCIM).

| Parameter | Symbol | Nominal Value | Unit | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Rated Power** | $P_{rated}$ | 5.5 | kW | Continuous shaft mechanical rating |
| **Rated Voltage** | $V_{LL}$ | 415.0 | V RMS | Line-to-line supply voltage (balanced) |
| **Rated Frequency** | $f_{rated}$ | 50.0 | Hz | Supply electrical frequency |
| **Number of Poles** | $P$ | 4 | poles | 2 pole pairs ($p = 2$) |
| **Synchronous Speed**| $N_s$ | 1500.0 | RPM | $N_s = 120 f / P$ |
| **Rated Speed** | $N_r$ | 1450.0 | RPM | Nominal full-load shaft speed |
| **Rated Torque** | $T_{rated}$ | 36.22 | N·m | $T = P_{mech} / \omega_m$ |
| **Stator Resistance**| $R_1$ | 1.15 | $\Omega$ | Per-phase winding resistance |
| **Stator Reactance** | $X_1$ | 1.75 | $\Omega$ | Leakage reactance at 50 Hz |
| **Rotor Resistance** | $R_2'$ | 1.05 | $\Omega$ | Referred to stator per phase |
| **Rotor Reactance**  | $X_2'$ | 1.75 | $\Omega$ | Referred to stator per phase |
| **Magnetizing Reactance**| $X_m$| 48.0 | $\Omega$ | Core magnetizing branch |
| **Core Loss Resistance** | $R_c$| 650.0| $\Omega$ | Parallel iron loss resistance |
| **Rotor Inertia**    | $J$ | 0.048 | $\text{kg}\cdot\text{m}^2$| Total rotational inertia |
| **Friction & Windage**| $B$ | 0.0025 | $\text{N}\cdot\text{m}\cdot\text{s}/\text{rad}$ | Viscous drag coefficient |

*Disclaimer: These parameters are representative demonstration values designed for physical and educational consistency, not manufacturer-certified ratings.*

## 2. Fundamental Kinematic Calculations

### A. Synchronous Speed
$$N_s = \frac{120 \cdot f}{P} \quad [\text{RPM}]$$
$$\omega_s = \frac{2 \pi N_s}{60} = \frac{4 \pi f}{P} \quad [\text{rad/s}]$$

### B. Slip
$$s = \frac{N_s - N_r}{N_s}$$
- At standstill ($N_r = 0$): $s = 1.0$ (Starting condition)
- At synchronous speed ($N_r = N_s$): $s = 0.0$ (Zero torque point)
- In normal motoring: $0 < s < s_{max}$ (Typically $0.01 \le s \le 0.05$)
- Under locked-rotor fault: $s = 1.0$

## 3. Thevenin Equivalent Circuit & Torque Model

The per-phase equivalent circuit is reduced to a Thevenin equivalent viewed from the rotor terminals:

$$V_{th} = V_1 \cdot \frac{X_m}{\sqrt{R_1^2 + (X_1 + X_m)^2}}$$

$$Z_{th} = R_{th} + j X_{th} = (R_1 + j X_1) \parallel (j X_m)$$
$$R_{th} \approx R_1 \left(\frac{X_m}{X_1 + X_m}\right)^2, \quad X_{th} \approx X_1 \left(\frac{X_m}{X_1 + X_m}\right)$$

### Steady-State Electromagnetic Torque:
$$T_e(s) = \frac{3}{\omega_s} \cdot \frac{V_{th}^2 \cdot \frac{R_2'}{s}}{\left(R_{th} + \frac{R_2'}{s}\right)^2 + (X_{th} + X_2')^2}$$

### Breakdown (Maximum) Torque and Slip:
$$s_{max} = \frac{R_2'}{\sqrt{R_{th}^2 + (X_{th} + X_2')^2}}$$
$$T_{max} = \frac{3}{2 \omega_s} \cdot \frac{V_{th}^2}{R_{th} + \sqrt{R_{th}^2 + (X_{th} + X_2')^2}}$$

## 4. Mechanical Dynamics Integration

Newton's second law for rotational mechanics governs rotor speed changes:

$$J \frac{d\omega_m}{dt} = T_e(\omega_m) - T_L - B \omega_m$$

The differential equation is integrated using a **4th-Order Runge-Kutta (RK4)** numerical solver with adaptive internal sub-stepping ($h \le 0.005$ s) to guarantee unconditional numerical stability during rapid startup transients and sudden load rejections.
