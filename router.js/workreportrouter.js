const express = require("express");
const router = express.Router();

const {
  createWorker,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  getWorkerReport,
  getAllWorkersReport
} = require("../controllers/workerreportcontrollers");

// Worker CRUD
router.post("/workers", createWorker);
router.get("/workers", getAllWorkers);
router.get("/workers/:id", getWorkerById);
router.put("/workers/:id", updateWorker);
router.delete("/workers/:id", deleteWorker);

// Reports
router.get("/worker-reports", getAllWorkersReport);
router.get("/worker-reports/:id", getWorkerReport);

module.exports = router;
