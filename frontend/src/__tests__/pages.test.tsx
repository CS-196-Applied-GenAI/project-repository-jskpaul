import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../auth/AuthContext";
import { AccountCreatePage } from "../pages/AccountCreatePage";
import { AccountCreatedPage } from "../pages/AccountCreatedPage";
import { LoginPage } from "../pages/LoginPage";
import { NewPostPage } from "../pages/NewPostPage";
import { ReplyPostPage } from "../pages/ReplyPostPage";
import { RepliesPage } from "../pages/RepliesPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ProfileSettingsPage } from "../pages/ProfileSettingsPage";
import { SearchResultsPage } from "../pages/SearchResultsPage";

function renderWithAuth(ui: React.ReactElement, initialPath = "/") {
  return render(
    <AuthProvider inactivityTimeoutMs={10_000}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </AuthProvider>
  );
}

describe("page components render basic content", () => {
  it("renders account creation form and accepts input", async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/" element={<AccountCreatePage />} />
      </Routes>
    );

    await user.type(screen.getByLabelText(/Handle/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/Password/i), "password123");

    expect(screen.getByRole("button", { name: /Create account/i })).toBeInTheDocument();
  });

  it("renders login page and can fill form", async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/" element={<LoginPage />} />
      </Routes>
    );

    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Password/i), "password123");

    expect(screen.getByRole("button", { name: /Log in/i })).toBeInTheDocument();
  });

  it("renders new post page and updates character counter", async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/" element={<NewPostPage />} />
      </Routes>
    );

    const textarea = screen.getByPlaceholderText(/What's happening\?/i);
    await user.type(textarea, "hello world");

    expect(screen.getByText(/characters left/i)).toBeInTheDocument();
  });

  it("renders reply page with tweet id", () => {
    renderWithAuth(
      <Routes>
        <Route path="/post/:tweetId/reply" element={<ReplyPostPage />} />
      </Routes>,
      "/post/123/reply"
    );

    expect(screen.getByText(/Replying to tweet #123/i)).toBeInTheDocument();
  });

  it("renders replies page with tweet id", () => {
    renderWithAuth(
      <Routes>
        <Route path="/tweet/:tweetId/replies" element={<RepliesPage />} />
      </Routes>,
      "/tweet/456/replies"
    );

    expect(
      screen.getByText(/Viewing replies to this tweet/i)
    ).toBeInTheDocument();
  });

  it("renders not found page with navigation links", () => {
    renderWithAuth(<NotFoundPage />);

    expect(screen.getByText(/We couldn't find that page/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Home/i })).toBeInTheDocument();
  });

  it("renders profile page shell even when profile fails", () => {
    renderWithAuth(
      <Routes>
        <Route path="/profile/:handle" element={<ProfilePage />} />
      </Routes>,
      "/profile/unknownuser"
    );

    expect(screen.getByText(/Viewing profile/i)).toBeInTheDocument();
  });

  it("renders account created page and Go to login button", () => {
    renderWithAuth(
      <Routes>
        <Route path="/register/success" element={<AccountCreatedPage />} />
      </Routes>,
      "/register/success"
    );
    expect(screen.getByRole("heading", { name: /Account created/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to login/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to your feed/i })).toBeInTheDocument();
  });

  it("renders account created page with username when passed in state", () => {
    render(
      <AuthProvider inactivityTimeoutMs={10_000}>
        <MemoryRouter
          initialEntries={[{ pathname: "/register/success", state: { username: "alice" } }]}
        >
          <Routes>
            <Route path="/register/success" element={<AccountCreatedPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByText(/@alice/)).toBeInTheDocument();
  });

  it("navigates to login when Go to login is clicked on account created page", async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/register/success" element={<AccountCreatedPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      "/register/success"
    );
    await user.click(screen.getByRole("button", { name: /Go to login/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    });
  });
});

describe("ProfileSettingsPage and SearchResultsPage with mocks", () => {
  beforeAll(() => {
    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/users/") && !url.includes("/search")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              user: { id: 1, username: "alice", name: "Alice", bio: "" },
              tweets: [],
              is_following: false
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      if (url.includes("/users/search")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: 1, username: "alice" }]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("renders profile settings when authenticated", async () => {
    const auth = { username: "alice", token: "test-token" };
    window.localStorage.setItem("bird-app-auth", JSON.stringify(auth));
    render(
      <AuthProvider inactivityTimeoutMs={10_000}>
        <MemoryRouter initialEntries={["/settings/profile"]}>
          <Routes>
            <Route path="/settings/profile" element={<ProfileSettingsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profile settings/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
    window.localStorage.removeItem("bird-app-auth");
  });

  it("renders search results page with empty query", () => {
    renderWithAuth(
      <Routes>
        <Route path="/search" element={<SearchResultsPage />} />
      </Routes>,
      "/search"
    );
    expect(screen.getByText(/Type a handle in the search box/i)).toBeInTheDocument();
  });

  it("renders search results page with query and results", async () => {
    renderWithAuth(
      <Routes>
        <Route path="/search" element={<SearchResultsPage />} />
      </Routes>,
      "/search?q=alice"
    );
    await waitFor(() => {
      expect(
        screen.getByText((_, el) => el?.textContent === "Results for @alice")
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /@alice/i })).toBeInTheDocument();
  });
});
