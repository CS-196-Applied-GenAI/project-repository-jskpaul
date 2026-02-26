import { Link } from 'react-router-dom'

// Placeholder feed items (no backend)
const placeholderFeed = [
  { id: 1, username: 'alice', text: 'Welcome to your feed. Follow people to see their tweets here.', created_at: 'Just now' },
  { id: 2, username: 'bob', text: 'This is a sample tweet. The real feed will load from the API later.', created_at: 'Earlier' },
]

export default function Home() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Home</h1>
        <Link
          to="/post"
          className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-full hover:bg-sky-700 dark:hover:bg-sky-600"
        >
          Post
        </Link>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {placeholderFeed.map((tweet) => (
          <article key={tweet.id} className="py-4 first:pt-0">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Link to={`/users/${tweet.username}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">
                    @{tweet.username}
                  </Link>
                  <span className="text-slate-500 dark:text-slate-400">· {tweet.created_at}</span>
                </div>
                <p className="mt-1 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{tweet.text}</p>
                <div className="mt-2 flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm">
                  <Link to={`/tweets/${tweet.id}/replies`} className="hover:text-sky-600 dark:hover:text-sky-400">
                    Reply
                  </Link>
                  <Link to={`/tweets/${tweet.id}/reply`} className="hover:text-sky-600 dark:hover:text-sky-400">
                    Reply (compose)
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
