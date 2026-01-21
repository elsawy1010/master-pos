import { useState } from 'react'
import { io, Socket } from 'socket.io-client'

// Check if we're in production and Socket.IO is not available
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
const SOCKET_ENABLED = !isProduction || import.meta.env.VITE_SOCKET_URL

const SOCKET_URL = typeof window !== 'undefined'
    ? (import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.host}`)
    : 'http://localhost:3001'

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null)

    function connect() {
        // Don't connect if Socket.IO is disabled in production
        if (!SOCKET_ENABLED) {
            console.warn('Socket.IO is disabled in production. Real-time updates are not available.')
            return
        }

        if (!socket) {
            const newSocket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 3,
                timeout: 5000,
            })

            newSocket.on('connect_error', (error) => {
                console.warn('Socket.IO connection failed:', error.message)
            })

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
