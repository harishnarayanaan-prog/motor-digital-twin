// Vibration Analysis Page – waveform, FFT, diagnostics
import { useTelemetryStore } from '../store/telemetryStore'
import { fmt1, fmt2, isoZoneColor } from '../utils/formatting'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

export function VibrationPage() {
  const { telemetry: t, history } = useTelemetryStore()
  const vib = t?.vibration
  const freqs = vib?.frequencies
  const diag = vib?.diagnostics

  const waveformData = (vib?.waveform ?? []).map((v, i) => ({ i, v }))
  const fftData = vib?.fft_spectrum ?? []

  const isoColor = isoZoneColor(vib?.iso_severity_zone ?? '')
  const isoLabels = [
    { zone: 'Zone A (Good)', limit: 1.4, color: '#22c55e' },
    { zone: 'Zone B (Acceptable)', limit: 2.8, color: '#eab308' },
    { zone: 'Zone C (Unsatisfactory)', limit: 4.5, color: '#f97316' },
    { zone: 'Zone D (Unacceptable)', limit: 7.0, color: '#ef4444' },
  ]

  return (
    <div className="pt-[76px] p-4 h-screen overflow-y-auto grid-bg" style={{ background: '#0a0f1e' }}>
      <div className="text-xs font-bold mb-4 text-neon tracking-widest">🔊 VIBRATION ANALYSIS (ISO 10816-3)</div>
      <div className="text-xs mb-4" style={{ color: '#475569' }}>
        ⚠ Simulated vibration signatures. Not equivalent to certified industrial vibration measurement.
      </div>

      <div className="grid grid-cols-12 gap-4">

        {/* Summary Panel */}
        <div className="col-span-3 flex flex-col gap-3">
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>VIBRATION SUMMARY</div>
            <div className="text-center mb-3 p-3 rounded" style={{
              background: `${isoColor}18`, border: `1px solid ${isoColor}44`
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: isoColor, fontFamily: 'monospace',
                textShadow: `0 0 20px ${isoColor}66` }}>
                {fmt2(vib?.rms_velocity_mms)}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>mm/s RMS</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: isoColor, marginTop: 4 }}>
                {vib?.iso_severity_zone ?? '—'}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: '#64748b' }}>Peak Velocity</span>
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>{fmt2(vib?.peak_velocity_mms)} mm/s</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#64748b' }}>Crest Factor</span>
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>{fmt2(vib?.crest_factor)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#64748b' }}>Dominant Freq</span>
                <span style={{ color: '#00d4ff', fontWeight: 700 }}>{fmt1(vib?.dominant_frequency_hz)} Hz</span>
              </div>
            </div>
          </div>

          {/* ISO Zone Reference */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>ISO 10816-3 ZONES</div>
            {isoLabels.map(z => (
              <div key={z.zone} className="flex items-center gap-2 mb-2 text-xs">
                <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color, flexShrink: 0 }}/>
                <span style={{ color: '#94a3b8' }}>{z.zone}</span>
                <span style={{ color: z.color, marginLeft: 'auto', fontWeight: 700 }}>≤{z.limit}</span>
              </div>
            ))}
            <div className="text-xs mt-2 p-2 rounded" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
              Group 2: 15–300 kW motors, rigid mounting
            </div>
          </div>

          {/* Bearing Frequencies */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>BEARING DEFECT FREQUENCIES</div>
            {[
              { label: '1X (fr)', val: freqs?.fr, unit: 'Hz', color: '#00d4ff' },
              { label: 'BPFO', val: freqs?.bpfo, unit: 'Hz', color: '#f97316' },
              { label: 'BPFI', val: freqs?.bpfi, unit: 'Hz', color: '#ef4444' },
              { label: 'BSF', val: freqs?.bsf, unit: 'Hz', color: '#eab308' },
              { label: 'FTF', val: freqs?.ftf, unit: 'Hz', color: '#94a3b8' },
            ].map(({ label, val, unit, color }) => (
              <div key={label} className="flex justify-between text-xs mb-1">
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{val?.toFixed(1) ?? '—'} {unit}</span>
              </div>
            ))}
            <div className="text-xs mt-2" style={{ color: '#475569' }}>
              Calculated from motor speed and bearing geometry. Not measured.
            </div>
          </div>

          {/* Spectral Diagnostics */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>SPECTRAL AMPLITUDE INDICATORS</div>
            {[
              { label: '1X (Imbalance)', val: diag?.amp_1x, warn: 1.5, color: '#00d4ff' },
              { label: '2X (Misalignment)', val: diag?.amp_2x, warn: 0.8, color: '#8b5cf6' },
              { label: '2×fe (Electrical)', val: diag?.amp_2fe, warn: 0.5, color: '#3b82f6' },
              { label: 'BPFO (Bearing)', val: diag?.amp_bpfo, warn: 0.3, color: '#f97316' },
              { label: 'BPFI (Bearing)', val: diag?.amp_bpfi, warn: 0.3, color: '#ef4444' },
            ].map(({ label, val, warn, color }) => {
              const v = val ?? 0
              const exceeded = v > warn
              return (
                <div key={label} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span style={{ color: '#64748b' }}>{label}</span>
                    <span style={{ color: exceeded ? '#ef4444' : color, fontWeight: 700 }}>
                      {v.toFixed(3)} {exceeded ? '⚠' : ''}
                    </span>
                  </div>
                  <div style={{ background: '#1e293b', borderRadius: 2, height: 3 }}>
                    <div style={{ background: exceeded ? '#ef4444' : color, width: `${Math.min(100, v / (warn * 2) * 100)}%`,
                      height: 3, borderRadius: 2, transition: 'width 0.5s' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="col-span-9 flex flex-col gap-4">
          {/* Time-domain waveform */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>TIME-DOMAIN VIBRATION WAVEFORM (mm/s)</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={waveformData} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="i" tick={{ fill: '#475569', fontSize: 8 }} label={{ value: 'Sample', position: 'right', fontSize: 9, fill: '#475569' }}/>
                <YAxis tick={{ fill: '#475569', fontSize: 8 }} label={{ value: 'mm/s', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#475569' }}/>
                <Tooltip contentStyle={{ background: '#0d1424', fontSize: 9 }} formatter={(v: any) => [v.toFixed(3), 'Velocity mm/s']}/>
                <Line type="monotone" dataKey="v" stroke="#00d4ff" strokeWidth={1} dot={false} name="Vib. Velocity"/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* FFT Spectrum */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-1" style={{ color: '#64748b' }}>FREQUENCY-DOMAIN FFT SPECTRUM (Hanning window, 0–600 Hz)</div>
            <div className="text-xs mb-3" style={{ color: '#475569' }}>
              Peaks at 1X, 2X (harmonics of running speed), 2×fe (100 Hz electrical), and bearing defect frequencies.
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fftData} margin={{ top: 2, right: 15, left: -20, bottom: 0 }} barCategoryGap="0%">
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                <XAxis dataKey="freq" tick={{ fill: '#475569', fontSize: 8 }}
                  tickFormatter={v => `${v}Hz`} interval={Math.floor(fftData.length / 10)}
                  label={{ value: 'Frequency (Hz)', position: 'insideBottomRight', offset: 0, fontSize: 9, fill: '#475569' }}/>
                <YAxis tick={{ fill: '#475569', fontSize: 8 }}
                  label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#475569' }}/>
                <Tooltip contentStyle={{ background: '#0d1424', fontSize: 9 }}
                  formatter={(v: any) => [v.toFixed(4), 'Amplitude']}
                  labelFormatter={(l: any) => `${l} Hz`}/>
                <Bar dataKey="amp" fill="#00d4ff" fillOpacity={0.8} name="Amplitude"/>
                {/* Reference lines for key frequencies */}
                {freqs?.fr && <ReferenceLine x={freqs.fr.toFixed(1)} stroke="#f59e0b" strokeDasharray="4 4"/>}
                {freqs?.bpfo && <ReferenceLine x={freqs.bpfo.toFixed(1)} stroke="#f97316" strokeDasharray="4 4"/>}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vibration history trend */}
          <div className="panel p-4">
            <div className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>VIBRATION RMS TREND — TIME SERIES</div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={history} margin={{ top: 2, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-vib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="sim_time" tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={v => `${v.toFixed(0)}s`}/>
                <YAxis tick={{ fill: '#475569', fontSize: 8 }}/>
                <Tooltip contentStyle={{ background: '#0d1424', fontSize: 9 }}/>
                <ReferenceLine y={1.4} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Zone B', fontSize: 8, fill: '#22c55e' }}/>
                <ReferenceLine y={2.8} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Zone C', fontSize: 8, fill: '#f97316' }}/>
                <ReferenceLine y={4.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Zone D', fontSize: 8, fill: '#ef4444' }}/>
                <Area type="monotone" dataKey="vibe_rms" stroke="#eab308" fill="url(#g-vib)" strokeWidth={2} dot={false} name="Vib RMS mm/s"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
