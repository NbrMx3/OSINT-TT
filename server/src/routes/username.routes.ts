import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RoleName } from "@prisma/client";
import { history, investigate, result } from "../controllers/username.controller";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { status: "error", code: "USERNAME_RATE_LIMITED", message: "Username intelligence rate limit reached. Try again shortly." } });
router.use(limiter, requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.post("/intelligence", investigate);
router.get("/history", history);
router.get("/results/:id", result);
export default router;
