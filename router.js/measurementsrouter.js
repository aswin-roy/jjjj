const express = require("express");
const router = express.Router();
const measurementController = require("../controllers/measurementscontrollers");

// GET /api/measurements - Retrieve all measurements
router.get("/", measurementController.getAllMeasurements);

// GET /api/measurements/:customerId - Retrieve measurement
router.get("/:customerId", measurementController.getMeasurement);

// POST /api/measurements/:customerId - Save/Update measurement
router.post("/:customerId", measurementController.saveMeasurement);
router.put("/:customerId", measurementController.updateMeasurement);

module.exports = router;
