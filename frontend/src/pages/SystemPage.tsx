import { useEffect, useState } from 'react'
import { get, post } from '../api'

interface HealthCheck {
  status: string
  checks: {
    postgres: string
    redis: string
    minio: string
  }
}

export default function SystemPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionResult, setActionResult] = useState('')

  async function loadHealth() {
    try {
      const data = await get<HealthCheck>('/api/system/health')
      setHealth(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load health')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [])

  async function handlePurge() {
    setActionResult('')
    try {
      const data = await post<{ purged: number }>('/api/system/purge-run')
      setActionResult(`Purge complete: ${data.purged} items removed`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purge failed')
    }
  }

  async function handleReaper() {
    setActionResult('')
    try {
      const data = await post<{ reaped: number }>('/api/system/reaper-run')
      setActionResult(`Reaper complete: ${data.reaped} orphaned jobs recovered`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reaper failed')
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">System</h1>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {actionResult && (
        <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          {actionResult}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Health Checks</h2>
      {health && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <HealthCard
            name="PostgreSQL"
            status={health.checks.postgres}
          />
          <HealthCard name="Redis" status={health.checks.redis} />
          <HealthCard name="MinIO" status={health.checks.minio} />
        </div>
      )}

      {health && (
        <div className="mb-6">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              health.status === 'healthy'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            Overall: {health.status}
          </span>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Maintenance</h2>
      <div className="flex space-x-3">
        <button
          onClick={handlePurge}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Run Purge
        </button>
        <button
          onClick={handleReaper}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Run Reaper
        </button>
        <button
          onClick={loadHealth}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Refresh Health
        </button>
      </div>
    </div>
  )
}

function HealthCard({ name, status }: { name: string; status: string }) {
  const ok = status === 'ok'
  return (
    <div
      className={`rounded-lg border p-4 ${
        ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="text-sm font-medium text-gray-700">{name}</div>
      <div
        className={`mt-1 text-lg font-bold ${ok ? 'text-green-700' : 'text-red-700'}`}
      >
        {ok ? 'OK' : status}
      </div>
    </div>
  )
}
