import React, { useRef } from 'react'
import type { FC } from 'react'

import type { Position } from '@logic/board'
import type { ThreeElements } from '@react-three/fiber'

export const PieceMaterial: FC<
  ThreeElements['meshPhysicalMaterial'] & {
    isSelected: boolean
    pieceIsBeingReplaced: boolean
  }
> = ({ color, isSelected, pieceIsBeingReplaced, ...props }) => {
  return (
    <meshPhysicalMaterial
      reflectivity={4}
      color={color === `white` ? `#d9d9d9` : `#7c7c7c`}
      emissive={isSelected ? `#733535` : `#000000`}
      metalness={1}
      roughness={0.5}
      attach="material"
      envMapIntensity={0.2}
      opacity={pieceIsBeingReplaced ? 0 : 1}
      transparent={true}
      {...props}
    />
  )
}

export type ModelProps = ThreeElements['group'] & {
  color: string
  isSelected: boolean
  canMoveHere: Position | null
  movingTo: Position | null
  finishMovingPiece: () => void
  pieceIsBeingReplaced: boolean
  wasSelected: boolean
}

export const MeshWrapper: FC<ModelProps> = ({
  movingTo,
  finishMovingPiece,
  isSelected,
  children,
  pieceIsBeingReplaced,
  wasSelected,
  ...props
}) => {
  const ref = useRef(null)
  const meshRef = useRef(null)
  return (
    <group ref={ref} {...props} dispose={null} castShadow>
      <mesh
        ref={meshRef}
        scale={0.03}
        castShadow={pieceIsBeingReplaced ? false : true}
        receiveShadow
      >
        {children}
        <PieceMaterial
          color={props.color}
          pieceIsBeingReplaced={pieceIsBeingReplaced}
          isSelected={isSelected}
        />
      </mesh>
    </group>
  )
}
