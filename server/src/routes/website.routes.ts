import { Router } from "express";
import rateLimit from "express-rate-limit";
import { history, investigate, result } from "../controllers/website.controller";
import { authorizePermissions, requireAuth } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
const websiteLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false,
  message: { status: "error", code: "WEBSITE_RATE_LIMITED", message: "Website collection rate limit reached. Try again shortly." },
});
router.use(websiteLimiter, requireAuth);
router.post("/intelligence", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), investigate);
router.get("/history", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), history);
router.get("/results/:id", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), result);
export default router;
