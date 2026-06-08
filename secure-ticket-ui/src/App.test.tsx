import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";

let mockLogin = vi.fn();

vi.mock("./api", () => ({
  api: {
    health: () => Promise.resolve({ ok: true, data: { success: true, message: "ok" } }),
    login: (...args: unknown[]) => mockLogin(...args)
  }
}));

import { App } from "./App";

test("renders brand and title", async () => {
  render(<App />);

  expect(await screen.findByText("AegisCore")).toBeTruthy();
  expect(screen.getByText("Ticket Operations")).toBeTruthy();
});

test("shows API online and login updates session message", async () => {
  mockLogin.mockResolvedValue({ ok: true, data: { success: true, token: "dummy-token" } });

  render(<App />);

  expect(await screen.findByText("API Online")).toBeTruthy();

  await userEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(await screen.findByText("Analyst session active")).toBeTruthy();
});
