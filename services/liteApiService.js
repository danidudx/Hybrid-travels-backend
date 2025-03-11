// // services/liteApiService.js
// const axios = require("axios");
// const dotenv = require("dotenv");

// // Load environment variables
// dotenv.config();

// // LiteAPI Key and base URL
// const LITEAPI_KEY = process.env.LITEAPI_KEY; // API key from environment
// const API_BASE_URL = "https://api.liteapi.travel/v3.0";

// /**
//  * Fetch hotel rates and availability.
//  * @param {Array} hotelIds - List of hotel IDs.
//  * @param {string} checkInDate - Check-in date in YYYY-MM-DD format.
//  * @param {string} checkOutDate - Check-out date in YYYY-MM-DD format.
//  * @param {number} adults - Number of adults per room.
//  * @param {Array} childrenAges - Array of integers representing children's ages.
//  * @param {string} currency - Currency code (e.g., "USD").
//  * @param {string} guestNationality - Nationality of the guest (ISO-2 code, e.g., "US").
//  * @returns {object} - Hotel rates and availability details.
//  */
// const getHotelRates = async (
//   hotelIds,
//   checkInDate,
//   checkOutDate,
//   adults,
//   childrenAges = [],
//   currency = "USD",
//   guestNationality = "US"
// ) => {
//   try {
//     console.log(
//       `📌 Fetching hotel rates for hotels: ${hotelIds.join(", ")}...`
//     );

//     // Ensure dates are properly formatted
//     if (
//       !/^\d{4}-\d{2}-\d{2}$/.test(checkInDate) ||
//       !/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate)
//     ) {
//       console.error("❌ ERROR: Invalid date format (expected YYYY-MM-DD).");
//       return { message: "Invalid date format. Use YYYY-MM-DD." };
//     }

//     const apiUrl = `${API_BASE_URL}/hotels/rates`;

//     const requestBody = {
//       hotelIds, // List of hotel IDs
//       checkin: checkInDate, // Correct field name
//       checkout: checkOutDate,
//       occupancies: [
//         {
//           adults,
//           children: childrenAges || [], // Ensure empty array if no children
//         },
//       ],
//       currency,
//       guestNationality, // ✅ Required field added
//       limit: 5, // Limit number of hotels
//     };

//     console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));

//     const response = await axios.post(apiUrl, requestBody, {
//       headers: {
//         "X-API-Key": LITEAPI_KEY,
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//     });

//     console.log("✅ Hotel Rates Response:", response.data);

//     if (
//       !response.data ||
//       !response.data.data ||
//       response.data.data.length === 0
//     ) {
//       console.error("❌ ERROR: No rates found for the hotels.");
//       return { message: "No pricing available for these hotels." };
//     }

//     return response.data.data;
//   } catch (error) {
//     console.error(
//       "❌ ERROR: Failed to fetch hotel rates:",
//       error.response?.data || error.message
//     );
//     return {
//       message: "Error retrieving hotel rates.",
//       details: error.response?.data || error.message,
//     };
//   }
// };

// // Function to fetch hotels based on destination and dates
// const getHotels = async (
//   countryCode,
//   cityName,
//   checkInDate,
//   checkOutDate,
//   budget,
//   limit = 10
// ) => {
//   try {
//     console.log("🔍 Sending request to LiteAPI...");

//     // ✅ Fix: Do NOT encode cityName (axios does it automatically)
//     let params = new URLSearchParams({
//       limit: limit.toString(),
//     });

//     if (countryCode) params.append("countryCode", countryCode);
//     if (cityName) params.append("cityName", cityName); // ✅ Fixed encoding issue
//     if (checkInDate) params.append("check_in", checkInDate);
//     if (checkOutDate) params.append("check_out", checkOutDate);
//     if (budget) params.append("budget", budget.toString());

//     // ✅ Fix: Ensure API URL is correct
//     const apiUrl = `${API_BASE_URL}/data/hotels?${params.toString()}`;
//     console.log("📌 Correct API Request URL:", apiUrl);

