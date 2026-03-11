import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createTweet } from "../api/client";

export function NewPostPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const charsRemaining = 280 - text.length;
  const isTooLong = charsRemaining < 0;

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isTooLong || text.trim().length === 0 || !user) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createTweet(text.trim(), user.token);
      setText("");
      setToastMessage("Post published successfully.");
      setTimeout(() => {
        navigate("/home");
      }, 800);
    } catch (err) {
      setError("Failed to post. Try again.");
      setToastMessage("Failed to publish post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (!text.trim()) {
      navigate("/home");
      return;
    }
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    setShowCancelModal(false);
    setText("");
    navigate("/home");
  };

  const dismissCancel = () => {
    setShowCancelModal(false);
  };

  return (
    <section className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Compose new post</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          className="w-full min-h-[160px] rounded-xl bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-vertical"
          maxLength={320}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
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
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </form>
      {showCancelModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-50">
            <h2 className="mb-2 text-lg font-semibold">Discard post?</h2>
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
