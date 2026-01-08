import express from "express";
import * as statusController from "../controllers/statusController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/change", auth, statusController.changeStatus);
router.get("/history", auth, statusController.getHistory);

export default router;
