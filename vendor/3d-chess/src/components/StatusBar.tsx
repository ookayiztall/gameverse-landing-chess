import type { FC } from 'react'

import { css } from '@emotion/css'

import { useGameSettingsState } from '@chess/state/game'
import { usePlayerState } from '@chess/state/player'
import { uppercaseFirstLetter } from '@chess/utils/upperCaseFirstLetter'

export const StatusBar: FC = () => {
  const room = usePlayerState((state) => state.room)
  const joinedRoom = usePlayerState((state) => state.joinedRoom)
  const playerColor = usePlayerState((state) => state.playerColor)
  const gameStarted = useGameSettingsState((state) => state.gameStarted)
  const turn = useGameSettingsState((state) => state.turn)
  return (
    <div
      className={css`
        position: absolute;
        top: 30px;
        left: 50%;
        transform: translateX(-50%);
        color: #ffffff8d;
        font-size: 14px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        span {
          color: #ffffffba;
          font-weight: 600;
        }
      `}
    >
      {joinedRoom && (
        <p>
          Room{` `}
          <span>{room}</span>
          {` | `}Player{` `}
          <span>{uppercaseFirstLetter(playerColor)}</span>
          {` | `}Turn{` `}
          <span>{uppercaseFirstLetter(turn)}</span>
        </p>
      )}
      {!gameStarted && joinedRoom && (
        <p>Share your room name to invite another player.</p>
      )}
    </div>
  )
}
