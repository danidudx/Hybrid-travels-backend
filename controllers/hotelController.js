// controllers/hotelController.js
const liteApiService = require("../services/liteApiService"); // Import the LiteAPI service

// Function to get hotels for a given destination, check-in/check-out dates, and budget
const getHotels = async (req, res) => {
  const { destination, checkInDate, checkOutDate, budget } = req.body;

  try {
    // Fetch hotels using the LiteAPI service
    const hotels = await liteApiService.getHotels(
      destination,
      checkInDate,
      checkOutDate,
      budget
    );

    console.log("Hotels API Response:", hotels);

    // Return the fetched hotels to the user
    res.json(hotels);
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res
      .status(500)
      .json({ message: "Error fetching hotels", error: error.message });
  }
};

// Function to get hotel details for a given hotel ID
const getHotelDetails = async (req, res) => {
  const { hotelId } = req.params; // Hotel ID from the URL params

  try {
    // Fetch detailed hotel information using the LiteAPI service
    const hotelDetails = await liteApiService.getHotelDetails(hotelId);

    // Return the hotel details to the user
    res.json(hotelDetails);
  } catch (error) {
    console.error("Error fetching hotel details:", error);
    res
      .status(500)
      .json({ message: "Error fetching hotel details", error: error.message });
  }
};

// Function to get hotel facilities for a given hotel ID
const getHotelFacilities = async (req, res) => {
  const { hotelId } = req.params; // Hotel ID from the URL params

  try {
    // Fetch hotel facilities using the LiteAPI service
    const facilities = await liteApiService.getHotelFacilities(hotelId);

    // Return the hotel facilities to the user
    res.json(facilities);
  } catch (error) {
    console.error("Error fetching hotel facilities:", error);
    res.status(500).json({
      message: "Error fetching hotel facilities",
      error: error.message,
    });
  }
};

module.exports = {
  getHotels,
  getHotelDetails,
  getHotelFacilities,
};
