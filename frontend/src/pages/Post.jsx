import { useState } from 'react'
import { Link } from 'react-router-dom'

const MAX_LENGTH = 280

export default function Post() {
  const [text, setText] = useState('')
  const remaining = MAX_LENGTH - text.length

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Compose a tweet</h1>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="What's happening?"
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500 resize-none"
          />
          <div className="mt-1 flex justify-end">
            <span className={`text-sm ${remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {remaining} / {MAX_LENGTH}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Link
            to="/"
            className="px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-sky-600"
          >
            Post
          </button>
        </div>
      </form>
    </div>
  )
}
