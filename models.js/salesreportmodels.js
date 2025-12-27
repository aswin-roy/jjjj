/*const mongoose = require('mongoose');

const salesReportSchema = new mongoose.Schema(
  {
    billNo: {
      type: String,
      required: true,
      unique: true
    },
    customer: {
      type: String,
      required: true
    },
    phone: {
      type: Number,
      required: true
    },
    mode: {
      type: String,
      enum: ["upi", "cash", "card"],
      required: true
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paid: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    pending: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("salesreport", salesReportSchema);*/



const mongoose = require('mongoose');

const salesReportSchema = new mongoose.Schema(
  {
    billNo: {
      type: String,
      required: true,
      unique: true
    },
    customer: {
      type: String,
      required: true
    },
    phone: {
      type: Number,
      required: true
    },
    mode: {
      type: String,
      enum: ["upi", "cash", "card"],
      required: true
    },

    total: {
      type: Number,
      required: true,
      min: 0
    },

    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    paid: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    pending: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    date: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("salesreport", salesReportSchema);



