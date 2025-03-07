// // services/openAIService.js
// const OpenAI = require("openai");
// const dotenv = require("dotenv");

// // Load environment variables
// dotenv.config();

// // Initialize OpenAI API client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
// });

// /**
//  * Function to generate a travel itinerary using OpenAI
//  * @param {string} destination - The travel destination
//  * @param {number} numNights - Number of nights for the trip
//  * @param {array} interests - List of user interests (e.g., ["adventure", "culture", "food"])
//  * @returns {object} - The structured travel itinerary
//  */
// const generateItinerary = async (destination, numNights, interests) => {
//   try {
//     // Constructing the prompt dynamically based on user input
//     const prompt = `Create a ${numNights}-day travel itinerary for ${destination} based on these interests: ${interests.join(
//       ", "
//     )}.
//     Include recommended activities for each day, considering must-see attractions, cultural experiences, food places, and leisure time.
//     The response should be structured as JSON inside an object with key 'itinerary', containing an array of objects with 'day', 'activity', and 'description'.`;

//     // Making a request to OpenAI for structured itinerary generation
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o", // Use GPT-4o for optimized responses
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a travel assistant helping users create trip plans.",
//         },
//         { role: "user", content: prompt },
//       ],
//       response_format: {
//         type: "json_schema",
//         json_schema: {
//           name: "travel_itinerary",
//           schema: {
//             type: "object", // ✅ Fix: Root schema must be an object
//             properties: {
//               itinerary: {
//                 type: "array",
//                 items: {
//                   type: "object",
//                   properties: {
//                     day: {
//                       type: "integer",
//                       description: "The day number of the itinerary.",
//                     },
//                     activity: {
//                       type: "string",
//                       description: "The main activity for the day.",
//                     },
//                     description: {
//                       type: "string",
//                       description: "A brief description of the activity.",
//                     },
//                   },
//                   required: ["day", "activity", "description"],
//                 },
//               },
//             },
//             required: ["itinerary"], // ✅ Ensure 'itinerary' key is always present
//           },
//         },
//       },
//       store: false,
//     });

//     // ✅ Fix: Access the itinerary inside the returned object
//     return JSON.parse(completion.choices[0].message.content).itinerary;
//   } catch (error) {
//     console.error("Error generating itinerary:", error);
//     throw new Error("Failed to generate itinerary.");
//   }
// };

// /**
//  * Function to generate sightseeing places for a destination using OpenAI
//  * @param {string} destination - The travel destination
//  * @returns {array} - A list of sightseeing attractions
//  */
// const getSightseeingActivities = async (destination) => {
//   try {
//     const prompt = `Provide a list of top sightseeing attractions in ${destination}.
//     Include famous landmarks, cultural sites, and unique experiences.
//     The response should be in JSON format with key 'sightseeing', containing an array of objects with 'name', 'description', and 'location'.`;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o", // Use GPT-4o for optimized responses
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a travel assistant helping users find sightseeing locations.",
//         },
//         { role: "user", content: prompt },
//       ],
//       response_format: {
//         type: "json_schema",
//         json_schema: {
//           name: "sightseeing_places",
//           schema: {
//             type: "object", // ✅ Fix: Root schema must be an object
//             properties: {
//               sightseeing: {
//                 type: "array",
//                 items: {
//                   type: "object",
//                   properties: {
//                     name: {
//                       type: "string",
//                       description: "The name of the attraction.",
//                     },
//                     description: {
//                       type: "string",
//                       description: "A short description of the attraction.",
//                     },
//                     location: {
//                       type: "string",
//                       description:
//                         "The address or general location of the attraction.",
//                     },
//                   },
//                   required: ["name", "description", "location"],
//                 },
//               },
//             },
//             required: ["sightseeing"], // ✅ Ensure 'sightseeing' key is always present
//           },
//         },
//       },
//       store: false,
//     });

//     // ✅ Fix: Access the sightseeing data inside the returned object
//     return JSON.parse(completion.choices[0].message.content).sightseeing;
//   } catch (error) {
//     console.error("Error generating sightseeing activities:", error);
//     throw new Error("Failed to generate sightseeing activities.");
//   }
// };

// // Export functions for use in other parts of the project
// module.exports = {
//   generateItinerary,
//   getSightseeingActivities,
// };

const OpenAI = require("openai");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

