import { Router } from "express";
import rateLimit from "express-rate-limit";
import { history, investigate, result } from "../controllers/social.controller";
import { authorizePermissions, requireAuth } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
const socialLimiter = rateLimit({
  // YouTube collection makes at most two list calls per request; keep daily quota usage bounded.
  windowMs: 60 * 1000, limit: 3, standardHeaders: "draft-8", legacyHeaders: false,
  message: { status: "error", code: "SOCIAL_RATE_LIMITED", message: "Social collection rate limit reached. Try again shortly." },
});
router.use(socialLimiter, requireAuth);
router.post("/intelligence", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), investigate);
router.get("/history", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), history);
router.get("/results/:id", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), result);
export default router;
