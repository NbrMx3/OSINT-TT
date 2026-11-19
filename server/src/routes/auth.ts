import { Router } from "express";
import { currentUser, forgotPassword, login, logout, register, resetPasswordController, updateCurrentUser } from "../controllers/authController";
import { optionalAuth, requireAuth } from "../middleware/auth";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/logout", optionalAuth, logout);
router.get("/me", requireAuth, currentUser);
router.patch("/me", requireAuth, updateCurrentUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordController);
export default router;
