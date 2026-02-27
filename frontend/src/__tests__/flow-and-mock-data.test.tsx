import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../auth/AuthContext";
import App from "../App";

function renderApp(initialPath = "/login") {
  return render(
    <AuthProvider inactivityTimeoutMs={10_000}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );
}

async function loginFromLoginPage() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Handle or Email/i), "me");
  await user.type(screen.getByLabelText(/Password/i), "password");
  await user.click(screen.getByRole("button", { name: /Log in/i }));
}

describe("navigation flow & mock data", () => {
  it("allows navigating from feed to another user's profile via tweet author", async () => {
    const user = userEvent.setup();
    renderApp("/login");

    await loginFromLoginPage();
    expect(screen.getByText(/Ship fast, read faster/i)).toBeInTheDocument();

    const authorLink = screen.getByRole("link", { name: /@fastapi_wiz/i });
    await user.click(authorLink);

    expect(screen.getByText(/Viewing profile/i)).toBeInTheDocument();
    expect(screen.getByText(/@fastapi_wiz/i)).toBeInTheDocument();
  });

  it("shows mock tweets in the feed for quick iteration", async () => {
    renderApp("/login");
    await loginFromLoginPage();

    expect(
      screen.getByText(/Ship fast, read faster. Building Bird-App 2.0 today./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Remember: indexes are your best friends when feeds get hot./i)
    ).toBeInTheDocument();
  });
});
