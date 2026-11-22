import { Router } from "express";
import { requireAuth, authorizePermissions } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";
import { getDashboard } from "../controllers/dashboardController";
import { create, list, remove, update } from "../controllers/dashboardCustomization.controller";

const router = Router();
router.use(requireAuth);
router.get("/", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), getDashboard);
router.get("/saved", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), list);
router.post("/saved", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), create);
router.patch("/saved/:id", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), update);
router.delete("/saved/:id", authorizePermissions(PERMISSIONS.DELETE_DATA), remove);
export default router;
