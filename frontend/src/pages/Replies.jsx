import { Link, useParams } from 'react-router-dom'

// Placeholder data (no backend)
const placeholderParent = {
  id: 1,
  username: 'bob',
  text: 'This is the original tweet. All replies will show below.',
  created_at: 'Earlier',
}

const placeholderReplies = [
  { id: 101, username: 'alice', contents: 'First reply!', created_at: 'Just now' },
  { id: 102, username: 'charlie', contents: 'Second reply here.', created_at: 'A bit ago' },
]

export default function Replies() {
  const { tweetId } = useParams()

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="mb-6">
        <Link to="/" className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 mb-4 inline-block">
          ← Back to feed
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">Replies to tweet #{tweetId}</h1>
      </div>

      <article className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 mb-6">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <Link to={`/users/${placeholderParent.username}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">
                @{placeholderParent.username}
              </Link>
              <span className="text-slate-500 dark:text-slate-400">· {placeholderParent.created_at}</span>
            </div>
            <p className="mt-1 text-slate-800 dark:text-slate-200">{placeholderParent.text}</p>
          </div>
        </div>
      </article>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Replies</h2>
        <Link
          to={`/tweets/${tweetId}/reply`}
          className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
        >
          Write a reply
        </Link>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {placeholderReplies.map((reply) => (
          <article key={reply.id} className="py-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Link to={`/users/${reply.username}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">
                    @{reply.username}
                  </Link>
                  <span className="text-slate-500 dark:text-slate-400">· {reply.created_at}</span>
                </div>
                <p className="mt-1 text-slate-800 dark:text-slate-200">{reply.contents}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
