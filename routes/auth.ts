import express from "express";
import * as authController from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/me", auth, authController.getMe);
router.put("/profile", auth, authController.updateProfile);

export default router;
