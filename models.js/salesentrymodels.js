/*const mongoose = require('mongoose');

const salesEntrySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customers",
      required: true
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "inventory",
          required: true
        },
        quantity: { type: Number, required: true, min: 1 },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 }
      }
    ],
    paymentMethod: {
      type: String,
      enum: ["upi", "cash", "card"],
      required: true
    },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    balance: { type: Number, required: true, min: 0 },
    notes: { type: String }
  },
  { timestamps: true, versionKey: false }
);


module.exports = mongoose.model("salesentry", salesEntrySchema);
*/



const mongoose = require('mongoose');

const salesEntrySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customers",
      required: true
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "inventory",
          required: true
        },
        quantity: { type: Number, required: true, min: 1 },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 }
      }
    ],
    paymentMethod: {
      type: String,
      enum: ["upi", "cash", "card"],
      required: true
    },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    balance: { type: Number, required: true },
    notes: { type: String }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("salesentry", salesEntrySchema);
