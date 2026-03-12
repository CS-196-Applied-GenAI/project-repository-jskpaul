import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  blockUser,
  deleteTweet,
  fetchProfile,
  followUser,
  unfollowUser,
  unblockUser,
  updateMyProfile,
  type ProfileResponse
} from "../api/client";

export function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();

  let username = handle ?? user?.username ?? null;
  if (username === "me" && user?.username) {
    username = user.username;
  }

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!username) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchProfile(username, user?.token ?? null);
        if (!cancelled) {
          setProfile(data);
          setDraftName(data.user.name ?? "");
          setDraftBio(data.user.bio ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load profile.");
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
  }, [username, user]);

  const isYou = user != null && username === user.username;
  const profileUser = profile?.user;

  const canFollow = !isYou && !!profileUser && !!user && !profile?.is_blocked_by_me && !profile?.has_blocked_me;
  const canBlock = !isYou && !!profileUser && !!user;

  const handleToggleFollow = async () => {
    if (!user || !profileUser || isTogglingFollow) return;
    setIsTogglingFollow(true);
    setError(null);
    try {
      if (profile?.is_following) {
        await unfollowUser(profileUser.id, user.token);
        setProfile({ ...profile, is_following: false });
      } else {
        await followUser(profileUser.id, user.token);
        setProfile({ ...profile!, is_following: true });
      }
    } catch (err) {
      setError("Failed to update follow status.");
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!user || !profileUser || !profile || isTogglingBlock) return;
    setIsTogglingBlock(true);
    setError(null);
    try {
      if (profile.is_blocked_by_me) {
        await unblockUser(profileUser.id, user.token);
        setProfile({ ...profile, is_blocked_by_me: false });
      } else {
        await blockUser(profileUser.id, user.token);
        // When blocking a user, we also consider them not followed anymore in the local view.
        setProfile({ ...profile, is_blocked_by_me: true, is_following: false });
      }
    } catch (err) {
      setError("Failed to update block status.");
    } finally {
      setIsTogglingBlock(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isYou ? "Your profile" : "Viewing profile"}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">@{profileUser?.username ?? username}</h1>
          {profile && profileUser && (
            <div className="flex items-center gap-2">
              {canFollow && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isTogglingFollow}
                  className="rounded-full border border-accent/70 text-xs font-semibold px-3 py-1 text-accent bg-white/80 hover:bg-gradient-to-r hover:from-accent hover:to-[#FF7A5A] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-[color,background-image,filter]"
                >
                  {profile.is_following
                    ? isTogglingFollow
                      ? "Unfollowing..."
                      : "Unfollow"
                    : isTogglingFollow
                    ? "Following..."
                    : "Follow"}
                </button>
              )}
              {canBlock && (
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  disabled={isTogglingBlock}
                  className="rounded-full border border-red-400 text-xs font-semibold px-3 py-1 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {profile.is_blocked_by_me
                    ? isTogglingBlock
                      ? "Unblocking..."
                      : "Unblock"
                    : isTogglingBlock
                    ? "Blocking..."
                    : "Block"}
                </button>
              )}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      </header>
      {isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Loading profile…</p>}
      {!isLoading && !error && !profileUser && (
        <p className="text-sm text-slate-600 dark:text-slate-400">Profile data is unavailable.</p>
      )}
      {deleteError && <p className="text-sm text-red-500 dark:text-red-400">{deleteError}</p>}
      {!isLoading && profile && profileUser && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {isEditingProfile ? (
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">
                      Name
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        maxLength={100}
                        className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
                      />
                    </label>
                    <label className="block text-xs text-slate-600 dark:text-slate-400">
                      Bio
                      <textarea
                        value={draftBio}
                        onChange={(e) => setDraftBio(e.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70 resize-vertical"
                        placeholder="Write a short bio…"
                      />
                    </label>
                    {profileSaveError && (
                      <p className="text-xs text-red-500 dark:text-red-400">{profileSaveError}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSavingProfile}
                        onClick={async () => {
                          if (!user || !profile) return;
                          setProfileSaveError(null);
                          setIsSavingProfile(true);
                          try {
                            await updateMyProfile(
                              { name: draftName.trim() || null, bio: draftBio.trim() || null },
                              user.token
                            );
                            setProfile({
                              ...profile,
                              user: { ...profile.user, name: draftName.trim() || null, bio: draftBio.trim() || null }
                            });
                            setIsEditingProfile(false);
                          } catch (e) {
                            setProfileSaveError("Failed to save profile.");
                          } finally {
                            setIsSavingProfile(false);
                          }
                        }}
                        className="rounded-full bg-gradient-to-r from-accent to-[#FF7A5A] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-[#FF7A94] hover:to-[#FF9A7A] disabled:opacity-60 disabled:shadow-none transition-[filter,background-image,opacity]"
                      >
                        {isSavingProfile ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingProfile}
                        onClick={() => {
                          setDraftName(profile.user.name ?? "");
                          setDraftBio(profile.user.bio ?? "");
                          setProfileSaveError(null);
                          setIsEditingProfile(false);
                        }}
                        className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {profileUser.name && (
                      <p className="text-base font-semibold leading-tight truncate">{profileUser.name}</p>
                    )}
                    {profileUser.bio ? (
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {profileUser.bio}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No bio yet.</p>
                    )}
                  </>
                )}
              </div>
              {isYou && !isEditingProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(profile.user.name ?? "");
                    setDraftBio(profile.user.bio ?? "");
                    setProfileSaveError(null);
                    setIsEditingProfile(true);
                  }}
                  className="shrink-0 rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs font-medium hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300">
            <p className="mb-2">
              Tweets by @{profileUser.username} ({profile.tweets.length} total in this page):
            </p>
            {profile.tweets.length === 0 ? (
              <p>No tweets yet.</p>
            ) : (
              <ul className="space-y-2">
                {profile.tweets.map((t) => (
                  <li key={t.id} className="border border-slate-700 rounded-lg px-3 py-2">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs text-slate-500">
                          {new Date(t.created_at).toLocaleString()}
                        </p>
                        <Link
                          to={`/tweet/${t.id}/replies`}
                          className="text-[11px] text-accent2 hover:underline"
                        >
                          View replies
                        </Link>
                      </div>
                      {isYou && user && (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(t.id)}
                          className="rounded-full border border-red-400 px-2 py-0.5 text-xs text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {t.retweeted_from && t.retweeted_from_username && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Retweeted from{" "}
                        <Link to={`/profile/${t.retweeted_from_username}`} className="font-semibold hover:underline">
                          @{t.retweeted_from_username}
                        </Link>
                      </p>
                    )}
                    <p className="text-sm mb-1">{t.text ?? t.retweeted_from_text ?? ""}</p>
                    {typeof t.sentiment_label === "string" && t.sentiment_label && (
                      <span
                        className={
                          t.sentiment_label === "positive"
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : t.sentiment_label === "negative"
                            ? "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                            : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }
                      >
                        {t.sentiment_label.charAt(0).toUpperCase() + t.sentiment_label.slice(1)}
                        {typeof t.sentiment_score === "number" && !Number.isNaN(t.sentiment_score) && (
                          <span className="ml-1 opacity-80">
                            ({t.sentiment_score.toFixed(2)})
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {pendingDeleteId !== null && isYou && user && (
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
                      if (pendingDeleteId === null || !profile) return;
                      setDeleteError(null);
                      try {
                        await deleteTweet(pendingDeleteId, user.token);
                        setProfile({
                          ...profile,
                          tweets: profile.tweets.filter((pt) => pt.id !== pendingDeleteId)
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
        </>
      )}
    </section>
  );
}
