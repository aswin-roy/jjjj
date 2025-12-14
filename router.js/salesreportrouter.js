const express = require("express");
const router = express.Router();

const {
  createSalesReport,
  getAllSalesReports,
  getSalesReportSummary,
  getInvoiceById,
  getInvoiceForPrint,
  getDatabaseStats
} = require("../controllers/salesreportcontrollers");

router.post("/sales-report", createSalesReport);
router.get("/sales-report/summary", getSalesReportSummary);
router.get("/sales-report", getAllSalesReports);
router.get("/sales-report/debug", getDatabaseStats); // Debug endpoint
router.get("/invoice/:id", getInvoiceById);
router.get("/invoice-print/:id", getInvoiceForPrint);

module.exports = router;

