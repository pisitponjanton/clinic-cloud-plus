import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { LoginForm } from "@/components/auth/login-form";
import {
  SIGNUP_NOTICE,
  SignupForm,
} from "@/components/auth/signup-form";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

describe("public auth screens", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.restoreAllMocks();
  });

  it("renders a concise landing page with clear public entry points", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /ทดลอง workflow คลินิก/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Sign in with Demo Account" }),
    ).toHaveAttribute("href", "/login");

    expect(
      screen.getByRole("link", { name: "View Signup demo" }),
    ).toHaveAttribute("href", "/signup");

    expect(screen.getByText("Synthetic / mock only")).toBeInTheDocument();
  });

  it("prefills a selected demo account and the shared demo password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /OWNER/ }));

    expect(screen.getByLabelText(/^Email/)).toHaveValue(
      "owner@cliniccloud.demo",
    );
    expect(screen.getByLabelText(/^Password/)).toHaveValue("12345678");
  });

  it("shows inline validation without calling the login API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("กรุณากรอกอีเมล")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกรหัสผ่าน")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits credentials to the Web auth API and navigates after success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          user: {
            id: "USR-STAFF-001",
            role: "STAFF",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /STAFF/ }));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      email: "staff@cliniccloud.demo",
      password: "12345678",
    });
  });

  it("shows the API error and preserves entered credentials", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm />);

    await user.type(
      screen.getByLabelText(/^Email/),
      "owner@cliniccloud.demo",
    );
    await user.type(screen.getByLabelText(/^Password/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveValue(
      "owner@cliniccloud.demo",
    );
    expect(screen.getByLabelText(/^Password/)).toHaveValue("wrong-password");
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps signup demo-only and displays the exact MVP notice", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/^Display name/), "Demo User");
    await user.type(
      screen.getByLabelText(/^Email/),
      "new-user@cliniccloud.demo",
    );
    await user.type(screen.getByLabelText(/^Password/), "example-password");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText(SIGNUP_NOTICE)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/account (created|registered)/i),
    ).not.toBeInTheDocument();
  });
});
