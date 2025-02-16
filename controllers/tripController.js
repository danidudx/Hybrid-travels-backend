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
