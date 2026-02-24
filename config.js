// config.js - NO API KEY NEEDED! Just Discord token
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CHANNEL_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these in your .env file or Render environment variables.');
    console.error('✅ NO GOOGLE MAPS API KEY NEEDED!');
}

// India-specific configuration - COMPLETE STD DATABASE
const INDIA_CITIES = {
  // METRO CITIES (2-digit STD codes)
  "11": { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, circle: "Delhi NCR", type: "Metro" },
  "22": { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, circle: "Mumbai", type: "Metro" },
  "33": { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, circle: "Kolkata", type: "Metro" },
  "44": { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, circle: "Chennai", type: "Metro" },
  "80": { city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946, circle: "Karnataka", type: "Metro" },
  "40": { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867, circle: "Andhra Pradesh", type: "Metro" },
  "20": { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, circle: "Maharashtra", type: "Major City" },
  "79": { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, circle: "Gujarat", type: "Metro" },
  
  // 3-digit STD codes
  "141": { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, circle: "Rajasthan", type: "Major City" },
  "522": { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, circle: "Uttar Pradesh", type: "Major City" },
  "512": { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, circle: "Uttar Pradesh", type: "Major City" },
  "712": { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, circle: "Maharashtra", type: "Major City" },
  "731": { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, circle: "Madhya Pradesh", type: "Major City" },
  "755": { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, circle: "Madhya Pradesh", type: "Major City" },
  "612": { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, circle: "Bihar", type: "Major City" },
  "461": { city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, circle: "Tamil Nadu", type: "City" },
  "471": { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, circle: "Kerala", type: "Major City" },
  "484": { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, circle: "Kerala", type: "Major City" },
  "422": { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, circle: "Tamil Nadu", type: "Major City" },
  "431": { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, circle: "Tamil Nadu", type: "Major City" },
  "413": { city: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083, circle: "Tamil Nadu", type: "City" },
  "821": { city: "Mysore", state: "Karnataka", lat: 12.2958, lng: 76.6394, circle: "Karnataka", type: "City" },
  "832": { city: "Mangalore", state: "Karnataka", lat: 12.9141, lng: 74.8560, circle: "Karnataka", type: "City" },
  "891": { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, circle: "Andhra Pradesh", type: "Major City" },
  "863": { city: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, circle: "Andhra Pradesh", type: "City" },
  "866": { city: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, circle: "Andhra Pradesh", type: "City" },
  "877": { city: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, circle: "Andhra Pradesh", type: "City" },
  "5422": { city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, circle: "Uttar Pradesh", type: "City" },
  "5512": { city: "Gorakhpur", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732, circle: "Uttar Pradesh", type: "City" },
  "562": { city: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, circle: "Uttar Pradesh", type: "City" },
  "751": { city: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828, circle: "Madhya Pradesh", type: "City" },
  "761": { city: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864, circle: "Madhya Pradesh", type: "City" },
  "771": { city: "Bilaspur", state: "Chhattisgarh", lat: 22.0797, lng: 82.1391, circle: "Chhattisgarh", type: "City" },
  "781": { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296, circle: "Chhattisgarh", type: "Major City" },
  "831": { city: "Belgaum", state: "Karnataka", lat: 15.8497, lng: 74.4977, circle: "Karnataka", type: "City" },
  "836": { city: "Hubli", state: "Karnataka", lat: 15.3647, lng: 75.1240, circle: "Karnataka", type: "City" },
  "851": { city: "Kurnool", state: "Andhra Pradesh", lat: 15.8281, lng: 78.0373, circle: "Andhra Pradesh", type: "City" },
  "8712": { city: "Warangal", state: "Telangana", lat: 17.9689, lng: 79.5941, circle: "Telangana", type: "City" }
};

// Mobile operator prefixes
const OPERATORS = {
  "70": "Reliance Jio", "71": "Reliance Jio", "72": "Reliance Jio", "73": "Reliance Jio",
  "74": "Reliance Jio", "75": "Reliance Jio", "76": "Reliance Jio", "77": "Reliance Jio",
  "78": "Reliance Jio", "79": "Reliance Jio",
  "80": "Airtel", "81": "Airtel", "82": "Airtel", "83": "Airtel",
  "84": "Airtel", "85": "Airtel", "86": "Airtel", "87": "Airtel", "88": "Airtel", "89": "Airtel",
  "90": "Vodafone Idea", "91": "Vodafone Idea", "92": "Vodafone Idea", "93": "Vodafone Idea",
  "94": "Vodafone Idea", "95": "Vodafone Idea", "96": "Vodafone Idea", "97": "Vodafone Idea",
  "98": "Vodafone Idea", "99": "Vodafone Idea",
  "60": "BSNL", "61": "BSNL", "62": "BSNL", "63": "BSNL", "64": "BSNL", "65": "BSNL",
  "66": "BSNL", "67": "BSNL", "68": "BSNL", "69": "BSNL"
};

// Telecom circles
const CIRCLES = [
  "Delhi NCR", "Mumbai", "Kolkata", "Chennai", "Maharashtra", "Gujarat",
  "Andhra Pradesh", "Karnataka", "Tamil Nadu", "Kerala", "Uttar Pradesh",
  "Rajasthan", "Madhya Pradesh", "Punjab", "Haryana", "Bihar", "West Bengal",
  "Assam", "North East", "Odisha", "Jammu & Kashmir", "Himachal Pradesh",
  "Chhattisgarh", "Jharkhand", "Uttarakhand", "Telangana"
];

const config = {
    discord: {
        token: process.env.DISCORD_BOT_TOKEN,
        channelId: process.env.DISCORD_CHANNEL_ID,
        commandPrefix: '!',
        statusMessage: '!locate +91XXXXXXXXXX | 🇮🇳 Free',
        intents: {
            guilds: true,
            messages: true,
            messageContent: true
        }
    },
    
    // India-specific data - NO API KEYS NEEDED!
    india: {
        cities: INDIA_CITIES,
        operators: OPERATORS,
        circles: CIRCLES,
        countryCode: '91',
        countryName: 'India',
        mobilePrefixes: ['6', '7', '8', '9']
    },
    
    // OpenStreetMap (FREE - no API key!)
    maps: {
        tileServer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        defaultZoom: 12
    },
    
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
    },
    
    features: {
        enableWebInterface: true,
        enableStaticMaps: true,
        enableCircleLookup: true,
        enableOperatorLookup: true
    }
};

module.exports = Object.freeze(config);
