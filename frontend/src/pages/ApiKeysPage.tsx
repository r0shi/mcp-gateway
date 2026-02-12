import { FormEvent, useEffect, useState } from 'react'
import { del, get, post } from '../api'

interface ApiKeyInfo {
  key_id: string
  name: string
  is_active: boolean
  created_at: string
  last_used_at?: string
}

interface ApiKeyCreated {
  key_id: string
  name: string
  raw_key: string
  created_at: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null)

  async function loadKeys() {
    try {
      const data = await get<ApiKeyInfo[]>('/api/api-keys')
      setKeys(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    try {
      await del(`/api/api-keys/${keyId}`)
      await loadKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revoke failed')
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">API Keys</h1>
        <button
          onClick={() => {
            setShowCreate(!showCreate)
            setNewKey(null)
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Create Key'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">
            API key created! Copy it now — it won't be shown again.
          </p>
          <code className="block rounded bg-white px-3 py-2 text-sm font-mono text-gray-800 select-all">
            {newKey.raw_key}
          </code>
        </div>
      )}

      {showCreate && !newKey && (
        <CreateKeyForm
          onCreated={(key) => {
            setNewKey(key)
            loadKeys()
          }}
          onError={setError}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Last Used
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {keys.map((k) => (
              <tr key={k.key_id}>
                <td className="px-4 py-3 text-sm font-medium">{k.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      k.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {k.is_active ? 'active' : 'revoked'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {k.last_used_at
                    ? new Date(k.last_used_at).toLocaleString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  {k.is_active && (
                    <button
                      onClick={() => handleRevoke(k.key_id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateKeyForm({
  onCreated,
  onError,
}: {
  onCreated: (key: ApiKeyCreated) => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const key = await post<ApiKeyCreated>('/api/api-keys', { name })
      onCreated(key)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 flex items-end space-x-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Key Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Claude Desktop"
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Create
      </button>
    </form>
  )
}
