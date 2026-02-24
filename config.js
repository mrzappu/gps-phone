// config.js - Indian Phone + IP Locator with Location Stand
require('dotenv').config();

// ============================================
// COMPLETE INDIAN CITIES DATABASE
// ============================================
const INDIA_CITIES = {
    // METRO CITIES (2-digit STD)
    "11": { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, circle: "Delhi NCR" },
    "22": { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, circle: "Mumbai" },
    "33": { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, circle: "Kolkata" },
    "44": { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, circle: "Chennai" },
    "80": { city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946, circle: "Karnataka" },
    "40": { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867, circle: "Andhra Pradesh" },
    "20": { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, circle: "Maharashtra" },
    "79": { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, circle: "Gujarat" },
    
    // 3-digit STD codes (MAJOR CITIES)
    "141": { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, circle: "Rajasthan" },
    "522": { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, circle: "Uttar Pradesh" },
    "512": { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, circle: "Uttar Pradesh" },
    "712": { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, circle: "Maharashtra" },
    "731": { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, circle: "Madhya Pradesh" },
    "755": { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, circle: "Madhya Pradesh" },
    "612": { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, circle: "Bihar" },
    "461": { city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, circle: "Tamil Nadu" },
    "471": { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, circle: "Kerala" },
    "484": { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, circle: "Kerala" },
    "422": { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, circle: "Tamil Nadu" },
    "431": { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, circle: "Tamil Nadu" },
    "413": { city: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083, circle: "Tamil Nadu" },
    "821": { city: "Mysore", state: "Karnataka", lat: 12.2958, lng: 76.6394, circle: "Karnataka" },
    "832": { city: "Mangalore", state: "Karnataka", lat: 12.9141, lng: 74.8560, circle: "Karnataka" },
    "891": { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, circle: "Andhra Pradesh" },
    "863": { city: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, circle: "Andhra Pradesh" },
    "866": { city: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, circle: "Andhra Pradesh" },
    "877": { city: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, circle: "Andhra Pradesh" },
    "5422": { city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, circle: "Uttar Pradesh" },
    "5512": { city: "Gorakhpur", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732, circle: "Uttar Pradesh" },
    "562": { city: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, circle: "Uttar Pradesh" },
    "751": { city: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828, circle: "Madhya Pradesh" },
    "761": { city: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864, circle: "Madhya Pradesh" },
    "781": { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296, circle: "Chhattisgarh" },
    "836": { city: "Hubli", state: "Karnataka", lat: 15.3647, lng: 75.1240, circle: "Karnataka" },
    "851": { city: "Kurnool", state: "Andhra Pradesh", lat: 15.8281, lng: 78.0373, circle: "Andhra Pradesh" },
    
    // ADDED MORE BSNL/VI AREAS
    "180": { city: "Amritsar", state: "Punjab", lat: 31.6340, lng: 74.8723, circle: "Punjab" },
    "175": { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794, circle: "Punjab" },
    "183": { city: "Jalandhar", state: "Punjab", lat: 31.3260, lng: 75.5762, circle: "Punjab" },
    "172": { city: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lng: 77.1734, circle: "Himachal Pradesh" },
    "194": { city: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lng: 74.7973, circle: "Jammu & Kashmir" },
    "191": { city: "Jammu", state: "Jammu & Kashmir", lat: 32.7266, lng: 74.8570, circle: "Jammu & Kashmir" },
    "135": { city: "Haridwar", state: "Uttarakhand", lat: 29.9457, lng: 78.1642, circle: "Uttarakhand" },
    "124": { city: "Gurgaon", state: "Haryana", lat: 28.4595, lng: 77.0266, circle: "Haryana" },
    "129": { city: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178, circle: "Haryana" },
    "166": { city: "Hisar", state: "Haryana", lat: 29.1492, lng: 75.7217, circle: "Haryana" },
    "174": { city: "Ambala", state: "Haryana", lat: 30.3782, lng: 76.7767, circle: "Haryana" }
};

