import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RoleName } from "@prisma/client";
import { history, investigate, result } from "../controllers/social.controller";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
const socialLimiter = rateLimit({
  // YouTube collection makes at most two list calls per request; keep daily quota usage bounded.
  windowMs: 60 * 1000, limit: 3, standardHeaders: "draft-8", legacyHeaders: false,
  message: { status: "error", code: "SOCIAL_RATE_LIMITED", message: "Social collection rate limit reached. Try again shortly." },
});
router.use(socialLimiter, requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.post("/intelligence", investigate);
router.get("/history", history);
router.get("/results/:id", result);
export default router;
