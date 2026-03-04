import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

export type AuthUser = {
  username: string;
  token: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  /** Inactivity timeout in milliseconds. Defaults to 10 minutes. */
  inactivityTimeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const STORAGE_KEY = "bird-app-auth";

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && typeof parsed.username === "string" && typeof parsed.token === "string") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function AuthProvider({ children, inactivityTimeoutMs = DEFAULT_TIMEOUT_MS }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const timeoutIdRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  };

  const scheduleTimeout = useCallback(() => {
    clearTimer();
    if (!user) return;
    timeoutIdRef.current = window.setTimeout(() => {
      setUser(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }, inactivityTimeoutMs);
  }, [user, inactivityTimeoutMs]);

  const login = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!user) {
      clearTimer();
      return;
    }

    scheduleTimeout();

    const reset = () => scheduleTimeout();

    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("click", reset);
    window.addEventListener("scroll", reset);

    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("click", reset);
      window.removeEventListener("scroll", reset);
      clearTimer();
    };
  }, [user, scheduleTimeout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

