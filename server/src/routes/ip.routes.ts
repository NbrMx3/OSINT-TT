import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RoleName } from "@prisma/client";
import { history, investigate, result } from "../controllers/ip.controller";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
const ipLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { status: "error", code: "IP_RATE_LIMITED", message: "IP intelligence collection rate limit reached. Try again shortly." } });

router.use(ipLimiter, requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.post("/intelligence", investigate);
router.get("/history", history);
router.get("/results/:id", result);

export default router;
