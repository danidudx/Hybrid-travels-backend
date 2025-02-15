// routes/activitiesRoutes.js

const express = require("express");
const router = express.Router();
const activitiesController = require("../controllers/activitiesController");

// Define route for generating daily activity itinerary
router.post("/generate", activitiesController.generateItinerary);

module.exports = router;
