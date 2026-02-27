export type MockTweet = {
  id: string;
  authorHandle: string;
  createdAt: string;
  text: string;
};

export type MockUser = {
  handle: string;
  bio: string;
  following: string[];
};

export const mockUsers: MockUser[] = [
  {
    handle: "me",
    bio: "This is your profile. Soon this will come from the backend.",
    following: ["fastapi_wiz", "db_tuner"]
  },
  {
    handle: "fastapi_wiz",
    bio: "Async all the things. Building fast feeds with FastAPI.",
    following: ["db_tuner"]
  },
  {
    handle: "db_tuner",
    bio: "Optimizing indexes for hot timelines.",
    following: ["fastapi_wiz"]
  }
];

export const mockFeedTweets: MockTweet[] = [
  {
    id: "1",
    authorHandle: "fastapi_wiz",
    createdAt: "2m ago",
    text: "Ship fast, read faster. Building Bird-App 2.0 today."
  },
  {
    id: "2",
    authorHandle: "db_tuner",
    createdAt: "10m ago",
    text: "Remember: indexes are your best friends when feeds get hot."
  }
];

