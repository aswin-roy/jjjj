const express = require("express");
const router = express.Router();

const {
  createWorkSchedule,
  getAllWorkSchedules,
  getWorkScheduleById,
  updateWorkSchedule,
  deleteWorkSchedule,
  getSchedulesByWorker,
  getSchedulesByOrder,
  getUpcomingSchedules
} = require("../controllers/workschedulecontrollers");

// CRUD operations
router.post("/", createWorkSchedule);
router.get("/", getAllWorkSchedules);
router.get("/:id", getWorkScheduleById);
router.put("/:id", updateWorkSchedule);
router.delete("/:id", deleteWorkSchedule);

// Special routes
router.get("/worker/:workerId", getSchedulesByWorker);
router.get("/order/:orderId", getSchedulesByOrder);
router.get("/upcoming", getUpcomingSchedules);

module.exports = router;

