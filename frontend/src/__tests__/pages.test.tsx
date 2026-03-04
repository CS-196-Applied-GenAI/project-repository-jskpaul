import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../auth/AuthContext";
import { AccountCreatePage } from "../pages/AccountCreatePage";
import { LoginPage } from "../pages/LoginPage";
import { NewPostPage } from "../pages/NewPostPage";
import { ReplyPostPage } from "../pages/ReplyPostPage";
import { RepliesPage } from "../pages/RepliesPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";

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

    expect(screen.getByText(/Viewing replies to tweet #456/i)).toBeInTheDocument();
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
});