/**
 * Function to generate a travel itinerary using OpenAI with tours prioritized
 * @param {string} cityName - The travel destination (City Name)
 * @param {number} numNights - Number of nights for the trip
 * @param {array} tours - List of available tours for the destination
 * @param {array} sightseeing - List of sightseeing activities for fallback
 * @returns {array} - The structured travel itinerary
 */
const generateItinerary = async (cityName, numNights, tours, sightseeing) => {
  try {
    // Generate itinerary with OpenAI prioritizing tours
    let itinerary = [];

    // If tours are available, prioritize them for the itinerary
    let remainingNights = numNights;

    // Add tours to the itinerary first
    for (let i = 0; i < tours.length; i++) {
      if (remainingNights <= 0) break;
      itinerary.push({
        day: numNights - remainingNights + 1,
        activity: tours[i].tourName,
        description:
          tours[i].tourShortDescription || "A special tour activity for today.",
      });
      remainingNights--;
    }

    // If there are remaining nights and no enough tours, generate itinerary with sightseeing
    if (remainingNights > 0) {
      for (let i = 0; i < remainingNights; i++) {
        itinerary.push({
          day: numNights - remainingNights + 1 + i,
          activity: sightseeing[i].name,
          description: sightseeing[i].description,
        });
      }
    }

    // If no tours were available, use OpenAI to generate a full itinerary
    if (itinerary.length === 0) {
      const prompt = `Create a ${numNights}-day itinerary for ${cityName} including these sightseeing places: ${sightseeing
        .map((item) => item.name)
        .join(", ")}. Provide detailed activity for each day in a JSON format.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a travel assistant helping users create detailed trip itineraries.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const openAiItinerary = JSON.parse(completion.choices[0].message.content);
      itinerary = openAiItinerary.itinerary; // return the OpenAI generated itinerary
    }

    return itinerary; // Return the generated itinerary
  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error("Failed to generate itinerary.");
  }
};

/**
 * Function to generate sightseeing places for a destination using OpenAI
 * @param {string} cityName - The travel destination (City Name)
 * @returns {array} - A list of sightseeing attractions
 */
const getSightseeingActivities = async (cityName) => {
  try {
    const prompt = `Provide a list of top sightseeing attractions in ${cityName}. 
    Include famous landmarks, cultural sites, and unique experiences. 
    The response should be in JSON format with key 'sightseeing', containing an array of objects with 'name', 'description', and 'location'.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Use GPT-4 for optimized responses
      messages: [
        {
          role: "system",
          content:
            "You are a travel assistant helping users find sightseeing locations.",
        },
        { role: "user", content: prompt },
      ],
    });

    const sightseeing = JSON.parse(
      completion.choices[0].message.content
    ).sightseeing;

    return sightseeing; // Return sightseeing activities
  } catch (error) {
    console.error("Error generating sightseeing activities:", error);
    throw new Error("Failed to generate sightseeing activities.");
  }
};

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
      activity: tour.tourName || "Tour Activity",
      description: generatedDescription || "A special tour activity for today.",
    });
  }

  return itinerary;
};

// Function to generate richer descriptions using OpenAI
const generateDescriptionUsingOpenAI = async (originalDescription) => {
  try {
    const prompt = `Rewrite the following description in a more engaging and descriptive manner. Make it sound like a travel guide writing it for tourists: ${originalDescription}`;

    // Call OpenAI API to generate a new description
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a travel guide assistant." },
        { role: "user", content: prompt },
      ],
    });

    const generatedText = completion.choices[0].message.content.trim();
    return generatedText;
  } catch (error) {
    console.error("Error generating description using OpenAI:", error);
    return originalDescription; // Fallback to original if OpenAI fails
  }
};
const getIATACode = async (location) => {
  try {
    const prompt = `Provide the nearest IATA code for the following location. strictly only provide single IATA code without anything else: ${location}`;

    // Call OpenAI API to generate a new description
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a travel guide assistant." },
        { role: "user", content: prompt },
      ],
    });

    const generatedText = completion.choices[0].message.content.trim();
    return generatedText;
  } catch (error) {
    console.error("Error generating description using OpenAI:", error);
    return location; // Fallback to original if OpenAI fails
  }
};

// Export functions for use in other parts of the project
module.exports = {
  generateItinerary,
  getSightseeingActivities,
  generateDescriptionUsingOpenAI,
  generateItineraryWithTours,
  getIATACode,
};
