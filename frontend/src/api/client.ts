export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type Tweet = {
  id: number;
  text: string | null;
  created_at: string;
  user_id: number;
  username: string;
  retweeted_from: number | null;
  like_count: number;
  liked_by_me: boolean;
};

export type FeedResponse = {
  items: Tweet[];
  next_cursor: Record<string, unknown> | null;
};

export type UserMinimal = {
  id: number;
  username: string;
};

export type ProfileResponse = {
  user: UserMinimal;
  tweets: Tweet[];
  is_following: boolean;
};

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";

function withBase(path: string): string {
  return `${API_BASE_URL.replace(/\/+$/, "")}${path}`;
}

export async function loginRequest(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const resp = await fetch(withBase("/auth/token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!resp.ok) {
    throw new Error("Invalid credentials");
  }

  return (await resp.json()) as TokenResponse;
}

export async function registerRequest(params: {
  username: string;
  email: string;
  password: string;
}): Promise<void> {
  const resp = await fetch(withBase("/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Registration failed");
  }
}

export async function fetchFeed(token: string): Promise<FeedResponse> {
  const resp = await fetch(withBase("/feed"), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const error = new Error("Failed to load feed") as Error & { status?: number };
    error.status = resp.status;
    throw error;
  }
  return (await resp.json()) as FeedResponse;
}

export async function createTweet(text: string, token: string): Promise<Tweet> {
  const resp = await fetch(withBase("/tweets"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to create tweet");
  }
  return (await resp.json()) as Tweet;
}

export async function fetchProfile(
  username: string,
  token: string | null
): Promise<ProfileResponse> {
  const resp = await fetch(withBase(`/users/${encodeURIComponent(username)}`), {
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined
  });
  if (!resp.ok) {
    throw new Error("Failed to load profile");
  }
  return (await resp.json()) as ProfileResponse;
}

export async function followUser(userId: number, token: string): Promise<void> {
  const resp = await fetch(withBase(`/users/${userId}/follow`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to follow user");
  }
}

export async function unfollowUser(userId: number, token: string): Promise<void> {
  const resp = await fetch(withBase(`/users/${userId}/follow`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to unfollow user");
  }
}


