import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, test, expect } from "vitest";

vi.mock("./api", () => ({
  api: {
    health: () => Promise.resolve({ ok: true, data: { success: true, message: "ok" } }),
    login: vi.fn()
  }
}));

import { App } from "./App";

test("renders brand and title", async () => {
  render(<App />);

  // App renders brand and page title (smoke checks)
  expect(await screen.findByText("AegisCore")).toBeTruthy();
  expect(screen.getByText("Ticket Operations")).toBeTruthy();
});
