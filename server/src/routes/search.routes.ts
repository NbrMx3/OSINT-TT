import { Router } from "express";
import { requireAuth, authorizePermissions } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";
import { savedCreate, savedDelete, savedList, savedUpdate, search } from "../controllers/search.controller";

const router = Router();
router.use(requireAuth);
router.get("/", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), search);
router.get("/saved", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), savedList);
router.post("/saved", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), savedCreate);
router.patch("/saved/:id", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), savedUpdate);
router.delete("/saved/:id", authorizePermissions(PERMISSIONS.DELETE_DATA), savedDelete);
export default router;
