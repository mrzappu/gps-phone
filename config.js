// config.js - Complete configuration for Indian Phone Locator
// Includes Discord settings, India database, and feature flags

require('dotenv').config();

// ============================================
// INDIAN CITIES DATABASE (STD Codes with Coordinates)
// ============================================
const INDIA_CITIES = {
    // METRO CITIES (2-digit STD codes)
    "11": { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, circle: "Delhi NCR", type: "Metro", population: "31M" },
    "22": { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, circle: "Mumbai", type: "Metro", population: "20M" },
    "33": { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, circle: "Kolkata", type: "Metro", population: "14M" },
    "44": { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, circle: "Chennai", type: "Metro", population: "10M" },
    "80": { city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946, circle: "Karnataka", type: "Metro", population: "12M" },
    "40": { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867, circle: "Andhra Pradesh", type: "Metro", population: "9M" },
    "20": { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, circle: "Maharashtra", type: "Major City", population: "6M" },
    "79": { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, circle: "Gujarat", type: "Metro", population: "7M" },
    
    // MAJOR CITIES (3-digit STD codes)
    "141": { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, circle: "Rajasthan", type: "Major City", population: "3M" },
    "522": { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, circle: "Uttar Pradesh", type: "Major City", population: "3M" },
    "512": { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, circle: "Uttar Pradesh", type: "Major City", population: "2.8M" },
    "712": { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, circle: "Maharashtra", type: "Major City", population: "2.5M" },
    "731": { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, circle: "Madhya Pradesh", type: "Major City", population: "2M" },
    "755": { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, circle: "Madhya Pradesh", type: "Major City", population: "2M" },
    "612": { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, circle: "Bihar", type: "Major City", population: "2M" },
    "461": { city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, circle: "Tamil Nadu", type: "City", population: "1M" },
    "471": { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, circle: "Kerala", type: "Major City", population: "1M" },
    "484": { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, circle: "Kerala", type: "Major City", population: "2M" },
    "422": { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, circle: "Tamil Nadu", type: "Major City", population: "1.5M" },
    "431": { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, circle: "Tamil Nadu", type: "Major City", population: "1.5M" },
    "413": { city: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083, circle: "Tamil Nadu", type: "City", population: "0.5M" },
    "821": { city: "Mysore", state: "Karnataka", lat: 12.2958, lng: 76.6394, circle: "Karnataka", type: "City", population: "1M" },
    "832": { city: "Mangalore", state: "Karnataka", lat: 12.9141, lng: 74.8560, circle: "Karnataka", type: "City", population: "0.5M" },
    "891": { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, circle: "Andhra Pradesh", type: "Major City", population: "2M" },
    "863": { city: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, circle: "Andhra Pradesh", type: "City", population: "0.7M" },
    "866": { city: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, circle: "Andhra Pradesh", type: "City", population: "0.3M" },
    "5422": { city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, circle: "Uttar Pradesh", type: "City", population: "1.2M" },
    "562": { city: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, circle: "Uttar Pradesh", type: "City", population: "1.6M" },
    "751": { city: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828, circle: "Madhya Pradesh", type: "City", population: "1M" },
    "761": { city: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864, circle: "Madhya Pradesh", type: "City", population: "1M" },
    "781": { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296, circle: "Chhattisgarh", type: "Major City", population: "1M" },
    "836": { city: "Hubli", state: "Karnataka", lat: 15.3647, lng: 75.1240, circle: "Karnataka", type: "City", population: "0.9M" }
};

// ============================================
// INDIAN MOBILE OPERATORS
// ============================================
const OPERATORS = {
    // Reliance Jio (70-79)
    "70": "Reliance Jio", "71": "Reliance Jio", "72": "Reliance Jio", "73": "Reliance Jio",
    "74": "Reliance Jio", "75": "Reliance Jio", "76": "Reliance Jio", "77": "Reliance Jio",
    "78": "Reliance Jio", "79": "Reliance Jio",
    
    // Airtel (80-89)
    "80": "Airtel", "81": "Airtel", "82": "Airtel", "83": "Airtel",
    "84": "Airtel", "85": "Airtel", "86": "Airtel", "87": "Airtel", 
    "88": "Airtel", "89": "Airtel",
    
    // Vodafone Idea (90-99)
    "90": "Vodafone Idea", "91": "Vodafone Idea", "92": "Vodafone Idea", "93": "Vodafone Idea",
    "94": "Vodafone Idea", "95": "Vodafone Idea", "96": "Vodafone Idea", "97": "Vodafone Idea",
    "98": "Vodafone Idea", "99": "Vodafone Idea",
    
    // BSNL (60-69)
    "60": "BSNL", "61": "BSNL", "62": "BSNL", "63": "BSNL", 
    "64": "BSNL", "65": "BSNL", "66": "BSNL", "67": "BSNL", 
    "68": "BSNL", "69": "BSNL"
};

