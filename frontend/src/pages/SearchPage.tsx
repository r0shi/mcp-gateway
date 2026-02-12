import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { post } from '../api'

interface SearchHit {
  chunk_id: string
  doc_id: string
  version_id: string
  chunk_num: number
  chunk_text: string
  page_start?: number
  page_end?: number
  language: string
  ocr_used: boolean
  ocr_confidence?: number
  score: number
  doc_title?: string
}

interface ConflictSource {
  doc_id: string
  version_id: string
  title: string
}

interface SearchResponse {
  hits: SearchHit[]
  possible_conflict: boolean
  conflict_sources: ConflictSource[]
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    setLoading(true)
    try {
      const data = await post<SearchResponse>('/api/search', {
        query: query.trim(),
        k: 10,
      })
      setResults(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const maxScore = results?.hits[0]?.score || 1

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Search</h1>
      <form onSubmit={handleSearch} className="mb-6 flex space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents..."
          autoFocus
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {results && (
        <>
          {results.possible_conflict && results.conflict_sources.length > 0 && (
            <div className="mb-4 rounded bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Possible conflict:</strong> Similar content found across
              multiple sources:{' '}
              {results.conflict_sources.map((s, i) => (
                <span key={s.version_id}>
                  {i > 0 && ', '}
                  <Link
                    to={`/docs/${s.doc_id}`}
                    className="font-medium text-amber-900 underline"
                  >
                    {s.title}
                  </Link>
                </span>
              ))}
            </div>
          )}

          {results.hits.length === 0 ? (
            <p className="text-gray-500">No results found.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {results.hits.length} results
              </p>
              {results.hits.map((hit) => (
                <div
                  key={hit.chunk_id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Link
                      to={`/docs/${hit.doc_id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {hit.doc_title || 'Untitled'}
                    </Link>
                    <div className="flex items-center space-x-2">
                      <div className="h-1.5 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{
                            width: `${Math.round((hit.score / maxScore) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {hit.score.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-gray-700 line-clamp-3">
                    {hit.chunk_text}
                  </p>
                  <div className="flex items-center space-x-3 text-xs text-gray-400">
                    {hit.page_start != null && (
                      <span>
                        Page {hit.page_start}
                        {hit.page_end != null && hit.page_end !== hit.page_start
                          ? `–${hit.page_end}`
                          : ''}
                      </span>
                    )}
                    <span>Lang: {hit.language}</span>
                    {hit.ocr_used && <span>OCR</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
