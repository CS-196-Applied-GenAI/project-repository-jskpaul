import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <h1 className="text-6xl font-bold text-slate-300 dark:text-slate-600">404</h1>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-4">Page not found</h2>
      <p className="text-slate-600 dark:text-slate-400 mt-2">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-block px-6 py-3 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 dark:hover:bg-sky-600"
      >
        Go home
      </Link>
    </div>
  )
}
