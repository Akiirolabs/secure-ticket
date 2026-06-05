import express from "express";
import request from "supertest";
import { logEvents } from "../logger";
import { errorMiddleware } from "../middleware/error.middleware";
import { AppError } from "./AppError";
import { controllerHandler } from "./asyncHandler";

const buildApp = () => {
  const app = express();

  app.use((req, res, next) => {
    req.requestId = "req_test";
    req.user = {
      id: "user_123",
      email: "user@example.com",
      role: "ANALYST"
    };
    next();
  });

  app.get(
    "/success",
    controllerHandler("TEST_SUCCESS", (_req, res) => {
      res.status(200).json({ success: true });
    })
  );

  app.get(
    "/failure",
    controllerHandler("TEST_FAILURE", async () => {
      throw new AppError("Controller exploded", 500);
    })
  );

  app.use(errorMiddleware);

  return app;
};

describe("controllerHandler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs controller start and success", async () => {
    const startedSpy = jest
      .spyOn(logEvents, "controllerStarted")
      .mockImplementation();
    const succeededSpy = jest
      .spyOn(logEvents, "controllerSucceeded")
      .mockImplementation();

    const response = await request(buildApp()).get("/success");

    expect(response.status).toBe(200);
    expect(startedSpy).toHaveBeenCalledWith(
      "req_test",
      "TEST_SUCCESS",
      "user_123",
      { method: "GET", path: "/success" }
    );
    expect(succeededSpy).toHaveBeenCalledWith(
      "req_test",
      "TEST_SUCCESS",
      expect.any(Number),
      "user_123",
      { statusCode: 200 }
    );
  });

  it("logs controller failures before error middleware returns JSON", async () => {
    const failedSpy = jest
      .spyOn(logEvents, "controllerFailed")
      .mockImplementation();

    const response = await request(buildApp()).get("/failure");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Controller exploded",
      requestId: "req_test"
    });
    expect(failedSpy).toHaveBeenCalledWith(
      "req_test",
      "TEST_FAILURE",
      expect.any(Number),
      expect.any(AppError),
      "user_123"
    );
  });
});
