// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// Load environment variables
require("./config/dotenv-config");

// Connect to the database
const connectDB = require("./config/db");
connectDB();

const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Import routes
const tripRoutes = require("./routes/tripRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const weatherRoutes = require("./routes/weatherRoutes"); // Import weather routes
const bookingRoutes = require("./routes/bookingRoutes");
const activitiesRoutes = require("./routes/activitiesRoutes");

// Use routes
app.use("/api/trip", tripRoutes);
app.use("/api/hotel", hotelRoutes);
app.use("/api/weather", weatherRoutes); // Use weather routes
app.use("/api/booking", bookingRoutes);
app.use("/api/activities", activitiesRoutes);

// Test route to check if server and DB are connected
app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

// Server setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
