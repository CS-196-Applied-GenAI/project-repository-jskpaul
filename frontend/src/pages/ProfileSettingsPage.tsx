import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchProfile, updateMyProfile } from "../api/client";

export function ProfileSettingsPage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [handle, setHandle] = useState(user?.username ?? "");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const profile = await fetchProfile(user.username, user.token);
        if (!cancelled) {
          setHandle(profile.user.username);
          setName(profile.user.name ?? "");
          setBio(profile.user.bio ?? "");
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load profile settings.");
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

  if (!user) {
    return null;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const trimmedHandle = handle.trim();
      const trimmedName = name.trim();
      const trimmedBio = bio.trim();
      const updated = await updateMyProfile(
        {
          username: trimmedHandle || null,
          name: trimmedName || null,
          bio: trimmedBio || null
        },
        user.token
      );
      login({ username: updated.username, token: user.token });
      setSuccess("Profile updated successfully.");
      navigate(`/profile/${updated.username}`);
    } catch (e) {
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <section className="max-w-lg mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Profile settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Update your public profile details and account handle.
        </p>
      </header>
      {isLoading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading your settings…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/70">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              Handle
              <div className="mt-1 flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="flex-1 rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
                  placeholder="handle"
                  required
                />
              </div>
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
                placeholder="Your name"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70 resize-vertical"
                placeholder="Write a short bio…"
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-600 dark:text-emerald-400">{success}</p>}
          <div className="flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-1.5 font-medium hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-gradient-to-r from-accent to-[#FF7A5A] px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-[#FF7A94] hover:to-[#FF9A7A] disabled:opacity-60 disabled:shadow-none transition-[filter,background-image,opacity]"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        <h2 className="mb-1 text-sm font-semibold">Sign out</h2>
        <p className="mb-3 text-[11px] text-red-700/80 dark:text-red-200/80">
          Log out of this account on this device. You can always log back in later.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-red-400 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500 hover:text-white transition-colors dark:border-red-500"
        >
          Logout
        </button>
      </div>
    </section>
  );
}

