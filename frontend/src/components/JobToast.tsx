import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'

interface JobEvent {
  version_id: string
  stage: string
  status: string
  progress_current?: number
  progress_total?: number
  error?: string
  doc_title?: string
}

interface ActiveJob {
  version_id: string
  stage: string
  status: string
  progress_current?: number
  progress_total?: number
  doc_title?: string
}

export default function JobToast() {
  const { token } = useAuth()
  const [jobs, setJobs] = useState<Map<string, ActiveJob>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!token) return

    // EventSource doesn't support custom headers, so we pass token as query param
    // But our SSE endpoint uses cookie auth or we need to handle this differently
    // For now, use fetch-based SSE since EventSource can't set Authorization headers
    const controller = new AbortController()

    async function connectSSE() {
      try {
        const res = await fetch('/api/jobs/stream', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as {
                  type: string
                  data: JobEvent
                }
                const d = event.data
                const key = `${d.version_id}:${d.stage}`

                setJobs((prev) => {
                  const next = new Map(prev)
                  if (
                    d.status === 'completed' ||
                    d.status === 'failed'
                  ) {
                    next.delete(key)
                  } else {
                    next.set(key, {
                      version_id: d.version_id,
                      stage: d.stage,
                      status: d.status,
                      progress_current: d.progress_current,
                      progress_total: d.progress_total,
                      doc_title: d.doc_title,
                    })
                  }
                  return next
                })
              } catch {
                // ignore malformed JSON
              }
            }
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        // Reconnect after a delay
        setTimeout(connectSSE, 5000)
      }
    }

    connectSSE()

    return () => {
      controller.abort()
      eventSourceRef.current?.close()
    }
  }, [token])

  if (jobs.size === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {Array.from(jobs.values()).map((job) => (
        <div
          key={`${job.version_id}:${job.stage}`}
          className="rounded-lg bg-white px-4 py-3 shadow-lg ring-1 ring-gray-200"
        >
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-gray-700">
              {stageLabel(job.stage)}
              {job.doc_title ? ` — ${job.doc_title}` : ''}
            </span>
          </div>
          {job.progress_total != null && job.progress_total > 0 && (
            <div className="mt-1.5">
              <div className="h-1.5 w-48 rounded-full bg-gray-200">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.round(((job.progress_current || 0) / job.progress_total) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {job.progress_current}/{job.progress_total}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function stageLabel(stage: string): string {
  switch (stage) {
    case 'extract':
      return 'Extracting'
    case 'ocr':
      return 'OCR processing'
    case 'chunk':
      return 'Chunking'
    case 'embed':
      return 'Embedding'
    case 'finalize':
      return 'Finalizing'
    default:
      return stage
  }
}
