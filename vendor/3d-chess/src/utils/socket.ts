import { useEffect } from 'react'

import { toast } from 'react-toastify'
import type { Socket } from 'socket.io-client'
// eslint-disable-next-line import/no-named-as-default
import io from 'socket.io-client'
import { create } from 'zustand'

import type { MovingTo } from '@chess/components/Board'
import type {
  SocketClientToServer,
  SocketServerToClient,
  playerJoinedServer,
} from '@chess/pages/api/socket'
import type { CameraMove } from '@chess/server/cameraMove'
import { useGameSettingsState } from '@chess/state/game'
import type { Message } from '@chess/state/player'
import {
  useOpponentState,
  usePlayerState,
  useMessageState,
} from '@chess/state/player'

type ClientSocket = Socket<SocketServerToClient, SocketClientToServer>
let socket: ClientSocket | null = null

type SocketState = {
  socket: ClientSocket | null
  setSocket: (socket: ClientSocket) => void
}

export const useSocketState = create<SocketState>()((set) => ({
  socket: null,
  setSocket: (socket: ClientSocket) => set({ socket }),
}))

export const useSockets = ({ reset }: { reset: VoidFunction }): void => {
  useEffect(() => {
    socketInitializer()

    return () => {
      if (socket) {
        socket.emit(`playerLeft`, { room: usePlayerState.getState().room })
        socket.disconnect()
      }
    }
  }, [reset])

  const socketInitializer = async () => {
    await fetch(`/api/socket`)
    const socketUrl = typeof window !== `undefined` ? window.location.origin : undefined
    socket = socketUrl ? io(socketUrl) : io()
    const currentSocket = socket
    useSocketState.getState().setSocket(currentSocket)

    const addMessage = useMessageState.getState().addMessage
    const setGameStarted = useGameSettingsState.getState().setGameStarted
    const setMovingTo = useGameSettingsState.getState().setMovingTo
    const { setPlayerColor, setJoinedRoom } = usePlayerState.getState()
    const { setPosition, setName: setOpponentName } = useOpponentState.getState()

    currentSocket.on(`newIncomingMessage`, (msg: Message) => {
      addMessage(msg)
    })

    currentSocket.on(`playerJoined`, (data: playerJoinedServer) => {
      const split = data.username.split(`#`)
      addMessage({
        author: `System`,
        message: `${split[0]} has joined ${data.room}`,
      })
      const { id, username } = usePlayerState.getState()
      if (split[1] === id) {
        setPlayerColor(data.color)
        setJoinedRoom(true)
      } else {
        currentSocket.emit(`existingPlayer`, {
          room: data.room,
          name: `${username}#${id}`,
        })
        setOpponentName(split[0])
      }
    })

    currentSocket.on(`clientExistingPlayer`, (data: string) => {
      const split = data.split(`#`)
      if (split[1] !== usePlayerState.getState().id) {
        setOpponentName(split[0])
      }
    })

    currentSocket.on(`cameraMoved`, (data: CameraMove) => {
      const { playerColor } = usePlayerState.getState()
      if (playerColor === data.color) {
        return
      }
      setPosition(data.position)
    })

    currentSocket.on(`moveMade`, (data: MovingTo) => {
      setMovingTo(data)
    })

    currentSocket.on(`gameReset`, () => {
      reset()
    })

    currentSocket.on(`playersInRoom`, (data: number) => {
      setGameStarted(data === 2)
    })

    currentSocket.on(`newError`, (err: string) => {
      toast.error(err, {
        toastId: err,
      })
    })
  }
}
