const express = require("express");
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} = require("../controllers/customercontrollers");

const Router = express.Router();

// CREATE
Router.post("/", async (req, res) => {
  try {
    await createCustomer(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// READ ALL
Router.get("/", async (req, res) => {
  try {
    await getAllCustomers(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// READ BY ID
Router.get("/:id", async (req, res) => {
  try {
    await getCustomerById(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// UPDATE
Router.put("/:id", async (req, res) => {
  try {
    await updateCustomer(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// DELETE
Router.delete("/:id", async (req, res) => {
  try {
    await deleteCustomer(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

module.exports = Router;
