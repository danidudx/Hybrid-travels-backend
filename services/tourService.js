const axios = require("axios");
const ACTIVITY_LINKER_API_KEY = process.env.ACTIVITY_LINKER_API_KEY; // Make sure to store your API Key in environment variables

// Fetch Tours for a specific city using the ActivityLinker API
const getToursForCity = async (cityName, countryName) => {
  try {
    console.log(
      `📌 Fetching tours for city: ${cityName}, country: ${countryName}...`
    );

    // Fetch all countries from ActivityLinker to get the countryId
    const countryToursResponse = await axios.get(
      `https://api.activitylinker.com/api/apiTour/country`,
      {
        headers: { Authorization: `Bearer ${ACTIVITY_LINKER_API_KEY}` },
      }
    );

    console.log("countries", countryToursResponse);

    // Check if the countryToursResponse has valid data
    if (!countryToursResponse.data || !countryToursResponse.data.result) {
      console.error("❌ No countries found in the response.");
      return [];
    }

    // Find the countryId using the provided countryName
    const country = countryToursResponse.data.result.find(
      (country) =>
        country.countryName.toLowerCase() === countryName.toLowerCase()
    );

    console.log("selected country", country);

    // if (!country) {
    //   console.error("❌ Country not found.");
    //   return [];
    // }

    const countryId = country.countryId;

    // Fetch the cities available for the given countryId
    console.log("Fetching cities for countryId:", countryId);
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

    console.log("cities", cityResponse);

    // Check if the cityResponse has valid data
    if (!cityResponse.data || !cityResponse.data.result) {
      console.error("❌ No cities found for this country.");
      return [];
    }

    // Find cityId for the specified city
    const city = cityResponse.data.result.find(
      (city) => city.cityName.toLowerCase() === cityName.toLowerCase()
    );

    console.log("selected city", city);

    if (!city) {
      console.error("❌ City not found.");
      return [];
    }

    const cityId = city.cityId;

    // Fetch tours using the cityId and countryId
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

    console.log("tours", toursResponse);

    return toursResponse.data.result || [];
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch tours:", error);
    return [];
  }
};

// Export the function so that it can be called in other files
module.exports = { getToursForCity };
