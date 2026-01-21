import { createServer } from 'http'
import { initSocketServer } from '@/lib/socket-server'

const PORT = process.env.SOCKET_PORT || 3001

const httpServer = createServer()
const io = initSocketServer(httpServer)

httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Server running on port ${PORT}`)
})

export { io }
