import { Outlet, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function Layout() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300">
            Bird-App
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <span className="text-lg" aria-hidden>☀️</span>
              ) : (
                <span className="text-lg" aria-hidden>🌙</span>
              )}
            </button>
            <nav className="flex items-center gap-4 text-sm">
              <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Home</Link>
              <Link to="/post" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Post</Link>
              <Link to="/login" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Log in</Link>
              <Link to="/register" className="text-sky-600 dark:text-sky-400 font-medium hover:text-sky-700 dark:hover:text-sky-300">Sign up</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
