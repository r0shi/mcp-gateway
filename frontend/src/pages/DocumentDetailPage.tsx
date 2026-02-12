import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, post, del } from '../api'
import { useAuth } from '../auth'

interface JobInfo {
  job_id: string
  stage: string
  status: string
  progress_current?: number
  progress_total?: number
  error?: string
  created_at: string
  started_at?: string
  finished_at?: string
}

interface VersionInfo {
  version_id: string
  status: string
  mime_type?: string
  size_bytes?: number
  has_text_layer?: boolean
  needs_ocr?: boolean
  extracted_chars?: number
  error?: string
  created_at: string
  jobs: JobInfo[]
}

interface DocumentDetail {
  doc_id: string
  title: string
  canonical_filename?: string
  status: string
  created_at: string
  updated_at: string
  versions: VersionInfo[]
}

interface PageContent {
  page_num: number
  text: string
  ocr_used: boolean
  ocr_confidence?: number
}

interface ContentResponse {
  doc_id: string
  version_id: string
  pages: PageContent[]
  total_chars: number
}

function JobStatusBadge({ status }: { status: string }) {
  let cls = 'bg-gray-100 text-gray-600'
  if (status === 'completed') cls = 'bg-green-100 text-green-700'
  else if (status === 'failed') cls = 'bg-red-100 text-red-700'
  else if (status === 'running') cls = 'bg-blue-100 text-blue-700'
  else if (status === 'queued') cls = 'bg-amber-100 text-amber-700'

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [content, setContent] = useState<ContentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showContent, setShowContent] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    get<DocumentDetail>(`/api/docs/${id}`)
      .then(setDoc)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function loadContent() {
    setShowContent(true)
    try {
      const data = await get<ContentResponse>(`/api/docs/${id}/content`)
      setContent(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load content')
    }
  }

  async function handleReprocess() {
    setActionLoading(true)
    try {
      await post(`/api/docs/${id}/reprocess`)
      // Reload doc
      const updated = await get<DocumentDetail>(`/api/docs/${id}`)
      setDoc(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reprocess failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this document and all its versions? This cannot be undone.')) return
    setActionLoading(true)
    try {
      await del(`/api/docs/${id}`)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setActionLoading(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>
  if (error && !doc) return <div className="text-red-600">Error: {error}</div>
  if (!doc) return <div className="text-gray-500">Not found</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{doc.title}</h1>
          {doc.canonical_filename && (
            <p className="text-sm text-gray-500">{doc.canonical_filename}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex space-x-2">
            <button
              onClick={handleReprocess}
              disabled={actionLoading}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Reprocess
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-2 text-sm text-gray-500">
        Created {new Date(doc.created_at).toLocaleString()} | Updated{' '}
        {new Date(doc.updated_at).toLocaleString()}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Versions</h2>
      {doc.versions.map((v) => (
        <div
          key={v.version_id}
          className="mb-4 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">
                {v.mime_type || 'unknown type'}
              </span>
              {v.size_bytes != null && (
                <span className="ml-2 text-gray-500">
                  {(v.size_bytes / 1024).toFixed(0)} KB
                </span>
              )}
            </div>
            <JobStatusBadge status={v.status} />
          </div>
          {v.error && (
            <div className="mb-2 text-sm text-red-600">Error: {v.error}</div>
          )}
          <div className="text-xs text-gray-400">
            {v.extracted_chars != null && (
              <span>Chars: {v.extracted_chars} | </span>
            )}
            OCR: {v.needs_ocr ? 'yes' : 'no'} | Text layer:{' '}
            {v.has_text_layer ? 'yes' : 'no'}
          </div>

          {v.jobs.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-1 pr-3">Stage</th>
                  <th className="pb-1 pr-3">Status</th>
                  <th className="pb-1 pr-3">Progress</th>
                  <th className="pb-1">Time</th>
                </tr>
              </thead>
              <tbody>
                {v.jobs.map((j) => (
                  <tr key={j.job_id} className="border-b border-gray-100">
                    <td className="py-1 pr-3 font-medium">{j.stage}</td>
                    <td className="py-1 pr-3">
                      <JobStatusBadge status={j.status} />
                    </td>
                    <td className="py-1 pr-3 text-gray-500">
                      {j.progress_total
                        ? `${j.progress_current || 0}/${j.progress_total}`
                        : '—'}
                    </td>
                    <td className="py-1 text-xs text-gray-400">
                      {j.finished_at
                        ? new Date(j.finished_at).toLocaleTimeString()
                        : j.started_at
                          ? 'running...'
                          : 'queued'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <h2 className="mb-2 mt-6 text-lg font-semibold">Content</h2>
      {!showContent ? (
        <button
          onClick={loadContent}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          View Content
        </button>
      ) : content ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {content.total_chars.toLocaleString()} total characters,{' '}
            {content.pages.length} pages
          </p>
          {content.pages.map((page) => (
            <div
              key={page.page_num}
              className="rounded border border-gray-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Page {page.page_num}
                </span>
                {page.ocr_used && (
                  <span className="text-xs text-gray-400">
                    OCR{' '}
                    {page.ocr_confidence != null
                      ? `(${(page.ocr_confidence * 100).toFixed(0)}%)`
                      : ''}
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800">
                {page.text}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500">Loading content...</div>
      )}
    </div>
  )
}
