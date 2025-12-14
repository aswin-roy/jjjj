const mongoose = require("mongoose");

const measurementSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "customers",
            required: true,
            unique: true // One measurement per customer
        },
        upperBody: {
            blouselength: { type: Number },
            shoulder: { type: Number },
            chest: { type: Number },
            upperchest: { type: Number },
            waist: { type: Number },
            hip: { type: Number },
            sleevelength: { type: Number },
            sleeveround: { type: Number },
            armhole: { type: Number },
            frontneck: { type: Number },
            backneck: { type: Number }
        },
        lowerBody: {
            pantlength: { type: Number },
            waistround: { type: Number },
            hipround: { type: Number },
            thigh: { type: Number },
            knee: { type: Number },
            calf: { type: Number },
            bottom: { type: Number },
            crotch: { type: Number }
        },
        notes: {
            type: String
        }
    },
    { timestamps: true }
);

const Measurement = mongoose.model("measurements", measurementSchema);
module.exports = Measurement;