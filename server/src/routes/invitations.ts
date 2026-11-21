import { Router } from "express";
import { accept, create, list, revoke } from "../controllers/invitationController";
import { authorizePermissions, requireAuth } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.post("/accept", accept);
router.use(requireAuth, authorizePermissions(PERMISSIONS.MANAGE_USERS));
router.get("/", list);
router.post("/", create);
router.delete("/:id", revoke);
export default router;
