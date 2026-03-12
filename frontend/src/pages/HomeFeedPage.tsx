import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { deleteTweet, fetchFeed, likeTweet, retweetTweet, unlikeTweet, type Tweet } from "../api/client";

export function HomeFeedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [retweetError, setRetweetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchFeed(user.token);
        if (!cancelled) {
          setTweets(data.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          const status = (err as { status?: number }).status;
          if (status === 401 || status === 403) {
            // Token is invalid or expired; log out and send user back to login.
            logout();
            navigate("/login", { replace: true });
            return;
          }
          setError("Could not load your feed. Try refreshing.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleToggleLike = async (tweet: Tweet) => {
    if (!user) return;
    setLikeError(null);
    const optimisticTweets = tweets.map((t) =>
      t.id === tweet.id
        ? {
            ...t,
            liked_by_me: !t.liked_by_me,
            like_count: t.like_count + (t.liked_by_me ? -1 : 1)
          }
        : t
    );
    setTweets(optimisticTweets);
    try {
      if (tweet.liked_by_me) {
        await unlikeTweet(tweet.id, user.token);
      } else {
        await likeTweet(tweet.id, user.token);
      }
    } catch (err) {
      // Revert on failure
      setTweets(tweets);
      setLikeError("Could not update like. Please try again.");
    }
  };

  const handleRetweet = async (tweet: Tweet) => {
    if (!user) return;
    setRetweetError(null);
    try {
      const newTweet = await retweetTweet(tweet.id, user.token);
      setTweets((prev) => [newTweet, ...prev]);
    } catch (err) {
      setRetweetError("Could not retweet. Please try again.");
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Home</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        This is your follower-only, reverse-chronological feed. You&apos;ll see tweets from accounts you
        follow.
      </p>
      {isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Loading feed...</p>}
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      {likeError && <p className="text-sm text-red-500 dark:text-red-400">{likeError}</p>}
      {deleteError && <p className="text-sm text-red-500 dark:text-red-400">{deleteError}</p>}
      {retweetError && <p className="text-sm text-red-500 dark:text-red-400">{retweetError}</p>}
      {!isLoading && tweets.length === 0 && !error && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tweets yet. Follow someone or post from another account to see activity here.
        </p>
      )}
      {tweets.length > 0 && (
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white/70 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
          {tweets.map((tweet) => (
            <article
              key={tweet.id}
              className="p-4 transition-colors hover:bg-gradient-to-r hover:from-[#FFF7ED] hover:to-[#F5F3FF] dark:hover:bg-gradient-to-r dark:hover:from-[#1A1024] dark:hover:to-[#0F1A2A]"
            >
              <header className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Link to={`/profile/${tweet.username}`} className="font-semibold hover:underline">
                    @{tweet.username}
                  </Link>
                  <span className="text-xs text-slate-400">
                    {new Date(tweet.created_at).toLocaleString()}
                  </span>
                </div>
                {user && tweet.username === user.username && (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(tweet.id)}
                    className="rounded-full border border-red-400 px-2 py-0.5 text-xs text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Delete
                  </button>
                )}
              </header>
              {tweet.retweeted_from && tweet.retweeted_from_username && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Retweeted from{" "}
                  <Link to={`/profile/${tweet.retweeted_from_username}`} className="font-semibold hover:underline">
                    @{tweet.retweeted_from_username}
                  </Link>
                </p>
              )}
              <p className="text-sm leading-relaxed mb-1.5">
                {tweet.text ?? tweet.retweeted_from_text ?? ""}
              </p>
              {typeof tweet.sentiment_label === "string" && tweet.sentiment_label && (
                <div className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span
                    className={
                      tweet.sentiment_label === "positive"
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : tweet.sentiment_label === "negative"
                        ? "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                        : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }
                  >
                    {tweet.sentiment_label.charAt(0).toUpperCase() + tweet.sentiment_label.slice(1)}
                    {typeof tweet.sentiment_score === "number" && !Number.isNaN(tweet.sentiment_score) && (
                      <span className="ml-1 opacity-80">
                        ({tweet.sentiment_score.toFixed(2)})
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => handleToggleLike(tweet)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-slate-200 hover:dark:bg-slate-800"
                >
                  <span>{tweet.liked_by_me ? "♥" : "♡"}</span>
                  <span>{tweet.like_count}</span>
                </button>
                {user && tweet.username !== user.username && (
                  <button
                    type="button"
                    onClick={() => handleRetweet(tweet)}
                    disabled={tweet.retweeted_by_me}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-slate-200 hover:dark:bg-slate-800"
                  >
                    {tweet.retweeted_by_me ? "↻ Retweeted" : "↻ Retweet"}
                  </button>
                )}
                <Link
                  to={`/post/${tweet.id}/reply`}
                  className="rounded-full px-2 py-1 hover:bg-slate-200 hover:dark:bg-slate-800"
                >
                  Reply
                </Link>
                <Link
                  to={`/tweet/${tweet.id}/replies`}
                  className="rounded-full px-2 py-1 hover:bg-slate-200 hover:dark:bg-slate-800"
                >
                  View replies
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {pendingDeleteId !== null && user && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-50">
            <h2 className="mb-2 text-lg font-semibold">Delete tweet?</h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              This will permanently delete the tweet and all of its replies. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1.5 hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (pendingDeleteId === null) return;
                  setDeleteError(null);
                  try {
                    await deleteTweet(pendingDeleteId, user.token);
                    setTweets((prev) => {
                      const toDelete = prev.find((t) => t.id === pendingDeleteId);
                      if (!toDelete) {
                        return prev.filter((t) => t.id !== pendingDeleteId);
                      }
                      const originalId = toDelete.retweeted_from ?? toDelete.id;
                      return prev
                        .filter((t) => t.id !== pendingDeleteId)
                        .map((t) =>
                          t.id === originalId
                            ? { ...t, retweeted_by_me: false }
                            : t
                        );
                    });
                    setPendingDeleteId(null);
                  } catch (err) {
                    setDeleteError("Failed to delete tweet.");
                    setPendingDeleteId(null);
                  }
                }}
                className="rounded-full bg-red-500 px-3 py-1.5 font-semibold text-white hover:bg-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
