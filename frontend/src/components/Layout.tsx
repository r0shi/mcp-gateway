import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import JobToast from './JobToast'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive
      ? 'bg-gray-900 text-white'
      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
  }`

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()

  return (
    <div className="min-h-screen">
      <nav className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-lg font-bold text-white">
                LKA
              </Link>
              <NavLink to="/" end className={linkClass}>
                Documents
              </NavLink>
              <NavLink to="/upload" className={linkClass}>
                Upload
              </NavLink>
              <NavLink to="/search" className={linkClass}>
                Search
              </NavLink>
              {isAdmin && (
                <>
                  <NavLink to="/admin/users" className={linkClass}>
                    Users
                  </NavLink>
                  <NavLink to="/admin/keys" className={linkClass}>
                    API Keys
                  </NavLink>
                  <NavLink to="/admin/system" className={linkClass}>
                    System
                  </NavLink>
                </>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {isAdmin && (
                <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-medium text-white">
                  admin
                </span>
              )}
              <span className="text-sm text-gray-300">{user?.email}</span>
              <button
                onClick={logout}
                className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <JobToast />
    </div>
  )
}
