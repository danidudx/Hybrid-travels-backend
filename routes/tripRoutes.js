// routes/tripRoutes.js

const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");

// Define route for generating a trip plan
router.post("/generate", tripController.generateTripPlan);

router.post("/fetch-hotel-rates", tripController.fetchHotelRates);

module.exports = router;
