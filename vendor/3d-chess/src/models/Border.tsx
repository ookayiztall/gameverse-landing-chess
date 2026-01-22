import type { FC } from 'react'

import type { ThreeElements } from '@react-three/fiber'

export const BorderMaterial: FC<
  ThreeElements['meshPhysicalMaterial']
> = ({ ...props }) => (
  <meshPhysicalMaterial
    reflectivity={3}
    color={`#c6c6c6`}
    emissive={`#323232`}
    metalness={0.8}
    roughness={0.7}
    envMapIntensity={0.15}
    clearcoat={1}
    clearcoatRoughness={0.1}
    attach="material"
    {...props}
  />
)

export const Border: FC = () => {
  return (
    <mesh
      onClick={(e) => e.stopPropagation()}
      receiveShadow
      position={[0, -0.35, 0]}
      rotation={[0, 0, 0]}
    >
      <boxGeometry args={[9, 0.5, 9]} />
      <BorderMaterial />
    </mesh>
  )
}
