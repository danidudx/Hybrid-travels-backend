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
const duffelService = require("../services/duffelService");

const generateTripPlan = async (req, res) => {
  try {
    console.log("🚀 Generating trip plan...");

    // Extract user input
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
      flightOrigin,
      flightDestination,
    } = req.body;

    console.log("✅ Extracted Parameters:", {
      countryCode,
      cityName,
      checkInDate,
      checkOutDate,
      flightOrigin,
      flightDestination,
    });

    // ✅ Fetch hotel rates
    console.log("📌 Fetching hotel rates...");
    const hotelRatesResponse = await liteApiService.getHotelRates(
      cityName,
      countryCode,
      checkInDate,
      checkOutDate,
      Number(numTravelers),
      [],
      currency,
      guestNationality,
      10
    );

    if (!hotelRatesResponse || hotelRatesResponse.length === 0) {
      console.error("❌ ERROR: No hotel rates found.");
      return res.status(404).json({ message: "No hotel rates found." });
    }

    console.log("✅ Hotel Rates Retrieved:", hotelRatesResponse.length);

    // ✅ Fetch first hotel details
    const firstHotel = hotelRatesResponse[0];
    console.log("📌 Fetching full details for hotel ID:", firstHotel.hotelId);
    const fullHotelDetails = await liteApiService.getHotelDetails(
      firstHotel.hotelId
    );

    const firstHotelDetails = {
      hotelId: firstHotel.hotelId,
      name: fullHotelDetails?.name || "Unknown Hotel",
      address: fullHotelDetails?.address || "N/A",
      rating: fullHotelDetails?.rating || "N/A",
      mainPhoto: fullHotelDetails?.main_photo || "N/A",
      amenities: fullHotelDetails?.amenities || [],
      roomTypes: firstHotel.roomTypes.map((room) => ({
        name: room.rates[0]?.name || "No Name",
        price: room.rates[0].retailRate.total[0].amount ?? "N/A",
        currency: room.rates[0].retailRate.total?.[0]?.currency ?? currency,
      })),
    };

    console.log("✅ First Hotel Details Processed:", firstHotelDetails);

    // ✅ Fetch flights using Duffel API
    console.log("📌 Searching for flights...");
    const flightResponse = await duffelService.searchFlights(
      flightOrigin,
      flightDestination,
      checkInDate,
      numTravelers
    );

    let selectedFlight = null;

    if (
      flightResponse &&
      flightResponse.data &&
      flightResponse.data.data &&
      flightResponse.data.data.offers &&
      flightResponse.data.data.offers.length > 0
    ) {
      console.log(
        "✅ Flights Retrieved:",
        flightResponse.data.data.offers.length
      );

      const flightOffers = flightResponse.data.data.offers;

      // ✅ Select the cheapest flight
      selectedFlight = flightOffers.reduce((cheapest, flight) => {
        return !cheapest ||
          parseFloat(flight.total_amount) < parseFloat(cheapest.total_amount)
          ? flight
          : cheapest;
      }, null);

      console.log("✅ Selected Flight:", selectedFlight);
    } else {
      console.error("❌ ERROR: No flights found.");
    }

    // ✅ Format selected flight data
    const formattedFlight = selectedFlight
      ? {
          flightId: selectedFlight.id,
          departure: selectedFlight.slices[0]?.origin?.name || "Unknown",
          arrival: selectedFlight.slices[0]?.destination?.name || "Unknown",
          departureTime:
            selectedFlight.slices[0]?.segments[0]?.departing_at || "Unknown",
          arrivalTime:
            selectedFlight.slices[0]?.segments[
              selectedFlight.slices[0]?.segments.length - 1
            ]?.arriving_at || "Unknown",
          airline: selectedFlight.owner?.name || "Unknown Airline",
          totalAmount: selectedFlight.total_amount || "N/A",
          currency: selectedFlight.total_currency || "N/A",
          owner: selectedFlight.owner || "N/A",
        }
      : null;

    // ✅ Generate itinerary
    console.log("📌 Generating itinerary...");
    const itinerary = await generateItinerary(cityName, numNights, interests);
    console.log("✅ Itinerary Generated.");

    // ✅ Fetch sightseeing locations
    console.log("📌 Fetching sightseeing locations...");
    const sightseeing = await getSightseeingActivities(cityName);
    console.log("✅ Sightseeing Locations Retrieved.");

    // ✅ Calculate estimated cost
    console.log("📌 Calculating estimated cost...");
    const estimatedCost = firstHotelDetails.roomTypes.reduce((acc, room) => {
      return (
        acc +
        (room.price !== "N/A"
          ? parseFloat(room.price) * numTravelers * numNights
          : 0)
      );
    }, 0);

    console.log("✅ Estimated Cost:", estimatedCost);

    // ✅ Final Trip Plan Response
    const tripPlan = {
      destination: cityName,
      startLocation,
      checkInDate,
      checkOutDate,
      numTravelers,
      numNights,
      flight: formattedFlight,
      hotels: [firstHotelDetails],
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

//     console.log("✅ Extracted Parameters:", {
//       countryCode,
//       cityName,
//       checkInDate,
//       checkOutDate,
//     });

//     // Fetch hotel rates
//     console.log("📌 Fetching hotel rates...");
//     const hotelRatesResponse = await liteApiService.getHotelRates(
//       cityName,
//       countryCode,
//       checkInDate,
//       checkOutDate,
//       Number(numTravelers),
//       [],
//       "USD",
//       guestNationality,
//       10
//     );

//     if (!hotelRatesResponse || hotelRatesResponse.length === 0) {
//       console.error("❌ ERROR: No hotel rates found.");
//       return res.status(404).json({ message: "No hotel rates found." });
//     }

//     console.log("✅ Hotel Rates Retrieved:", hotelRatesResponse.length);

//     // Extract first hotel details
//     const firstHotel = hotelRatesResponse[0];
//     console.log("✅ First Hotel:", firstHotel);

//     // Fetch additional hotel details using hotelId
//     console.log(
//       `📌 Fetching full details for hotel ID: ${firstHotel.hotelId}...`
//     );
//     const fullHotelDetails = await liteApiService.getHotelDetails(
//       firstHotel.hotelId
//     );

//     if (!fullHotelDetails) {
//       console.warn(
//         `⚠️ Warning: No additional details found for hotel ID ${firstHotel.hotelId}`
//       );
//     } else {
//       console.log("✅ Full Hotel Details Retrieved:", fullHotelDetails);
//     }

//     // Format first hotel details
//     const firstHotelDetails = {
//       hotelId: firstHotel.hotelId,
//       data: fullHotelDetails,

//       roomTypes: firstHotel.roomTypes.map((room) => {
//         console.log("🔍 Checking Room:", room);

//         return {
//           name: room.rates[0].name || "No Name",
//           maxOccupancy: room.rates[0].maxOccupancy || "N/A",
//           boardType: room.rates[0].boardName || "N/A",
//           price: room.retailRate?.total?.[0]?.amount ?? "N/A",
//           currency: room.retailRate?.total?.[0]?.currency ?? currency,
//           taxesAndFees: room.retailRate?.taxesAndFees || "N/A",
//           priceType: room.rates[0].priceType || "N/A",
//           offerRetailRate: room.offerRetailRate?.amount || "N/A",
//           suggestedSellingPrice: room.suggestedSellingPrice?.amount || "N/A",
//           offerInitialPrice: room.offerInitialPrice?.amount || "N/A",
//           refundableTag: room.cancellationPolicies?.refundableTag || "N/A",
//           cancellationPolicy:
//             room.cancellationPolicies?.cancelPolicyInfos || [],
//         };
//       }),
//     };

//     console.log("✅ First Hotel Details Processed:", firstHotelDetails);

//     // Extract the next 9 hotel IDs
//     const nextHotelIds = hotelRatesResponse
//       .slice(1, 10)
//       .map((hotel) => hotel.hotelId);
//     console.log("✅ Next 9 Hotel IDs:", nextHotelIds);

//     // Fetch weather data
//     const weather = hotelRatesResponse.weather || {};
//     console.log("✅ Weather Data:", weather);

//     // Generate itinerary
//     console.log("📌 Generating itinerary...");
//     const itinerary = await generateItinerary(cityName, numNights, interests);
//     console.log("✅ Itinerary Generated.");

//     // Fetch sightseeing locations
//     console.log("📌 Fetching sightseeing locations...");
//     const sightseeing = await getSightseeingActivities(cityName);
//     console.log("✅ Sightseeing Locations Retrieved.");

//     // Calculate Estimated Cost
//     console.log("📌 Calculating estimated cost...");
//     const estimatedCost = firstHotelDetails.roomTypes.reduce((acc, room) => {
//       return (
//         acc +
//         (room.price !== "N/A"
//           ? parseFloat(room.price) * numTravelers * numNights
//           : 0)
//       );
//     }, 0);

//     console.log("✅ Estimated Cost:", estimatedCost);

//     // Final Trip Plan Response
//     const tripPlan = {
//       destination: cityName,
//       startLocation,
//       checkInDate,
//       checkOutDate,
//       numTravelers,
//       numNights,
//       weather,
//       firstHotel: firstHotelDetails,
//       nextHotelIds,
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
