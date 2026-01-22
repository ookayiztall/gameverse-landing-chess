import type { JoinRoomClient } from '@chess/components/GameCreation'
import type { Color } from '@logic/pieces'
import type {
  MyServer,
  MySocket,
  playerJoinedServer,
  PublicRoomMeta,
} from '@chess/pages/api/socket'

export const joinRoom = (socket: MySocket, io: MyServer): void => {
  socket.on(`joinRoom`, (data: JoinRoomClient) => {
    const { room, username } = data

    const playerCount = io.sockets.adapter.rooms.get(data.room)?.size || 0
    if (playerCount === 2) {
      socket.emit(`newError`, `Room is full`)
      return
    }

    socket.join(room)
    socket.data.room = room
    socket.data.username = username
    const color: Color = playerCount === 1 ? `black` : `white`
    const props: playerJoinedServer = { room, username, color, playerCount }
    io.sockets.in(room).emit(`playerJoined`, props)

    const metaMap = (io as unknown as { __publicRoomsMeta?: Map<string, PublicRoomMeta> })
      .__publicRoomsMeta
    if (metaMap && playerCount === 0 && !metaMap.has(room)) {
      metaMap.set(room, {
        roomId: room,
        displayName: `Room ${room}`,
        host: username,
        visibility: 'private',
        timeControl: '15m',
        createdAt: Date.now(),
      })
    }

    ;(io as unknown as { __emitPublicRoomsUpdated?: VoidFunction })
      .__emitPublicRoomsUpdated?.()
  })
}
