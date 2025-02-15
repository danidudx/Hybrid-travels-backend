// controllers/activitiesController.js
const openAiService = require("../services/openAiService");

// Function to generate a daily activity itinerary
const generateItinerary = async (req, res) => {
  const { startLocation, destination, interests, numTravelers, numNights } =
    req.body;

  try {
    // Create a prompt for OpenAI
    const itinerary = await openAiService.getSightseeingActivities(
      destination,
      interests
    );

    // Return the generated itinerary to the user
    res.json({
      destination,
      interests,
      numTravelers,
      numNights,
      itinerary,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error generating itinerary", error: error.message });
  }
};

module.exports = { generateItinerary };
