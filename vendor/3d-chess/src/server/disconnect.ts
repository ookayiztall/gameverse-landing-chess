import type { MyServer, MySocket, PublicRoomMeta } from '@chess/pages/api/socket'

export const disconnect = (socket: MySocket, io: MyServer): void => {
  socket.on(`playerLeft`, (data: { room: string }) => {
    const room = typeof data?.room === 'string' ? data.room : socket.data?.room
    if (!room) return

    socket.leave(room)
    io.sockets.in(room).emit(`playerLeft`, { room })
    const players = io.sockets.adapter.rooms.get(room)?.size || 0
    io.sockets.in(room).emit(`playersInRoom`, players)

    const metaMap = (io as unknown as { __publicRoomsMeta?: Map<string, PublicRoomMeta> })
      .__publicRoomsMeta
    if (metaMap && players <= 0) {
      metaMap.delete(room)
    }

    ;(io as unknown as { __emitPublicRoomsUpdated?: VoidFunction })
      .__emitPublicRoomsUpdated?.()
  })

  socket.on(`disconnecting`, () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue
      io.sockets.in(room).emit(`playerLeft`, { room })
      const current = io.sockets.adapter.rooms.get(room)?.size || 1
      const players = Math.max(0, current - 1)
      io.sockets.in(room).emit(`playersInRoom`, players)

      const metaMap = (io as unknown as { __publicRoomsMeta?: Map<string, PublicRoomMeta> })
        .__publicRoomsMeta
      if (metaMap && players <= 0) {
        metaMap.delete(room)
      }
    }

    ;(io as unknown as { __emitPublicRoomsUpdated?: VoidFunction })
      .__emitPublicRoomsUpdated?.()
  })
}
