const liteApiService = require("../services/liteApiService");
const {
  generateItinerary,
  getSightseeingActivities,
} = require("../services/openAiService");
const duffelService = require("../services/duffelService");
const tourService = require("../services/tourService");
const ACTIVITY_LINKER_API_KEY = process.env.ACTIVITY_LINKER_API_KEY;
const axios = require("axios");
const { generateDescriptionUsingOpenAI } = require("../services/openAiService"); // Import the OpenAI function

// Helper function to fetch tours for a given destination
const getToursForCity = async (destination) => {
  try {
    const [cityName, countryName] = destination
      .split(",")
      .map((str) => str.trim());

    console.log(
      `📌 Fetching tours for city: ${cityName}, country: ${countryName}...`
    );

    // Step 1: Fetch the country-specific tours from ActivityLinker to get the countryId
    const countryResponse = await axios.get(
      "https://api.activitylinker.com/api/apiTour/country",
      {
        headers: {
          Authorization: `Bearer ${ACTIVITY_LINKER_API_KEY}`,
        },
      }
    );

    const country = countryResponse.data.result.find(
      (item) => item.countryName.toLowerCase() === countryName.toLowerCase()
    );

    if (!country) {
      console.error("❌ Country not found in ActivityLinker API.");
      return [];
    }

    const countryId = country.countryId;

    // Step 2: Fetch the list of cities for the country
    const cityResponse = await axios.post(
      `https://api.activitylinker.com/api/apiTour/city`,
      { CountryId: countryId }, // JSON request body
      {
        headers: {
          Authorization: `Bearer ${ACTIVITY_LINKER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const city = cityResponse.data.result.find(
      (item) => item.cityName.toLowerCase() === cityName.toLowerCase()
    );

    if (!city) {
      console.error("❌ City not found in ActivityLinker API.");
      return [];
    }

    const cityId = city.cityId;

    // Step 3: Fetch tours based on the countryId and cityId
    const toursResponse = await axios.post(
      `https://api.activitylinker.com/api/apiTour/tourstaticdata`,
      { CountryId: countryId, CityId: cityId }, // JSON request body
      {
        headers: {
          Authorization: `Bearer ${ACTIVITY_LINKER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return toursResponse.data.result || [];
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch tours:", error.message);
    return [];
  }
};

// Function to handle the multi-destination trip plan
const generateMultiTripPlan = async (req, res) => {
  try {
    console.log("🚀 Generating multi-destination trip plan...");

    const trips = req.body;

    if (!Array.isArray(trips) || trips.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid trip data. Provide an array of trips." });
    }

    let multiTripPlan = [];

    // Loop through each trip and process them
    for (const trip of trips) {
      console.log(
        `📌 Processing trip from ${trip.startLocation} to ${trip.destination}...`
      );
      const tripPlan = await generateTripPlanInternal(trip);
      multiTripPlan.push(tripPlan);
    }

    console.log("✅ Multi-Destination Trip Plan Generated Successfully!");
    res.json({ trips: multiTripPlan });
  } catch (error) {
    console.error("❌ ERROR: Failed to generate multi-trip plan:", error);
    res.status(500).json({
      message: "Error generating multi-trip plan",
      error: error.message,
    });
  }
};

// Helper function to generate a single trip plan
const generateTripPlanInternal = async (tripData) => {
  try {
    const {
      startLocation,
      destination,
      countryCode,
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
      accommodationPreference,
    } = tripData;

    const [cityName, countryName] = destination
      .split(",")
      .map((item) => item.trim());

    console.log("✅ Extracted Trip Data:", {
      startLocation,
      cityName,
      countryName,
      countryCode,
    });

    // Fetch flight, hotel, tour, and sightseeing data
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
      accommodationPreference,
      budget
    );

    if (!hotelRatesResponse || hotelRatesResponse.length === 0) {
      console.error("❌ ERROR: No hotels found.");
      return { message: "No hotels found for destination" };
    }

    const flightResponse = await duffelService.searchFlights(
      flightOrigin,
      flightDestination,
      checkInDate,
      numTravelers
    );

    let selectedFlight = null;
    if (
      flightResponse.data.data.offers &&
      flightResponse.data.data.offers.length > 0
    ) {
      const flightOffers = flightResponse.data.data.offers;
      selectedFlight = flightOffers.reduce((cheapest, flight) => {
        const flightCost = parseFloat(flight.total_amount);
        return !cheapest ||
          (flightCost <= budget &&
            flightCost < parseFloat(cheapest.total_amount))
          ? flight
          : cheapest;
      }, null);
    }

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

    // Fetch Tours and Sightseeing data
    const tours = await getToursForCity(destination);
    const sightseeing = await getSightseeingActivities(cityName, interests);

    let itinerary = [];
    if (tours.length >= numNights) {
      itinerary = await generateItineraryWithTours(cityName, numNights, tours);
    } else {
      itinerary = await generateFullItinerary(
        cityName,
        numNights,
        interests,
        sightseeing
      );
    }

    // Estimate the total cost
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

    return {
      destination: cityName,
      startLocation,
      checkInDate,
      checkOutDate,
      numTravelers,
      numNights,
      flight: formattedFlight,
      hotels: hotelRatesResponse,
      sightseeing,
      tours,
      itinerary,
      estimatedCost,
    };
  } catch (error) {
    console.error("❌ ERROR: Failed to generate trip plan:", error);
    return { message: "Error generating trip plan", error: error.message };
  }
};

// Function to generate itinerary with tours
const generateItineraryWithTours = async (cityName, numNights, tours) => {
  const itinerary = [];
  for (let i = 0; i < numNights; i++) {
    const tour = tours[i % tours.length]; // Use tours for the days
    const originalDescription =
      tour.tourShortDescription || "No description available.";

    const generatedDescription = await generateDescriptionUsingOpenAI(
      originalDescription
    );

    itinerary.push({
      day: i + 1,
      tour: tour,
      activity: tour.tourName || "Tour Activity",
      description: generatedDescription || "A special tour activity for today.",
    });
  }

  return itinerary;
};

// Function to generate full itinerary if not enough tours
const generateFullItinerary = async (
  cityName,
  numNights,
  interests,
  sightseeing
) => {
  const itinerary = [];
  const remainingDays = numNights;

  const openAiItinerary = await generateItinerary(
    cityName,
    remainingDays,
    interests
  );

  for (let i = 0; i < remainingDays; i++) {
    if (i < openAiItinerary.length) {
      itinerary.push(openAiItinerary[i]);
    } else {
      itinerary.push({
        day: i + 1,
        activity: sightseeing[i % sightseeing.length]?.name || "Sightseeing",
        description:
          sightseeing[i % sightseeing.length]?.description ||
          "Visit the city's famous landmarks.",
      });
    }
  }

  return itinerary;
};

// Export the multi-destination function for routing
module.exports = { generateMultiTripPlan };
