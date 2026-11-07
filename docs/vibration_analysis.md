# Vibration Analysis & Spectral Diagnostics

## 1. Physical Signal Synthesis Methodology

The vibration module synthesizes radial vibration velocity waveforms ($v(t)$ in mm/s) by superimposing physically motivated spectral components corresponding to rotating mechanical and electromagnetic phenomena:

$$v(t) = \sum_{k} A_k \sin(2\pi f_k t + \theta_k) + \text{noise}(t)$$

Where:
- **1X Component ($f_r = N_r / 60$)**: Fundamental shaft rotational frequency. Amplitude surges dynamically under **Rotor Imbalance** ($A_{1X} \propto m_{ecc} \cdot \omega_m^2$).
- **2X Component ($2 f_r$)**: Angular and parallel **Shaft Misalignment** manifests predominantly as a strong 2nd order harmonic with axial vibration.
- **Harmonics (0.5X, 3X, 4X)**: Mechanical looseness in foundation bolts or bearing housing fits.
- **2fe Component ($2 \times 50 \text{ Hz} = 100 \text{ Hz}$)**: Electromagnetic double line frequency vibration caused by stator magnetic pull and phase voltage imbalance.
- **Bearing Defect Impact Waves**: Modulated impulse trains at outer race (BPFO) and inner race (BPFI) frequencies.
- **Gaussian Background Noise**: Realistic white noise scaled to load and operating conditions.

## 2. Bearing Kinematic Frequencies (6206 Deep Groove Ball Bearing)

With pitch diameter $D_p = 46.0 \text{ mm}$, ball diameter $d = 9.5 \text{ mm}$, contact angle $\alpha = 0^\circ$, and $N_b = 9$ balls:

$$\gamma = \frac{d}{D_p} \approx 0.2065$$

1. **Ball Pass Frequency Outer Race (BPFO)**:
   $$\text{BPFO} = \frac{N_b}{2} f_r (1 - \gamma) \approx 3.57 \times f_r$$
2. **Ball Pass Frequency Inner Race (BPFI)**:
   $$\text{BPFI} = \frac{N_b}{2} f_r (1 + \gamma) \approx 5.43 \times f_r$$
3. **Ball Spin Frequency (BSF)**:
   $$\text{BSF} = \frac{D_p}{2d} f_r (1 - \gamma^2) \approx 2.32 \times f_r$$
4. **Fundamental Train Frequency (FTF / Cage)**:
   $$\text{FTF} = \frac{1}{2} f_r (1 - \gamma) \approx 0.397 \times f_r$$

## 3. Real-Time Discrete FFT

Waveforms are sampled at $F_s = 2048 \text{ Hz}$ ($N = 512$ points). A **Hanning window** $w[n]$ is applied to reduce spectral leakage before computing the Real Fast Fourier Transform (`np.fft.rfft`):

$$X[k] = \sum_{n=0}^{N-1} (v[n] \cdot w[n]) e^{-j 2\pi k n / N}$$
$$A[k] = \frac{2}{\sum w[n]} |X[k]|$$

## 4. ISO 10816-3 Vibration Severity Classification

For Class II / Group 2 Industrial Medium Electric Motors (15 kW – 300 kW, rigid mounting):

| Severity Zone | RMS Velocity Range ($v_{RMS}$) | Condition & Recommended Operational Action |
| :--- | :--- | :--- |
| **Zone A (Good)** | $< 1.4 \text{ mm/s}$ | Machine is newly commissioned or in optimal operating condition. |
| **Zone B (Acceptable)** | $1.4 \text{ to } 2.8 \text{ mm/s}$ | Suitable for unrestricted long-term continuous operation. |
| **Zone C (Unsatisfactory)**| $2.8 \text{ to } 4.5 \text{ mm/s}$ | Warning alert generated. Continuous operation restricted; schedule inspection. |
| **Zone D (Unacceptable)** | $> 4.5 \text{ mm/s}$ | Danger / Trip condition. High risk of catastrophic failure; stop machine immediately. |

*Disclaimer: Simulated vibration signatures are algorithmically synthesized for educational and demonstration purposes. They are not equivalent to measured diagnostic signatures acquired from physical accelerometers.*
