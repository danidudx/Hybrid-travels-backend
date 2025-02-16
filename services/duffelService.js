const axios = require("axios");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY;
const API_BASE_URL = "https://api.duffel.com/air";

// Set up Axios instance
const duffelClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Authorization: `Bearer ${DUFFEL_API_KEY}`,
    "Duffel-Version": "v1",
    "Content-Type": "application/json",
  },
});

/**
 * Search for flights based on trip details.
 * @param {string} origin - IATA airport code (e.g., "JFK").
 * @param {string} destination - IATA airport code (e.g., "LAX").
 * @param {string} departureDate - Departure date in "YYYY-MM-DD" format.
 * @param {number} adults - Number of adult passengers.
 * @returns {object} - Flights response.
 */
const searchFlights = async (
  origin,
  destination,
  departureDate,
  adults = 1
) => {
  try {
    console.log(
      `📌 Searching for flights: ${origin} ➝ ${destination} on ${departureDate} for ${adults} adults...`
    );

    const requestBody = {
      data: {
        slices: [
          {
            origin,
            destination,
            departure_date: departureDate,
          },
        ],
        passengers: Array(adults).fill({ type: "adult" }),
        cabin_class: "economy",
        max_connections: 1,
      },
    };

    console.log(
      "📤 Sending Request Body:",
      JSON.stringify(requestBody, null, 2)
    );

    const response = await duffelClient.post("/offer_requests", requestBody);
    console.log("✅ Flights Retrieved:", response.data);

    return response;
  } catch (error) {
    console.error(
      "❌ ERROR: Failed to fetch flights:",
      error.response?.data || error.message
    );
    return null;
  }
};

module.exports = { searchFlights };
