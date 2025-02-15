// // Function to generate the trip plan
// const liteApiService = require("../services/liteApiService");
// const {
//   generateItinerary,
//   getSightseeingActivities,
// } = require("../services/openAiService");

// // Function to generate the trip plan
// const generateTripPlan = async (req, res) => {
//   try {
//     console.log("🚀 Generating trip plan...");

//     // Extract user input
//     const {
//       startLocation,
//       countryCode,
//       cityName,
//       interests,
//       numTravelers,
//       numNights,
//       checkInDate,
//       checkOutDate,
//       budget,
//       currency = "USD",
//       guestNationality = "US",
//     } = req.body;

//     if (!countryCode && !cityName) {
//       return res
//         .status(400)
//         .json({ message: "Either countryCode or cityName must be provided." });
//     }

//     // ✅ Step 1: Fetch Hotels from LiteAPI
//     console.log("📌 Fetching hotels...");
//     const hotels = await liteApiService.getHotels(
//       countryCode,
//       cityName,
//       checkInDate,
//       checkOutDate,
//       budget,
//       10
//     );
//     console.log("✅ Hotels Retrieved:", hotels.length);

//     if (!hotels || hotels.length === 0) {
//       return res.status(500).json({
//         message: "No hotels available for the given destination and dates.",
//       });
//     }

//     // ✅ Step 2: Fetch Hotel Rates for Selected Hotels
//     console.log("📌 Fetching hotel rates...");
//     // ✅ Ensure we extract valid hotel IDs
//     const hotelIds = hotels.map((hotel) => hotel.id).filter((id) => id); // Removes null values
//     if (hotelIds.length === 0) {
//       console.error("❌ ERROR: No valid hotel IDs found.");
//       return res
//         .status(500)
//         .json({ message: "No hotels found for the selected criteria." });
//     }

//     // ✅ Prevent API call if no valid hotel IDs
//     if (!hotelIds || hotelIds.length === 0) {
//       console.error("❌ ERROR: No valid hotel IDs for rate lookup.");
//       return [];
//     }

//     const hotelRates = await liteApiService.getHotelRates(
//       hotelIds,
//       checkInDate,
//       checkOutDate,
//       numTravelers,
//       [],
//       currency,
//       guestNationality
//     );

//     // ✅ Handle cases where no rates are available
//     if (!hotelRates || hotelRates.error) {
//       console.error("❌ ERROR: No rates found for the hotels.");
//       return res
//         .status(500)
//         .json({ message: "No rates found for the selected hotels." });
//     }

//     console.log("✅ Hotel Rates Retrieved:", hotelRates.length);

//     // ✅ Step 3: Fetch Weather Data
//     console.log("📌 Fetching weather...");
//     const weather = await liteApiService.getWeather(cityName || countryCode);
//     console.log("✅ Weather Data Retrieved.");

//     // ✅ Step 4: Generate Itinerary using OpenAI
//     console.log("📌 Generating itinerary...");
//     const itinerary = await generateItinerary(cityName, numNights, interests);
//     console.log("✅ Itinerary Generated.");

//     // ✅ Step 5: Fetch Sightseeing Locations
//     console.log("📌 Fetching sightseeing locations...");
//     const sightseeing = await getSightseeingActivities(cityName);
//     console.log("✅ Sightseeing Locations Retrieved.");

//     // ✅ Step 6: Format Hotel Data
//     console.log("📌 Formatting hotel data...");
//     // ✅ Ensure safe access to hotel rate details
//     const formattedHotels = hotelRates.map((hotel) => ({
//       hotelId: hotel.hotelId,
//       roomTypes: hotel.roomTypes.slice(0, 3).map((room) => {
//         // Extracting rates safely
//         const rate = room.rates?.[0] || {}; // Get the first rate or empty object
//         const retailRate = rate.retailRate?.total?.[0] || {}; // Get total price details or empty object

//         return {
//           name: room.name || "No Name",
//           maxOccupancy: room.maxOccupancy || "N/A",
//           boardType: room.boardType || "N/A",
//           price: retailRate.amount ?? "N/A",
//           currency: retailRate.currency ?? "USD",
//           cancellationPolicy:
//             rate.cancellationPolicies?.cancelPolicyInfos || [],
//         };
//       }),
//     }));

//     console.log(
//       "✅ Formatted Hotel Data:",
//       JSON.stringify(formattedHotels, null, 2)
//     );

