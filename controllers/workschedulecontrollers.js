const WorkSchedule = require("../models.js/workschedulemodels");
const Order = require("../models.js/ordermodels");
const Worker = require("../models.js/workermodels");

// POST /workschedule - Create a new work schedule
const createWorkSchedule = async (req, res) => {
  try {
    const { orderId, workerId, task, scheduledDate, startDate, endDate, status, notes, estimatedHours } = req.body;

    // Validation
    if (!orderId) return res.status(400).json({ message: "orderId is required" });
    if (!workerId) return res.status(400).json({ message: "workerId is required" });
    if (!task) return res.status(400).json({ message: "task is required" });
    if (!scheduledDate) return res.status(400).json({ message: "scheduledDate is required" });

    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Validate worker exists
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    const workSchedule = new WorkSchedule({
      orderId,
      workerId,
      task,
      scheduledDate: new Date(scheduledDate),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status || "PENDING",
      notes,
      estimatedHours
    });

    const saved = await workSchedule.save();
    
    // Populate references for response
    await saved.populate('orderId');
    await saved.populate('workerId');

    return res.status(201).json({ 
      message: "Work schedule created successfully", 
      data: saved 
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /workschedule - Get all work schedules with filtering
const getAllWorkSchedules = async (req, res) => {
  try {
    const { 
      orderId, 
      workerId, 
      status, 
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (orderId) filter.orderId = orderId;
    if (workerId) filter.workerId = workerId;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [schedules, total] = await Promise.all([
      WorkSchedule.find(filter)
        .populate('orderId')
        .populate('workerId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WorkSchedule.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: schedules,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /workschedule/:id - Get work schedule by ID
const getWorkScheduleById = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findById(req.params.id)
      .populate('orderId')
      .populate('workerId');

    if (!schedule) {
      return res.status(404).json({ message: "Work schedule not found" });
    }

    return res.status(200).json({ data: schedule });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// PUT /workschedule/:id - Update work schedule
const updateWorkSchedule = async (req, res) => {
  try {
    const { task, scheduledDate, startDate, endDate, status, notes, estimatedHours, actualHours } = req.body;

    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Work schedule not found" });
    }

    // Update fields
    if (task !== undefined) schedule.task = task;
    if (scheduledDate !== undefined) schedule.scheduledDate = new Date(scheduledDate);
    if (startDate !== undefined) schedule.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) schedule.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) schedule.status = status;
    if (notes !== undefined) schedule.notes = notes;
    if (estimatedHours !== undefined) schedule.estimatedHours = estimatedHours;
    if (actualHours !== undefined) schedule.actualHours = actualHours;

    const saved = await schedule.save();
    await saved.populate('orderId');
    await saved.populate('workerId');

    return res.status(200).json({ 
      message: "Work schedule updated successfully", 
      data: saved 
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// DELETE /workschedule/:id - Delete work schedule
const deleteWorkSchedule = async (req, res) => {
  try {
    const deleted = await WorkSchedule.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Work schedule not found" });
    }
    return res.status(200).json({ 
      message: "Work schedule deleted successfully", 
      data: deleted 
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /workschedule/worker/:workerId - Get schedules for a specific worker
const getSchedulesByWorker = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const filter = { workerId: req.params.workerId };

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    const schedules = await WorkSchedule.find(filter)
      .populate('orderId')
      .populate('workerId')
      .sort({ scheduledDate: 1 })
      .lean();

    return res.status(200).json({ data: schedules });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /workschedule/order/:orderId - Get schedules for a specific order
const getSchedulesByOrder = async (req, res) => {
  try {
    const schedules = await WorkSchedule.find({ orderId: req.params.orderId })
      .populate('orderId')
      .populate('workerId')
      .sort({ scheduledDate: 1 })
      .lean();

    return res.status(200).json({ data: schedules });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /workschedule/upcoming - Get upcoming schedules
const getUpcomingSchedules = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    const schedules = await WorkSchedule.find({
      scheduledDate: { $gte: today, $lte: futureDate },
      status: { $in: ["PENDING", "CUTTING", "STITCHING", "IN_PROGRESS"] }
    })
      .populate('orderId')
      .populate('workerId')
      .sort({ scheduledDate: 1 })
      .lean();

    return res.status(200).json({ data: schedules });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createWorkSchedule,
  getAllWorkSchedules,
  getWorkScheduleById,
  updateWorkSchedule,
  deleteWorkSchedule,
  getSchedulesByWorker,
  getSchedulesByOrder,
  getUpcomingSchedules
};

