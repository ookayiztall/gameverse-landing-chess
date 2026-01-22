import type { MessageClient } from '@chess/components/Chat'
import type { MyServer, MySocket } from '@chess/pages/api/socket'
import type { Message } from '@chess/state/player'

export const sendMessage = (socket: MySocket, io: MyServer): void => {
  socket.on(`createdMessage`, (data: MessageClient) => {
    const send: Message = data.message
    io.sockets.in(data.room).emit(`newIncomingMessage`, send)
  })
}
