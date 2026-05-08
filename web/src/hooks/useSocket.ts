import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useSocket() {
  const token   = useAuthStore((s) => s.token)
  const qc      = useQueryClient()
  const sockRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = io('/events', {
      auth: { token },
      transports: ['websocket'],
    })

    sockRef.current = socket

    const invalidateFiles  = () => qc.invalidateQueries({ queryKey: ['files'] })
    const invalidateShares = () => qc.invalidateQueries({ queryKey: ['shares'] })

    socket.on('file:created',  invalidateFiles)
    socket.on('file:updated',  invalidateFiles)
    socket.on('file:deleted',  invalidateFiles)
    socket.on('file:restored', invalidateFiles)
    socket.on('folder:created', invalidateFiles)
    socket.on('folder:updated', invalidateFiles)
    socket.on('folder:deleted', invalidateFiles)

    return () => {
      socket.disconnect()
      sockRef.current = null
    }
  }, [token, qc])
}
