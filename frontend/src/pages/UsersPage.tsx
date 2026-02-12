import { FormEvent, useEffect, useState } from 'react'
import { del, get, patch, post } from '../api'

interface UserInfo {
  user_id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  last_login_at?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  async function loadUsers() {
    try {
      const data = await get<UserInfo[]>('/api/users')
      setUsers(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleToggleActive(user: UserInfo) {
    try {
      await patch(`/api/users/${user.user_id}`, {
        is_active: !user.is_active,
      })
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function handleToggleRole(user: UserInfo) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      await patch(`/api/users/${user.user_id}`, { role: newRole })
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function handleDelete(user: UserInfo) {
    if (!confirm(`Delete user ${user.email}?`)) return
    try {
      await del(`/api/users/${user.user_id}`)
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Users</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Create User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {showCreate && (
        <CreateUserForm
          onCreated={() => {
            setShowCreate(false)
            loadUsers()
          }}
          onError={setError}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Active
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Last Login
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((u) => (
              <tr key={u.user_id}>
                <td className="px-4 py-3 text-sm">{u.email}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleRole(u)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {u.role}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {u.is_active ? 'active' : 'disabled'}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(u)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateUserForm({
  onCreated,
  onError,
}: {
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await post('/api/users', { email, password, role })
      onCreated()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Create
      </button>
    </form>
  )
}
