# Predictive Maintenance & Degradation Engine

## 1. Machine Health Index Methodology

The overall motor health index ($H_{total} \in [0, 100\%]$) is computed as a weighted aggregate of component health scores:

$$H_{total} = w_b \cdot H_{bearing} + w_w \cdot H_{winding} + w_r \cdot H_{rotor} + w_c \cdot H_{cooling} + w_s \cdot H_{shaft}$$

Where the demonstration weights are:
- $w_b = 0.28$ (Bearings)
- $w_w = 0.28$ (Stator Winding Insulation)
- $w_r = 0.18$ (Rotor Cage)
- $w_c = 0.14$ (Cooling System)
- $w_s = 0.12$ (Shaft & Coupling)

## 2. Transparent Degradation Accumulation Model

Degradation $D(t) \in [0.05, 0.95]$ accumulates as the motor runs, scaled by combined operational stressors:

$$\frac{dD}{dt} = \kappa_{base} \cdot S_{thermal} \cdot S_{vibration} \cdot S_{overload}$$

Where:
- $\kappa_{base} = 2 \times 10^{-5} \text{ hr}^{-1}$ (baseline wear corresponding to nominal 50,000-hour bearing L10 life).
- **Thermal Stress Factor** (Arrhenius rule approximation: insulation life halves for every $10^\circ\text{C}$ above $105^\circ\text{C}$):
  $$S_{thermal} = 1.0 + 2.0 \cdot \max\left(0, \frac{T_{winding} - 105}{10}\right)$$
- **Vibration Stress Factor** (accelerated fatigue in ISO Zone C / D):
  $$S_{vibration} = 1.0 + 3.5 \cdot \max\left(0, \frac{v_{RMS} - 2.8}{1.5}\right)$$
- **Overload Stress Factor**:
  $$S_{overload} = 1.0 + 2.0 \cdot \max\left(0, \frac{\text{Load}\% - 100}{25}\right)$$

## 3. Remaining Useful Life (RUL) Estimation

$$\text{RUL} = 25000 \cdot (1 - D) \cdot \left(\frac{H_{total}}{100}\right)^{1.8} \quad [\text{hours}]$$

*Disclaimer: Remaining Useful Life calculations are illustrative educational simulations based on simplified degradation models. They must not be interpreted as certified industrial RUL prognostic models.*