//     // ✅ Step 7: Calculate Estimated Cost
//     console.log("📌 Calculating estimated cost...");
//     const estimatedCost = calculateTotalCost(
//       hotelRates,
//       numTravelers,
//       numNights
//     );
//     console.log("✅ Estimated Cost:", estimatedCost);

//     // ✅ Final Trip Plan Response
//     const tripPlan = {
//       destination: cityName,
//       startLocation,
//       checkInDate,
//       checkOutDate,
//       numTravelers,
//       numNights,
//       weather,
//       hotels: formattedHotels,
//       activities: itinerary,
//       sightseeing,
//       estimatedCost,
//     };

//     console.log("✅ Trip Plan Generated Successfully!");
//     res.json(tripPlan);
//   } catch (error) {
//     console.error("❌ ERROR: Failed to generate trip plan:", error);
//     res
//       .status(500)
//       .json({ message: "Error generating trip plan", error: error.message });
//   }
// };

// // Helper function to calculate the total estimated cost
// const calculateTotalCost = (hotels, numTravelers, numNights) => {
//   let totalCost = 0;

//   hotels.forEach((hotel) => {
//     // Ensure roomTypes exists and has at least one valid room
//     if (hotel.roomTypes && hotel.roomTypes.length > 0) {
//       const firstRoom = hotel.roomTypes[0];

//       // Ensure price data exists before accessing amount
//       const pricePerNight =
//         firstRoom.price && firstRoom.price !== "N/A"
//           ? parseFloat(firstRoom.price)
//           : 0;

//       totalCost += pricePerNight * numTravelers * numNights;
//     }
//   });

//   return totalCost;
// };

// /**
//  * Fetches rates for selected hotels.
//  * @param {Request} req - The request object.
//  * @param {Response} res - The response object.
//  */
// const fetchHotelRates = async (req, res) => {
//   try {
//     const {
//       hotelIds,
//       checkInDate,
//       checkOutDate,
//       adults,
//       childrenAges,
//       currency,
//     } = req.body;

//     if (!hotelIds || hotelIds.length === 0) {
//       return res.status(400).json({ message: "Hotel IDs are required." });
//     }

//     const hotelRates = await liteApiService.getHotelRates(
//       hotelIds,
//       checkInDate,
//       checkOutDate,
//       adults,
//       childrenAges,
//       currency
//     );
//     res.json(hotelRates);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error fetching hotel rates", error: error.message });
//   }
// };
// module.exports = { generateTripPlan, fetchHotelRates };

const liteApiService = require("../services/liteApiService");
const {
  generateItinerary,
  getSightseeingActivities,
} = require("../services/openAiService");

