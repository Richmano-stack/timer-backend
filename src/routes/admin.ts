import express from "express";
import * as adminController from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/betterAuth.js";
import roleAuth from "../middleware/roleAuth.js";


const router = express.Router();

// Supervisor and Admin can view team status
router.get("/team-status", authMiddleware, roleAuth(["supervisor", "admin"]), adminController.getTeamStatus);

// Admin only user management
router.get("/users", authMiddleware, roleAuth(["admin"]), adminController.getAllUsers);
router.post("/users", authMiddleware, roleAuth(["admin"]), adminController.createUser);
router.put("/users/:id", authMiddleware, roleAuth(["admin"]), adminController.updateUser);
router.patch("/users/:id/deactivate", authMiddleware, roleAuth(["admin"]), adminController.deactivateUser);

export default router;
