import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api'

interface DocSummary {
  doc_id: string
  title: string
  canonical_filename?: string
  status: string
  latest_version_status?: string
  version_count: number
  created_at: string
  updated_at: string
}

function StatusBadge({ status }: { status: string }) {
  let cls = 'bg-gray-100 text-gray-700'
  if (status === 'ready') cls = 'bg-green-100 text-green-700'
  else if (status === 'error') cls = 'bg-red-100 text-red-700'
  else if (status === 'processing') cls = 'bg-amber-100 text-amber-700'

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    get<DocSummary[]>('/api/docs')
      .then(setDocs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-500">Loading documents...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Documents</h1>
        <Link
          to="/"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Upload
        </Link>
      </div>
      {docs.length === 0 ? (
        <p className="text-gray-500">
          No documents yet.{' '}
          <Link to="/" className="text-blue-600 hover:underline">
            Upload one
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Versions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {docs.map((doc) => (
                <tr key={doc.doc_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/docs/${doc.doc_id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {doc.title}
                    </Link>
                    {doc.canonical_filename && (
                      <div className="text-xs text-gray-400">
                        {doc.canonical_filename}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {doc.version_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
