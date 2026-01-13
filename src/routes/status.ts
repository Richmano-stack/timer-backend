import express from "express";
import * as statusController from "../controllers/statusController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/change", auth, statusController.changeStatus);
router.get("/history", auth, statusController.getHistory);
router.get("/current", auth, statusController.getCurrentStatus);
router.get("/summary", auth, statusController.getSummary);
router.get("/export", auth, statusController.exportLogs);
router.post("/stop", auth, statusController.stopStatus);

export default router;
