// models/tripModel.js
const mongoose = require("mongoose");

// Define schema for Trip model
const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    startLocation: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    travelDates: {
      checkInDate: {
        type: Date,
        required: true,
      },
      checkOutDate: {
        type: Date,
        required: true,
      },
    },
    weather: {
      temperature: {
        type: String, // E.g., "22°C"
        required: true,
      },
      conditions: {
        type: String, // E.g., "Sunny", "Rainy"
        required: true,
      },
    },
    hotels: [
      {
        hotelName: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        facilities: [String], // List of hotel facilities like ["Wi-Fi", "Gym"]
      },
    ],
    activities: [
      {
        day: {
          type: Number,
          required: true, // Day of the itinerary (1 for Day 1, 2 for Day 2, etc.)
        },
        activity: {
          type: String,
          required: true, // Description of the activity
        },
      },
    ],
    estimatedCost: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Create and export Trip model
const Trip = mongoose.model("Trip", tripSchema);
module.exports = Trip;