// ============================================
// CORRECT INDIAN MOBILE OPERATORS (FIXED BSNL!)
// ============================================
const OPERATORS = {
    // BSNL (60-69) - FIXED: These were showing Airtel before!
    "60": "BSNL", "61": "BSNL", "62": "BSNL", "63": "BSNL", 
    "64": "BSNL", "65": "BSNL", "66": "BSNL", "67": "BSNL", 
    "68": "BSNL", "69": "BSNL",
    
    // Reliance Jio (70-79)
    "70": "Jio", "71": "Jio", "72": "Jio", "73": "Jio",
    "74": "Jio", "75": "Jio", "76": "Jio", "77": "Jio",
    "78": "Jio", "79": "Jio",
    
    // Airtel (80-89)
    "80": "Airtel", "81": "Airtel", "82": "Airtel", "83": "Airtel",
    "84": "Airtel", "85": "Airtel", "86": "Airtel", "87": "Airtel", 
    "88": "Airtel", "89": "Airtel",
    
    // Vodafone Idea (90-99)
    "90": "Vi", "91": "Vi", "92": "Vi", "93": "Vi",
    "94": "Vi", "95": "Vi", "96": "Vi", "97": "Vi",
    "98": "Vi", "99": "Vi"
};

// ============================================
// IP GEOLOCATION CONFIGURATION (FREE!)
// ============================================
const IP_CONFIG = {
    provider: 'ip-api.com',
    endpoint: 'http://ip-api.com/json/',
    fields: 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,query',
    rateLimit: 45
};

// ============================================
// LOCATION STAND CONFIGURATION (NEW!)
// ============================================
const LOCATION_STAND_CONFIG = {
    enabled: true,
    maxHistory: 10,              // Keep last 10 locations
    saveToFile: true,             // Save to JSON file for persistence
    filePath: './data/location-history.json',
    showInDiscord: true,          // Show last seen in Discord
    showInWeb: true,              // Show last seen in web interface
    discordChannel: process.env.DISCORD_STAND_CHANNEL_ID || null // Optional separate channel for stand
};

// ============================================
// DISCORD CONFIGURATION
// ============================================
const DISCORD_CONFIG = {
    token: process.env.DISCORD_BOT_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
    standChannelId: process.env.DISCORD_STAND_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID,
    prefix: '!',
    status: '!locate +91 | !ip | !stand',
    intents: {
        guilds: true,
        messages: true,
        messageContent: true
    },
    embed: {
        phoneColor: 0x00FF00,
        ipColor: 0x0099FF,
        standColor: 0xFFA500,
        errorColor: 0xFF0000,
        footer: '🇮🇳 Indian Phone + IP Locator | Location Stand v3.0'
    },
    commands: {
        phone: ['locate', 'phone', 'call', 'track'],
        ip: ['ip', 'iplocate', 'whereis', 'geo'],
        stand: ['stand', 'last', 'history', 'recent', 'lastseen'],
        clear: ['clearstand', 'clearhistory', 'reset'],
        help: ['help', 'commands'],
        stats: ['stats', 'status']
    }
};

// ============================================
// WEB SERVER CONFIGURATION
// ============================================
const SERVER_CONFIG = {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
};

// ============================================
// EXPORT CONFIG
// ============================================
module.exports = {
    discord: DISCORD_CONFIG,
    server: SERVER_CONFIG,
    ip: IP_CONFIG,
    locationStand: LOCATION_STAND_CONFIG,
    india: {
        cities: INDIA_CITIES,
        operators: OPERATORS,
        countryCode: '91',
        countryName: 'India',
        mobilePrefixes: ['6', '7', '8', '9'],
        stdLengths: [2, 3, 4]
    },
    maps: {
        staticMapService: 'https://staticmap.openstreetmap.de/staticmap.php',
        defaultZoom: 12,
        mapSize: '600x300'
    }
};
