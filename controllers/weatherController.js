// controllers/weatherController.js
const liteApiService = require("../services/liteApiService"); // Import LiteAPI service

// Function to get weather data for a given destination
const getWeather = async (req, res) => {
  const { destination } = req.params; // Destination from URL params

  try {
    // Fetch weather information using the LiteAPI service
    const weatherData = await liteApiService.getWeather(destination);

    // Return the weather data to the user
    res.json(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res
      .status(500)
      .json({ message: "Error fetching weather data", error: error.message });
  }
};

// Function to get weather forecast for a given destination
const getWeatherForecast = async (req, res) => {
  const { destination } = req.params; // Destination from URL params

  try {
    // Fetch weather forecast using the LiteAPI service
    const weatherForecast = await liteApiService.getWeather(destination);

    // Return the weather forecast to the user
    res.json(weatherForecast);
  } catch (error) {
    console.error("Error fetching weather forecast:", error);
    res
      .status(500)
      .json({
        message: "Error fetching weather forecast",
        error: error.message,
      });
  }
};

module.exports = {
  getWeather,
  getWeatherForecast,
};
