const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "customers",
        required: true
    },
    item: {
        type: String,
    },
    status: {
        type: String,
        enum: ["pending", "cutting", "stitching", "inprogress", "Ready", "Delivered"],
        default: "pending"
    },
    deliveryDate: {
        type: Date
    },
    workerAssignment: [
        {
            worker: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "worker" 
            },

            task: { type: String },

            date: { type: Date },

            commission: { type: Number }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model("orders", orderSchema);
