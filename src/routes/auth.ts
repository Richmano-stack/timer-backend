import express from "express";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/betterAuth.js";

const router = express.Router();

/* router.post("/register", auth, roleAuth(["admin"]), authController.register); */
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.getMe);
router.put("/profile", authMiddleware, authController.updateProfile);

export default router;
