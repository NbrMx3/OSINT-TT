import type { NextFunction, Request, Response } from "express";
import { verifyDatabaseConnection } from "../config/database";

export async function getHealth(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await verifyDatabaseConnection();
    response.json({
      status: "ok",
      service: "osint-x-api",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
