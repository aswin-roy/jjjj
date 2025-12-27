const SalesReport = require("../models.js/salesreportmodels");
const SalesEntry = require("../models.js/salesentrymodels");

// POST /api/sales-report - Create a new sales report
const createSalesReport = async (req, res) => {
  try {
    const { billNo, customer, phone, mode, total, paid, pending, date } = req.body;

    // Validation
    if (!billNo) return res.status(400).json({ message: "billNo is required" });
    if (!customer) return res.status(400).json({ message: "customer is required" });
    if (phone === undefined || phone === null) return res.status(400).json({ message: "phone is required" });
    if (!mode) return res.status(400).json({ message: "mode is required" });
    if (total === undefined || total === null) return res.status(400).json({ message: "total is required" });
    if (paid === undefined || paid === null) return res.status(400).json({ message: "paid is required" });
    if (pending === undefined || pending === null) return res.status(400).json({ message: "pending is required" });

    // Validate mode enum
    if (!["upi", "cash", "card"].includes(mode)) {
      return res.status(400).json({ message: "mode must be one of: upi, cash, card" });
    }

    // Auto-calculate pending if not provided or validate if provided
    const calculatedPending = total - paid;
    if (calculatedPending < 0) {
      return res.status(400).json({
        message: "paid amount cannot exceed total amount"
      });
    }

    // Use calculated pending if not provided or doesn't match
    const finalPending = (pending === undefined || pending === null)
      ? calculatedPending
      : pending;

    // Validate pending matches calculation if explicitly provided
    if (pending !== undefined && pending !== null && pending !== calculatedPending) {
      return res.status(400).json({
        message: `pending (${pending}) must equal total (${total}) - paid (${paid}) = ${calculatedPending}`
      });
    }

    const salesReport = new SalesReport({
      billNo,
      customer,
      phone,
      mode,
      total,
      paid,
      pending: finalPending,
      date: date ? new Date(date) : new Date()
    });

    const saved = await salesReport.save();
    return res.status(201).json({ message: "sales report created successfully", data: saved });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "billNo already exists", error: err.message });
    }
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /api/sales-report - Get all sales reports from sales entries
const getAllSalesReports = async (req, res) => {
  try {
    const {
      search,
      month,
      year,
      startDate,
      endDate,
      mode,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query filter for sales entries
    const filter = {};

    // Date filtering - use createdAt from sales entries
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    // Mode filter - use paymentMethod from sales entries
    if (mode && ['upi', 'cash', 'card'].includes(mode.toLowerCase())) {
      filter.paymentMethod = mode.toLowerCase();
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort - default to createdAt
    const sortOptions = {};
    const sortField = sortBy === 'date' ? 'createdAt' : sortBy;
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Fetch sales entries with customer populated
    const [entries, total] = await Promise.all([
      SalesEntry.find(filter)
        .populate('customerId')
        .populate('items.product')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SalesEntry.countDocuments(filter)
    ]);

    console.log(`Found ${entries.length} sales entries, total: ${total}`);

    // Transform entries to sales report format
    const salesReports = entries.map(entry => {
      // Handle customer data - could be ObjectId or populated object
      let customer = {};
      if (entry.customerId) {
        if (typeof entry.customerId === 'object' && entry.customerId !== null) {
          customer = entry.customerId;
        } else {
          // If customerId is just an ID, we'll show placeholder
          customer = { customername: 'Customer Not Found', customerphone: 0 };
        }
      }

      // Generate bill number from entry ID
      const billNo = `B${String(entry._id).slice(-6).toUpperCase()}`;

      return {
        _id: entry._id,
        bill_no: billNo,
        customer: customer.customername || 'Unknown Customer',
        phone: String(customer.customerphone || ''),
        paymentMode: entry.paymentMethod,
        amount: entry.totalAmount,
        paidAmount: entry.paidAmount,
        status: entry.balance <= 0.5 ? 'Paid' : 'Unpaid',
        date: entry.createdAt ? entry.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        billNo: billNo, // Keep for compatibility if needed
        mode: entry.paymentMethod,
        total: entry.totalAmount,
        paid: entry.paidAmount,
        pending: entry.balance,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      };
    });

    // Apply search filter after transformation
    let filteredReports = salesReports;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredReports = salesReports.filter(report => {
        return (
          report.billNo.toLowerCase().includes(searchLower) ||
          report.customer.toLowerCase().includes(searchLower) ||
          String(report.phone).includes(search)
        );
      });
    }

    return res.status(200).json({
      data: filteredReports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: search ? filteredReports.length : total,
        totalPages: Math.ceil((search ? filteredReports.length : total) / limitNum)
      }
    });
  } catch (err) {
    console.error('Error fetching sales reports:', err);
    return res.status(500).json({
      message: "server error",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// GET /api/sales-report/summary - Get summary statistics from sales entries
const getSalesReportSummary = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};

    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      dateFilter.createdAt = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      dateFilter.createdAt = { $lte: new Date(endDate) };
    }

    // Aggregate statistics from sales entries
    const summary = await SalesEntry.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 },
          outstandingBalance: { $sum: '$balance' },
          totalPaid: { $sum: '$paidAmount' }
        }
      }
    ]);

    const result = summary.length > 0 ? summary[0] : {
      totalRevenue: 0,
      ordersCount: 0,
      outstandingBalance: 0,
      totalPaid: 0
    };

    delete result._id;

    return res.status(200).json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /api/invoice/:id - Get invoice by id (from sales entry)
