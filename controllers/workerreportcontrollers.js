const Worker = require("../models.js/workermodels");
const Order = require("../models.js/ordermodels");

// Helper to build date filter
const buildDateFilter = (query) => {
  const { type, date, month, year, startDate, endDate } = query;
  let filter = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (startDate && endDate) {
    // Custom range
    filter = {
      "workerAssignment.date": {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  } else if (type === 'day' && date) {
    // Specific day
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter = {
      "workerAssignment.date": { $gte: start, $lte: end }
    };
  } else if (type === 'month' || (month && year)) {
    // Specific month
    const m = month ? parseInt(month) - 1 : currentMonth; // 0-indexed
    const y = year ? parseInt(year) : currentYear;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    filter = {
      "workerAssignment.date": { $gte: start, $lte: end }
    };
  } else if (type === 'year' && year) {
    // Specific year
    const y = parseInt(year);
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31, 23, 59, 59, 999);
    filter = {
      "workerAssignment.date": { $gte: start, $lte: end }
    };
  } else {
    // Default: Current Month
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    filter = {
      "workerAssignment.date": { $gte: start, $lte: end }
    };
  }
  return filter;
};

// Create worker
const createWorker = async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name || !role) {
      return res.status(400).json({ message: "name and role are required" });
    }
    const worker = new Worker({ name, role });
    const saved = await worker.save();
    return res.status(201).json({ message: "worker created", data: saved });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Read all workers
const getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({});
    return res.status(200).json({ data: workers });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Read single worker
const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "worker not found" });
    return res.status(200).json({ data: worker });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Update worker
const updateWorker = async (req, res) => {
  try {
    const updated = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "worker not found" });
    return res.status(200).json({ message: "worker updated", data: updated });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Delete worker
const deleteWorker = async (req, res) => {
  try {
    const deleted = await Worker.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "worker not found" });
    return res.status(200).json({ message: "worker deleted", data: deleted });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Commission breakdown for a single worker (by task and total)
