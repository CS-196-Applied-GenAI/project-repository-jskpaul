import { describe, expect, it, vi, afterEach } from "vitest";
import {
  loginRequest,
  registerRequest,
  fetchFeed,
  createTweet,
  deleteTweet,
  fetchProfile,
  updateMyProfile,
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  searchUsers,
  likeTweet,
  unlikeTweet,
  listComments,
  createComment,
  fetchTweet,
  previewSentiment,
  retweetTweet,
  unretweetTweet,
  type FeedResponse,
  type Tweet,
  type ProfileResponse,
  type Comment,
  type SentimentPreviewResponse
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

  it("deleteTweet sends DELETE to /tweets/:id", async () => {
    mockFetchOnce(undefined);
    await deleteTweet(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/tweets\/1$/);
    expect((options as RequestInit).method).toBe("DELETE");
  });

  it("searchUsers returns users from /users/search", async () => {
    mockFetchOnce([{ id: 1, username: "alice" }]);
    const result = await searchUsers("alice");
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("alice");
    const [url] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toContain("/users/search");
  });

  it("likeTweet posts to /tweets/:id/like", async () => {
    mockFetchOnce(undefined);
    await likeTweet(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/tweets\/1\/like$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("unlikeTweet deletes /tweets/:id/like", async () => {
    mockFetchOnce(undefined);
    await unlikeTweet(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/tweets\/1\/like$/);
    expect((options as RequestInit).method).toBe("DELETE");
  });

  it("listComments returns comments from /tweets/:id/comments", async () => {
    const comments: Comment[] = [
      {
        id: 1,
        user_id: 1,
        username: "bob",
        tweet_id: 1,
        contents: "hello",
        created_at: new Date().toISOString()
      }
    ];
    mockFetchOnce(comments);
    const result = await listComments(1, "token");
    expect(result).toHaveLength(1);
    expect(result[0].contents).toBe("hello");
  });

  it("createComment posts to /tweets/:id/comments", async () => {
    const comment: Comment = {
      id: 1,
      user_id: 1,
      username: "alice",
      tweet_id: 1,
      contents: "reply",
      created_at: new Date().toISOString()
    };
    mockFetchOnce(comment);
    const result = await createComment(1, "reply", "token");
    expect(result.contents).toBe("reply");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/tweets\/1\/comments$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("fetchTweet returns tweet from /tweets/:id", async () => {
    const tweet: Tweet = {
      id: 1,
      text: "hi",
      created_at: new Date().toISOString(),
      user_id: 1,
      username: "alice",
      retweeted_from: null,
      like_count: 0,
      liked_by_me: false
    };
    mockFetchOnce(tweet);
    const result = await fetchTweet(1, "token");
    expect(result.text).toBe("hi");
  });

  it("previewSentiment posts to /tweets/sentiment-preview", async () => {
    const sentiment: SentimentPreviewResponse = {
      sentiment_label: "positive",
      sentiment_score: 0.9,
      sentiment_model: "test"
    };
    mockFetchOnce(sentiment);
    const result = await previewSentiment("hello", "token");
    expect(result.sentiment_label).toBe("positive");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/sentiment-preview/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("retweetTweet posts to /tweets/:id/retweet", async () => {
    const tweet: Tweet = {
      id: 2,
      text: "hi",
      created_at: new Date().toISOString(),
      user_id: 1,
      username: "alice",
      retweeted_from: 1,
      like_count: 0,
      liked_by_me: false
    };
    mockFetchOnce(tweet);
    const result = await retweetTweet(1, "token");
    expect(result.retweeted_from).toBe(1);
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/tweets\/1\/retweet$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("unretweetTweet deletes /tweets/:id/retweet", async () => {
    mockFetchOnce(undefined);
    await unretweetTweet(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/tweets\/1\/retweet$/);
    expect((options as RequestInit).method).toBe("DELETE");
  });

  it("updateMyProfile puts to /users/me", async () => {
    mockFetchOnce({
      id: 1,
      username: "alice",
      created_at: new Date().toISOString(),
      email: null,
      bio: "Hi",
      profile_picture: null,
      name: "Alice"
    });
    const result = await updateMyProfile({ bio: "Hi" }, "token");
    expect(result.username).toBe("alice");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/users\/me$/);
    expect((options as RequestInit).method).toBe("PUT");
  });

  it("followUser posts to /users/:id/follow", async () => {
    mockFetchOnce(undefined);
    await followUser(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/users\/1\/follow$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("unfollowUser deletes /users/:id/follow", async () => {
    mockFetchOnce(undefined);
    await unfollowUser(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/users\/1\/follow$/);
    expect((options as RequestInit).method).toBe("DELETE");
  });

  it("blockUser posts to /users/:id/block", async () => {
    mockFetchOnce(undefined);
    await blockUser(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/users\/1\/block$/);
    expect((options as RequestInit).method).toBe("POST");
  });

  it("unblockUser deletes /users/:id/block", async () => {
    mockFetchOnce(undefined);
    await unblockUser(1, "token");
    const [url, options] = (global.fetch as vi.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/users\/1\/block$/);
    expect((options as RequestInit).method).toBe("DELETE");
  });
});
