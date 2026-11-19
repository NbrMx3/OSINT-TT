import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/appError";

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ status: "error", message: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ status: "error", code: error.code, message: error.message });
    return;
  }
  response.status(500).json({ status: "error", code: "INTERNAL_ERROR", message: "Internal server error" });
};
