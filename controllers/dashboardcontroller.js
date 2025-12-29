const Order = require("../models.js/ordermodels");
const SalesEntry = require("../models.js/salesentrymodels");

exports.getStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // 1. Today's Sales
        const todaySalesData = await SalesEntry.aggregate([
            {
                $match: {
                    createdAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const today_sales = todaySalesData.length > 0 ? todaySalesData[0].total : 0;

        // 2. Monthly Sales
        const monthlySalesData = await SalesEntry.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const monthly_sales = monthlySalesData.length > 0 ? monthlySalesData[0].total : 0;

        // 3. Pending Orders (All not delivered or ready)
        // Status enum: ["pending", "cutting", "stitching", "inprogress", "Ready", "Delivered"]
        const pending_orders = await Order.countDocuments({
            status: { $in: ["pending", "cutting", "stitching", "inprogress"] }
        });

        // 4. Ready Orders
        const ready_orders = await Order.countDocuments({
            status: "Ready"
        });

        // 5. Unpaid Bills (Sum of balances)
        const unpaidBillsData = await SalesEntry.aggregate([
            {
                $match: {
                    balance: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$balance" }
                }
            }
        ]);
        const unpaid_bills = unpaidBillsData.length > 0 ? unpaidBillsData[0].total : 0;

        // 6. Upcoming Deliveries (Next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const upcomingOrders = await Order.find({
            deliveryDate: { $gte: today, $lte: nextWeek },
            status: { $ne: "Delivered" }
        })
            .populate("customerId", "customername") // Assuming customerId ref is 'customers' and has 'customername' which maps to 'name' in frontend typically
            .select("customerId deliveryDate item")
            .sort({ deliveryDate: 1 });

        const upcoming_delivery = upcomingOrders.map(order => ({
            name: order.customerId ? order.customerId.customername : "Unknown",
            delivery_date: order.deliveryDate ? order.deliveryDate.toISOString().split('T')[0] : ""
        }));

        res.status(200).json({
            today_sales,
            monthly_sales,
            pending_orders,
            ready_orders,
            unpaid_bills,
            upcoming_delivery
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Error fetching dashboard stats", error: error.message });
    }
};
