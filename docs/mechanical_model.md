# Mechanical Dynamics & Torque-Speed Model

## 1. Rotational Dynamics Equation

The angular acceleration of the motor rotor and coupled load is defined by:

$$J_{total} \frac{d\omega_m}{dt} = T_e(\omega_m) - T_L(\omega_m) - B \omega_m$$

Where:
- $J_{total} = J_{rotor} + J_{coupling} + J_{load} \approx 0.048 \text{ kg}\cdot\text{m}^2$
- $\omega_m = \frac{2 \pi N_r}{60}$ is the rotor mechanical angular velocity [rad/s].
- $T_e$ is the developed electromagnetic torque [N·m].
- $T_L$ is the mechanical load torque opposing rotation [N·m].
- $B$ is the viscous friction and windage coefficient ($0.0025 \text{ N}\cdot\text{m}\cdot\text{s/rad}$).

## 2. Load Profiles Supported

1. **Constant Torque Load**: $T_L = T_{set}$ (e.g., hoists, conveyors).
2. **Variable Quadratic Fan/Pump Load**: $T_L = k \cdot \omega_m^2$.
3. **Overload Condition**: $T_L$ set from 100% to 150% of rated torque ($T_{rated} = 36.22 \text{ N}\cdot\text{m}$).
4. **Mechanical Blockage / Locked Rotor**: Driven load stalls abruptly; speed drops to 0 while motor draws starting inrush current.

## 3. Four-Quadrant Motoring & Directional Dynamics

- **Forward Motoring**: Direction $+1$, $\omega_m > 0$, $T_e > 0$.
- **Reverse Motoring**: Direction $-1$, $\omega_m < 0$, $T_e < 0$.
- **Plugging / Reversal**: When reversing direction while running, motor operates in the braking region ($s > 1$) with high rotor losses until it decelerates through zero and accelerates in reverse.
