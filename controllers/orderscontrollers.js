const Order = require("../models.js/ordermodels");
// Create order
const createOrder = async (req, res) => {
    try {
        const { customerId, item, status, workerAssignment, deliveryDate } = req.body;

        const newOrder = new Order({
            customerId,
            item,
            status,
            workerAssignment,
            deliveryDate
        });

        const savedOrder = await newOrder.save();

        res.status(201).json({
            message: "Order created",
            data: savedOrder
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// read all orders
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("customerId")
            .populate("workerAssignment.worker");

        res.status(200).json({ data: orders });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
// getby id
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("customerId")
            .populate("workerAssignment.worker");

        if (!order) return res.status(404).json({ message: "Order not found" });

        res.status(200).json({ data: order });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
//update order
const updateOrder = async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedOrder)
            return res.status(404).json({ message: "Order not found" });

        res.status(200).json({
            message: "Order updated",
            data: updatedOrder
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ message: "Invalid Order ID format" });
        }
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
// work assignment add

const addWorkerAssignment = async (req, res) => {
    try {
        const { worker, task, date, commission } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.workerAssignment.push({ worker, task, date, commission });

        await order.save();

        res.status(200).json({
            message: "Worker assignment added",
            data: order
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
//delete
const deleteOrder = async (req, res) => {
    try {
        const deleted = await Order.findByIdAndDelete(req.params.id);

        if (!deleted)
            return res.status(404).json({ message: "Order not found" });

        res.status(200).json({ message: "Order deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


module.exports = {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    addWorkerAssignment,
    deleteOrder
};
 

