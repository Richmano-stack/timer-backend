const express = require("express");
const router = express.Router();
const statusController = require("../controllers/statusController");
const auth = require("../middleware/auth");

router.post("/change", auth, statusController.changeStatus);
router.get("/history", auth, statusController.getHistory);

module.exports = router;
