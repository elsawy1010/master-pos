import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    socket.onAny((event, ...args) => {
      io?.emit(event, ...args)
    })

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Client disconnected:', socket.id)
    })
  })

  console.log('[Socket.IO] Server initialized')
  return io
}

export function getIO() {
  return io
}
