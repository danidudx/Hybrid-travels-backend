const liteApiService = require("../services/liteApiService");
const {
  getIATACode,
  generateItinerary,
  getSightseeingActivities,
  generateOtherTours,
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

    const trips = req.body; // Extract the trips array from request body

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
// const generateTripPlanInternal = async (tripData) => {
//   try {
//     const {
//       startLocation,
//       destination,
//       countryCode,
//       interests,
//       numTravelers,
//       numNights,
//       checkInDate,
//       checkOutDate,
//       budget,
//       currency = "USD",
//       guestNationality = "US",
//       // flightOrigin,
//       // flightDestination,
//       accommodationPreference,
//     } = tripData;

//     const [cityName, countryName] = destination
//       .split(",")
//       .map((item) => item.trim());

//     console.log("✅ Extracted Trip Data:", {
//       startLocation,
//       cityName,
//       countryName,
//       countryCode,
//     });

//     // Fetch flight, hotel, tour, and sightseeing data
//     const hotelRatesResponse = await liteApiService.getHotelRates(
//       cityName,
//       countryCode,
//       checkInDate,
//       checkOutDate,
//       Number(numTravelers),
//       [],
//       currency,
//       guestNationality,
//       10,
//       accommodationPreference,
//       budget
//     );

//     if (!hotelRatesResponse || hotelRatesResponse.length === 0) {
//       console.error("❌ ERROR: No hotels found.");
//       return { message: "No hotels found for destination" };
//     }
//     const flightOrigin = await getIATACode(startLocation);
//     console.log("IATA code for origin:", flightOrigin);
//     const flightDestination = await getIATACode(destination);
//     console.log("IATA code for destination:", flightDestination);
//     console.log("numtravelers:", numTravelers);

//     const flightResponse = await duffelService.searchFlights(
//       flightOrigin,
//       flightDestination,
//       checkInDate,
//       numTravelers
//     );

//     let selectedFlight = null;
//     if (
//       flightResponse.data.data.offers &&
//       flightResponse.data.data.offers.length > 0
//     ) {
//       const flightOffers = flightResponse.data.data.offers;
//       selectedFlight = flightOffers.reduce((cheapest, flight) => {
//         const flightCost = parseFloat(flight.total_amount);
//         return !cheapest ||
//           (flightCost <= budget &&
//             flightCost < parseFloat(cheapest.total_amount))
//           ? flight
//           : cheapest;
//       }, null);
//     }

//     const fullFlightData = selectedFlight;
//     const formattedFlight = selectedFlight
//       ? {
//           flightId: selectedFlight.id,
//           departure: selectedFlight.slices[0]?.origin?.name || "Unknown",
//           arrival: selectedFlight.slices[0]?.destination?.name || "Unknown",
//           departureTime:
//             selectedFlight.slices[0]?.segments[0]?.departing_at || "Unknown",
//           arrivalTime:
//             selectedFlight.slices[0]?.segments[
//               selectedFlight.slices[0]?.segments.length - 1
//             ]?.arriving_at || "Unknown",
//           airline: selectedFlight.owner?.name || "Unknown Airline",
//           totalAmount: selectedFlight.total_amount || "N/A",
//           currency: selectedFlight.total_currency || "N/A",
//         }
//       : null;

//     // Fetch Tours and Sightseeing data
//     const tours = await getToursForCity(destination);
//     const sightseeing = await getSightseeingActivities(cityName, interests);

//     let itinerary = [];
//     if (tours.length >= numNights) {
//       itinerary = await generateItineraryWithTours(cityName, numNights, tours);
//     } else {
//       itinerary = await generateFullItineraryWithSightseeing(
//         cityName,
//         numNights,
//         interests,
//         tours,
//         sightseeing
//       );
//     }

//     // Estimate the total cost
//     const estimatedHotelCost = hotelRatesResponse.reduce((acc, hotel) => {
//       return (
//         acc +
//         (hotel.roomTypes?.[0]?.rates?.[0]?.retailRate?.total?.[0]?.amount ??
//           0) *
//           numTravelers *
//           numNights
//       );
//     }, 0);

//     const estimatedFlightCost = formattedFlight
//       ? parseFloat(formattedFlight.totalAmount)
//       : 0;
//     const estimatedCost = estimatedHotelCost + estimatedFlightCost;

//     return {
//       destination: cityName,
//       startLocation,
//       checkInDate,
//       checkOutDate,
//       numTravelers,
//       numNights,
//       flight: fullFlightData,
//       hotels: hotelRatesResponse,
//       sightseeing,
//       tours,
//       itinerary,
//       estimatedCost,
//     };
//   } catch (error) {
//     console.error("❌ ERROR: Failed to generate trip plan:", error);
//     return { message: "Error generating trip plan", error: error.message };
//   }
// };

// const generateTripPlanInternal = async (tripData) => {
//   try {
//     const {
//       startLocation,
//       destination,
//       countryCode,
//       interests,
//       numTravelers,
//       numNights,
//       checkInDate,
//       checkOutDate,
//       budget,
//       currency = "USD",
//       guestNationality = "US",
//       accommodationPreference,
//     } = tripData;

//     const [cityName, countryName] = destination
//       .split(",")
//       .map((item) => item.trim());

//     console.log("✅ Extracted Trip Data:", {
//       startLocation,
//       cityName,
//       countryName,
//       countryCode,
//     });

//     // Step 1: Fetch hotel rates
//     const hotelRatesResponse = await liteApiService.getHotelRates(
//       cityName,
//       countryCode,
//       checkInDate,
//       checkOutDate,
//       Number(numTravelers),
//       [],
//       currency,
//       guestNationality,
//       10,
//       accommodationPreference,
//       budget
//     );

//     if (!hotelRatesResponse || hotelRatesResponse.length === 0) {
//       console.error("❌ ERROR: No hotels found.");
//       return { message: "No hotels found for destination" };
//     }

//     // Step 2: Filter hotels within budget
//     const hotelsWithinBudget = hotelRatesResponse.filter((hotel) => {
//       const hotelCost =
//         (hotel.roomTypes?.[0]?.rates?.[0]?.retailRate?.total?.[0]?.amount ??
//           0) *
//         numTravelers *
//         numNights;
//       return hotelCost <= budget;
//     });

//     // If no hotels are within budget, include the cheapest option
//     const selectedHotels =
//       hotelsWithinBudget.length > 0
//         ? hotelsWithinBudget
//         : [
//             hotelRatesResponse.reduce((cheapest, hotel) => {
//               const hotelCost =
//                 (hotel.roomTypes?.[0]?.rates?.[0]?.retailRate?.total?.[0]
//                   ?.amount ?? 0) *
//                 numTravelers *
//                 numNights;
//               return !cheapest || hotelCost < cheapest.cost
//                 ? { ...hotel, cost: hotelCost }
//                 : cheapest;
//             }, null),
//           ];

//     // Step 3: Calculate total hotel cost
//     const estimatedHotelCost = selectedHotels.reduce((acc, hotel) => {
//       return (
//         acc +
//         (hotel.roomTypes?.[0]?.rates?.[0]?.retailRate?.total?.[0]?.amount ??
//           0) *
//           numTravelers *
//           numNights
//       );
//     }, 0);

//     console.log(
//       `Hotel: ${hotel.name}, Cost per night per traveler: ${hotel.roomTypes?.[0]?.rates?.[0]?.retailRate?.total?.[0]?.amount}, ` +
//         `Total Hotel Cost for ${numTravelers} travelers for ${numNights} nights: ${hotelCost}`
//     );

//     console.log(`Total Estimated Hotel Cost: ${estimatedHotelCost}`);
//     // Step 4: Fetch flight data
//     const flightOrigin = await getIATACode(startLocation);
//     const flightDestination = await getIATACode(destination);
//     const flightResponse = await duffelService.searchFlights(
//       flightOrigin,
//       flightDestination,
//       checkInDate,
//       numTravelers
//     );

//     let selectedFlight = null;
//     if (
//       flightResponse.data.data.offers &&
//       flightResponse.data.data.offers.length > 0
//     ) {
//       const flightOffers = flightResponse.data.data.offers;

//       // Filter flights within budget
//       const flightsWithinBudget = flightOffers.filter((flight) => {
//         const flightCost = parseFloat(flight.total_amount);
//         return flightCost <= budget;
//       });

//       // If no flights are within budget, include the cheapest option
//       selectedFlight =
//         flightsWithinBudget.length > 0
//           ? flightsWithinBudget.reduce((cheapest, flight) => {
//               const flightCost = parseFloat(flight.total_amount);
//               return !cheapest || flightCost < parseFloat(cheapest.total_amount)
//                 ? flight
//                 : cheapest;
//             }, null)
//           : flightOffers.reduce((cheapest, flight) => {
//               const flightCost = parseFloat(flight.total_amount);
//               return !cheapest || flightCost < parseFloat(cheapest.total_amount)
//                 ? flight
//                 : cheapest;
//             }, null);
//     }

//     const estimatedFlightCost = selectedFlight
//       ? parseFloat(selectedFlight.total_amount)
//       : 0;

//     // Log selected flight cost
//     console.log(
//       selectedFlight
//         ? `Selected Flight: ${selectedFlight.id}, Total Amount: ${selectedFlight.total_amount}`
//         : "No flight selected"
//     );

//     console.log(`Estimated Flight Cost: ${estimatedFlightCost}`);
//     // Step 5: Calculate total estimated cost
//     const estimatedCost = estimatedHotelCost + estimatedFlightCost;

//     // Step 6: Check if budget is exceeded
//     const isBudgetExceeded = estimatedCost > budget;

//     // Step 7: Fetch tours and sightseeing data
//     const tours = await getToursForCity(destination);
//     const sightseeing = await getSightseeingActivities(cityName, interests);

//     let itinerary = [];
//     if (tours.length >= numNights) {
//       itinerary = await generateItineraryWithTours(cityName, numNights, tours);
//     } else {
//       itinerary = await generateFullItineraryWithSightseeing(
//         cityName,
//         numNights,
//         interests,
//         tours,
//         sightseeing
//       );
//     }

//     // Step 8: Return the trip plan with budget information
//     return {
//       destination: cityName,
//       startLocation,
//       checkInDate,
//       checkOutDate,
//       numTravelers,
//       numNights,
//       flight: selectedFlight,
//       hotels: selectedHotels,
//       sightseeing,
//       tours,
//       itinerary,
//       estimatedCost,
//       budget,
//       isBudgetExceeded,
//       message: isBudgetExceeded
//         ? "The total cost exceeds the budget, but no cheaper options were available."
//         : "The trip plan is within the budget.",
//     };
//   } catch (error) {
//     console.error("❌ ERROR: Failed to generate trip plan:", error);
//     return { message: "Error generating trip plan", error: error.message };
//   }
// };

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

    // Fetch hotel rates
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

    // Filter hotels within budget
    const hotelsWithinBudget = hotelRatesResponse.filter((hotel) => {
      // The price already includes the total cost for the stay
      const hotelCost = hotel.room?.price ?? 0;
      return hotelCost <= budget;
    });

    // If no hotels are within budget, include the cheapest option
    const selectedHotels =
      hotelsWithinBudget.length > 0
        ? hotelsWithinBudget
        : [
            hotelRatesResponse.reduce((cheapest, hotel) => {
              const hotelCost = hotel.room?.price ?? 0;
              return !cheapest || hotelCost < cheapest.cost
                ? { ...hotel, cost: hotelCost }
                : cheapest;
            }, {}), // Initialize with an empty object to avoid null issues
          ];

    // Calculate total hotel cost
    const estimatedHotelCost = selectedHotels.reduce((acc, hotel) => {
      // The price already includes the total cost for the stay
      const hotelCost = hotel.room?.price ?? 0;

      console.log(
        `Hotel: ${hotel.name}, Total Hotel Cost: ${hotelCost} ${hotel.room?.currency}`
      );

      return acc + hotelCost;
    }, 0);

    console.log(`Total Estimated Hotel Cost: ${estimatedHotelCost}`);

    // Fetch flight data
    const flightOrigin = await getIATACode(startLocation);
    const flightDestination = await getIATACode(destination);
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

      // Filter flights within budget
      const flightsWithinBudget = flightOffers.filter((flight) => {
        const flightCost = parseFloat(flight.total_amount);
        return flightCost <= budget;
      });

      // If no flights are within budget, include the cheapest option
      selectedFlight =
        flightsWithinBudget.length > 0
          ? flightsWithinBudget.reduce((cheapest, flight) => {
              const flightCost = parseFloat(flight.total_amount);
              return !cheapest || flightCost < parseFloat(cheapest.total_amount)
                ? flight
                : cheapest;
            }, null)
          : flightOffers.reduce((cheapest, flight) => {
              const flightCost = parseFloat(flight.total_amount);
              return !cheapest || flightCost < parseFloat(cheapest.total_amount)
                ? flight
                : cheapest;
            }, null);
    }

    // Log selected flight cost
    console.log(
      selectedFlight
        ? `Selected Flight: ${selectedFlight.id}, Total Amount: ${selectedFlight.total_amount}`
        : "No flight selected"
    );

    const estimatedFlightCost = selectedFlight
      ? parseFloat(selectedFlight.total_amount)
      : 0;

    console.log(`Estimated Flight Cost: ${estimatedFlightCost}`);

    // Calculate total estimated cost
    const estimatedCost = estimatedHotelCost + estimatedFlightCost;

    console.log(`Estimated Total Cost (Hotel + Flight): ${estimatedCost}`);

    // Check if budget is exceeded
    const isBudgetExceeded = estimatedCost > budget;
    console.log(`Is Budget Exceeded? ${isBudgetExceeded ? "Yes" : "No"}`);

    // Fetch tours and sightseeing data
    const tours = await getToursForCity(destination);
    const sightseeing = await getSightseeingActivities(cityName, interests);

    let itinerary = [];
    if (tours.length >= numNights) {
      itinerary = await generateItineraryWithTours(cityName, numNights, tours);
    } else {
      itinerary = await generateFullItineraryWithSightseeing(
        cityName,
        numNights,
        interests,
        tours,
        sightseeing
      );
    }

    // Return the trip plan with budget information
    return {
      destination: cityName,
      startLocation,
      checkInDate,
      checkOutDate,
      numTravelers,
      numNights,
      flight: selectedFlight,
      hotels: selectedHotels,
      sightseeing,
      tours,
      itinerary,
      estimatedCost,
      budget,
      isBudgetExceeded,
      message: isBudgetExceeded
        ? "The total cost exceeds the budget, but no cheaper options were available."
        : "The trip plan is within the budget.",
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
// const generateFullItineraryWithSightseeing = async (
//   cityName,
//   numNights,
//   interests,
//   tours,
//   sightseeing
// ) => {
//   const itinerary = [];
//   const remainingDays = numNights;

//   // First, try to fill in with the available tours
//   let tourIndex = 0;
//   for (let i = 0; i < remainingDays; i++) {
//     if (tourIndex < tours.length) {
//       const tour = tours[tourIndex];
//       const originalDescription =
//         tour.tourShortDescription || "No description available.";

//       const generatedDescription = await generateDescriptionUsingOpenAI(
//         originalDescription
//       );

//       itinerary.push({
//         day: i + 1,
//         activity: tour.tourName || "Tour Activity",
//         description:
//           generatedDescription || "A special tour activity for today.",
//       });

//       tourIndex++; // Move to the next tour
//     } else {
//       // If we run out of tours, fallback to sightseeing
//       const sightseeingActivity = sightseeing[i % sightseeing.length];
//       itinerary.push({
//         day: i + 1,
//         activity: sightseeingActivity?.name || "Sightseeing",
//         description:
//           sightseeingActivity?.description ||
//           "Visit the city's famous landmarks.",
//       });
//     }
//   }

//   return itinerary;
// };

// const generateFullItineraryWithSightseeing = async (
//   cityName,
//   numNights,
//   interests,
//   tours,
//   sightseeing
// ) => {
//   const itinerary = [];
//   let tourIndex = 0; // To keep track of the current tour
//   const usedTours = new Set(); // To track tours already assigned
//   const usedSightseeing = new Set(); // To track sightseeing activities already assigned

//   // Step 1: First, assign all available tours to the itinerary
//   for (let i = 0; i < numNights; i++) {
//     if (tourIndex < tours.length) {
//       // Assign the available tour to this day
//       const tour = tours[tourIndex];
//       const originalDescription = tour.tourShortDescription;
//       const originalTitle = tour.tourName;
//       const generatedDescription = await generateDescriptionUsingOpenAI(
//         originalDescription,
//         originalTitle
//       );

//       itinerary.push({
//         day: i + 1,
//         activity: tour.tourName || "Tour Activity",
//         description:
//           generatedDescription || "A special tour activity for today.",
//         tour: {
//           tourId: tour.tourId,
//           tourName: tour.tourName,
//           duration: tour.duration,
//           rating: tour.rating,
//           reviewCount: tour.reviewCount,
//           imagePath: tour.imagePath,
//           cityId: tour.cityId,
//           cityName: tour.cityName,
//           cityTourType: tour.cityTourType,
//           countryId: tour.countryId,
//           countryName: tour.countryName,
//           tourShortDescription: tour.tourShortDescription,
//           recommended: tour.recommended,
//           cancellationPolicyName: tour.cancellationPolicyName,
//         },
//       });
//       usedTours.add(tour.tourName); // Mark the tour as used
//       tourIndex++; // Move to the next tour for the subsequent days
//     }
//   }

//   // Step 2: After all available tours are assigned, fill the remaining days with sightseeing
//   const remainingDays = numNights - tours.length;

//   if (remainingDays > 0) {
//     // Step 3: Generate non-duplicate sightseeing activities using OpenAI
//     const response = await generateOtherTours(
//       cityName,
//       usedTours,
//       remainingDays
//     );
//     // console.log("Generated remaining days activities:", response);

//     // Assign generated sightseeing activities
//     response.forEach((tour, index) => {
//       if (!usedTours.has(tour.name)) {
//         itinerary.push({
//           day: tours.length + index + 1, // Start after the last tour day
//           activity: tour.name || "Sightseeing",
//           description: tour.description || "Visit the city's famous landmarks.",
//         });
//         usedSightseeing.add(tour.name); // Mark the sightseeing activity as used
//       }
//     });
//   }

//   return itinerary;
// };

// const generateFullItineraryWithSightseeing = async (
//   cityName,
//   numNights,
//   interests,
//   tours,
//   sightseeing
// ) => {
//   const itinerary = [];
//   let tourIndex = 0; // To keep track of the current tour
//   const usedTours = new Set(); // To track tours already assigned
//   const usedSightseeing = new Set(); // To track sightseeing activities already assigned

//   // Step 1: First, assign all available tours to the itinerary
//   for (let i = 0; i < numNights; i++) {
//     if (tourIndex < tours.length) {
//       // Assign the available tour to this day
//       const tour = tours[tourIndex];
//       const originalDescription =
//         tour.tourShortDescription || "No description available.";
//       const originalTitle = tour.tourName;
//       const generatedDescription = await generateDescriptionUsingOpenAI(
//         originalDescription,
//         originalTitle
//       );

//       itinerary.push({
//         day: i + 1,
//         activity: tour.tourName || "Tour Activity",
//         description:
//           generatedDescription || "A special tour activity for today.",
//         activityType: "tour", // Label this day as a "tour"
//         tour: {
//           tourId: tour.tourId,
//           tourName: tour.tourName,
//           duration: tour.duration,
//           rating: tour.rating,
//           reviewCount: tour.reviewCount,
//           imagePath: tour.imagePath,
//           cityId: tour.cityId,
//           cityName: tour.cityName,
//           cityTourType: tour.cityTourType,
//           countryId: tour.countryId,
//           countryName: tour.countryName,
//           tourShortDescription: tour.tourShortDescription,
//           recommended: tour.recommended,
//           cancellationPolicyName: tour.cancellationPolicyName,
//         },
//       });
//       usedTours.add(tour.tourName); // Mark the tour as used
//       tourIndex++; // Move to the next tour for the subsequent days
//     }
//   }

//   // Step 2: After all available tours are assigned, fill the remaining days with sightseeing
//   const remainingDays = numNights - tours.length;

//   if (remainingDays > 0) {
//     // Step 3: Generate non-duplicate sightseeing activities using OpenAI
//     const response = await generateOtherTours(
//       cityName,
//       usedTours,
//       remainingDays
//     );
//     console.log("Generated remaining days activities:", response);

//     // Assign generated sightseeing activities
//     response.forEach((tour, index) => {
//       if (!usedTours.has(tour.name)) {
//         itinerary.push({
//           day: tours.length + index + 1, // Start after the last tour day
//           activity: tour.name || "Sightseeing",
//           description: tour.description || "Visit the city's famous landmarks.",
//           activityType: "sightseeing", // Label this day as "sightseeing"
//         });
//         usedSightseeing.add(tour.name); // Mark the sightseeing activity as used
//       }
//     });
//   }

//   return itinerary;
// };

const generateFullItineraryWithSightseeing = async (
  cityName,
  numNights,
  interests,
  tours,
  sightseeing
) => {
  const itinerary = [];
  let tourIndex = 0; // To keep track of the current tour
  const usedTours = new Set(); // To track tours already assigned
  const usedSightseeing = new Set(); // To track sightseeing activities already assigned

  // Step 1: First, assign all available tours to the itinerary
  for (let i = 0; i < numNights; i++) {
    if (tourIndex < tours.length) {
      // Assign the available tour to this day
      const tour = tours[tourIndex];
      const originalDescription =
        tour.tourShortDescription || "No description available.";
      const originalTitle = tour.tourName;
      const generatedDescription = await generateDescriptionUsingOpenAI(
        originalDescription,
        originalTitle
      );

      itinerary.push({
        day: i + 1,
        activity: tour.tourName || "Tour Activity",
        description:
          generatedDescription || "A special tour activity for today.",
        activityType: "tour", // Label this day as a "tour"
        tour: {
          tourId: tour.tourId,
          tourName: tour.tourName,
          duration: tour.duration,
          rating: tour.rating,
          reviewCount: tour.reviewCount,
          imagePath: tour.imagePath,
          cityId: tour.cityId,
          cityName: tour.cityName,
          cityTourType: tour.cityTourType,
          countryId: tour.countryId,
          countryName: tour.countryName,
          tourShortDescription: tour.tourShortDescription,
          recommended: tour.recommended,
          cancellationPolicyName: tour.cancellationPolicyName,
        },
      });
      usedTours.add(tour.tourName); // Mark the tour as used
      tourIndex++; // Move to the next tour for the subsequent days
    }
  }

  // Step 2: After all available tours are assigned, fill the remaining days with sightseeing
  const remainingDays = numNights - tours.length;

  if (remainingDays > 0) {
    // Step 3: Generate non-duplicate sightseeing activities using OpenAI
    const response = await generateOtherTours(
      cityName,
      usedTours,
      remainingDays
    );
    console.log("Generated remaining days activities:", response);

    // Ensure that response is an array, even if OpenAI returns a single object
    const sightseeingActivities = Array.isArray(response)
      ? response
      : [response];

    // Assign generated sightseeing activities
    sightseeingActivities.forEach((tour, index) => {
      if (!usedTours.has(tour.name)) {
        itinerary.push({
          day: tours.length + index + 1, // Start after the last tour day
          activity: tour.name || "Sightseeing",
          description: tour.description || "Visit the city's famous landmarks.",
          activityType: "sightseeing", // Label this day as "sightseeing"
        });
        usedSightseeing.add(tour.name); // Mark the sightseeing activity as used
      }
    });
  }

  return itinerary;
};

module.exports = { generateMultiTripPlan };
