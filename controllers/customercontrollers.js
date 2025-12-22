const Customer = require("../models.js/customersModels");

// CREATE CUSTOMER
const createCustomer = async (req, res) => {
  try {
    const { customername, customerphone, customeraddress } = req.body;
    const newCustomer = new Customer({ customername, customerphone, customeraddress });
    const savedCustomer = await newCustomer.save();
    return res.status(201).json({ message: "customer created successfully", data: savedCustomer });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// READ ALL CUSTOMERS
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({});
    return res.status(200).json({ data: customers });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// READ BY ID FOR CUSTOMER
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "customer not found" });
    return res.status(200).json({ data: customer });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// UPDATE CUSTOMER
const updateCustomer = async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "customer not found" });
    return res.status(200).json({ message: "customer updated", data: updated });
  } catch (err) {
    console.error("Update Customer Error:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid Customer ID format" });
    }
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// DELETE CUSTOMER
const deleteCustomer = async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "customer not found" });
    return res.status(200).json({ message: "customer deleted", data: deleted });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
  getCustomerById,
  updateCustomer,
  deleteCustomer

};
