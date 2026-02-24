// config.js - Centralized configuration management
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
    
    // Don't exit in production if on Render (they might set them after build)
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
}

// Configuration object with defaults
const config = {
    // Discord configuration
    discord: {
        token: process.env.DISCORD_BOT_TOKEN,
        channelId: process.env.DISCORD_CHANNEL_ID,
        commandPrefix: process.env.COMMAND_PREFIX || '!',
        statusMessage: process.env.BOT_STATUS || '!locate +1234567890',
        intents: {
            guilds: true,
            messages: true,
            messageContent: true,
            directMessages: true
        }
    },

    // Google Maps configuration
    google: {
        mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        staticMapZoom: parseInt(process.env.STATIC_MAP_ZOOM) || 12,
        staticMapSize: process.env.STATIC_MAP_SIZE || '800x400',
        mapType: process.env.MAP_TYPE || 'roadmap'
    },

    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        authToken: process.env.API_AUTH_TOKEN || generateSecureToken(),
        environment: process.env.NODE_ENV || 'development',
        trustProxy: process.env.TRUST_PROXY === 'true',
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100
        }
    },

    // Phone number analysis configuration
    phoneAnalysis: {
        defaultRegion: process.env.DEFAULT_REGION || 'US',
        cacheResults: process.env.CACHE_RESULTS !== 'false',
        cacheTTL: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
        maxLookupsPerDay: parseInt(process.env.MAX_LOOKUPS_PER_DAY) || 1000
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log',
        console: process.env.LOG_CONSOLE !== 'false'
    },

    // Feature flags
    features: {
        enableWebInterface: process.env.ENABLE_WEB !== 'false',
        enableApiEndpoint: process.env.ENABLE_API !== 'false',
        enableStaticMaps: process.env.ENABLE_STATIC_MAPS !== 'false',
        enableCarrierLookup: process.env.ENABLE_CARRIER_LOOKUP === 'true',
        enableTimezoneLookup: process.env.ENABLE_TIMEZONE_LOOKUP !== 'false'
    },

    // Cache configuration (for Redis if you want to scale)
    cache: {
        type: process.env.CACHE_TYPE || 'memory', // 'memory' or 'redis'
        redisUrl: process.env.REDIS_URL,
        redisPrefix: process.env.REDIS_PREFIX || 'phone:'
    },

    // Security
    security: {
        allowedHosts: process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',') : ['*'],
        requireAuth: process.env.REQUIRE_AUTH !== 'false',
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
    }
};

// Generate a secure random token if none provided
function generateSecureToken() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️ No API_AUTH_TOKEN provided. Generated temporary token:', token);
    console.warn('   Set this in your .env file for persistent access!');
    return token;
}

// Validate critical API keys
if (!config.google.mapsApiKey) {
    console.error('❌ GOOGLE_MAPS_API_KEY is required but not set!');
    if (config.server.environment === 'production') {
        process.exit(1);
    }
}

// Freeze config to prevent modifications
module.exports = Object.freeze(config);
