import { Link } from "react-router-dom";
import { mockFeedTweets } from "../mock/data";

export function HomeFeedPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Home</h1>
      <p className="text-sm text-slate-300 mb-4">
        This is your follower-only, reverse-chronological feed. For now, we&apos;re using mock data until
        the backend is wired up.
      </p>
      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white/70 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
        {mockFeedTweets.map((tweet) => (
          <article key={tweet.id} className="p-4 hover:bg-slate-900/60 transition-colors">
            <header className="flex items-center justify-between mb-1">
              <Link
                to={`/profile/${tweet.authorHandle}`}
                className="font-semibold hover:underline"
              >
                @{tweet.authorHandle}
              </Link>
              <span className="text-xs text-slate-400">{tweet.createdAt}</span>
            </header>
            <p className="text-sm leading-relaxed">{tweet.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
