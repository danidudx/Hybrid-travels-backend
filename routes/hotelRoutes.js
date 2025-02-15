// routes/hotelRoutes.js
const express = require("express");
const router = express.Router();
const hotelController = require("../controllers/hotelController");

// Route to fetch hotels for a destination
router.post("/getHotels", hotelController.getHotels);

// Route to fetch details for a specific hotel by ID
router.get("/getHotelDetails/:hotelId", hotelController.getHotelDetails);

// Route to fetch facilities for a specific hotel by ID
router.get("/getHotelFacilities/:hotelId", hotelController.getHotelFacilities);

module.exports = router;
