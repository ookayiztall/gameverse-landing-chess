/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket, ServerOptions } from 'socket.io'
import { Server } from 'socket.io'

import type { MakeMoveClient, MovingTo } from '@chess/components/Board'
import type { MessageClient } from '@chess/components/Chat'
import type { JoinRoomClient } from '@chess/components/GameCreation'
import type { Color } from '@logic/pieces'
import type { CameraMove } from '@chess/server/cameraMove'
import { cameraMove } from '@chess/server/cameraMove'
import { disconnect } from '@chess/server/disconnect'
import { fetchPlayers } from '@chess/server/fetchPlayers'
import { joinRoom } from '@chess/server/joinRoom'
import { makeMove } from '@chess/server/makeMove'
import { resetGame } from '@chess/server/resetGame'
import { sendMessage } from '@chess/server/sendMessage'
import type { Message } from '@chess/state/player'

export type PublicRoomVisibility = 'public' | 'private'

export type PublicRoomMeta = {
  roomId: string
  displayName: string
  host: string
  visibility: PublicRoomVisibility
  timeControl: '10m' | '15m' | '30m'
  createdAt: number
}

export type PublicRoomSummary = {
  roomId: string
  displayName: string
  host: string
  timeControl: '10m' | '15m' | '30m'
  players: number
  isFull: boolean
}

export type PublicRoomsPayload = {
  rooms: PublicRoomSummary[]
  onlineCount: number
}

export type CreateRoomClient = {
  displayName: string
  host: string
  visibility: PublicRoomVisibility
  timeControl: '10m' | '15m' | '30m'
}

export type CreateRoomResponse =
  | { ok: true; roomId: string }
  | { ok: false; error: string }

let publicRoomsMeta = new Map<string, PublicRoomMeta>()

const getOnlineCount = (io: MyServer): number => {
  const engine = (io as unknown as { engine?: { clientsCount?: number } }).engine
  return typeof engine?.clientsCount === 'number' ? engine.clientsCount : 0
}

const getPublicRoomsPayload = (io: MyServer): PublicRoomsPayload => {
  const rooms: PublicRoomSummary[] = []
  for (const meta of publicRoomsMeta.values()) {
    if (meta.visibility !== 'public') continue
    const players = io.sockets.adapter.rooms.get(meta.roomId)?.size || 0
    rooms.push({
      roomId: meta.roomId,
      displayName: meta.displayName,
      host: meta.host.split(`#`)[0] ?? meta.host,
      timeControl: meta.timeControl,
      players,
      isFull: players >= 2,
    })
  }

  rooms.sort((a, b) => {
    if (a.isFull !== b.isFull) return a.isFull ? 1 : -1
    return b.players - a.players
  })

  return { rooms, onlineCount: getOnlineCount(io) }
}

const emitPublicRoomsUpdated = (io: MyServer, socket?: MySocket): void => {
  const payload = getPublicRoomsPayload(io)
  if (socket) {
    socket.emit('publicRoomsUpdated', payload)
    return
  }
  io.emit('publicRoomsUpdated', payload)
}

const generateRoomId = (): string => {
  const n = Math.floor(Math.random() * 100000)
  return String(n).padStart(5, '0')
}

