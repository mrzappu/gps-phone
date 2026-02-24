// config.js - Indian Number Only Configuration
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'GOOGLE_MAPS_API_KEY',
    'DISCORD_CHANNEL_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these in your .env file or Render environment variables.');
}

// India-specific configuration
const config = {
    // Discord configuration
    discord: {
        token: process.env.DISCORD_BOT_TOKEN,
        channelId: process.env.DISCORD_CHANNEL_ID,
        commandPrefix: '!',
        statusMessage: '!locate +91XXXXXXXXXX',
        intents: {
            guilds: true,
            messages: true,
            messageContent: true
        }
    },

    // Google Maps configuration (India focused)
    google: {
        mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        staticMapZoom: 12,
        staticMapSize: '800x400',
        mapType: 'roadmap',
        region: 'in', // India region bias
        language: 'en'
    },

    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        authToken: process.env.API_AUTH_TOKEN || generateSecureToken(),
        environment: process.env.NODE_ENV || 'development'
    },

    // India-specific phone validation
    india: {
        countryCode: '91',
        countryName: 'India',
        stdCodes: {
            '11': 'Delhi',
            '22': 'Mumbai',
            '33': 'Kolkata',
            '44': 'Chennai',
            '80': 'Bangalore',
            '40': 'Hyderabad',
            '20': 'Pune',
            '79': 'Ahmedabad',
            '141': 'Jaipur',
            '522': 'Lucknow',
            '512': 'Kanpur',
            '712': 'Nagpur',
            '731': 'Indore',
            '755': 'Bhopal',
            '612': 'Patna',
            '461': 'Tiruchirappalli',
            '471': 'Thiruvananthapuram',
            '484': 'Kochi',
            '422': 'Coimbatore',
            '431': 'Madurai',
            '413': 'Pondicherry',
            '836': 'Hubli',
            '821': 'Mysore',
            '832': 'Mangalore',
            '836': 'Hubli-Dharwad',
            '851': 'Kurnool',
            '866': 'Tirupati',
            '891': 'Visakhapatnam',
            '863': 'Guntur',
            '8656': 'Nellore',
            '8712': 'Warangal',
            '877': 'Tirupati',
            '881': 'Agra',
            '891': 'Vijayawada',
            '5422': 'Varanasi',
            '5512': 'Gorakhpur',
            '562': 'Agra',
            '571': 'Aligarh',
            '581': 'Bareilly',
            '591': 'Moradabad',
            '751': 'Gwalior',
            '761': 'Jabalpur',
            '771': 'Bilaspur',
            '781': 'Raipur',
            '821': 'Mysore',
            '831': 'Belgaum',
            '836': 'Hubli',
            '851': 'Kurnool',
            '863': 'Guntur',
            '866': 'Tirupati',
            '8712': 'Warangal',
            '877': 'Tirupati',
            '891': 'Visakhapatnam'
        },
        mobilePrefixes: [
            '6', '7', '8', '9' // Indian mobile numbers start with 6,7,8,9
        ],
        operatorCodes: {
            '70': 'Reliance Jio',
            '71': 'Reliance Jio',
            '72': 'Reliance Jio',
            '73': 'Reliance Jio',
            '74': 'Reliance Jio',
            '75': 'Reliance Jio',
            '76': 'Reliance Jio',
            '77': 'Reliance Jio',
            '78': 'Reliance Jio',
            '79': 'Reliance Jio',
            '80': 'Airtel',
            '81': 'Airtel',
            '82': 'Airtel',
            '83': 'Airtel',
            '84': 'Airtel',
            '85': 'Airtel',
            '86': 'Airtel',
            '87': 'Airtel',
            '88': 'Airtel',
            '89': 'Airtel',
            '90': 'Vodafone Idea',
            '91': 'Vodafone Idea',
            '92': 'Vodafone Idea',
            '93': 'Vodafone Idea',
            '94': 'Vodafone Idea',
            '95': 'Vodafone Idea',
            '96': 'Vodafone Idea',
            '97': 'Vodafone Idea',
            '98': 'Vodafone Idea',
            '99': 'Vodafone Idea'
        },
        circles: {
            'Andhra Pradesh': ['AP', 'Andhra'],
            'Assam': ['AS', 'Assam'],
            'Bihar': ['BR', 'Bihar'],
            'Chennai': ['TN', 'Chennai'],
            'Delhi': ['DL', 'Delhi', 'NCR'],
            'Gujarat': ['GJ', 'Gujarat'],
            'Haryana': ['HR', 'Haryana'],
            'Himachal Pradesh': ['HP', 'Himachal'],
            'Jammu & Kashmir': ['JK', 'Jammu'],
            'Karnataka': ['KA', 'Karnataka'],
            'Kerala': ['KL', 'Kerala'],
            'Kolkata': ['WB', 'Kolkata'],
            'Madhya Pradesh': ['MP', 'Madhya'],
            'Maharashtra': ['MH', 'Maharashtra'],
            'Mumbai': ['MH', 'Mumbai'],
            'North East': ['NE', 'NorthEast'],
            'Odisha': ['OD', 'Odisha'],
            'Punjab': ['PB', 'Punjab'],
            'Rajasthan': ['RJ', 'Rajasthan'],
            'Tamil Nadu': ['TN', 'Tamil'],
            'Uttar Pradesh East': ['UP', 'UPE'],
            'Uttar Pradesh West': ['UP', 'UPW'],
            'West Bengal': ['WB', 'Bengal']
        }
    },

    // Feature flags
    features: {
        enableWebInterface: true,
        enableApiEndpoint: true,
        enableStaticMaps: true,
        enableCircleLookup: true,
        enableOperatorLookup: true
    },

    // Logging
    logging: {
        level: 'info',
        console: true
    }
};

// Generate a secure random token if none provided
function generateSecureToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

module.exports = Object.freeze(config);
