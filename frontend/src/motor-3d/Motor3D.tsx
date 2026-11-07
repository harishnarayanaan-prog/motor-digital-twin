// 3D Interactive Motor Digital Twin using React Three Fiber
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTelemetryStore } from '../store/telemetryStore'

function MotorHousing() {
  return (
    <group>
      {/* Main housing cylinder */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.68, 0.68, 2.0, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Cooling fins */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh key={i} rotation={[0, (i / 18) * Math.PI * 2, 0]}>
          <boxGeometry args={[0.04, 2.0, 0.08]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function RotatingRotor({ rpm, direction }: { rpm: number; direction: number }) {
  const ref = useRef<THREE.Group>(null)
  const speedRef = useRef(0)

  useFrame((_, dt) => {
    if (!ref.current) return
    const targetOmega = (Math.abs(rpm) / 9.549296) * direction // rad/s
    speedRef.current += (targetOmega - speedRef.current) * Math.min(1, dt * 2)
    ref.current.rotation.z += speedRef.current * dt
  })

  return (
    <group ref={ref}>
      {/* Rotor core */}
      <mesh castShadow>
        <cylinderGeometry args={[0.38, 0.38, 1.85, 20]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Squirrel cage bars */}
      {Array.from({ length: 24 }).map((_, i) => (
        <mesh key={i} rotation={[0, (i / 24) * Math.PI * 2, 0]}>
          <boxGeometry args={[0.025, 1.9, 0.025]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}
      {/* End rings */}
      {[-0.93, 0.93].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.37, 0.025, 8, 24]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

function MotorShaft({ rpm, direction }: { rpm: number; direction: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const speedRef = useRef(0)

  useFrame((_, dt) => {
    if (!ref.current) return
    const targetOmega = (Math.abs(rpm) / 9.549296) * direction
    speedRef.current += (targetOmega - speedRef.current) * Math.min(1, dt * 2)
    ref.current.rotation.y += speedRef.current * dt
  })

  return (
    <mesh ref={ref} castShadow>
      <cylinderGeometry args={[0.07, 0.07, 3.0, 12]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
    </mesh>
  )
}

function CoolingFan({ rpm }: { rpm: number }) {
  const ref = useRef<THREE.Group>(null)
  const speedRef = useRef(0)

  useFrame((_, dt) => {
    if (!ref.current) return
    const target = Math.abs(rpm) / 9.549296
    speedRef.current += (target - speedRef.current) * Math.min(1, dt * 1.5)
    ref.current.rotation.y += speedRef.current * dt
  })

  return (
    <group ref={ref} position={[0, -1.15, 0]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} rotation={[0, (i / 6) * Math.PI * 2, 0]} position={[0.3, 0, 0]}>
          <boxGeometry args={[0.35, 0.04, 0.12]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Hub */}
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 0.08, 10]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function TerminalBox() {
  return (
    <mesh position={[0.72, 0.5, 0]}>
      <boxGeometry args={[0.22, 0.28, 0.4]} />
      <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
    </mesh>
  )
}

function MountingBase() {
  return (
    <group>
      <mesh position={[0, -0.85, 0]}>
        <boxGeometry args={[1.9, 0.14, 1.0]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.6} />
      </mesh>
      {[-0.75, 0.75].map((x) =>
        [-0.38, 0.38].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.95, z]}>
            <cylinderGeometry args={[0.045, 0.045, 0.14, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
          </mesh>
        ))
      )}
    </group>
  )
}

function Bearings({ highlighted }: { highlighted: boolean }) {
  const col = highlighted ? '#ef4444' : '#94a3b8'
  return (
    <>
      {[-0.9, 0.9].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh>
            <torusGeometry args={[0.11, 0.045, 10, 24]} />
            <meshStandardMaterial color={col} metalness={0.9} roughness={0.1}
              emissive={highlighted ? '#ef4444' : undefined} emissiveIntensity={highlighted ? 0.5 : 0} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function FaultGlow({ affectedComponents }: { affectedComponents: string[] }) {
  const hasRed = affectedComponents.some(c =>
    ['Bearings', 'Rotor', 'Shaft', 'Stator', 'Cooling Fan', 'Terminal Box', 'Mounting Base'].includes(c)
  )
  if (!hasRed) return null
  return (
    <pointLight color="#ef4444" intensity={4} distance={3} position={[0, 0, 0.8]}/>
  )
}

function MotorScene() {
  const { telemetry } = useTelemetryStore()
  const rpm = telemetry?.mechanical.rotor_speed_rpm ?? 0
  const direction = telemetry?.direction_value ?? 1
  const affectedComponents = telemetry?.affected_3d_components ?? []
  const bearingHL = affectedComponents.includes('Bearings')
  const state = telemetry?.state ?? 'OFF'

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.0} castShadow />
      <pointLight position={[-2, 3, -2]} intensity={0.5} color="#00d4ff" />
      {/* Cyan ambient glow when running */}
      {state === 'RUNNING' && <pointLight position={[0, 0, 1.5]} color="#00d4ff" intensity={1.5} distance={4} />}
      <FaultGlow affectedComponents={affectedComponents} />

      <group rotation={[Math.PI / 2, 0, 0]}>
        <MotorHousing />
        <RotatingRotor rpm={rpm} direction={direction} />
        <MotorShaft rpm={rpm} direction={direction} />
        <Bearings highlighted={bearingHL} />
        <CoolingFan rpm={rpm} />
        <TerminalBox />
        <MountingBase />
      </group>

      {/* Telemetry overlay */}
      <Html position={[1.1, 0.8, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(10,15,30,0.9)', border: '1px solid rgba(0,212,255,0.3)',
          borderRadius: 6, padding: '8px 12px', minWidth: 140, fontSize: 11,
          fontFamily: 'monospace', color: '#e2e8f0', backdropFilter: 'blur(8px)'
        }}>
          <div style={{ color: '#00d4ff', fontWeight: 700, marginBottom: 4 }}>SIMULATED TELEMETRY</div>
          <div>RPM: <span style={{ color: '#00d4ff' }}>{Math.abs(rpm).toFixed(0)}</span></div>
          <div>Torque: <span style={{ color: '#3b82f6' }}>{telemetry?.mechanical.electromagnetic_torque_nm.toFixed(1) ?? '—'} Nm</span></div>
          <div>Temp: <span style={{ color: '#f97316' }}>{telemetry?.thermal.t_winding.toFixed(1) ?? '—'}°C</span></div>
          <div>Vibe: <span style={{ color: '#eab308' }}>{telemetry?.vibration.rms_velocity_mms.toFixed(2) ?? '—'} mm/s</span></div>
          {affectedComponents.length > 0 && (
            <div style={{ color: '#ef4444', marginTop: 4, fontWeight: 700 }}>
              ⚠ {affectedComponents.join(', ')}
            </div>
          )}
        </div>
      </Html>

      <OrbitControls enableDamping dampingFactor={0.08} minDistance={2.5} maxDistance={10} />
      <Environment preset="city" />
    </>
  )
}

export function Motor3D() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#060b18' }}>
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 42 }}
        shadows
        gl={{ antialias: true }}
      >
        <MotorScene />
      </Canvas>
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, color: '#475569', textAlign: 'center',
        background: 'rgba(10,15,30,0.7)', padding: '3px 10px', borderRadius: 4
      }}>
        Left-drag: Orbit • Scroll: Zoom • Right-drag: Pan | ⚠ 3D SIMULATED MODEL
      </div>
    </div>
  )
}
