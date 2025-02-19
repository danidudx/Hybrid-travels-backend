const liteApiService = require("../services/liteApiService");
const {
  generateItinerary,
  getSightseeingActivities,
} = require("../services/openAiService");
const duffelService = require("../services/duffelService");

const generateTripPlan = async (req, res) => {
  try {
    console.log("🚀 Generating trip plan...");

    // ✅ Extract User Inputs
    const {
      startLocation,
      countryCode,
      cityName,
      interests, // User travel interests
      numTravelers,
      numNights,
      checkInDate,
      checkOutDate,
      budget, // Budget for hotels & flights
      currency = "USD",
      guestNationality = "US",
      flightOrigin,
      flightDestination,
      accommodationPreference, // New input for hotel filtering
    } = req.body;

    console.log("✅ Extracted User Inputs:", {
      countryCode,
      cityName,
      checkInDate,
      checkOutDate,
      flightOrigin,
      flightDestination,
      interests,
      accommodationPreference,
      budget,
    });

    // ✅ Fetch Hotel Rates Based on User Preferences
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
      10,
      accommodationPreference, // Pass user preference
      budget // Pass max budget
    );

    if (!hotelRatesResponse || hotelRatesResponse.length === 0) {
      console.error("❌ ERROR: No hotels found.");
      return res
        .status(404)
        .json({ message: "No hotels available within your preferences." });
    }

    console.log("✅ Hotel Rates Retrieved:", hotelRatesResponse.length);

    // ✅ Fetch Flights Using Duffel API (With Budget Constraint)
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

      // ✅ Select the cheapest flight within budget
      selectedFlight = flightOffers.reduce((cheapest, flight) => {
        const flightCost = parseFloat(flight.total_amount);
        return !cheapest ||
          (flightCost <= budget &&
            flightCost < parseFloat(cheapest.total_amount))
          ? flight
          : cheapest;
      }, null);

      if (!selectedFlight) {
        console.error("❌ ERROR: No flights found within budget.");
        selectedFlight = null;
      } else {
        console.log("✅ Selected Flight:", selectedFlight);
      }
    } else {
      console.error("❌ ERROR: No flights found.");
    }

    // ✅ Format Selected Flight Data
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
        }
      : null;

    // ✅ Generate Itinerary Based on Interests
    console.log("📌 Generating itinerary...");
    const itinerary = await generateItinerary(cityName, numNights, interests);
    console.log("✅ Itinerary Generated.");

    // ✅ Fetch Sightseeing Locations Based on Interests
    console.log("📌 Fetching sightseeing locations...");
    const sightseeing = await getSightseeingActivities(cityName, interests);
    console.log("✅ Sightseeing Locations Retrieved.");

    // ✅ Calculate Estimated Cost
    console.log("📌 Calculating estimated cost...");
    const estimatedHotelCost = hotelRatesResponse.reduce((acc, hotel) => {
      return (
        acc +
        (hotel.roomTypes?.[0]?.rates?.[0]?.retailRate?.total?.[0]?.amount ??
          0) *
          numTravelers *
          numNights
      );
    }, 0);

    const estimatedFlightCost = formattedFlight
      ? parseFloat(formattedFlight.totalAmount)
      : 0;
    const estimatedCost = estimatedHotelCost + estimatedFlightCost;

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
      hotels: hotelRatesResponse,
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
