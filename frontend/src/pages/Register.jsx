import { Link } from 'react-router-dom'

export default function Register() {
  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Create your account</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Sign up with a unique username and email. No backend connected yet.
      </p>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="e.g. alice"
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="alice@example.com"
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="min 8 characters"
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
        >
          Sign up
        </button>
      </form>
      <p className="mt-6 text-center text-slate-600 dark:text-slate-400 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}
