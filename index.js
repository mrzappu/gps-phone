// index.js - Indian Phone Number Locator (Single File)
// Only supports Indian numbers (+91)

require('dotenv').config();
const config = require('./config');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const phonenumbers = require('google-libphonenumber');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ============================================
// INITIALIZATION
// ============================================
const phoneUtil = phonenumbers.PhoneNumberUtil.getInstance();
const geocoder = phonenumbers.PhoneNumberOfflineGeocoder.getInstance();

// Create logs directory if it doesn't exist
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

// ============================================
// LOGGER
// ============================================
const logger = {
    info: (...args) => {
        const msg = `[${new Date().toISOString()}] INFO: ${args.join(' ')}`;
        console.log(msg);
        fs.appendFileSync('./logs/app.log', msg + '\n');
    },
    error: (...args) => {
        const msg = `[${new Date().toISOString()}] ERROR: ${args.join(' ')}`;
        console.error(msg);
        fs.appendFileSync('./logs/error.log', msg + '\n');
    },
    warn: (...args) => {
        const msg = `[${new Date().toISOString()}] WARN: ${args.join(' ')}`;
        console.warn(msg);
        fs.appendFileSync('./logs/app.log', msg + '\n');
    },
    debug: (...args) => {
        if (config.logging.level === 'debug') {
            const msg = `[${new Date().toISOString()}] DEBUG: ${args.join(' ')}`;
            console.debug(msg);
            fs.appendFileSync('./logs/debug.log', msg + '\n');
        }
    }
};

// ============================================
// INDIAN PHONE NUMBER VALIDATOR
// ============================================
function isValidIndianNumber(phoneNumber) {
    try {
        // Remove any spaces or special characters
        phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        // Check if it starts with +91 or 91
        let cleanNumber = phoneNumber;
        if (phoneNumber.startsWith('+91')) {
            cleanNumber = phoneNumber.substring(3);
        } else if (phoneNumber.startsWith('91')) {
            cleanNumber = phoneNumber.substring(2);
        } else if (phoneNumber.startsWith('0')) {
            cleanNumber = phoneNumber.substring(1);
        }
        
        // Check if it's 10 digits
        if (!/^\d{10}$/.test(cleanNumber)) {
            return { valid: false, reason: 'Must be 10 digits after country code' };
        }
        
        // Check first digit (Indian mobile numbers start with 6,7,8,9)
        const firstDigit = cleanNumber[0];
        if (!config.india.mobilePrefixes.includes(firstDigit)) {
            return { 
                valid: false, 
                reason: `Indian mobile numbers must start with ${config.india.mobilePrefixes.join(', ')}` 
            };
        }
        
        return { 
            valid: true, 
            number: cleanNumber,
            formatted: `+91${cleanNumber}`
        };
        
    } catch (error) {
        return { valid: false, reason: 'Invalid format' };
    }
}

