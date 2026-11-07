# 5-Node Lumped Parameter Thermal Network Model

## 1. Network Topology

The motor thermal behavior is modeled by a 5-node lumped thermal circuit representing conductive heat transfer within the motor structure and forced/natural convective dissipation to the ambient air:

```
[ Winding (Tw) ] ----(Rw-s)----> [ Stator Core (Ts) ] ----(Rs-h)----> [ Housing (Th) ] ----(Rh-a)----> [ Ambient (Tamb) ]
       |                                                                    ^
       |                                                                    |
       +-----------(Rr-s)--------> [ Rotor (Tr) ] ----(Rr-b)----> [ Bearings (Tb) ] ----(Rb-h)----+
```

## 2. Nodes, Heat Capacitances, and Resistances

| Node | Description | Thermal Capacitance ($C_i$) | Adjacent Resistances ($R_{ij}$) |
| :--- | :--- | :--- | :--- |
| **Node 1: Tw** | Stator Copper Windings | $2200 \text{ J/K}$ | $R_{w-s} = 0.08 \text{ K/W}$ (to Stator core) |
| **Node 2: Ts** | Stator Core Iron | $6500 \text{ J/K}$ | $R_{s-h} = 0.05 \text{ K/W}$ (to Housing) |
| **Node 3: Tr** | Rotor Core & Squirrel Cage | $4500 \text{ J/K}$ | $R_{r-s} = 0.15 \text{ K/W}$, $R_{r-b} = 0.22 \text{ K/W}$ |
| **Node 4: Tb** | Drive-End & NDE Bearings | $950 \text{ J/K}$ | $R_{b-h} = 0.12 \text{ K/W}$ (to Housing) |
| **Node 5: Th** | Motor Frame / Housing | $8500 \text{ J/K}$ | $R_{h-a}(\omega_m)$ (to Ambient) |

## 3. Heat Sources (Losses)

1. **Stator Copper Loss**: $P_{cu1} = 3 \cdot I_{line}^2 \cdot R_1(T)$
   - Temperature coefficient: $R_1(T) = R_1(20^\circ\text{C}) \cdot [1 + 0.00393 \cdot (T_w - 20)]$
2. **Rotor Copper Loss**: $P_{cu2} = s \cdot P_{airgap}$
3. **Core / Iron Loss**: $P_{core} \approx 0.025 \cdot P_{in}$
4. **Bearing Friction Loss**: $P_{bearing} = 15 \cdot \frac{\omega}{\omega_{rated}} + \Delta P_{wear}$
5. **Mechanical Friction & Windage**: $P_{mech} = B \cdot \omega_m^2$

## 4. Forced Convective Cooling (TEFC Fan)

The convective heat transfer resistance from the ribbed motor housing to ambient air decreases dynamically with shaft rotation speed:

$$R_{h-a}(\omega_m) = \frac{R_{h-a,base}}{1 + 3.2 \cdot k_{fan} \cdot \left(\frac{\omega_m}{\omega_{rated}}\right)^{0.8}}$$

Under **Cooling Fan Failure**, $k_{fan}$ collapses by up to 95%, causing rapid overheating across all nodes.
