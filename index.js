// index.js - Main entry point
require('dotenv').config();

const config = require('./config');
const logger = require('./utils/logger');
const { validateEnvironment } = require('./utils/validators');
const phoneAnalyzer = require('./services/phoneAnalyzer');
const mapGenerator = require('./services/mapGenerator');
const discordBot = require('./services/discordBot');
const apiServer = require('./api/server');

// Validate environment before starting
try {
    validateEnvironment();
} catch (error) {
    logger.error('Environment validation failed:', error.message);
    process.exit(1);
}

// Initialize services
async function initializeServices() {
    logger.info('🚀 Starting Phone Locator Bot v2.0');
    logger.info(`Environment: ${config.server.environment}`);
    
    // Initialize phone analyzer
    try {
        await phoneAnalyzer.initialize();
        logger.info('✅ Phone analyzer initialized');
    } catch (error) {
        logger.error('❌ Phone analyzer initialization failed:', error.message);
        throw error;
    }
    
    // Initialize map generator
    try {
        await mapGenerator.initialize();
        logger.info('✅ Map generator initialized');
    } catch (error) {
        logger.warn('⚠️ Map generator initialization warning:', error.message);
        // Non-fatal, continue without maps
    }
    
    // Initialize Discord bot
    try {
        await discordBot.initialize();
        logger.info('✅ Discord bot initialized');
    } catch (error) {
        logger.error('❌ Discord bot initialization failed:', error.message);
        throw error;
    }
    
    // Initialize API server
    try {
        await apiServer.initialize();
        logger.info(`✅ API server initialized on port ${config.server.port}`);
    } catch (error) {
        logger.error('❌ API server initialization failed:', error.message);
        throw error;
    }
    
    logger.info('🎉 All services initialized successfully!');
}

// Graceful shutdown handler
async function shutdown(signal) {
    logger.info(`📥 Received ${signal}, starting graceful shutdown...`);
    
    // Shutdown in reverse order of initialization
    try {
        await apiServer.shutdown();
        logger.info('✅ API server shutdown complete');
    } catch (error) {
        logger.error('❌ API server shutdown error:', error.message);
    }
    
    try {
        await discordBot.shutdown();
        logger.info('✅ Discord bot shutdown complete');
    } catch (error) {
        logger.error('❌ Discord bot shutdown error:', error.message);
    }
    
    try {
        await phoneAnalyzer.shutdown();
        logger.info('✅ Phone analyzer shutdown complete');
    } catch (error) {
        logger.error('❌ Phone analyzer shutdown error:', error.message);
    }
    
    logger.info('👋 Goodbye!');
    process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the application
initializeServices().catch(error => {
    logger.error('💥 Failed to start application:', error);
    process.exit(1);
});
