import { useState } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001'

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null)
    
    function connect() {
        if (!socket) {
            const newSocket = io(SOCKET_URL)
            setSocket(newSocket)
        }
    }

    function disconnect() {
        if (socket) {
            socket.disconnect()
            setSocket(null)
        }
    }

    return { socket, connect, disconnect }
}
