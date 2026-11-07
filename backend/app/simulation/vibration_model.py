"""
Vibration Signal Synthesis and Real-Time FFT Spectral Analysis Model.
Generates physically grounded time-domain waveforms and frequency spectra
incorporating 1X, 2X, 3X harmonics, bearing defect frequencies (BPFO/BPFI),
imbalance, misalignment, looseness, electrical vibration, and noise.
Evaluates severity according to ISO 10816-3.
"""

import math
import numpy as np
from typing import Dict, Any, List, Tuple


class VibrationAnalysisEngine:
    """
    Simulates tri-axial / radial vibration signals and performs real-time FFT.
    Calculates:
      - Time-domain waveform points
      - FFT spectrum (amplitude vs frequency)
      - RMS vibration velocity (mm/s)
      - Peak vibration amplitude
      - Dominant frequency
      - ISO 10816-3 severity rating (Zone A, B, C, D)
    """

    def __init__(
        self,
        sampling_rate: int = 2048,
        num_samples: int = 512,
        bearing_num_balls: int = 9,
        bearing_pitch_dia_mm: float = 46.0,
        bearing_ball_dia_mm: float = 9.5
    ):
        self.fs = sampling_rate
        self.num_samples = num_samples
        self.n_balls = bearing_num_balls
        self.pitch_dia = bearing_pitch_dia_mm
        self.ball_dia = bearing_ball_dia_mm

        # Phase tracking for signal continuity
        self.phase_acc = 0.0

    def compute_bearing_defect_frequencies(self, speed_rpm: float) -> Dict[str, float]:
        """
        Calculates theoretical bearing fault frequencies:
          - fr: Rotational frequency (1X)
          - BPFO: Ball Pass Frequency Outer race
          - BPFI: Ball Pass Frequency Inner race
          - BSF: Ball Spin Frequency
          - FTF: Fundamental Train Frequency (cage)
        """
        fr = max(0.0, speed_rpm / 60.0)
        gamma = self.ball_dia / self.pitch_dia  # 9.5 / 46.0 ≈ 0.2065

        bpfo = (self.n_balls / 2.0) * fr * (1.0 - gamma)
        bpfi = (self.n_balls / 2.0) * fr * (1.0 + gamma)
        bsf = (self.pitch_dia / (2.0 * self.ball_dia)) * fr * (1.0 - gamma**2)
        ftf = 0.5 * fr * (1.0 - gamma)

        return {
            "fr": round(fr, 2),
            "bpfo": round(bpfo, 2),
            "bpfi": round(bpfi, 2),
            "bsf": round(bsf, 2),
            "ftf": round(ftf, 2)
        }

    def generate_vibration_data(
        self,
        speed_rpm: float,
        supply_freq_hz: float,
        load_pct: float,
        imbalance_severity: float = 0.0,
        misalignment_severity: float = 0.0,
        bearing_wear_severity: float = 0.0,
        looseness_severity: float = 0.0,
        excessive_vibe_severity: float = 0.0,
        electrical_imbalance_severity: float = 0.0,
        noise_level: float = 0.15,
        random_seed: int = None
    ) -> Dict[str, Any]:
        """
        Synthesizes a time-domain vibration waveform (mm/s) and computes its discrete FFT.
        """
        if random_seed is not None:
            np.random.seed(random_seed)

        fr = max(0.0, speed_rpm / 60.0)
        dt = 1.0 / self.fs
        t = np.linspace(0.0, (self.num_samples - 1) * dt, self.num_samples)

        if fr < 0.5:
            # Motor at standstill
            noise = np.random.normal(0, 0.05 * noise_level, self.num_samples)
            waveform = noise
            rms_val = float(np.std(waveform))
            peak_val = float(np.max(np.abs(waveform)))
            return {
                "rms_velocity_mms": round(rms_val, 3),
                "peak_velocity_mms": round(peak_val, 3),
                "dominant_frequency_hz": 0.0,
                "iso_severity_zone": "Zone A (Good)",
                "waveform": [round(float(v), 3) for v in waveform[:128]],
                "fft_spectrum": [{"freq": round(float(f), 1), "amp": round(float(a), 4)} for f, a in zip(np.linspace(0, 500, 64), np.zeros(64))],
                "frequencies": self.compute_bearing_defect_frequencies(speed_rpm)
            }

        # Baseline healthy vibration level (scales mildly with speed and load)
        base_amp_1x = 0.45 * (fr / 25.0) * (0.8 + 0.2 * (load_pct / 100.0))
        base_amp_2x = 0.15 * (fr / 25.0)

        # Fault Amplitude contributions:
        # 1. Rotor Imbalance produces massive 1X amplitude:
        amp_1x = base_amp_1x + (imbalance_severity * 6.5)

        # 2. Shaft Misalignment produces high 2X harmonic:
        amp_2x = base_amp_2x + (misalignment_severity * 4.8)

        # 3. Mechanical Looseness produces 0.5X, 2X, 3X, 4X harmonics:
        amp_sub_harm = looseness_severity * 2.2
        amp_3x = looseness_severity * 2.8
        amp_4x = looseness_severity * 1.5

        # 4. Electrical vibration at 2x line frequency (100 Hz):
        f_line_2x = 2.0 * supply_freq_hz
        amp_2fe = 0.1 + (electrical_imbalance_severity * 3.5)

        # 5. Bearing defect frequencies:
        bearing_freqs = self.compute_bearing_defect_frequencies(speed_rpm)
        bpfo = bearing_freqs["bpfo"]
        bpfi = bearing_freqs["bpfi"]
        amp_bpfo = bearing_wear_severity * 3.8
        amp_bpfi = bearing_wear_severity * 2.6

        # 6. General resonance / excessive vibration fault
        amp_excess = excessive_vibe_severity * 7.5

        # Synthesize time-domain signal
        signal = np.zeros(self.num_samples)
        # 1X
        signal += amp_1x * np.sin(2.0 * np.pi * fr * t)
        # 2X
        signal += amp_2x * np.sin(2.0 * np.pi * (2.0 * fr) * t + 0.8)
        # 2fe (100 Hz)
        signal += amp_2fe * np.sin(2.0 * np.pi * f_line_2x * t + 1.2)

        # Bearing faults
        if amp_bpfo > 0.05:
            # Bearing defect impact model: amplitude-modulated impacts with decaying envelope
            impulse_rate = bpfo
            mod_wave = (1.0 + np.cos(2.0 * np.pi * fr * t))  # Modulated by shaft rotation
            signal += amp_bpfo * np.sin(2.0 * np.pi * bpfo * t) * mod_wave
        if amp_bpfi > 0.05:
            signal += amp_bpfi * np.sin(2.0 * np.pi * bpfi * t)

        # Looseness
        if looseness_severity > 0.05:
            signal += amp_sub_harm * np.sin(2.0 * np.pi * (0.5 * fr) * t + 0.3)
            signal += amp_3x * np.sin(2.0 * np.pi * (3.0 * fr) * t + 1.9)
            signal += amp_4x * np.sin(2.0 * np.pi * (4.0 * fr) * t + 2.5)

        # General excessive vibration
        if amp_excess > 0.05:
            signal += amp_excess * np.sin(2.0 * np.pi * (1.5 * fr + 45.0) * t)

        # Add Gaussian background noise
        noise_std = max(0.02, noise_level * (0.25 + 0.1 * (load_pct / 100.0)))
        noise = np.random.normal(0, noise_std, self.num_samples)
        signal += noise

        # Calculate metrics
        rms_val = float(np.sqrt(np.mean(signal**2)))
        peak_val = float(np.max(np.abs(signal)))

        # FFT Analysis
        # Apply Hanning window to prevent spectral leakage
        window = np.hanning(self.num_samples)
        signal_windowed = signal * window
        fft_complex = np.fft.rfft(signal_windowed)
        fft_freqs = np.fft.rfftfreq(self.num_samples, d=dt)
        # Scale amplitude spectrum to match physical peak velocity mm/s
        fft_amp = (2.0 / np.sum(window)) * np.abs(fft_complex)

        # Find dominant peak (ignore DC component)
        dominant_idx = int(np.argmax(fft_amp[1:])) + 1
        dominant_freq = float(fft_freqs[dominant_idx])

        # ISO 10816-3 Severity Classification for Group 2 Medium Motors (15 kW - 300 kW, rigid support)
        # Zone A: < 1.4 mm/s RMS (Good)
        # Zone B: 1.4 - 2.8 mm/s RMS (Acceptable)
        # Zone C: 2.8 - 4.5 mm/s RMS (Unsatisfactory / Warning)
        # Zone D: > 4.5 mm/s RMS (Unacceptable / Danger)
        if rms_val < 1.4:
            iso_zone = "Zone A (Good)"
            iso_class = "healthy"
        elif rms_val < 2.8:
            iso_zone = "Zone B (Acceptable)"
            iso_class = "acceptable"
        elif rms_val < 4.5:
            iso_zone = "Zone C (Unsatisfactory)"
            iso_class = "warning"
        else:
            iso_zone = "Zone D (Unacceptable)"
            iso_class = "danger"

        # Downsample waveform and FFT spectrum for lightweight JSON transfer to frontend
        # Waveform: 128 points
        waveform_step = max(1, len(signal) // 128)
        waveform_sample = [round(float(v), 3) for v in signal[::waveform_step][:128]]

        # FFT: take up to 600 Hz (relevant motor diagnostics band)
        mask = (fft_freqs <= 600.0)
        selected_freqs = fft_freqs[mask]
        selected_amp = fft_amp[mask]
        fft_step = max(1, len(selected_freqs) // 80)
        fft_spectrum = [
            {"freq": round(float(f), 1), "amp": round(float(a), 4)}
            for f, a in zip(selected_freqs[::fft_step], selected_amp[::fft_step])
        ]

        return {
            "rms_velocity_mms": round(rms_val, 3),
            "peak_velocity_mms": round(peak_val, 3),
            "crest_factor": round(peak_val / max(0.001, rms_val), 2),
            "dominant_frequency_hz": round(dominant_freq, 1),
            "iso_severity_zone": iso_zone,
            "iso_class": iso_class,
            "waveform": waveform_sample,
            "fft_spectrum": fft_spectrum,
            "frequencies": bearing_freqs,
            "diagnostics": {
                "amp_1x": round(float(amp_1x), 3),
                "amp_2x": round(float(amp_2x), 3),
                "amp_2fe": round(float(amp_2fe), 3),
                "amp_bpfo": round(float(amp_bpfo), 3),
                "amp_bpfi": round(float(amp_bpfi), 3)
            }
        }
