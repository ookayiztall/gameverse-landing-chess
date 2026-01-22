import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { css } from '@emotion/css'
import type { Board } from '@logic/board'
import { createBoard } from '@logic/board'
import type { Color, GameOverType, Move, Piece } from '@logic/pieces'
import { Environment, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

import { BoardComponent } from '@chess/components/Board'
import { Chat } from '@chess/components/Chat'
import { GameCreation } from '@chess/components/GameCreation'
import { GameOverScreen } from '@chess/components/GameOverScreen'
import { Loader } from '@chess/components/Loader'
import { Opponent } from '@chess/components/Opponent'
import { Sidebar } from '@chess/components/Sidebar'
import { StatusBar } from '@chess/components/StatusBar'
import { Toast } from '@chess/components/Toast'
import { Border } from '@chess/models/Border'
import { useGameSettingsState } from '@chess/state/game'
import { useHistoryState } from '@chess/state/history'
import { usePlayerState } from '@chess/state/player'
import { useSockets } from '@chess/utils/socket'

export type GameOver = {
  type: GameOverType
  winner: Color
}

export const Home: FC<{
  onGameOver?: (gameOver: GameOver) => void
  onReset?: VoidFunction
  showGameCreation?: boolean
}> = ({ onGameOver, onReset, showGameCreation = true }) => {
  const [board, setBoard] = useState<Board>(createBoard())
  const [selected, setSelected] = useState<Piece | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [gameOver, setGameOver] = useState<GameOver | null>(null)
  const resetHistory = useHistoryState.getState().reset
  const resetTurn = useGameSettingsState.getState().resetTurn
  const joined = usePlayerState((state) => state.joinedRoom)

  const reset = useCallback(() => {
    setBoard(createBoard())
    setSelected(null)
    setMoves([])
    resetHistory()
    resetTurn()
    setGameOver(null)
    onReset?.()
  }, [resetHistory, resetTurn, onReset])

  useSockets({ reset })

  useEffect(() => {
    if (gameOver) onGameOver?.(gameOver)
  }, [gameOver, onGameOver])

  const { progress } = useProgress()

  return (
    <div
      className={css`
        height: 100%;
        width: 100%;
        background-color: #000;
        background: linear-gradient(180deg, #000000, #242424);
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      `}
    >
      {progress === 100 ? (showGameCreation ? <GameCreation /> : null) : (
        <Loader />
      )}
      <Sidebar board={board} moves={moves} selected={selected} />
      {joined && <Chat />}
      <StatusBar />
      <GameOverScreen gameOver={gameOver} />
      <Toast />
      <Canvas shadows camera={{ position: [-12, 5, 6], fov: 50 }}>
        <Environment files="/dawn.hdr" />
        <Opponent />
        <Border />
        <BoardComponent
          selected={selected}
          setSelected={setSelected}
          board={board}
          setBoard={setBoard}
          moves={moves}
          setMoves={setMoves}
          setGameOver={setGameOver}
        />
      </Canvas>
    </div>
  )
}

export default Home
