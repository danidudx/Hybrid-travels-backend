const liteApiService = require("../services/liteApiService");
const {
  generateItinerary,
  getSightseeingActivities,
} = require("../services/openAiService");
const duffelService = require("../services/duffelService");
const tourService = require("../services/tourService"); // Import the new tourService
const ACTIVITY_LINKER_API_KEY = process.env.ACTIVITY_LINKER_API_KEY;
const axios = require("axios");

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

    // Find the countryId based on the country name
    const country = countryResponse.data.result.find(
      (item) => item.countryName.toLowerCase() === countryName.toLowerCase()
    );

    if (!country) {
      console.error("❌ Country not found in ActivityLinker API.");
      return [];
    }
    const countryId = country.countryId;

    // Step 2: Fetch the list of cities for the country
    const cityResponse = await axios.get(
      "https://api.activitylinker.com/api/apiTour/city",
      {
        headers: {
          Authorization: `Bearer ${ACTIVITY_LINKER_API_KEY}`,
        },
        params: {
          countryId: countryId, // Using the countryId obtained
        },
      }
    );

    // Find the cityId based on the city name
    const city = cityResponse.data.result.find(
      (item) => item.cityName.toLowerCase() === cityName.toLowerCase()
    );

    if (!city) {
      console.error("❌ City not found in ActivityLinker API.");
      return [];
    }
    const cityId = city.cityId;

    // Step 3: Fetch tours based on the countryId and cityId
    const toursResponse = await axios.get(
      "https://api.activitylinker.com/api/apiTour/tourstaticdata",
      {
        headers: {
          Authorization: `Bearer ${ACTIVITY_LINKER_API_KEY}`,
        },
        params: {
          countryId: countryId, // Provide countryId from previous step
          cityId: cityId, // Provide cityId from matching city name
        },
      }
    );

    return toursResponse.data.result || [];
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch tours:", error.message);
    return [];
  }
};

const { generateDescriptionUsingOpenAI } = require("../services/openAiService"); // Import the OpenAI function

const generateTripPlan = async (req, res) => {
  try {
    console.log("🚀 Generating trip plan...");

    // ✅ Extract User Inputs
    const {
      startLocation,
      destination, // Updated to include both city and country
      countryCode, // Country code for hotel filtering
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

    // ✅ Extract city and country from the new destination format (city, country)
    const [cityName, countryName] = destination
      .split(",")
      .map((item) => item.trim());

    console.log("✅ Extracted User Inputs:", {
      startLocation,
      cityName,
      countryName,
      countryCode,
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
      countryCode, // Use country code for hotel filtering
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

      // Select the cheapest flight within budget
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

    // Format Selected Flight Data
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

    // ✅ Fetch Tours Based on User Preferences and City
    console.log("📌 Fetching tours...");
    const tours = await tourService.getToursForCity(cityName, countryName);
    console.log("✅ Tours Retrieved:", tours.length);

    // ✅ Fetch Sightseeing Locations Based on Interests
    console.log("📌 Fetching sightseeing locations...");
    const sightseeing = await getSightseeingActivities(cityName, interests);
    console.log("✅ Sightseeing Locations Retrieved.");

    // ✅ Generate Itinerary Based on Tours or Sightseeing
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

    // Final Trip Plan Response
    const tripPlan = {
      destination: cityName,
      startLocation,
      checkInDate,
      checkOutDate,
      numTravelers,
      numNights,
      flight: formattedFlight,
      hotels: hotelRatesResponse,
      sightseeing, // Add sightseeing places separately
      tours, // Add tours separately
      itinerary, // Generated itinerary
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

// Function to generate itinerary with tours
const generateItineraryWithTours = async (cityName, numNights, tours) => {
  const itinerary = [];

  for (let i = 0; i < numNights; i++) {
    const tour = tours[i % tours.length]; // Use tours for the days
    const originalDescription =
      tour.tourShortDescription || "No description available.";

    // Generate more engaging description using OpenAI
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

  // Generate itinerary using OpenAI
  const openAiItinerary = await generateItinerary(
    cityName,
    remainingDays,
    interests
  );

  // Fill the days with sightseeing or other activities
  for (let i = 0; i < remainingDays; i++) {
    if (i < openAiItinerary.length) {
      itinerary.push(openAiItinerary[i]);
    } else {
      // Fallback to sightseeing if OpenAI doesn't provide enough activities
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

module.exports = { generateTripPlan };

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
