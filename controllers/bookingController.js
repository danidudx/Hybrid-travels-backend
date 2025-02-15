// controllers/bookingController.js
const liteApiService = require("../services/liteApiService"); // Import LiteAPI service
const Trip = require("../models/tripModel"); // Import the Trip model
const User = require("../models/userModel"); // Import the User model

// Function to create a booking
const createBooking = async (req, res) => {
  const {
    userId,
    destination,
    checkInDate,
    checkOutDate,
    numTravelers,
    budget,
    hotelId, // Hotel selected by the user
  } = req.body;

  try {
    // Fetch hotel details using LiteAPI service
    const hotelDetails = await liteApiService.getHotelDetails(hotelId);

    // Fetch hotel rates using LiteAPI service
    const hotelRate = await liteApiService.getHotelRate(
      hotelId,
      checkInDate,
      checkOutDate,
      numTravelers
    );

    // Fetch weather data using LiteAPI service
    const weather = await liteApiService.getWeather(destination);

    // Calculate the total cost of the booking
    const totalCost = hotelRate.total_price;

    // Create a new booking in the Trip model
    const newBooking = new Trip({
      user: userId, // The user who is making the booking
      destination,
      travelDates: {
        checkInDate,
        checkOutDate,
      },
      estimatedCost: totalCost, // Use the fetched rate as the estimated cost
      weather, // Include weather details
      hotels: [
        {
          hotelName: hotelDetails.name,
          price: hotelRate.price_per_night, // Price per night
          rating: hotelDetails.rating,
          facilities: hotelDetails.facilities, // List of hotel facilities
        },
      ],
    });

    // Save the new booking in the database
    await newBooking.save();

    // Update the user's trip history with the new booking (optional)
    await User.findByIdAndUpdate(userId, {
      $push: { tripHistory: newBooking._id },
    });

    // Respond with the new booking details
    res.json({
      message: "Booking created successfully",
      booking: newBooking,
    });
  } catch (error) {
    // Handle errors and send a response with an error message
    console.error("Error creating booking:", error);
    res
      .status(500)
      .json({ message: "Error creating booking", error: error.message });
  }
};

// Function to manage bookings (view and update)
const manageBooking = async (req, res) => {
  const { bookingId, newCheckInDate, newCheckOutDate } = req.body;

  try {
    // Find the booking by ID and update the check-in/check-out dates
    const updatedBooking = await Trip.findByIdAndUpdate(
      bookingId,
      {
        "travelDates.checkInDate": newCheckInDate,
        "travelDates.checkOutDate": newCheckOutDate,
      },
      { new: true } // Return the updated booking
    );

    // If booking is not found
    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Respond with the updated booking
    res.json({
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res
      .status(500)
      .json({ message: "Error updating booking", error: error.message });
  }
};

// Function to calculate the total cost of the booking (using hotel price, number of travelers, and dates)
const calculateBookingCost = (
  hotelPrice,
  numTravelers,
  checkInDate,
  checkOutDate
) => {
  const numNights =
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 3600 * 24);
  return hotelPrice * numNights * numTravelers;
};

module.exports = { createBooking, manageBooking };
