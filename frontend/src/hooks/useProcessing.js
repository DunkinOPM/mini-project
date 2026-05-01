import { useState, useEffect, useRef, useCallback } from 'react'
import { getStatus, startProcessing } from '../utils/api'

export default function useProcessing() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [info, setInfo] = useState({})
  const pollRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

  const poll = useCallback(async () => {
    try {
      const { data } = await getStatus()
      setStatus(data.status)
      setProgress(data.progress || 0)
      setInfo(data)
      if (data.status === 'done' || data.status === 'error') stopPolling()
    } catch {
      stopPolling()
    }
  }, [stopPolling])

  const startPipeline = useCallback(async () => {
    setStatus('queued')
    setProgress(0)
    await startProcessing()
    stopPolling()
    pollRef.current = setInterval(poll, 1200)
  }, [poll, stopPolling])

  useEffect(() => {
    poll()
    return stopPolling
  }, [])

  return { status, progress, info, startPipeline, refetch: poll }
}