// ============================================
// DISCORD CONFIGURATION
// ============================================
const DISCORD_CONFIG = {
    // Bot Settings
    token: process.env.DISCORD_BOT_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
    
    // Command Settings
    prefix: '!',
    status: '!locate +91XXXXXXXXXX | 🇮🇳',
    
    // Intent Settings (what the bot can see/do)
    intents: {
        guilds: true,           // Server info
        messages: true,         // Read messages
        messageContent: true,   // Read message content (required for commands)
        members: false,         // Member info (not needed)
        voiceStates: false      // Voice channel (not needed)
    },
    
    // Embed Settings
    embed: {
        color: 0x00FF00,        // Green color
        footer: '🇮🇳 Indian Phone Locator | No API Key',
        thumbnail: 'https://flagcdn.com/in.svg'
    },
    
    // Command List
    commands: {
        locate: ['locate', 'track', 'find', 'phone'],
        help: ['help', 'commands', 'h'],
        stats: ['stats', 'status', 'info'],
        cities: ['cities', 'citylist'],
        operators: ['operators', 'ops']
    }
};

// ============================================
// WEB SERVER CONFIGURATION
// ============================================
const SERVER_CONFIG = {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    
    // Rate limiting (prevent abuse)
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100           // 100 requests per window
    },
    
    // CORS settings
    cors: {
        origins: ['*'],
        methods: ['GET']
    }
};

// ============================================
// INDIA-SPECIFIC CONFIGURATION
// ============================================
const INDIA_CONFIG = {
    countryCode: '91',
    countryName: 'India',
    mobilePrefixes: ['6', '7', '8', '9'],     // Indian mobile numbers start with these
    stdCodeLengths: [2, 3, 4],                 // STD codes can be 2,3,4 digits
    cities: INDIA_CITIES,
    operators: OPERATORS,
    
    // Telecom circles in India
    circles: [
        "Delhi NCR", "Mumbai", "Kolkata", "Chennai", "Maharashtra",
        "Gujarat", "Andhra Pradesh", "Karnataka", "Tamil Nadu", "Kerala",
        "Uttar Pradesh", "Rajasthan", "Madhya Pradesh", "Punjab",
        "Haryana", "Bihar", "West Bengal", "Assam", "North East",
        "Odisha", "Jammu & Kashmir", "Himachal Pradesh", "Chhattisgarh",
        "Jharkhand", "Uttarakhand", "Telangana"
    ],
    
    // Number type patterns
    patterns: {
        mobile: /^[6-9]\d{9}$/,
        landline: /^[2-9]\d{7,9}$/,
        tollFree: /^1[8][0][0]\d{7}$/,
        premium: /^[9][0][0]\d{7}$/
    }
};

// ============================================
// MAP CONFIGURATION (OpenStreetMap - FREE!)
// ============================================
const MAP_CONFIG = {
    provider: 'OpenStreetMap',
    tileServer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    staticMapService: 'https://staticmap.openstreetmap.de/staticmap.php',
    defaultZoom: 12,
    mapSize: '600x300'
};

// ============================================
// FEATURE FLAGS
// ============================================
const FEATURES = {
    enableDiscordBot: true,
    enableWebServer: true,
    enableStaticMaps: true,
    enableOperatorLookup: true,
    enableCircleLookup: true,
    enableDetailedLogging: process.env.NODE_ENV !== 'production',
    enableRateLimiting: true
};

// ============================================
// LOGGING CONFIGURATION
// ============================================
const LOGGING_CONFIG = {
    level: process.env.LOG_LEVEL || 'info',
    console: true,
    file: true,
    filePath: './logs/app.log',
    maxSize: '10M',
    maxFiles: 5
};

// ============================================
// EXPORT ALL CONFIGURATIONS
// ============================================
module.exports = {
    discord: DISCORD_CONFIG,
    server: SERVER_CONFIG,
    india: INDIA_CONFIG,
    maps: MAP_CONFIG,
    features: FEATURES,
    logging: LOGGING_CONFIG,
    
    // Helper function to validate environment
    validate: () => {
        const errors = [];
        if (!process.env.DISCORD_BOT_TOKEN) {
            errors.push('DISCORD_BOT_TOKEN is required in .env file');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
};
