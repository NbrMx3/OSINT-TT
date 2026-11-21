import { Router } from "express";
import rateLimit from "express-rate-limit";
import { history, investigate, result } from "../controllers/ip.controller";
import { authorizePermissions, requireAuth } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
const ipLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { status: "error", code: "IP_RATE_LIMITED", message: "IP intelligence collection rate limit reached. Try again shortly." } });

router.use(ipLimiter, requireAuth);
router.post("/intelligence", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), investigate);
router.get("/history", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), history);
router.get("/results/:id", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), result);

export default router;
