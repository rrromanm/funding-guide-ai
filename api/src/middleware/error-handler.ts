import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError, NotFoundError } from "../errors.ts";

// Runs when no route matched
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

// Express recognises an error handler by its 4 parameters — keep _next even though it's unused
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Malformed JSON body (thrown by express.json())
  if (err?.type === "entity.parse.failed") {
    res
      .status(400)
      .json({
        error: { code: "INVALID_JSON", message: "Malformed JSON body" },
      });
    return;
  }

  // Anything else is a bug: log the full error
  console.error("Unhandled error:", err);
  res
    .status(500)
    .json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
};
