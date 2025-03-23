// routes/tripRoutes.js

const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const multiTripController = require("../controllers/multiTripController");

// Define route for generating a trip plan
router.post("/generate", tripController.generateTripPlan);

router.post("/fetch-hotel-rates", tripController.fetchHotelRates);

router.post("/multi-generate", multiTripController.generateMultiTripPlan);

module.exports = router;
