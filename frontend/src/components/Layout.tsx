import { Link, NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-2">
            <span className="text-lg font-semibold">Bird-App 2.0</span>
          </Link>
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-2">
                <NavLink to="/home" className={navLinkClasses}>
                  Home
                </NavLink>
                {isAuthenticated && (
                  <>
                    <NavLink to="/post" className={navLinkClasses}>
                      New Post
                    </NavLink>
                    <NavLink to="/profile/me" className={navLinkClasses}>
                      My Profile
                    </NavLink>
                  </>
                )}
                {!isAuthenticated && (
                  <NavLink to="/login" className={navLinkClasses}>
                    Login
                  </NavLink>
                )}
              </nav>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-red-400/70 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                >
                  Logout
                </button>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 hover:dark:bg-slate-800 transition-colors"
                aria-label="Toggle light/dark mode"
              >
                {theme === "dark" ? "Dark" : "Light"}
              </button>
            </div>
        </div>
        </header>
        <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
