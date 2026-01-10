import express from "express";
import * as adminController from "../controllers/adminController.js";
import auth from "../middleware/auth.js";
import roleAuth from "../middleware/roleAuth.js";

const router = express.Router();

// Supervisor and Admin can view team status
router.get("/team-status", auth, roleAuth(["supervisor", "admin"]), adminController.getTeamStatus);

// Admin only user management
router.get("/users", auth, roleAuth(["admin"]), adminController.getAllUsers);
router.post("/users", auth, roleAuth(["admin"]), adminController.createUser);
router.put("/users/:id", auth, roleAuth(["admin"]), adminController.updateUser);
router.patch("/users/:id/deactivate", auth, roleAuth(["admin"]), adminController.deactivateUser);

export default router;
