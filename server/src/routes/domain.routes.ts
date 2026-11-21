import { Router } from "express";
import rateLimit from "express-rate-limit";
import { history, investigate, result } from "../controllers/domain.controller";
import { authorizePermissions, requireAuth } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
const domainLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { status: "error", code: "DOMAIN_RATE_LIMITED", message: "Domain collection rate limit reached. Try again shortly." } });
router.use(domainLimiter, requireAuth);
router.post("/intelligence", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), investigate);
router.get("/history", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), history);
router.get("/results/:id", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), result);
export default router;
