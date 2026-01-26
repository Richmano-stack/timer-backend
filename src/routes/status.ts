import express from "express";
import * as statusController from "../controllers/statusController.js";
import { authMiddleware } from "../middleware/betterAuth.js";
import roleAuth from "../middleware/roleAuth.js";

const router = express.Router();

router.post("/change", authMiddleware, statusController.changeStatus);
router.get("/history", authMiddleware, statusController.getHistory);
router.get("/current", authMiddleware, statusController.getCurrentStatus);
router.get("/summary", authMiddleware, statusController.getSummary);
router.get("/export", authMiddleware, roleAuth(["supervisor"]), statusController.exportLogs);
router.post("/stop", authMiddleware, statusController.stopStatus);

export default router;
