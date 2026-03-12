import { Link, NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

type LayoutProps = {
  children: ReactNode;
};

const navLinkClasses =
  "px-3 py-1 rounded-full text-sm font-medium hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "bird-app-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function Layout({ children }: LayoutProps) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [searchHandle, setSearchHandle] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        event.target instanceof Node &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    setProfileMenuOpen(false);
  };

  const handleSearchSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const trimmed = searchHandle.trim();
    if (!trimmed) return;
    const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
    setSearchHandle("");
    navigate(`/search?q=${encodeURIComponent(handle)}`);
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen flex flex-col bg-sunset text-ink dark:bg-sunsetDark dark:text-[#F5F3FF]">
        <header className="border-b border-black/10 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-2">
            <span className="text-lg font-semibold">Chirper</span>
          </Link>
            <div className="flex items-center gap-3">
              {isAuthenticated && user && (
                <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
                  Signed in as <span className="font-semibold">@{user.username}</span>
                </span>
              )}
              <nav className="flex items-center gap-2">
                {!isAuthenticated && (
                  <NavLink to="/login" className={navLinkClasses}>
                    Login
                  </NavLink>
                )}
              </nav>
              {isAuthenticated && (
                <form
                  onSubmit={handleSearchSubmit}
                  className="hidden sm:flex items-center gap-2 text-xs"
                  aria-label="Search users by handle"
                >
                  <span className="text-slate-500 dark:text-slate-400">@</span>
                  <input
                    value={searchHandle}
                    onChange={(e) => setSearchHandle(e.target.value)}
                    placeholder="handle"
                    className="w-28 rounded-full bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-accent/70"
                  />
                </form>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
                aria-label="Toggle light/dark mode"
              >
                {theme === "dark" ? "☾" : "☀"}
              </button>
              {isAuthenticated && user && (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((open) => !open)}
                    className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm border border-white/40 bg-gradient-to-r from-accent to-[#FF7A5A] hover:from-[#FF7A94] hover:to-[#FF9A7A] transition-[filter,background-image] active:brightness-95 focus:outline-none focus:ring-2 focus:ring-accent/60 dark:border-white/10 dark:bg-gradient-to-r dark:from-[#FF5A7A] dark:to-[#A78BFA] dark:hover:from-[#FF7A5A] dark:hover:to-[#C4B5FD]"
                  >
                    My Profile ▾
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-black/10 bg-white/85 py-1 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate(`/profile/${user.username}`);
                        }}
                        className="block w-full px-3 py-2 text-left font-medium text-ink hover:bg-gradient-to-r hover:from-[#FFF7ED] hover:to-[#F5F3FF] dark:text-[#F5F3FF] dark:hover:bg-gradient-to-r dark:hover:from-[#1A1024] dark:hover:to-[#0F1A2A]"
                      >
                        View profile
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full px-3 py-2 text-left font-medium text-accent hover:bg-gradient-to-r hover:from-[#FFF7ED] hover:to-[#F5F3FF] dark:text-[#FF7A94] dark:hover:bg-gradient-to-r dark:hover:from-[#1A1024] dark:hover:to-[#0F1A2A]"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
        </header>
        <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-6">{children}</main>
        {isAuthenticated && (
          <Link
            to="/post"
            className="fixed bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-accent to-[#FF7A5A] text-white shadow-lg hover:bg-gradient-to-r hover:from-[#FF7A94] hover:to-[#FF9A7A] active:brightness-95 focus:outline-none focus:ring-2 focus:ring-accent/60"
            aria-label="Compose new post"
          >
            +
          </Link>
        )}
      </div>
    </div>
  );
}
