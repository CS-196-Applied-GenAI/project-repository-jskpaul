import { describe, expect, it, vi, afterEach } from "vitest";
import {
  loginRequest,
  registerRequest,
  fetchFeed,
  createTweet,
  fetchProfile,
  type FeedResponse,
  type Tweet,
  type ProfileResponse
} from "../api/client";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetchOnce(body: unknown, ok = true, init?: Partial<ResponseInit>) {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
      ...init
    })
  ) as unknown as typeof fetch;
}

describe("api client helpers", () => {
  it("loginRequest posts form data to /auth/token", async () => {
    const tokenBody = { access_token: "test-token", token_type: "bearer" };
    mockFetchOnce(tokenBody);

    const result = await loginRequest("alice", "password123");

    expect(result).toEqual(tokenBody);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/token$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("registerRequest sends JSON to /auth/register", async () => {
    mockFetchOnce({}, true);

    await registerRequest({ username: "alice", email: "a@example.com", password: "password123" });

    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/register$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("fetchFeed returns parsed items", async () => {
    const feed: FeedResponse = {
      items: [
        {
          id: 1,
          text: "hello",
          created_at: new Date().toISOString(),
          user_id: 1,
          username: "alice",
          retweeted_from: null,
          like_count: 0,
          liked_by_me: false
        }
      ],
      next_cursor: null
    };
    mockFetchOnce(feed);

    const result = await fetchFeed("token");
    expect(result.items).toHaveLength(1);
  });

  it("createTweet posts to /tweets and returns a tweet", async () => {
    const tweet: Tweet = {
      id: 1,
      text: "hello",
      created_at: new Date().toISOString(),
      user_id: 1,
      username: "alice",
      retweeted_from: null,
      like_count: 0,
      liked_by_me: false
    };
    mockFetchOnce(tweet);

    const result = await createTweet("hello", "token");
    expect(result.text).toBe("hello");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/tweets$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("fetchProfile calls /users/:username and returns profile", async () => {
    const profile: ProfileResponse = {
      user: { id: 1, username: "alice" },
      tweets: [],
      is_following: false
    };
    mockFetchOnce(profile);

    const result = await fetchProfile("alice", null);
    expect(result.user.username).toBe("alice");
    const [url] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/users\/alice$/);
  });
});
