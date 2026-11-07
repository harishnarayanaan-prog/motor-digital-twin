# Industrial Fault Simulation & Detection Engine

## 1. Matrix of 12 Simulated Industrial Faults

The simulation engine models 12 common industrial fault modes with configurable severity ($0.0$ to $1.0$):

| # | Fault Mode | Affected Component | Physical Parameter Impact | Diagnostic Signature |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Bearing Wear** | Bearings (DE/NDE) | Bearing friction $+180 \text{ W}$, BPFO/BPFI amplitudes | Elevated bearing temperature, BPFO/BPFI sidebands, high crest factor |
| **02** | **Rotor Imbalance** | Rotor | 1X radial force component | Dominant 1X vibration peak ($> 4.0 \text{ mm/s}$), radial bearing stress |
| **03** | **Shaft Misalignment** | Shaft & Coupling | 2X harmonic force | Pronounced 2X vibration harmonic ($A_{2X} > 0.5 A_{1X}$), axial vibration |
| **04** | **Motor Overload** | Stator & Rotor | Load torque $+110\% \text{ to } 160\%$ | Elevated slip ($s > 0.05$), stator current surge, winding overheating |
| **05** | **Cooling Fan Failure** | Cooling Fan | Convection coefficient $-95\%$ | Rapid temperature rise across winding, core, and housing |
| **06** | **Winding Overheating** | Stator Winding | Stator resistance $R_1 +40\%$ | Increased $I^2 R_1$ losses, winding thermal alarm |
| **07** | **Voltage Imbalance** | Terminal Box | Phase voltages unbalance $\le 25\%$ | Negative sequence current, 2fe electrical vibration (100 Hz), pulsating torque |
| **08** | **Phase Loss (Single-Phasing)**| Terminal Box | Phase C open circuit ($V_c = 0$) | Current surges $\approx 173\%$ on phases A & B, severe torque ripple, stall |
| **09** | **Supply Under-Voltage**| Terminal Box | Supply voltage $-15\% \text{ to } 30\%$ | Stator current increases to sustain load torque; increased slip |
| **10** | **Supply Over-Voltage** | Terminal Box | Supply voltage $+10\% \text{ to } 25\%$ | Core magnetic saturation, increased iron core losses, reduced PF |
| **11** | **Excessive Vibration** | Mounting Base | Structural resonance / sub-harmonics | ISO Zone D alert ($v_{RMS} > 4.5 \text{ mm/s}$), broadband noise |
| **12** | **Mechanical Blockage** | Shaft & Rotor | Locked rotor ($N_r = 0$, $s = 1$) | Zero speed, locked-rotor starting current ($\approx 6 \times I_{rated}$), FAULT trip |

## 2. Multi-Harmonic Detection Rules

The condition monitoring engine evaluates rules deterministically every 100 ms:
1. **Bearing Degradation**: Triggered if $(A_{BPFO} + A_{BPFI} > 0.6 \text{ mm/s})$ or $(T_{bearing} > 75^\circ\text{C})$. Confidence $\approx 94\%$.
2. **Rotor Imbalance**: Triggered if $A_{1X} > 2.0 \text{ mm/s}$ with dominant frequency matching shaft rotation rate ($f_r$). Confidence $\approx 91\%$.
3. **Shaft Misalignment**: Triggered if $A_{2X} > 1.2 \text{ mm/s}$ and $A_{2X} / A_{1X} > 0.5$. Confidence $\approx 88\%$.
4. **Thermal Overload**: Triggered if $T_{winding} > 115^\circ\text{C}$ (Warning) or $140^\circ\text{C}$ (Critical). Confidence $\approx 98\%$.
5. **Voltage Imbalance**: Triggered if line voltage unbalance exceeds $2.0\%$ (NEMA standard tolerance). Confidence $\approx 99\%$.
