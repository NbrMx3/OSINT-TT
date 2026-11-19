import { Router } from "express";
import authRoutes from "./auth";
import configurationRoutes from "./configurations";
import { getDashboard } from "../controllers/dashboardController";
import { getHealth } from "../controllers/healthController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.get("/health", getHealth);
router.use("/auth", authRoutes);
router.use("/configurations", configurationRoutes);
router.get("/dashboard", requireAuth, getDashboard);
export default router;
