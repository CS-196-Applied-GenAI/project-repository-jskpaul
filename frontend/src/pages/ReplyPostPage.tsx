import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createComment, fetchTweet, type Tweet } from "../api/client";

export function ReplyPostPage() {
  const { tweetId } = useParams<{ tweetId: string }>();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const charsRemaining = 280 - text.length;
  const isTooLong = charsRemaining < 0;

  useEffect(() => {
    if (!tweetId || !user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchTweet(Number(tweetId), user.token);
        if (!cancelled) {
          setTweet(data);
        }
      } catch {
        // If the tweet fails to load, we still allow replying; heading falls back to id.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [tweetId, user]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isTooLong || text.trim().length === 0 || !tweetId || !user) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createComment(Number(tweetId), text.trim(), user.token);
      setText("");
      setToastMessage("Reply posted successfully.");
      setTimeout(() => {
        navigate(`/tweet/${tweetId}/replies`);
      }, 800);
    } catch (err) {
      setError("Failed to post reply. Try again.");
      setToastMessage("Failed to post reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (!text.trim() && tweetId) {
      navigate(`/tweet/${tweetId}/replies`);
      return;
    }
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    setShowCancelModal(false);
    setText("");
    if (tweetId) {
      navigate(`/tweet/${tweetId}/replies`);
    } else {
      navigate("/home");
    }
  };

  const dismissCancel = () => {
    setShowCancelModal(false);
  };

  return (
    <section className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Reply</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        Replying to {tweet ? `@${tweet.username}'s tweet` : `tweet #${tweetId}`}
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          className="w-full min-h-[140px] rounded-xl bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-vertical"
          maxLength={320}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your thoughts in a quick reply..."
        />
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className={isTooLong ? "text-red-400" : undefined}>{charsRemaining} characters left</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelClick}
              className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTooLong || text.trim().length === 0 || isSubmitting}
              className="rounded-full bg-sky-500 text-white disabled:bg-slate-700 disabled:text-slate-400 hover:bg-sky-400 text-sm font-semibold px-4 py-1.5 transition-colors"
            >
              {isSubmitting ? "Replying..." : "Reply"}
            </button>
          </div>
        </div>
      </form>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {showCancelModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-50">
            <h2 className="mb-2 text-lg font-semibold">Discard reply?</h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to cancel? Your current text will be lost.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={dismissCancel}
                className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1.5 hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="rounded-full bg-red-500 px-3 py-1.5 font-semibold text-white hover:bg-red-400 transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 transform rounded-full bg-slate-900/90 px-4 py-2 text-xs text-slate-50 shadow-lg dark:bg-slate-800/90">
          {toastMessage}
        </div>
      )}
    </section>
  );
}
