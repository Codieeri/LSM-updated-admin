import { useState, useEffect, useRef } from 'react'

/**
 * Returns elapsed seconds since `startedAt` (if active) or total (if stopped)
 */
export function useTimer(startedAt: Date | null, active: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !startedAt) {
      if (startedAt && !active) {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
      }
      return
    }
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [startedAt, active])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const formatted = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`

  return { elapsed, formatted }
}