// ============================================
// INDIAN NUMBER ANALYZER
// ============================================
async function analyzeIndianNumber(phoneNumber) {
    try {
        logger.info(`Analyzing Indian number: ${phoneNumber}`);
        
        // Validate Indian number
        const validation = isValidIndianNumber(phoneNumber);
        if (!validation.valid) {
            return {
                success: false,
                error: `Invalid Indian number: ${validation.reason}`,
                phoneNumber: phoneNumber
            };
        }
        
        const cleanNumber = validation.number;
        const formattedNumber = validation.formatted;
        
        // Parse with libphonenumber
        let parsedNumber;
        try {
            parsedNumber = phoneUtil.parse(formattedNumber, 'IN');
        } catch (e) {
            parsedNumber = phoneUtil.parse('+91' + cleanNumber, 'IN');
        }
        
        const isValid = phoneUtil.isValidNumber(parsedNumber);
        const isPossible = phoneUtil.isPossibleNumber(parsedNumber);
        
        // Get STD code (first 2-4 digits after the first digit)
        let stdCode = '';
        let city = 'Unknown';
        
        // For landline analysis (if starts with 0 or is landline)
        if (cleanNumber.length >= 8) {
            // Check for STD codes of different lengths
            const possibleStdCodes = [
                cleanNumber.substring(0, 4), // 4-digit STD
                cleanNumber.substring(0, 3), // 3-digit STD
                cleanNumber.substring(0, 2)  // 2-digit STD
            ];
            
            for (const code of possibleStdCodes) {
                if (config.india.stdCodes[code]) {
                    stdCode = code;
                    city = config.india.stdCodes[code];
                    break;
                }
            }
        }
        
        // Get operator (for mobile numbers)
        let operator = 'Unknown';
        const firstTwoDigits = cleanNumber.substring(0, 2);
        const firstThreeDigits = cleanNumber.substring(0, 3);
        
        if (config.india.operatorCodes[firstTwoDigits]) {
            operator = config.india.operatorCodes[firstTwoDigits];
        } else if (config.india.operatorCodes[firstThreeDigits]) {
            operator = config.india.operatorCodes[firstThreeDigits];
        }
        
        // Determine number type
        let numberType = 'Mobile';
        if (cleanNumber.startsWith('1800')) {
            numberType = 'Toll Free';
        } else if (cleanNumber.startsWith('1860')) {
            numberType = 'Toll Free';
        } else if (cleanNumber.startsWith('140')) {
            numberType = 'Telemarketing';
        } else if (cleanNumber.startsWith('70') || cleanNumber.startsWith('71') || 
                   cleanNumber.startsWith('72') || cleanNumber.startsWith('73') || 
                   cleanNumber.startsWith('74') || cleanNumber.startsWith('75')) {
            numberType = 'Reliance Jio';
        } else if (cleanNumber.startsWith('80') || cleanNumber.startsWith('81') || 
                   cleanNumber.startsWith('82') || cleanNumber.startsWith('83') || 
                   cleanNumber.startsWith('84') || cleanNumber.startsWith('85')) {
            numberType = 'Airtel';
        } else if (cleanNumber.startsWith('90') || cleanNumber.startsWith('91') || 
                   cleanNumber.startsWith('92') || cleanNumber.startsWith('93') || 
                   cleanNumber.startsWith('94') || cleanNumber.startsWith('95')) {
            numberType = 'Vodafone Idea';
        }
        
        // Get location from geocoder
        let locationName = 'India';
        try {
            const geoLocation = geocoder.getDescriptionForNumber(parsedNumber, 'en');
            if (geoLocation && geoLocation !== 'Unknown') {
                locationName = geoLocation;
            }
        } catch (error) {
            logger.debug('Geocoder error:', error.message);
        }
        
        // Determine telecom circle
        let circle = 'Unknown';
        if (config.features.enableCircleLookup) {
            // Extract likely circle from location
            for (const [circleName, keywords] of Object.entries(config.india.circles)) {
                if (keywords.some(keyword => locationName.includes(keyword))) {
                    circle = circleName;
                    break;
                }
            }
        }
        
        // Get coordinates via Google Maps geocoding
        let coordinates = null;
        let mapUrl = null;
        let staticMapUrl = null;
        
        if (config.google.mapsApiKey && city !== 'Unknown') {
            try {
                const geoResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: {
                        address: `${city}, India`,
                        key: config.google.mapsApiKey,
                        region: 'in',
                        components: 'country:IN'
                    },
                    timeout: 5000
                });
                
                if (geoResponse.data.status === 'OK' && geoResponse.data.results.length > 0) {
                    const result = geoResponse.data.results[0];
                    coordinates = result.geometry.location;
                    
                    mapUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
                    
                    if (config.features.enableStaticMaps) {
                        staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap` +
                            `?center=${coordinates.lat},${coordinates.lng}` +
                            `&zoom=${config.google.staticMapZoom}` +
                            `&size=${config.google.staticMapSize}` +
                            `&maptype=${config.google.mapType}` +
                            `&markers=color:red%7C${coordinates.lat},${coordinates.lng}` +
                            `&region=in` +
                            `&key=${config.google.mapsApiKey}`;
                    }
                }
            } catch (geoError) {
                logger.debug('Geocoding error:', geoError.message);
            }
        }
        
        // Build result
        return {
            success: true,
            valid: isValid,
            possible: isPossible,
            phoneNumber: {
                raw: phoneNumber,
                clean: cleanNumber,
                formatted: formattedNumber,
                international: `+91 ${cleanNumber.substring(0, 5)} ${cleanNumber.substring(5)}`,
                national: `0${cleanNumber}`,
                countryCode: '91',
                country: 'India'
            },
            location: {
                city: city,
                state: locationName.replace('India', '').trim() || 'Unknown',
                country: 'India',
                circle: circle,
                stdCode: stdCode || 'N/A',
                coordinates: coordinates,
                type: numberType,
                operator: operator
            },
            maps: {
                url: mapUrl,
                staticImage: staticMapUrl
            },
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        logger.error('Analysis error:', error);
        return {
            success: false,
            error: error.message,
            phoneNumber: phoneNumber
        };
    }
}

// ============================================
// DISCORD BOT SETUP
// ============================================
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Discord event handlers
discordClient.once('ready', () => {
    logger.info(`✅ Discord bot logged in as ${discordClient.user.tag}`);
    discordClient.user.setActivity('!locate +91XXXXXXXXXX', { type: 'LISTENING' });
    
    // Verify channel access
    if (config.discord.channelId) {
        discordClient.channels.fetch(config.discord.channelId)
            .then(channel => {
                logger.info(`📡 Monitoring channel: #${channel.name}`);
            })
            .catch(error => {
                logger.error(`❌ Cannot access channel ${config.discord.channelId}:`, error.message);
            });
    }
});

