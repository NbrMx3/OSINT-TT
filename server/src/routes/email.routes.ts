import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RoleName } from "@prisma/client";
import { history, investigate, result } from "../controllers/email.controller";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false, message: { status: "error", code: "EMAIL_RATE_LIMITED", message: "Email intelligence rate limit reached. Try again shortly." } });
router.use(limiter, requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.post("/intelligence", investigate);
router.get("/history", history);
router.get("/results/:id", result);
export default router;
