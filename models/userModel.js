// models/userModel.js
const mongoose = require("mongoose");

// Define schema for User model
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    preferences: {
      startLocation: {
        type: String,
        required: true,
      },
      destination: {
        type: String,
        required: true,
      },
      numTravelers: {
        type: Number,
        required: true,
      },
      numNights: {
        type: Number,
        required: true,
      },
      travelDates: {
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
      },
      interests: {
        type: [String], // Array of user interests like ["adventure", "culture", "nature"]
        required: true,
      },
      accommodationPreferences: {
        type: String, // E.g., "Anywhere within budget", "At good hotel", etc.
        required: true,
      },
      budget: {
        type: Number,
        required: true,
      },
    },
    tripHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip",
      },
    ],
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Create and export User model
const User = mongoose.model("User", userSchema);
module.exports = User;