discordClient.on('messageCreate', async (message) => {
    // Ignore bots and wrong channels
    if (message.author.bot) return;
    if (config.discord.channelId && message.channel.id !== config.discord.channelId) return;
    
    const prefix = config.discord.commandPrefix;
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    // LOCATE COMMAND
    if (command === 'locate' || command === 'track') {
        if (args.length < 1) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Missing Phone Number')
                        .setDescription('Usage: `!locate +91XXXXXXXXXX`\nExample: `!locate +919876543210`')
                        .addFields(
                            { name: '📱 Indian Numbers Only', value: 'This bot only supports Indian phone numbers (+91)' }
                        )
                ]
            });
        }
        
        const phoneNumber = args[0];
        
        // Validate it's an Indian number
        const validation = isValidIndianNumber(phoneNumber);
        if (!validation.valid) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Invalid Indian Number')
                        .setDescription(validation.reason)
                        .addFields(
                            { name: '✅ Valid Format', value: '+91 98765 43210\n919876543210\n9876543210' },
                            { name: '⚠️ Note', value: 'This bot only supports Indian numbers (+91)' }
                        )
                ]
            });
        }
        
        await message.channel.sendTyping();
        
        const processingMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🔍 Analyzing Indian Number')
                    .setDescription(`Looking up information for **${phoneNumber}**...`)
            ]
        });
        
        try {
            const result = await analyzeIndianNumber(phoneNumber);
            
            if (!result.success) {
                return await processingMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('❌ Analysis Failed')
                            .setDescription(result.error)
                    ]
                });
            }
            
            // Create Discord embed
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🇮🇳 Indian Phone Number Report')
                .setDescription(`Results for **${result.phoneNumber.formatted}**`)
                .addFields(
                    {
                        name: '📞 Number Details',
                        value: [
                            `**Valid:** ${result.valid ? '✅ Yes' : '❌ No'}`,
                            `**International:** ${result.phoneNumber.international}`,
                            `**National:** ${result.phoneNumber.national}`,
                            `**Country:** ${result.phoneNumber.country}`,
                            `**Type:** ${result.location.type}`,
                            `**Operator:** ${result.location.operator}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📍 Location Information',
                        value: [
                            `**City:** ${result.location.city}`,
                            `**State:** ${result.location.state}`,
                            `**Circle:** ${result.location.circle}`,
                            `**STD Code:** ${result.location.stdCode}`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Indian Phone Locator | 🇮🇳 Bharat',
                    iconURL: discordClient.user.displayAvatarURL() 
                });
            
            // Add coordinates if available
            if (result.location.coordinates) {
                embed.addFields({
                    name: '🗺️ Coordinates',
                    value: `**Latitude:** ${result.location.coordinates.lat}\n**Longitude:** ${result.location.coordinates.lng}\n[View on Google Maps](${result.maps.url})`,
                    inline: false
                });
            }
            
            await processingMsg.delete();
            await message.channel.send({ embeds: [embed] });
            
            // Send static map if available
            if (result.maps.staticImage) {
                try {
                    const response = await axios.get(result.maps.staticImage, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(response.data, 'binary');
                    
                    await message.channel.send({
                        content: '🗺️ **Map of Location:**',
                        files: [{
                            attachment: buffer,
                            name: `india-location-${Date.now()}.png`
                        }]
                    });
                } catch (mapError) {
                    logger.debug('Map image error:', mapError.message);
                }
            }
            
            logger.info(`✅ Processed Indian number ${phoneNumber} for ${message.author.tag}`);
            
        } catch (error) {
            logger.error('Command error:', error);
            await processingMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Error')
                        .setDescription(error.message)
                ]
            });
        }
    }
    
    // HELP COMMAND
    else if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🇮🇳 Indian Phone Locator - Help')
            .setDescription('Commands for Indian phone numbers only')
            .addFields(
                { name: '!locate +91XXXXXXXXXX', value: 'Locate an Indian phone number\nExample: `!locate +919876543210`' },
                { name: '!help', value: 'Show this help message' },
                { name: '!info', value: 'Show bot information and stats' },
                { name: '!circles', value: 'Show Indian telecom circles' },
                { name: '!operators', value: 'Show Indian mobile operators' }
            )
            .setFooter({ text: 'Only supports Indian numbers (+91)' });
        
        await message.channel.send({ embeds: [helpEmbed] });
    }
    
    // INFO COMMAND
    else if (command === 'info') {
        const infoEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('ℹ️ Indian Phone Locator Bot')
            .setDescription('Specialized bot for Indian phone numbers (+91)')
            .addFields(
                { name: '🇮🇳 Features', value: '• Indian number validation\n• City/STD code lookup\n• Mobile operator detection\n• Telecom circle mapping\n• Google Maps integration' },
                { name: '📊 Stats', value: `• Uptime: ${Math.floor(process.uptime() / 60)} minutes\n• Indian numbers only` },
                { name: '⚠️ Disclaimer', value: 'For educational purposes only. Respect privacy laws.' }
            )
            .setTimestamp();
        
        await message.channel.send({ embeds: [infoEmbed] });
    }
    
    // CIRCLES COMMAND
    else if (command === 'circles') {
        const circlesList = Object.keys(config.india.circles).slice(0, 25).join('\n');
        const circlesEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📡 Indian Telecom Circles')
            .setDescription(circlesList)
            .setFooter({ text: `${Object.keys(config.india.circles).length} total circles` });
        
        await message.channel.send({ embeds: [circlesEmbed] });
    }
    
    // OPERATORS COMMAND
    else if (command === 'operators') {
        const operatorsEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📱 Indian Mobile Operators')
            .setDescription(
                '**Reliance Jio:** 70-79\n' +
                '**Airtel:** 80-89\n' +
                '**Vodafone Idea:** 90-99\n' +
                '**BSNL:** 60-69 (in some regions)'
            );
        
        await message.channel.send({ embeds: [operatorsEmbed] });
    }
});

// ============================================
// EXPRESS API SERVER
// ============================================
const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Indian Phone Number Locator',
        version: '1.0.0',
        features: ['Indian numbers only (+91)'],
        discord: discordClient.isReady() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// API endpoint for Indian number lookup
app.get('/api/locate', async (req, res) => {
    // Simple auth check
    const authToken = req.headers['authorization'];
    if (!authToken || authToken !== `Bearer ${config.server.authToken}`) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const phone = req.query.phone;
    if (!phone) {
        return res.status(400).json({ error: 'Missing phone parameter' });
    }
    
    // Validate Indian number
    const validation = isValidIndianNumber(phone);
    if (!validation.valid) {
        return res.status(400).json({ 
            error: 'Invalid Indian number',
            reason: validation.reason,
            note: 'Only Indian numbers (+91) are supported'
        });
    }
    
    try {
        const result = await analyzeIndianNumber(phone);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Web interface
app.get('/web', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Indian Phone Number Locator</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 50px auto; 
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .container {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    color: #333;
                }
                h1 { 
                    color: #333;
                    border-bottom: 3px solid #FF9933;
                    padding-bottom: 10px;
                }
                .flag {
                    font-size: 48px;
                    text-align: center;
                    margin: 20px 0;
                }
                input { 
                    width: 100%; 
                    padding: 15px; 
                    margin: 10px 0; 
                    border: 2px solid #ddd;
                    border-radius: 5px;
                    font-size: 16px;
                }
                button { 
                    padding: 15px 30px; 
                    background: #FF9933;
                    color: white; 
                    border: none; 
                    border-radius: 5px;
                    cursor: pointer; 
                    font-size: 16px;
                    font-weight: bold;
                }
                button:hover {
                    background: #FF8000;
                }
                #result { 
                    margin-top: 20px; 
                    padding: 20px; 
                    border: 2px solid #138808;
                    border-radius: 5px;
                    display: none;
                    background: #f9f9f9;
                }
                .note {
                    color: #666;
                    font-size: 14px;
                    margin-top: 20px;
                }
                .warning {
                    background: #ffeeba;
                    border-left: 4px solid #ffc107;
                    padding: 10px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="flag">🇮🇳</div>
                <h1>Indian Phone Number Locator</h1>
                <p>Enter an Indian phone number (+91) to get location information</p>
                
                <div class="warning">
                    ⚠️ This tool only supports Indian numbers (+91)
                </div>
                
                <input type="text" id="phone" placeholder="+91 98765 43210" value="+91">
                <button onclick="locate()">Locate Number</button>
                
                <div id="result"></div>
                
                <div class="note">
                    <strong>Supported formats:</strong><br>
                    • +91 98765 43210<br>
                    • 919876543210<br>
                    • 9876543210<br>
                    <br>
                    <strong>Note:</strong> For educational purposes only.
                </div>
            </div>
            
            <script>
                async function locate() {
                    const phone = document.getElementById('phone').value;
                    const resultDiv = document.getElementById('result');
                    
                    if (!phone) {
                        alert('Please enter a phone number');
                        return;
                    }
                    
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = 'Searching...';
                    
                    try {
                        const response = await fetch('/api/locate?phone=' + encodeURIComponent(phone), {
                            headers: {
                                'Authorization': 'Bearer ${config.server.authToken}'
                            }
                        });
                        const data = await response.json();
                        
                        if (data.error) {
                            resultDiv.innerHTML = '<h3>Error</h3><p>' + data.error + '</p>';
                        } else {
                            resultDiv.innerHTML = '<h3>Results</h3>' +
                                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                        }
                    } catch (error) {
                        resultDiv.innerHTML = '<h3>Error</h3><p>' + error.message + '</p>';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ============================================
// START APPLICATION
// ============================================
async function startApp() {
    try {
        // Start Express server
        app.listen(config.server.port, '0.0.0.0', () => {
            logger.info(`🌐 Web server running on port ${config.server.port}`);
            logger.info(`📊 Web interface: http://localhost:${config.server.port}/web`);
        });
        
        // Login to Discord
        await discordClient.login(config.discord.token);
        logger.info('✅ Discord bot started');
        
        logger.info('🎉 Indian Phone Locator is ready! 🇮🇳');
        logger.info('📱 Only accepting Indian numbers (+91)');
        
    } catch (error) {
        logger.error('💥 Failed to start:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('👋 Shutting down...');
    discordClient.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('👋 Shutting down...');
    discordClient.destroy();
    process.exit(0);
});

// Start the app
startApp();
