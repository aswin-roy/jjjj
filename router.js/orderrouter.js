
const express = require("express");
const router = express.Router();

const {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    addWorkerAssignment,
    deleteOrder
} = require("../controllers/orderscontrollers");

// Create new order
router.post("/", createOrder);

// Get all orders
router.get("/", getAllOrders);

// Get single order
router.get("/:id", getOrderById);

// Update order
router.put("/:id", updateOrder);

// Add worker assignment
router.post("/:id/assign", addWorkerAssignment);

// Delete order
router.delete("/:id", deleteOrder);

module.exports = router;
