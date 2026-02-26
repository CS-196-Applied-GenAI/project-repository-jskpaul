import { Link, useParams } from 'react-router-dom'

// Placeholder profile and tweets (no backend)
const placeholderTweets = [
  { id: 1, text: 'First tweet from this user.', created_at: 'Today' },
  { id: 2, text: 'Another tweet in the timeline.', created_at: 'Yesterday' },
]

export default function Profile() {
  const { username } = useParams()
  const isOwnProfile = false // Would come from auth context when connected

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="flex gap-4 items-start mb-8">
        <div className="w-20 h-20 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">@{username}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Profile for {username}. Bio and stats will load from the API later.
          </p>
          {isOwnProfile ? (
            <Link
              to="/settings"
              className="mt-4 inline-block px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Edit profile
            </Link>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-full hover:bg-sky-700 dark:hover:bg-sky-600"
              >
                Follow
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Tweets</h2>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {placeholderTweets.map((tweet) => (
            <article key={tweet.id} className="py-4">
              <p className="text-slate-800 dark:text-slate-200">{tweet.text}</p>
              <div className="mt-2 flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm">
                <span>{tweet.created_at}</span>
                <Link to={`/tweets/${tweet.id}/replies`} className="hover:text-sky-600 dark:hover:text-sky-400">
                  View replies
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
