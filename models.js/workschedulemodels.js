const mongoose = require('mongoose');

const workScheduleSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      required: true
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "worker",
      required: true
    },
    task: {
      type: String,
      required: true,
      trim: true
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ["PENDING", "CUTTING", "STITCHING", "IN_PROGRESS", "READY", "DELIVERED"],
      default: "PENDING"
    },
    notes: {
      type: String
    },
    estimatedHours: {
      type: Number,
      min: 0
    },
    actualHours: {
      type: Number,
      min: 0
    }
  },
  { timestamps: true, versionKey: false }
);

// Index for efficient queries
workScheduleSchema.index({ orderId: 1, workerId: 1 });
workScheduleSchema.index({ scheduledDate: 1 });
workScheduleSchema.index({ status: 1 });

module.exports = mongoose.model("workschedule", workScheduleSchema);