const getInvoiceById = async (req, res) => {
  try {
    const entry = await SalesEntry.findById(req.params.id)
      .populate('customerId')
      .populate('items.product');

    if (!entry) {
      return res.status(404).json({ message: "invoice not found" });
    }

    const customer = entry.customerId || {};
    const billNo = `B${String(entry._id).slice(-6).toUpperCase()}`;

    const invoice = {
      _id: entry._id,
      billNo: billNo,
      customer: customer.customername || 'Unknown Customer',
      phone: customer.customerphone || 0,
      address: customer.customeraddress || '',
      mode: entry.paymentMethod,
      total: entry.totalAmount,
      paid: entry.paidAmount,
      pending: entry.balance,
      date: entry.createdAt,
      items: entry.items.map(item => ({
        product: item.product?.productname || item.product?.name || 'Product',
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      })),
      notes: entry.notes || ''
    };

    return res.status(200).json({ data: invoice });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /api/invoice-print/:id - Get invoice for printing (from sales entry)
const getInvoiceForPrint = async (req, res) => {
  try {
    const entry = await SalesEntry.findById(req.params.id)
      .populate('customerId')
      .populate('items.product');

    if (!entry) {
      return res.status(404).json({ message: "invoice not found" });
    }

    const customer = entry.customerId || {};
    const billNo = `B${String(entry._id).slice(-6).toUpperCase()}`;

    const invoice = {
      billNo: billNo,
      date: entry.createdAt,
      customer: {
        name: customer.customername || 'Unknown Customer',
        phone: customer.customerphone || 0,
        address: customer.customeraddress || ''
      },
      items: entry.items.map(item => ({
        product: item.product?.productname || item.product?.name || 'Product',
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      })),
      payment: {
        method: entry.paymentMethod,
        total: entry.totalAmount,
        paid: entry.paidAmount,
        pending: entry.balance
      },
      notes: entry.notes || ''
    };

    return res.status(200).json({ data: invoice });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Debug endpoint - check database counts
const getDatabaseStats = async (req, res) => {
  try {
    const salesEntryCount = await SalesEntry.countDocuments({});
    const salesReportCount = await SalesReport.countDocuments({});
    const sampleEntry = await SalesEntry.findOne({}).populate('customerId').lean();

    return res.status(200).json({
      salesEntries: {
        count: salesEntryCount,
        sample: sampleEntry ? {
          _id: sampleEntry._id,
          customerId: sampleEntry.customerId,
          customerName: sampleEntry.customerId?.customername || 'Not populated',
          totalAmount: sampleEntry.totalAmount,
          createdAt: sampleEntry.createdAt
        } : null
      },
      salesReports: {
        count: salesReportCount
      },
      message: salesEntryCount > 0
        ? `Found ${salesEntryCount} sales entries. Sales reports are generated from these entries.`
        : 'No sales entries found. Create sales entries first using POST /salesentries'
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createSalesReport,
  getAllSalesReports,
  getSalesReportSummary,
  getInvoiceById,
  getInvoiceForPrint,
  getDatabaseStats
};




/*const SalesReport = require("../models.js/salesreportmodels");
const SalesEntry = require("../models.js/salesentrymodels");

// POST /api/sales-report - Create a new sales report
const createSalesReport = async (req, res) => {
  try {
    const { billNo, customer, phone, mode, total, paid, pending, date } = req.body;

    // Validation
    if (!billNo) return res.status(400).json({ message: "billNo is required" });
    if (!customer) return res.status(400).json({ message: "customer is required" });
    if (phone === undefined || phone === null) return res.status(400).json({ message: "phone is required" });
    if (!mode) return res.status(400).json({ message: "mode is required" });
    if (total === undefined || total === null) return res.status(400).json({ message: "total is required" });
    if (paid === undefined || paid === null) return res.status(400).json({ message: "paid is required" });
    if (pending === undefined || pending === null) return res.status(400).json({ message: "pending is required" });

    // Validate mode enum
    if (!["upi", "cash", "card"].includes(mode)) {
      return res.status(400).json({ message: "mode must be one of: upi, cash, card" });
    }

    // Auto-calculate pending if not provided or validate if provided
    const calculatedPending = total - paid;
    if (calculatedPending < 0) {
      return res.status(400).json({
        message: "paid amount cannot exceed total amount"
      });
    }

    // Use calculated pending if not provided or doesn't match
    const finalPending = (pending === undefined || pending === null)
      ? calculatedPending
      : pending;

    // Validate pending matches calculation if explicitly provided
    if (pending !== undefined && pending !== null && pending !== calculatedPending) {
      return res.status(400).json({
        message: `pending (${pending}) must equal total (${total}) - paid (${paid}) = ${calculatedPending}`
      });
    }

    const salesReport = new SalesReport({
      billNo,
      customer,
      phone,
      mode,
      total,
      paid,
      pending: finalPending,
      date: date ? new Date(date) : new Date()
    });

    const saved = await salesReport.save();
    return res.status(201).json({ message: "sales report created successfully", data: saved });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "billNo already exists", error: err.message });
    }
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /api/sales-report - Get all sales reports from sales entries
const getAllSalesReports = async (req, res) => {
  try {
    const {
      search,
      month,
      year,
      startDate,
      endDate,
      mode,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query filter for sales entries
    const filter = {};

    // Date filtering - use createdAt from sales entries
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    // Mode filter - use paymentMethod from sales entries
    if (mode && ['upi', 'cash', 'card'].includes(mode.toLowerCase())) {
      filter.paymentMethod = mode.toLowerCase();
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort - default to createdAt
    const sortOptions = {};
    const sortField = sortBy === 'date' ? 'createdAt' : sortBy;
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Fetch sales entries with customer populated
    const [entries, total] = await Promise.all([
      SalesEntry.find(filter)
        .populate('customerId')
        .populate('items.product')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SalesEntry.countDocuments(filter)
    ]);

    console.log(`Found ${entries.length} sales entries, total: ${total}`);

    // Transform entries to sales report format
    const salesReports = entries.map(entry => {
      // Handle customer data - could be ObjectId or populated object
      let customer = {};
      if (entry.customerId) {
        if (typeof entry.customerId === 'object' && entry.customerId !== null) {
          customer = entry.customerId;
        } else {
          // If customerId is just an ID, we'll show placeholder
          customer = { customername: 'Customer Not Found', customerphone: 0 };
        }
      }

      // Generate bill number from entry ID
      const billNo = `B${String(entry._id).slice(-6).toUpperCase()}`;

      return {
        _id: entry._id,
        bill_no: billNo,
        customer: customer.customername || 'Unknown Customer',
        phone: String(customer.customerphone || ''),
        paymentMode: entry.paymentMethod,
        amount: entry.totalAmount,
        paidAmount: entry.paidAmount,
        status: entry.balance <= 0.5 ? 'Paid' : 'Unpaid',
        date: entry.createdAt ? entry.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        billNo: billNo, // Keep for compatibility if needed
        mode: entry.paymentMethod,
        total: entry.totalAmount,
        paid: entry.paidAmount,
        pending: entry.balance,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      };
    });

    // Apply search filter after transformation
    let filteredReports = salesReports;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredReports = salesReports.filter(report => {
        return (
          report.billNo.toLowerCase().includes(searchLower) ||
          report.customer.toLowerCase().includes(searchLower) ||
          String(report.phone).includes(search)
        );
      });
    }

    return res.status(200).json({
      data: filteredReports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: search ? filteredReports.length : total,
        totalPages: Math.ceil((search ? filteredReports.length : total) / limitNum)
      }
    });
  } catch (err) {
    console.error('Error fetching sales reports:', err);
    return res.status(500).json({
      message: "server error",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// GET /api/sales-report/summary - Get summary statistics from sales entries
const getSalesReportSummary = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};

    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      dateFilter.createdAt = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      dateFilter.createdAt = { $lte: new Date(endDate) };
    }

    // Aggregate statistics from sales entries
    const summary = await SalesEntry.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 },
          outstandingBalance: { $sum: '$balance' },
          totalPaid: { $sum: '$paidAmount' }
        }
      }
    ]);

    const result = summary.length > 0 ? summary[0] : {
      totalRevenue: 0,
      ordersCount: 0,
      outstandingBalance: 0,
      totalPaid: 0
    };

    delete result._id;

    return res.status(200).json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /api/invoice/:id - Get invoice by id (from sales entry)
const getInvoiceById = async (req, res) => {
  try {
    const entry = await SalesEntry.findById(req.params.id)
      .populate('customerId')
      .populate('items.product');

    if (!entry) {
      return res.status(404).json({ message: "invoice not found" });
    }

    const customer = entry.customerId || {};
    const billNo = `B${String(entry._id).slice(-6).toUpperCase()}`;

    const invoice = {
      _id: entry._id,
      billNo: billNo,
      customer: customer.customername || 'Unknown Customer',
      phone: customer.customerphone || 0,
      address: customer.customeraddress || '',
      mode: entry.paymentMethod,
      total: entry.totalAmount,
      paid: entry.paidAmount,
      pending: entry.balance,
      date: entry.createdAt,
      items: entry.items.map(item => ({
        product: item.product?.productname || item.product?.name || 'Product',
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      })),
      notes: entry.notes || ''
    };

    return res.status(200).json({ data: invoice });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// GET /api/invoice-print/:id - Get invoice for printing (from sales entry)
const getInvoiceForPrint = async (req, res) => {
  try {
    const entry = await SalesEntry.findById(req.params.id)
      .populate('customerId')
      .populate('items.product');

    if (!entry) {
      return res.status(404).json({ message: "invoice not found" });
    }

    const customer = entry.customerId || {};
    const billNo = `B${String(entry._id).slice(-6).toUpperCase()}`;

    const invoice = {
      billNo: billNo,
      date: entry.createdAt,
      customer: {
        name: customer.customername || 'Unknown Customer',
        phone: customer.customerphone || 0,
        address: customer.customeraddress || ''
      },
      items: entry.items.map(item => ({
        product: item.product?.productname || item.product?.name || 'Product',
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      })),
      payment: {
        method: entry.paymentMethod,
        total: entry.totalAmount,
        paid: entry.paidAmount,
        pending: entry.balance
      },
      notes: entry.notes || ''
    };

    return res.status(200).json({ data: invoice });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

// Debug endpoint - check database counts
const getDatabaseStats = async (req, res) => {
  try {
    const salesEntryCount = await SalesEntry.countDocuments({});
    const salesReportCount = await SalesReport.countDocuments({});
    const sampleEntry = await SalesEntry.findOne({}).populate('customerId').lean();

    return res.status(200).json({
      salesEntries: {
        count: salesEntryCount,
        sample: sampleEntry ? {
          _id: sampleEntry._id,
          customerId: sampleEntry.customerId,
          customerName: sampleEntry.customerId?.customername || 'Not populated',
          totalAmount: sampleEntry.totalAmount,
          createdAt: sampleEntry.createdAt
        } : null
      },
      salesReports: {
        count: salesReportCount
      },
      message: salesEntryCount > 0
        ? `Found ${salesEntryCount} sales entries. Sales reports are generated from these entries.`
        : 'No sales entries found. Create sales entries first using POST /salesentries'
    });
  } catch (err) {
    return res.status(500).json({ message: "server error", error: err.message });
  }
};

module.exports = {
  createSalesReport,
  getAllSalesReports,
  getSalesReportSummary,
  getInvoiceById,
  getInvoiceForPrint,
  getDatabaseStats
};*/





