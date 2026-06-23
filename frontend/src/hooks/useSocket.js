import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

export default function useSocket(setMatches, setConnected) {
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    socket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      setConnected(false)
      if (reason === 'io server disconnect') {
        socket.connect()
      }
    })

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message)
      setConnected(false)
    })

    socket.on('matches-update', (data) => {
      setMatches(data)
    })

    socketRef.current = socket
  }, [setMatches, setConnected])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [connect])
}
