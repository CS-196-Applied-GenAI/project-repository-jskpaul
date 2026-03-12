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
  retweeted_from_username?: string | null;
  retweeted_from_text?: string | null;
  retweeted_by_me?: boolean;
  like_count: number;
  liked_by_me: boolean;
  sentiment_label?: string | null;
  sentiment_score?: number | null;
};

export type FeedResponse = {
  items: Tweet[];
  next_cursor: Record<string, unknown> | null;
};

export type UserMinimal = {
  id: number;
  username: string;
  bio?: string | null;
  name?: string | null;
};

export type ProfileResponse = {
  user: UserMinimal;
  tweets: Tweet[];
  is_following: boolean;
  is_blocked_by_me?: boolean;
  has_blocked_me?: boolean;
};

export type Comment = {
  id: number;
  user_id: number;
  username: string;
  tweet_id: number;
  contents: string | null;
  created_at: string;
};

export type SentimentPreviewResponse = {
  sentiment_label: string | null;
  sentiment_score: number | null;
  sentiment_model: string | null;
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
  name: string;
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

export async function deleteTweet(tweetId: number, token: string): Promise<void> {
  const resp = await fetch(withBase(`/tweets/${tweetId}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to delete tweet");
  }
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

export async function updateMyProfile(
  params: { bio?: string | null; name?: string | null },
  token: string
): Promise<void> {
  const resp = await fetch(withBase("/users/me"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(params)
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to update profile");
  }
}

export async function blockUser(userId: number, token: string): Promise<void> {
  const resp = await fetch(withBase(`/users/${userId}/block`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to block user");
  }
}

export async function unblockUser(userId: number, token: string): Promise<void> {
  const resp = await fetch(withBase(`/users/${userId}/block`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to unblock user");
  }
}

export async function searchUsers(query: string): Promise<UserMinimal[]> {
  const params = new URLSearchParams();
  params.set("q", query);
  const resp = await fetch(withBase(`/users/search?${params.toString()}`));
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to search users");
  }
  return (await resp.json()) as UserMinimal[];
}

export async function likeTweet(tweetId: number, token: string): Promise<void> {
  const resp = await fetch(withBase(`/tweets/${tweetId}/like`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to like tweet");
  }
}

export async function unlikeTweet(tweetId: number, token: string): Promise<void> {
  const resp = await fetch(withBase(`/tweets/${tweetId}/like`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to unlike tweet");
  }
}

export async function listComments(tweetId: number, token: string): Promise<Comment[]> {
  const resp = await fetch(withBase(`/tweets/${tweetId}/comments`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to load comments");
  }
  return (await resp.json()) as Comment[];
}

export async function createComment(
  tweetId: number,
  contents: string,
  token: string
): Promise<Comment> {
  const resp = await fetch(withBase(`/tweets/${tweetId}/comments`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ contents })
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to create comment");
  }
  return (await resp.json()) as Comment;
}

export async function fetchTweet(tweetId: number, token: string): Promise<Tweet> {
  const resp = await fetch(withBase(`/tweets/${tweetId}`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to load tweet");
  }
  return (await resp.json()) as Tweet;
}

export async function previewSentiment(
  text: string,
  token: string
): Promise<SentimentPreviewResponse> {
  const resp = await fetch(withBase("/tweets/sentiment-preview"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to preview sentiment");
  }
  return (await resp.json()) as SentimentPreviewResponse;
}

export async function retweetTweet(tweetId: number, token: string): Promise<Tweet> {
  const resp = await fetch(withBase(`/tweets/${tweetId}/retweet`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(detail || "Failed to retweet");
  }
  return (await resp.json()) as Tweet;
}