const getWorkerReport = async (req, res) => {
  try {
    const workerId = req.params.id;
    // Note: getWorkerReport ignores filters but maybe it should fix it?
    // User complaint was about getAllWorkersReport mainly. I will leave getWorkerReport alone for now to avoid regression if it's used elsewhere differently. 

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ message: "worker not found" });

    const pipeline = [
      { $unwind: "$workerAssignment" },
      {
        $match: {
          "workerAssignment.worker": worker._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$workerAssignment.task",
          totalCommission: { $sum: { $ifNull: ["$workerAssignment.commission", 0] } }
        }
      }
    ];

    const results = await Order.aggregate(pipeline);
    const totalsByTask = {};
    let grandTotal = 0;
    results.forEach((row) => {
      totalsByTask[row._id || "unspecified"] = row.totalCommission;
      grandTotal += row.totalCommission;
    });

    return res.status(200).json({
      worker: { id: worker._id, name: worker.name, role: worker.role },
      totalsByTask,
      totalCommission: grandTotal
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Aggregate report for all workers (per worker totals and global totals)
const getAllWorkersReport = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);

    // Aggregate per worker / task commissions from orders
    const pipeline = [
      { $unwind: "$workerAssignment" },
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: { worker: "$workerAssignment.worker", task: "$workerAssignment.task" },
          totalCommission: { $sum: { $ifNull: ["$workerAssignment.commission", 0] } }
        }
      }
    ];

    const agg = await Order.aggregate(pipeline);

    // Load workers for names/roles
    const workersMap = {};
    const workers = await Worker.find({});
    workers.forEach((w) => {
      workersMap[String(w._id)] = { id: w._id, name: w.name, role: w.role };
    });

    const workerSummaries = {};
    let globalGrandTotal = 0;
    const globalTotalsByTask = {};

    agg.forEach((row) => {
      const workerId = String(row._id.worker);
      const task = row._id.task || "unspecified";
      const amount = row.totalCommission;

      if (!workerSummaries[workerId]) {
        // Should have been initialized below, but just in case
        const info = workersMap[workerId] || { id: workerId, name: "Unknown", role: "" };
        workerSummaries[workerId] = {
          worker: info,
          totalsByTask: {},
          totalCommission: 0
        };
      }

      workerSummaries[workerId].totalsByTask[task] = amount;
      workerSummaries[workerId].totalCommission += amount;

      globalTotalsByTask[task] = (globalTotalsByTask[task] || 0) + amount;
      globalGrandTotal += amount;
    });

    // Ensure ALL workers are in the report, even with 0 commission
    workers.forEach(w => {
      const wId = String(w._id);
      if (!workerSummaries[wId]) {
        workerSummaries[wId] = {
          worker: { id: w._id, name: w.name, role: w.role },
          totalsByTask: {},
          totalCommission: 0
        };
      }
    });

    return res.status(200).json({
      totalsByTask: globalTotalsByTask,
      totalCommission: globalGrandTotal,
      workers: Object.values(workerSummaries),
      filter: dateFilter,
      debug: {
        filter: dateFilter,
        pipelineMatchStage: JSON.stringify(dateFilter),
        aggCount: agg.length
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createWorker,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  getWorkerReport,
  getAllWorkersReport
};






/*
const Worker = require("../models.js/workermodels");
const Order = require("../models.js/ordermodels");

// Create worker
const createWorker = async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name || !role) {
      return res.status(400).json({ message: "name and role are required" });
    }
    const worker = new Worker({ name, role });
    const saved = await worker.save();
    return res.status(201).json({ message: "worker created", data: saved });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Read all workers
const getAllWorkers = async (_req, res) => {
  try {
    const workers = await Worker.find({});
    return res.status(200).json({ data: workers });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Read single worker
const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "worker not found" });
    return res.status(200).json({ data: worker });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Update worker
const updateWorker = async (req, res) => {
  try {
    const updated = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "worker not found" });
    return res.status(200).json({ message: "worker updated", data: updated });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Delete worker
const deleteWorker = async (req, res) => {
  try {
    const deleted = await Worker.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "worker not found" });
    return res.status(200).json({ message: "worker deleted", data: deleted });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Commission breakdown for a single worker (by task and total)
const getWorkerReport = async (req, res) => {
  try {
    const workerId = req.params.id;

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ message: "worker not found" });

    const pipeline = [
      { $unwind: "$workerAssignment" },
      { $match: { "workerAssignment.worker": worker._id } },
      {
        $group: {
          _id: "$workerAssignment.task",
          totalCommission: { $sum: { $ifNull: ["$workerAssignment.commission", 0] } }
        }
      }
    ];

    const results = await Order.aggregate(pipeline);
    const totalsByTask = {};
    let grandTotal = 0;
    results.forEach((row) => {
      totalsByTask[row._id || "unspecified"] = row.totalCommission;
      grandTotal += row.totalCommission;
    });

    return res.status(200).json({
      worker: { id: worker._id, name: worker.name, role: worker.role },
      totalsByTask,
      totalCommission: grandTotal
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Aggregate report for all workers (per worker totals and global totals)
const getAllWorkersReport = async (_req, res) => {
  try {
    // Aggregate per worker / task commissions from orders
    const pipeline = [
      { $unwind: "$workerAssignment" },
      {
        $group: {
          _id: { worker: "$workerAssignment.worker", task: "$workerAssignment.task" },
          totalCommission: { $sum: { $ifNull: ["$workerAssignment.commission", 0] } }
        }
      }
    ];

    const agg = await Order.aggregate(pipeline);

    // Load workers for names/roles
    const workersMap = {};
    const workers = await Worker.find({});
    workers.forEach((w) => {
      workersMap[String(w._id)] = { id: w._id, name: w.name, role: w.role };
    });

    const workerSummaries = {};
    let globalGrandTotal = 0;
    const globalTotalsByTask = {};

    agg.forEach((row) => {
      const workerId = String(row._id.worker);
      const task = row._id.task || "unspecified";
      const amount = row.totalCommission;

      if (!workerSummaries[workerId]) {
        // Should have been initialized below, but just in case
        const info = workersMap[workerId] || { id: workerId, name: "Unknown", role: "" };
        workerSummaries[workerId] = {
          worker: info,
          totalsByTask: {},
          totalCommission: 0
        };
      }

      workerSummaries[workerId].totalsByTask[task] = amount;
      workerSummaries[workerId].totalCommission += amount;

      globalTotalsByTask[task] = (globalTotalsByTask[task] || 0) + amount;
      globalGrandTotal += amount;
    });

    // Ensure ALL workers are in the report, even with 0 commission
    workers.forEach(w => {
      const wId = String(w._id);
      if (!workerSummaries[wId]) {
        workerSummaries[wId] = {
          worker: { id: w._id, name: w.name, role: w.role },
          totalsByTask: {},
          totalCommission: 0
        };
      }
    });

    return res.status(200).json({
      totalsByTask: globalTotalsByTask,
      totalCommission: globalGrandTotal,
      workers: Object.values(workerSummaries)
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createWorker,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  getWorkerReport,
  getAllWorkersReport
};


*/






