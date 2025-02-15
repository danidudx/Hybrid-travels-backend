// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

// Define route for creating a booking
router.post("/create", bookingController.createBooking);

// Define route for managing bookings (view or update)
router.post("/manage", bookingController.manageBooking);

module.exports = router;