const attachLobbyHandlers = (io: MyServer): void => {
  const lobbyIo = io as unknown as {
    __publicRoomsMeta?: Map<string, PublicRoomMeta>
    __emitPublicRoomsUpdated?: VoidFunction
    __lobbyHandlersAttached?: boolean
  }

  if (lobbyIo.__publicRoomsMeta) {
    publicRoomsMeta = lobbyIo.__publicRoomsMeta
  } else {
    lobbyIo.__publicRoomsMeta = publicRoomsMeta
  }
  lobbyIo.__emitPublicRoomsUpdated = () => emitPublicRoomsUpdated(io)

  const attachToSocket = (socket: MySocket) => {
    socket.removeAllListeners('fetchPublicRooms')
    socket.removeAllListeners('createRoom')

    socket.on('fetchPublicRooms', () => {
      emitPublicRoomsUpdated(io, socket)
    })

    socket.on('createRoom', (data, cb) => {
      const displayName =
        typeof data?.displayName === 'string' ? data.displayName.trim() : ''
      const host = typeof data?.host === 'string' ? data.host.trim() : ''
      const visibility = data?.visibility === 'private' ? 'private' : 'public'
      const timeControl =
        data?.timeControl === '10m' || data?.timeControl === '30m'
          ? data.timeControl
          : '15m'

      const safeCb =
        typeof cb === 'function'
          ? cb
          : () => {
              return
            }

      if (displayName.length < 3) {
        safeCb({ ok: false, error: 'Room name is too short' })
        return
      }
      if (!host) {
        safeCb({ ok: false, error: 'Missing host' })
        return
      }

      let roomId = generateRoomId()
      for (let i = 0; i < 12 && publicRoomsMeta.has(roomId); i += 1) {
        roomId = generateRoomId()
      }
      if (publicRoomsMeta.has(roomId)) {
        safeCb({ ok: false, error: 'Could not allocate a room id' })
        return
      }

      publicRoomsMeta.set(roomId, {
        roomId,
        displayName,
        host,
        visibility,
        timeControl,
        createdAt: Date.now(),
      })

      safeCb({ ok: true, roomId })
      emitPublicRoomsUpdated(io)
    })
  }

  if (!lobbyIo.__lobbyHandlersAttached) {
    io.on('connection', (socket) => {
      attachToSocket(socket)
      emitPublicRoomsUpdated(io, socket)
    })
    lobbyIo.__lobbyHandlersAttached = true
  }

  for (const socket of io.sockets.sockets.values()) {
    attachToSocket(socket as unknown as MySocket)
    emitPublicRoomsUpdated(io, socket as unknown as MySocket)
  }
}

export type playerJoinedServer = {
  room: string
  username: string
  color: Color
  playerCount: number
}

export type Room = {
  room: string
}
export interface SocketClientToServer {
  createdMessage: (MessageClient: MessageClient) => void
  joinRoom: (JoinRoomClient: JoinRoomClient) => void
  makeMove: (MakeMoveClient: MakeMoveClient) => void
  cameraMove: (CameraMove: CameraMove) => void
  fetchPlayers: (Room: Room) => void
  resetGame: (Room: Room) => void
  playerLeft: (Room: Room) => void
  disconnect: (Room: Room) => void
  disconnecting: (Room: any) => void
  error: (Room: any) => void
  existingPlayer: (room: Room & { name: string }) => void
  fetchPublicRooms: () => void
  createRoom: (data: CreateRoomClient, cb: (res: CreateRoomResponse) => void) => void
}

export interface SocketServerToClient {
  newIncomingMessage: (MessageClient: Message) => void
  playerJoined: (playerJoinedServer: playerJoinedServer) => void
  moveMade: (movingTo: MovingTo) => void
  cameraMoved: (CameraMove: CameraMove) => void
  playersInRoom: (players: number) => void
  gameReset: (data: boolean) => void
  newError: (error: string) => void
  joinRoom: (JoinRoomClient: JoinRoomClient) => void
  playerLeft: (Room: Room) => void
  clientExistingPlayer: (name: string) => void
  publicRoomsUpdated: (payload: PublicRoomsPayload) => void
}

export type MySocket = Socket<SocketClientToServer, SocketServerToClient>
export type MyServer = Server<SocketClientToServer, SocketServerToClient>

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponse & {
    socket: {
      server: ServerOptions & {
        io: Server
      }
    }
  },
): void {
  // It means that socket server was already initialized
  if (res?.socket?.server?.io) {
    attachLobbyHandlers(res.socket.server.io as unknown as MyServer)
    console.log(`Already set up`)
    res.end()
    return
  }

  const io = new Server<SocketClientToServer, SocketServerToClient>(
    res?.socket?.server,
  )
  res.socket.server.io = io

  attachLobbyHandlers(io)

  const onConnection = (socket: MySocket) => {
    sendMessage(socket, io)
    joinRoom(socket, io)
    makeMove(socket, io)
    cameraMove(socket, io)
    fetchPlayers(socket, io)
    resetGame(socket, io)
    disconnect(socket, io)
    socket.on(`existingPlayer`, (data) => {
      io.sockets.in(data.room).emit(`clientExistingPlayer`, data.name)
    })
  }

  // Define actions inside
  io.on(`connection`, onConnection)

  console.log(`Setting up socket`)
  res.end()
}
