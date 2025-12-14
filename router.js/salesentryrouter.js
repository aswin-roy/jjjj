const express = require("express");
const router = express.Router();

const {
  createSalesEntry,
  getAllSalesEntries,
  getSalesEntryById,
  updateSalesEntry,
  deleteSalesEntry
} = require("../controllers/salesentrycontrollers");

router.post("/", createSalesEntry);
router.get("/", getAllSalesEntries);
router.get("/:id", getSalesEntryById);
router.put("/:id", updateSalesEntry);
router.delete("/:id", deleteSalesEntry);

module.exports = router;
