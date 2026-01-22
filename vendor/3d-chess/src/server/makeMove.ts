import type { MakeMoveClient } from '@chess/components/Board'
import type { MyServer, MySocket } from '@chess/pages/api/socket'

export const makeMove = (socket: MySocket, io: MyServer): void => {
  socket.on(`makeMove`, (data: MakeMoveClient) => {
    io.sockets.in(data.room).emit(`moveMade`, data.movingTo)
  })
}