// ✅ Function to generate the trip plan
const generateTripPlan = async (req, res) => {
  try {
    console.log("🚀 Generating trip plan...");

    // 🟢 Extract user input
    const {
      startLocation,
      countryCode,
      cityName,
      interests,
      numTravelers,
      numNights,
      checkInDate,
      checkOutDate,
      budget,
      currency = "USD",
      guestNationality = "US",
    } = req.body;

    // 🛑 Validate required fields
    if (!countryCode && !cityName) {
      return res
        .status(400)
        .json({ message: "Either countryCode or cityName must be provided." });
    }

    // ✅ Step 1: Fetch Hotels from LiteAPI
    console.log("📌 Fetching hotels...");
    const hotels = await liteApiService.getHotels(
      countryCode,
      cityName,
      checkInDate,
      checkOutDate,
      budget,
      3
    );

    if (!hotels || hotels.length === 0) {
      return res.status(404).json({
        message: "No hotels available for the given destination and dates.",
      });
    }

    console.log(`✅ Hotels Retrieved: ${hotels.length}`);

    // ✅ Step 2: Fetch Hotel Rates for Selected Hotels
    console.log("📌 Fetching hotel rates...");
    const hotelIds = hotels.map((hotel) => hotel.id).filter((id) => id); // Remove null values

    if (hotelIds.length === 0) {
      return res
        .status(404)
        .json({ message: "No valid hotel IDs found for the given criteria." });
    }

    const hotelRates = await liteApiService.getHotelRates(
      hotelIds,
      checkInDate,
      checkOutDate,
      numTravelers,
      [],
      currency,
      guestNationality
    );

    if (!hotelRates || hotelRates.length === 0) {
      return res.status(404).json({
        message: "No rates found for the selected hotels.",
      });
    }

    console.log(`✅ Hotel Rates Retrieved: ${hotelRates.length}`);

    // ✅ Step 3: Fetch Weather Data
    console.log("📌 Fetching weather...");
    const weather = await liteApiService.getWeather(cityName || countryCode);
    console.log("✅ Weather Data Retrieved.");

    // ✅ Step 4: Generate Itinerary using OpenAI
    console.log("📌 Generating itinerary...");
    const itinerary = await generateItinerary(cityName, numNights, interests);
    console.log("✅ Itinerary Generated.");

    // ✅ Step 5: Fetch Sightseeing Locations
    console.log("📌 Fetching sightseeing locations...");
    const sightseeing = await getSightseeingActivities(cityName);
    console.log("✅ Sightseeing Locations Retrieved.");

    // ✅ Step 6: Format Hotel Data
    console.log("📌 Formatting hotel data...");
    // ✅ Map rates with corresponding hotel details (matching by hotelId)
    const formattedHotels = hotelRates.map((hotel) => {
      // Find the hotel details from the `hotels` API response
      const hotelDetails = hotels.find((h) => h.id === hotel.hotelId) || {};

      return {
        hotelId: hotel.hotelId,
        name: hotelDetails.name || "Unknown Hotel", // ✅ Fetch hotel name
        roomTypes: hotel.roomTypes.slice(0, 3).map((room) => {
          const rate = room.rates?.[0] || {}; // Get the first rate safely
          const retailRate =
            rate.retailRate?.total && rate.retailRate.total.length > 0
              ? rate.retailRate.total[0]
              : { amount: "N/A", currency: "USD" };

          return {
            name: rate.name || "No Name",
            maxOccupancy: rate.maxOccupancy || "N/A",
            boardType: rate.boardType || "N/A",
            price: retailRate.amount ?? "N/A",
            currency: retailRate.currency ?? "USD",
            taxesAndFees: rate.retailRate?.taxesAndFees ?? "N/A",
            priceType: rate.priceType || "N/A",
            offerRetailRate: room.offerRetailRate?.amount ?? "N/A",
            suggestedSellingPrice: room.suggestedSellingPrice?.amount ?? "N/A",
            offerInitialPrice: room.offerInitialPrice?.amount ?? "N/A",
            refundableTag:
              rate.cancellationPolicies?.refundableTag ?? "Unknown",
            cancellationPolicy:
              rate.cancellationPolicies?.cancelPolicyInfos || [],
          };
        }),
      };
    });

    console.log(
      "✅ Formatted Hotel Data:",
      JSON.stringify(formattedHotels, null, 2)
    );

    // ✅ Step 7: Calculate Estimated Cost
    console.log("📌 Calculating estimated cost...");
    const estimatedCost = calculateTotalCost(
      hotelRates,
      numTravelers,
      numNights
    );
    console.log("✅ Estimated Cost:", estimatedCost);

    // ✅ Final Trip Plan Response
    const tripPlan = {
      destination: cityName,
      startLocation,
      checkInDate,
      checkOutDate,
      numTravelers,
      numNights,
      weather,
      hotels: formattedHotels,
      activities: itinerary,
      sightseeing,
      estimatedCost,
    };

    console.log("✅ Trip Plan Generated Successfully!");
    res.json(tripPlan);
  } catch (error) {
    console.error("❌ ERROR: Failed to generate trip plan:", error);
    res
      .status(500)
      .json({ message: "Error generating trip plan", error: error.message });
  }
};

// ✅ Helper function to calculate the total estimated cost
const calculateTotalCost = (hotels, numTravelers, numNights) => {
  let totalCost = 0;

  hotels.forEach((hotel) => {
    if (hotel.roomTypes && hotel.roomTypes.length > 0) {
      const firstRoom = hotel.roomTypes[0];
      const pricePerNight =
        firstRoom.price && firstRoom.price !== "N/A"
          ? parseFloat(firstRoom.price)
          : 0;

      totalCost += pricePerNight * numTravelers * numNights;
    }
  });

  return totalCost;
};

/**
 * ✅ Fetches rates for selected hotels.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
const fetchHotelRates = async (req, res) => {
  try {
    const {
      hotelIds,
      checkInDate,
      checkOutDate,
      adults,
      childrenAges,
      currency,
    } = req.body;

    if (!hotelIds || hotelIds.length === 0) {
      return res.status(400).json({ message: "Hotel IDs are required." });
    }

    const hotelRates = await liteApiService.getHotelRates(
      hotelIds,
      checkInDate,
      checkOutDate,
      adults,
      childrenAges,
      currency
    );

    res.json(hotelRates);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching hotel rates", error: error.message });
  }
};

// ✅ Export functions
module.exports = { generateTripPlan, fetchHotelRates };