//     const response = await axios.get(apiUrl, {
//       headers: {
//         "X-API-Key": LITEAPI_KEY,
//         Accept: "application/json",
//       },
//     });

//     console.log("✅ API Response:", response.data);

//     if (
//       !response.data ||
//       !Array.isArray(response.data.data) ||
//       response.data.data.length === 0
//     ) {
//       console.error("❌ ERROR: No hotels found.");
//       return [];
//     }

//     console.log(`✅ Returning ${response.data.data.length} hotels`);
//     return response.data.data;
//   } catch (error) {
//     console.error(
//       "❌ ERROR: Failed to fetch hotels from LiteAPI:",
//       error.message
//     );
//     return [];
//   }
// };

// // Function to fetch detailed hotel information
// const getHotelDetails = async (hotelId) => {
//   try {
//     const url = `${API_BASE_URL}/data/hotel`;

//     const response = await axios.get(url, {
//       params: {
//         hotel_id: hotelId, // hotel_id for specific hotel details
//       },
//       headers: {
//         "X-API-Key": LITEAPI_KEY, // API key in the header
//       },
//     });

//     // Return the hotel details
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching hotel details:", error);
//     throw new Error("Error fetching hotel details");
//   }
// };

// // Function to fetch weather for a given destination
// const getWeather = async (destination) => {
//   try {
//     const encodedDestination = encodeURIComponent(destination);
//     const url = `${API_BASE_URL}/search/weather`;

//     const response = await axios.get(url, {
//       params: {
//         destination: encodedDestination, // Encoded destination
//       },
//       headers: {
//         "X-API-Key": LITEAPI_KEY, // API key in the header
//       },
//     });

//     return response.data;
//   } catch (error) {
//     console.error("Error fetching weather data:", error);
//     throw new Error("Error fetching weather data");
//   }
// };

// // Function to fetch hotel facilities for a given hotel ID
// const getHotelFacilities = async (hotelId) => {
//   try {
//     const url = `${API_BASE_URL}/data/hotel-facilities`;

//     const response = await axios.get(url, {
//       params: {
//         hotel_id: hotelId, // hotel_id must be provided for fetching facilities
//       },
//       headers: {
//         "X-API-Key": LITEAPI_KEY, // API key in the header
//       },
//     });

//     return response.data;
//   } catch (error) {
//     console.error("Error fetching hotel facilities:", error);
//     throw new Error("Error fetching hotel facilities");
//   }
// };

// // Function to get hotel rates for a given hotel, check-in, check-out, and travelers
// const getHotelRate = async (
//   hotelId,
//   checkInDate,
//   checkOutDate,
//   numTravelers
// ) => {
//   try {
//     const url = `${API_BASE_URL}/rates/book`;

//     const response = await axios.post(
//       url,
//       {
//         hotel_id: hotelId,
//         check_in: checkInDate,
//         check_out: checkOutDate,
//         num_travelers: numTravelers,
//       },
//       {
//         headers: {
//           "X-API-Key": LITEAPI_KEY, // API key in the header
//         },
//       }
//     );

//     return response.data;
//   } catch (error) {
//     console.error("Error fetching hotel rates:", error);
//     throw new Error("Error fetching hotel rates");
//   }
// };

// // Function to create a pre-booking reservation
// const preBookHotel = async (
//   hotelId,
//   checkInDate,
//   checkOutDate,
//   numTravelers,
//   userDetails
// ) => {
//   try {
//     const url = `${API_BASE_URL}/rates/prebook`;

//     const response = await axios.post(
//       url,
//       {
//         hotel_id: hotelId,
//         check_in: checkInDate,
//         check_out: checkOutDate,
//         num_travelers: numTravelers,
//         user_details: userDetails, // User details to be provided for pre-booking
//       },
//       {
//         headers: {
//           "X-API-Key": LITEAPI_KEY, // API key in the header
//         },
//       }
//     );

//     return response.data;
//   } catch (error) {
//     console.error("Error pre-booking hotel:", error);
//     throw new Error("Error pre-booking hotel");
//   }
// };

