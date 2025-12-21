/*const SalesEntry = require("../models.js/salesentrymodels");

const computeItemsAndTotals = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items array is required and cannot be empty");
  }

  const computedItems = items.map((item, idx) => {
    const { product, quantity, rate } = item || {};
    if (!product) throw new Error(`items[${idx}].product is required`);
    if (!quantity || quantity <= 0) throw new Error(`items[${idx}].quantity must be > 0`);
    if (rate === undefined || rate === null || rate < 0) throw new Error(`items[${idx}].rate must be >= 0`);
    const amount = rate * quantity;
    return { product, quantity, rate, amount };
  });

  const totalAmount = computedItems.reduce((sum, i) => sum + (i.amount || 0), 0);
  return { computedItems, totalAmount };
};

// Create sales entry
const createSalesEntry = async (req, res) => {
  try {
    const { customerId, items, paymentMethod, paidAmount = 0, notes } = req.body;

    if (!customerId) return res.status(400).json({ message: "customerId is required" });
    if (!paymentMethod) return res.status(400).json({ message: "paymentMethod is required" });

    const { computedItems, totalAmount } = computeItemsAndTotals(items);
    const balance = totalAmount - paidAmount;
    if (balance < 0) {
      return res.status(400).json({ message: "paidAmount cannot exceed totalAmount" });
    }

    const entry = new SalesEntry({
      customerId,
      items: computedItems,
      paymentMethod,
      totalAmount,
      paidAmount,
      balance,
      notes
    });

    const saved = await entry.save();
    return res.status(201).json({ message: "sales entry created", data: saved });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Get all sales entries
const getAllSalesEntries = async (_req, res) => {
  try {
    const entries = await SalesEntry.find({})
      .populate("customerId")
      .populate("items.product");
    return res.status(200).json({ data: entries });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Get sales entry by id
const getSalesEntryById = async (req, res) => {
  try {
    const entry = await SalesEntry.findById(req.params.id)
      .populate("customerId")
      .populate("items.product");
    if (!entry) return res.status(404).json({ message: "sales entry not found" });
    return res.status(200).json({ data: entry });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Update sales entry
const updateSalesEntry = async (req, res) => {
  try {
    const { customerId, items, paymentMethod, paidAmount, notes } = req.body;

    const entry = await SalesEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "sales entry not found" });

    if (customerId) entry.customerId = customerId;
    if (paymentMethod) entry.paymentMethod = paymentMethod;
    if (notes !== undefined) entry.notes = notes;
    if (paidAmount !== undefined) entry.paidAmount = paidAmount;

    if (items) {
      const { computedItems, totalAmount } = computeItemsAndTotals(items);
      entry.items = computedItems;
      entry.totalAmount = totalAmount;
    }

    // Ensure totals/balance consistent
    if (!entry.totalAmount && entry.items?.length) {
      const { computedItems, totalAmount } = computeItemsAndTotals(entry.items);
      entry.items = computedItems;
      entry.totalAmount = totalAmount;
    }

    const balance = entry.totalAmount - (entry.paidAmount || 0);
    if (balance < 0) {
      return res.status(400).json({ message: "paidAmount cannot exceed totalAmount" });
    }
    entry.balance = balance;

    const saved = await entry.save();
    return res.status(200).json({ message: "sales entry updated", data: saved });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Delete sales entry
const deleteSalesEntry = async (req, res) => {
  try {
    const deleted = await SalesEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "sales entry not found" });
    return res.status(200).json({ message: "sales entry deleted", data: deleted });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createSalesEntry,
  getAllSalesEntries,
  getSalesEntryById,
  updateSalesEntry,
  deleteSalesEntry
};
*/


const SalesEntry = require("../models.js/salesentrymodels");
const Inventory = require("../models.js/inventorymodels");

const computeItemsAndTotals = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items array is required and cannot be empty");
  }

  const computedItems = items.map((item, idx) => {
    const { product, quantity, rate } = item || {};
    if (!product) throw new Error(`items[${idx}].product is required`);
    if (!quantity || quantity <= 0) throw new Error(`items[${idx}].quantity must be > 0`);
    if (rate === undefined || rate === null || rate < 0) throw new Error(`items[${idx}].rate must be >= 0`);
    const amount = rate * quantity;
    return { product, quantity, rate, amount };
  });

  const subtotal = computedItems.reduce((sum, i) => sum + (i.amount || 0), 0);
  const tax = subtotal * 0.05;
  const totalAmount = subtotal + tax;
  return { computedItems, totalAmount };
};

// Create sales entry
const createSalesEntry = async (req, res) => {
  try {
    const { customerId, items, paymentMethod, paidAmount = 0, notes } = req.body;

    if (!customerId) return res.status(400).json({ message: "customerId is required" });
    if (!paymentMethod) return res.status(400).json({ message: "paymentMethod is required" });

    const { computedItems, totalAmount } = computeItemsAndTotals(items);
    const balance = totalAmount - paidAmount;
    if (balance < -0.1) {
      return res.status(400).json({ message: "paidAmount cannot exceed totalAmount" });
    }

    const entry = new SalesEntry({
      customerId,
      items: computedItems,
      paymentMethod,
      totalAmount,
      paidAmount,
      balance,
      notes
    });

    const saved = await entry.save();

    // Decrease inventory stock
    for (const item of computedItems) {
      await Inventory.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    return res.status(201).json({ message: "sales entry created", data: saved });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Get all sales entries
const getAllSalesEntries = async (_req, res) => {
  try {
    const entries = await SalesEntry.find({})
      .populate("customerId")
      .populate("items.product");
    return res.status(200).json({ data: entries });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Get sales entry by id
const getSalesEntryById = async (req, res) => {
  try {
    const entry = await SalesEntry.findById(req.params.id)
      .populate("customerId")
      .populate("items.product");
    if (!entry) return res.status(404).json({ message: "sales entry not found" });
    return res.status(200).json({ data: entry });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Update sales entry
const updateSalesEntry = async (req, res) => {
  try {
    const { customerId, items, paymentMethod, paidAmount, notes } = req.body;

    const entry = await SalesEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "sales entry not found" });

    if (customerId) entry.customerId = customerId;
    if (paymentMethod) entry.paymentMethod = paymentMethod;
    if (notes !== undefined) entry.notes = notes;
    if (paidAmount !== undefined) entry.paidAmount = paidAmount;

    if (items) {
      const { computedItems, totalAmount } = computeItemsAndTotals(items);
      entry.items = computedItems;
      entry.totalAmount = totalAmount;
    }

    // Ensure totals/balance consistent
    if (!entry.totalAmount && entry.items?.length) {
      const { computedItems, totalAmount } = computeItemsAndTotals(entry.items);
      entry.items = computedItems;
      entry.totalAmount = totalAmount;
    }

    const balance = entry.totalAmount - (entry.paidAmount || 0);
    if (balance < -0.1) {
      return res.status(400).json({ message: "paidAmount cannot exceed totalAmount" });
    }
    entry.balance = balance;

    const saved = await entry.save();
    return res.status(200).json({ message: "sales entry updated", data: saved });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Delete sales entry
const deleteSalesEntry = async (req, res) => {
  try {
    const deleted = await SalesEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "sales entry not found" });
    return res.status(200).json({ message: "sales entry deleted", data: deleted });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createSalesEntry,
  getAllSalesEntries,
  getSalesEntryById,
  updateSalesEntry,
  deleteSalesEntry
};



