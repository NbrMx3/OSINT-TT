import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RoleName } from "@prisma/client";
import { history, investigate, result } from "../controllers/threat.controller";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
const threatLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false,
  message: { status: "error", code: "THREAT_RATE_LIMITED", message: "Threat intelligence rate limit reached. Try again shortly." },
});
router.use(threatLimiter, requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.post("/intelligence", investigate);
router.get("/history", history);
router.get("/results/:id", result);
export default router;