// module.exports = {
//   getHotels,
//   getHotelDetails,
//   getWeather,
//   getHotelFacilities,
//   getHotelRate,
//   preBookHotel,
//   getHotelRates,
// };
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const LITEAPI_KEY = process.env.LITEAPI_KEY;
const API_BASE_URL = "https://api.liteapi.travel/v3.0";

// Fetch hotels from LiteAPI
const getHotels = async (
  countryCode,
  cityName,
  checkInDate,
  checkOutDate,
  budget,
  limit = 10
) => {
  try {
    console.log("📌 Fetching hotels...");

    const params = new URLSearchParams({ limit: limit.toString() });
    if (countryCode) params.append("countryCode", countryCode);
    if (cityName) params.append("cityName", cityName);
    if (checkInDate) params.append("check_in", checkInDate);
    if (checkOutDate) params.append("check_out", checkOutDate);
    if (budget) params.append("budget", budget.toString());

    const apiUrl = `${API_BASE_URL}/data/hotels?${params.toString()}`;

    const response = await axios.get(apiUrl, {
      headers: { "X-API-Key": LITEAPI_KEY, Accept: "application/json" },
    });

    return response.data.data || [];
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch hotels:", error.message);
    return [];
  }
};

let selectedHotelRoom = null;

const getHotelRates = async (
  cityName,
  countryCode,
  checkInDate,
  checkOutDate,
  numTravelers,
  childrenAges = [],
  currency = "USD",
  guestNationality = "US",
  limit = 10,
  accommodationPreference,
  maxBudget
) => {
  try {
    console.log("📌 Fetching hotel rates with filters...");

    const requestBody = {
      countryCode,
      cityName,
      checkin: checkInDate,
      checkout: checkOutDate,
      occupancies: [
        {
          adults: Number(numTravelers) || 1,
          children: Array.isArray(childrenAges) ? childrenAges : [],
          roomCount: 1,
        },
      ],
      currency,
      guestNationality,
      limit,
      sort: [{ field: "price", direction: "ascending" }],
      maxRatesPerHotel: 5,
    };

    console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));

    // ✅ Call LiteAPI
    const response = await axios.post(
      `${API_BASE_URL}/hotels/rates`,
      requestBody,
      {
        headers: {
          "X-API-Key": LITEAPI_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("✅ Hotel Rates Response:", response.data);

    let hotels = response?.data?.data || [];

    if (hotels.length === 0) {
      console.warn("⚠️ No hotels found in API response!");
      return [];
    }

    console.log("📌 Raw Hotel Data from API:", hotels.length, "hotels found");

    // Fetching the basic hotel details from the `hotels` array
    const hotelBasicDetails = response?.data?.hotels || [];

    // ✅ Map hotels to return basic details and room rates
    hotels = hotels.map((hotel) => {
      const hotelDetails =
        hotelBasicDetails.find((h) => h.id === hotel.hotelId) || {}; // Find corresponding hotel details by hotelId

      // Get the first room from the roomTypes section
      const firstRoom = hotel.roomTypes?.[0]?.rates?.[0] || {};

      return {
        hotelId: hotel.hotelId, // Hotel ID
        name: hotelDetails.name || "Unknown Hotel", // Hotel name from the `hotels` array
        address: hotelDetails.address || "N/A", // Hotel address from the `hotels` array
        rating: hotelDetails.rating || "N/A", // Hotel rating from the `hotels` array
        mainPhoto: hotelDetails.main_photo || "N/A", // Hotel main photo from the `hotels` array
        room: {
          name: firstRoom.name || "Standard Room", // Room name
          price: firstRoom.retailRate?.total?.[0]?.amount ?? "N/A", // Room price
          currency: firstRoom.retailRate?.total?.[0]?.currency ?? currency, // Room price currency
          boardType: firstRoom.boardType || "N/A", // Room board type
        },
        amenities: hotel.amenities || [], // Fetch amenities if available
      };
    });

    // ✅ Apply accommodation preferences:
    if (accommodationPreference === "at_only_the_best") {
      // Filter for 5-star hotels
      hotels = hotels.filter((hotel) => hotel.rating >= 5);
    } else if (accommodationPreference === "at_good_hotel") {
      // Filter for 4-star hotels and above
      hotels = hotels.filter((hotel) => hotel.rating >= 4);
    } else if (accommodationPreference === "anywhere_within_budget") {
      // Sort by price (cheapest first)
      hotels = hotels.sort(
        (a, b) => parseFloat(a.room.price) - parseFloat(b.room.price)
      );
    } else if (accommodationPreference === "with_locals") {
      // Filter hotels that have amenities like guesthouses or homestays
      hotels = hotels.filter(
        (hotel) =>
          hotel.amenities.includes("guesthouse") ||
          hotel.amenities.includes("homestay")
      );
    }

    // ✅ Filter based on budget
    if (maxBudget) {
      hotels = hotels.filter((hotel) => {
        const price = hotel.room.price;
        return price && parseFloat(price) <= maxBudget; // Filter hotels that are within the budget
      });

      if (hotels.length === 0) {
        console.warn(
          "⚠️ No hotels within budget! Returning all hotels instead."
        );
        // If no hotels found within budget, return all available hotels
        hotels = hotels;
      }
    }

    console.log("✅ Formatted Hotels:", hotels.length, "hotels processed");

    return hotels;
  } catch (error) {
    console.error(
      "❌ ERROR: Failed to fetch hotels:",
      error.response?.data || error.message
    );
    return [];
  }
};

const getHotelDetails = async (hotelId) => {
  try {
    console.log(`📌 Fetching details for hotel ID: ${hotelId}...`);

    const response = await axios.get(`${API_BASE_URL}/data/hotel`, {
      params: { hotelId },
      headers: { "X-API-Key": LITEAPI_KEY, Accept: "application/json" },
    });

    return response.data.data || {};
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch hotel details:", error.message);
    return {};
  }
};

// Fetch weather details
const getWeather = async (cityName) => {
  try {
    console.log(`📌 Fetching weather for city: ${cityName}...`);

    const response = await axios.get(`${API_BASE_URL}/data/weather`, {
      params: { cityName },
      headers: { "X-API-Key": LITEAPI_KEY, Accept: "application/json" },
    });

    return response.data || {};
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch weather:", error.message);
    return {};
  }
};

// Fetch hotel facilities
const getHotelFacilities = async (hotelId) => {
  try {
    console.log(`📌 Fetching facilities for hotel ID: ${hotelId}...`);

    const response = await axios.get(`${API_BASE_URL}/data/hotel-facilities`, {
      params: { hotelId },
      headers: { "X-API-Key": LITEAPI_KEY, Accept: "application/json" },
    });

    return response.data.data || [];
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch hotel facilities:", error.message);
    return [];
  }
};

// Fetch a specific hotel rate
const getHotelRate = async (hotelId, roomTypeId) => {
  try {
    console.log(
      `📌 Fetching rate for hotel ID: ${hotelId}, roomTypeId: ${roomTypeId}...`
    );

    const response = await axios.get(`${API_BASE_URL}/data/hotel-rate`, {
      params: { hotelId, roomTypeId },
      headers: { "X-API-Key": LITEAPI_KEY, Accept: "application/json" },
    });

    return response.data.data || {};
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch hotel rate:", error.message);
    return {};
  }
};

// Pre-book a hotel (reservation process)
const preBookHotel = async (hotelId, roomTypeId, guestDetails) => {
  try {
    console.log(
      `📌 Pre-booking hotel ID: ${hotelId}, RoomType: ${roomTypeId}...`
    );

    const requestBody = {
      hotelId,
      roomTypeId,
      guestDetails,
    };

    const response = await axios.post(
      `${API_BASE_URL}/hotels/pre-book`,
      requestBody,
      {
        headers: {
          "X-API-Key": LITEAPI_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data.data || {};
  } catch (error) {
    console.error("❌ ERROR: Failed to pre-book hotel:", error.message);
    return {};
  }
};

// Export functions
module.exports = {
  getHotels,
  getHotelRates,
  getHotelDetails,
  getWeather,
  getHotelFacilities,
  getHotelRate,
  preBookHotel,
};
