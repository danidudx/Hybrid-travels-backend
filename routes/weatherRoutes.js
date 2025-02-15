// routes/weatherRoutes.js
const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");

// Route to get weather for a destination
router.get("/getWeather/:destination", weatherController.getWeather);

// Route to get weather forecast for a destination
router.get(
  "/getWeatherForecast/:destination",
  weatherController.getWeatherForecast
);

module.exports = router;
