import { Router } from "express";
import rateLimit from "express-rate-limit";
import { history, investigate, result } from "../controllers/username.controller";
import { authorizePermissions, requireAuth } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { status: "error", code: "USERNAME_RATE_LIMITED", message: "Username intelligence rate limit reached. Try again shortly." } });
router.use(limiter, requireAuth);
router.post("/intelligence", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), investigate);
router.get("/history", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), history);
router.get("/results/:id", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), result);
export default router;
