import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

beforeAll(() => {
  vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.endsWith("/auth/token")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "test-token",
            token_type: "bearer"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      );
    }

    if (url.endsWith("/feed")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            items: [],
            next_cursor: null
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      );
    }

    return Promise.resolve(new Response("Not Found", { status: 404 }));
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

async function loginFromLoginPage() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Username/i), "me");
  await user.type(screen.getByLabelText(/Password/i), "password");
  await user.click(screen.getByRole("button", { name: /Log in/i }));
}

describe("navigation flow & mock data", () => {
  it("shows an empty state when there are no tweets yet", async () => {
    renderApp("/login");
    await loginFromLoginPage();

    expect(
      screen.getByText(/No tweets yet/i)
    ).toBeInTheDocument();
  });
});
