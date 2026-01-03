const express = require('express');
const { default: mongoose } = require('mongoose');
const cors = require('cors');
const app = express();
app.use(express.json());
require('dotenv').config();

// CORS middleware - allow all origins for deployment
//app.use(cors({
 // origin: process.env.FRONTEND_URL || 'https://ladybird-frontend-deploy.vercel.app',
  //credentials: true
//}));
//
/*app.use(cors({
  origin: [
    "https://ladybird-frontend-deploy.vercel.app"
  ],
  credentials: true
}));*/

app.use(cors({
  origin: process.env.FRONTEND_URL ,
  credentials: true
}));


// Normalize URL middleware - strips accidental newline/carriage-return encodings from URLs
app.use((req, res, next) => {
  if (typeof req.url === 'string') {
    req.url = req.url.replace(/%0A|%0D/g, '');
  }
  next();
});

const PORT = process.env.PORT;
const MONGO_URL = process.env.mongo_url;
const authRouter = require('./router.js/authrouter');
app.use("/auth", authRouter);
const customerRouter=require('./router.js/customerrouter');
app.use('/customers',customerRouter);
const inventoryRouter = require("./router.js/inventoryrouter");
app.use("/inventory", inventoryRouter);
const measurementsRouter = require("./router.js/measurementsrouter");
app.use("/measurements", measurementsRouter);
const orderRouter =require('./router.js/orderrouter');
app.use('/orders',orderRouter);
const workReportRouter = require("./router.js/workreportrouter");
app.use("/", workReportRouter);
const salesEntryRouter = require("./router.js/salesentryrouter");
app.use("/salesentries", salesEntryRouter);
const salesReportRouter = require("./router.js/salesreportrouter");
app.use("/api", salesReportRouter);
const workScheduleRouter = require("./router.js/workschedulerouter");
app.use("/workschedule", workScheduleRouter);

// Basic dashboard stats endpoint for frontend
const dashboardRouter = require("./router.js/dashboardrouter");
app.use("/dashboard", dashboardRouter);


mongoose.connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB is connected successfully');
    })
    .catch((err) => {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
    });

app.listen(PORT, () => {
    console.log(`server is connected successfully on PORT ${PORT}`);
});







