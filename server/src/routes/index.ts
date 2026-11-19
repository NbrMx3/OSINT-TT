import { Router } from "express";
import authRoutes from "./auth";
import { getDashboard } from "../controllers/dashboardController";
import { getHealth } from "../controllers/healthController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.get("/health", getHealth);
router.use("/auth", authRoutes);
router.get("/dashboard", requireAuth, getDashboard);
export default router;
