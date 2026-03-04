import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchProfile, followUser, unfollowUser, type ProfileResponse } from "../api/client";

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

  const canFollow = !isYou && !!profileUser && !!user;

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

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isYou ? "Your profile" : "Viewing profile"}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            @{profileUser?.username ?? username}
          </h1>
          {canFollow && profile && profileUser && (
            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={isTogglingFollow}
              className="rounded-full border border-sky-500 text-xs font-semibold px-3 py-1 text-sky-500 hover:bg-sky-500 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {profile.is_following ? (isTogglingFollow ? "Unfollowing..." : "Unfollow") : isTogglingFollow ? "Following..." : "Follow"}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      </header>
      {isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Loading profile…</p>}
      {!isLoading && !error && !profileUser && (
        <p className="text-sm text-slate-600 dark:text-slate-400">Profile data is unavailable.</p>
      )}
      {!isLoading && profile && profileUser && (
        <>
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
                    <p className="text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm">{t.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
