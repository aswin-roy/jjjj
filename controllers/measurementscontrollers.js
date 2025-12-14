const Customer = require("../models.js/customersModels");
const Measurement = require("../models.js/measurementsmodels");

// GET /measurements - list all measurements with basic customer info
exports.getAllMeasurements = async (_req, res) => {
    try {
        const measurements = await Measurement.find().populate({
            path: "customerId",
            select: "customername customerphone customeraddress"
        });
        res.json({ message: "Measurements list", data: measurements });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /measurements/:customerId
exports.getMeasurement = async (req, res) => {
    try {
        const customerId = req.params.customerId;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid customer ID format" });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        const measurement = await Measurement.findOne({ customerId });

        if (!measurement) {
            return res.json({
                message: "No measurement found",
                data: null,
                customer: {
                    _id: customer._id,
                    name: customer.customername,
                    phone: customer.customerphone
                }
            });
        }

        res.json({
            message: "Measurement found",
            data: measurement,
            customer: {
                _id: customer._id,
                name: customer.customername,
                phone: customer.customerphone
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /measurements/:customerId (create or update)
exports.saveMeasurement = async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const { upperBody, lowerBody, notes } = req.body;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid customer ID format" });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        const updateData = {};
        if (upperBody) updateData.upperBody = upperBody;
        if (lowerBody) updateData.lowerBody = lowerBody;
        if (notes) updateData.notes = notes;

        const measurement = await Measurement.findOneAndUpdate(
            { customerId },
            { $set: updateData, $setOnInsert: { customerId } },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({
            message: "Measurement saved successfully",
            data: measurement,
            customer: {
                _id: customer._id,
                name: customer.customername,
                phone: customer.customerphone
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /measurements/:customerId - Update existing measurement (no upsert)
exports.updateMeasurement = async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const { upperBody, lowerBody, notes } = req.body;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid customer ID format" });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        const updateData = {};
        if (upperBody) updateData.upperBody = upperBody;
        if (lowerBody) updateData.lowerBody = lowerBody;
        if (notes) updateData.notes = notes;

        const measurement = await Measurement.findOneAndUpdate(
            { customerId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!measurement) {
            return res.status(404).json({
                error: "Measurement not found for this customer. Use POST to create first."
            });
        }

        res.json({
            message: "Measurement updated successfully",
            data: measurement,
            customer: {
                _id: customer._id,
                name: customer.customername,
                phone: customer.customerphone
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
