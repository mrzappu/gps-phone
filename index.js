// index.js - Indian Phone Locator - NO API KEY REQUIRED!
// Uses built-in India STD database + OpenStreetMap (FREE)

require('dotenv').config();
const config = require('./config');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ============================================
// SIMPLE LOGGER
// ============================================
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${level}: ${args.join(' ')}`;
    console.log(message);
    fs.appendFileSync(path.join(logDir, 'app.log'), message + '\n');
}

// ============================================
// INDIAN NUMBER VALIDATOR
// ============================================
function validateIndianNumber(phoneNumber) {
    try {
        // Clean the number
        let clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        // Extract 10-digit number
        let number = clean;
        if (clean.startsWith('+91')) number = clean.substring(3);
        else if (clean.startsWith('91')) number = clean.substring(2);
        else if (clean.startsWith('0')) number = clean.substring(1);
        
        // Must be 10 digits
        if (!/^\d{10}$/.test(number)) {
            return { valid: false, reason: 'Must be 10 digits' };
        }
        
        // First digit must be 6,7,8,9
        if (!['6','7','8','9'].includes(number[0])) {
            return { valid: false, reason: 'Must start with 6,7,8,9' };
        }
        
        return { valid: true, number, formatted: `+91${number}` };
    } catch (e) {
        return { valid: false, reason: 'Invalid format' };
    }
}

// ============================================
// INDIAN NUMBER ANALYZER (NO API KEYS!)
// ============================================
function analyzeIndianNumber(phoneInput) {
    log('INFO', `Analyzing: ${phoneInput}`);
    
    const validation = validateIndianNumber(phoneInput);
    if (!validation.valid) {
        return { success: false, error: validation.reason };
    }
    
    const { number, formatted } = validation;
    
    // Extract STD code (for landline detection)
    let stdCode = '';
    let cityData = null;
    
    // Check for 4-digit STD first
    if (config.india.cities[number.substring(0, 4)]) {
        stdCode = number.substring(0, 4);
        cityData = config.india.cities[stdCode];
    }
    // Then 3-digit
    else if (config.india.cities[number.substring(0, 3)]) {
        stdCode = number.substring(0, 3);
        cityData = config.india.cities[stdCode];
    }
    // Then 2-digit
    else if (config.india.cities[number.substring(0, 2)]) {
        stdCode = number.substring(0, 2);
        cityData = config.india.cities[stdCode];
    }
    
    // Determine operator
    const firstTwo = number.substring(0, 2);
    const firstThree = number.substring(0, 3);
    let operator = 'Unknown';
    
    if (config.india.operators[firstTwo]) operator = config.india.operators[firstTwo];
    else if (config.india.operators[firstThree]) operator = config.india.operators[firstThree];
    
    // Number type
    let numberType = 'Mobile';
    if (number.startsWith('1800')) numberType = 'Toll Free';
    else if (number.startsWith('1860')) numberType = 'Toll Free';
    else if (number.startsWith('140')) numberType = 'Telemarketing';
    else if (operator !== 'Unknown') numberType = operator;
    
    // Build result
    return {
        success: true,
        valid: true,
        phoneNumber: {
            raw: phoneInput,
            clean: number,
            formatted: formatted,
            international: `+91 ${number.substring(0,5)} ${number.substring(5)}`,
            national: `0${number}`,
            countryCode: '91',
            country: 'India'
        },
        location: {
            city: cityData ? cityData.city : 'Unknown',
            state: cityData ? cityData.state : 'Unknown',
            circle: cityData ? cityData.circle : 'Unknown',
            stdCode: stdCode || 'N/A',
            coordinates: cityData ? { lat: cityData.lat, lng: cityData.lng } : null,
            type: numberType,
            operator: operator,
            cityType: cityData ? cityData.type : 'Unknown'
        },
        maps: {
            // OpenStreetMap URL (FREE - no API key!)
            url: cityData ? 
                `https://www.openstreetmap.org/?mlat=${cityData.lat}&mlon=${cityData.lng}#map=12/${cityData.lat}/${cityData.lng}` : 
                null,
            // Static map image via staticmap.org (FREE)
            staticImage: cityData ?
                `https://staticmap.openstreetmap.de/staticmap.php?center=${cityData.lat},${cityData.lng}&zoom=12&size=800x400&markers=${cityData.lat},${cityData.lng},red` :
                null,
            // Embed URL
            embedUrl: cityData ?
                `https://www.openstreetmap.org/export/embed.html?bbox=${cityData.lng-0.1}%2C${cityData.lat-0.1}%2C${cityData.lng+0.1}%2C${cityData.lat+0.1}&layer=mapnik&marker=${cityData.lat}%2C${cityData.lng}` :
                null
        },
        timestamp: new Date().toISOString()
    };
}

// ============================================
// DISCORD BOT
// ============================================
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.once('ready', () => {
    log('INFO', `✅ Discord bot logged in as ${discordClient.user.tag}`);
    discordClient.user.setActivity('!locate +91XXXXXXXXXX | 🇮🇳 No API Key', { type: 'LISTENING' });
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (config.discord.channelId && message.channel.id !== config.discord.channelId) return;
    
    const prefix = config.discord.commandPrefix;
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    // ===== LOCATE COMMAND =====
    if (command === 'locate' || command === 'track' || command === 'find') {
        if (args.length < 1) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Missing Phone Number')
                    .setDescription('Usage: `!locate +91XXXXXXXXXX`\nExample: `!locate +919876543210`')
                    .setFooter({ text: '🇮🇳 Indian numbers only | No API key needed!' })
                ]
            });
        }
        
        const phoneNumber = args[0];
        
        // Send typing indicator
        await message.channel.sendTyping();
        
        const processingMsg = await message.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔍 Analyzing Indian Number')
                .setDescription(`Looking up **${phoneNumber}**...`)
                .setFooter({ text: 'Using local India database | 100% free' })
            ]
        });
        
        // Analyze
        const result = analyzeIndianNumber(phoneNumber);
        
        if (!result.success) {
            return await processingMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Invalid Indian Number')
                    .setDescription(`Error: ${result.error}`)
                    .addFields({ name: '✅ Valid Format', value: '+91 98765 43210\n919876543210\n9876543210' })
                ]
            });
        }
        
        // Build embed
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🇮🇳 Indian Phone Number Report')
            .setDescription(`Results for **${result.phoneNumber.formatted}**`)
            .addFields(
                {
                    name: '📞 Number Details',
                    value: [
                        `**Number:** ${result.phoneNumber.international}`,
                        `**National:** ${result.phoneNumber.national}`,
                        `**Operator:** ${result.location.operator}`,
                        `**Type:** ${result.location.type}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📍 Location',
                    value: [
                        `**City:** ${result.location.city}`,
                        `**State:** ${result.location.state}`,
                        `**Circle:** ${result.location.circle}`,
                        `**STD Code:** ${result.location.stdCode}`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: '🇮🇳 Indian Phone Locator | No API Key Required | OpenStreetMap',
                iconURL: discordClient.user.displayAvatarURL() 
            });
        
        // Add coordinates if available
        if (result.location.coordinates) {
            embed.addFields({
                name: '🗺️ Coordinates',
                value: `**Lat:** ${result.location.coordinates.lat}\n**Lng:** ${result.location.coordinates.lng}\n[View on OpenStreetMap](${result.maps.url})`,
                inline: false
            });
        }
        
        await processingMsg.delete();
        await message.channel.send({ embeds: [embed] });
        
        // Send static map if available
        if (result.maps.staticImage) {
            try {
                const response = await axios.get(result.maps.staticImage, { 
                    responseType: 'arraybuffer',
                    timeout: 5000 
                });
                
                await message.channel.send({
                    content: '🗺️ **Map Location (OpenStreetMap):**',
                    files: [{
                        attachment: Buffer.from(response.data),
                        name: `india-${result.phoneNumber.clean}.png`
                    }]
                });
            } catch (mapError) {
                log('DEBUG', 'Map image error:', mapError.message);
                // Send OSM link as fallback
                if (result.maps.url) {
                    await message.channel.send(`🗺️ **View Map:** ${result.maps.url}`);
                }
            }
        } else if (result.maps.url) {
            await message.channel.send(`🗺️ **View Map:** ${result.maps.url}`);
        }
        
        log('INFO', `✅ Processed ${phoneNumber} for ${message.author.tag}`);
    }
    
    // ===== HELP COMMAND =====
    else if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🇮🇳 Indian Phone Locator - Help')
            .setDescription('**NO API KEY REQUIRED!** 100% Free using OpenStreetMap')
            .addFields(
                { name: '!locate +91XXXXXXXXXX', value: 'Locate an Indian number\nExample: `!locate +919876543210`' },
                { name: '!cities', value: 'Show all supported Indian cities' },
                { name: '!operators', value: 'Show Indian mobile operators' },
                { name: '!circles', value: 'Show telecom circles' },
                { name: '!stats', value: 'Bot statistics' },
                { name: '!about', value: 'About this bot' }
            )
            .setFooter({ text: 'Powered by OpenStreetMap | No Google API needed!' });
        
        await message.channel.send({ embeds: [helpEmbed] });
    }
    
    // ===== CITIES COMMAND =====
    else if (command === 'cities') {
        const cities = Object.values(config.india.cities)
            .map(c => `${c.city} (${c.state})`)
            .slice(0, 25)
            .join('\n');
        
        await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🏙️ Supported Indian Cities')
                .setDescription(cities)
                .setFooter({ text: `${Object.keys(config.india.cities).length} cities in database` })
            ]
        });
    }
    
    // ===== OPERATORS COMMAND =====
    else if (command === 'operators') {
        const operators = {
            'Reliance Jio': '70-79',
            'Airtel': '80-89',
            'Vodafone Idea': '90-99',
            'BSNL': '60-69'
        };
        
        const opText = Object.entries(operators)
            .map(([op, prefix]) => `**${op}:** ${prefix}`)
            .join('\n');
        
        await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📱 Indian Mobile Operators')
                .setDescription(opText)
            ]
        });
    }
    
    // ===== CIRCLES COMMAND =====
    else if (command === 'circles') {
        await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📡 Indian Telecom Circles')
                .setDescription(config.india.circles.slice(0, 25).join('\n'))
            ]
        });
    }
    
    // ===== STATS COMMAND =====
    else if (command === 'stats') {
        await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📊 Bot Statistics')
                .addFields(
                    { name: 'Cities in DB', value: Object.keys(config.india.cities).length.toString(), inline: true },
                    { name: 'Operators', value: Object.keys(config.india.operators).length.toString(), inline: true },
                    { name: 'Circles', value: config.india.circles.length.toString(), inline: true },
                    { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
                    { name: 'API Keys', value: '✅ NONE!', inline: true },
                    { name: 'Maps', value: 'OpenStreetMap', inline: true }
                )
                .setFooter({ text: '100% Free | No Google billing!' })
            ]
        });
    }
    
    // ===== ABOUT COMMAND =====
    else if (command === 'about') {
        await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🇮🇳 About Indian Phone Locator')
                .setDescription('**NO API KEY REQUIRED!**')
                .addFields(
                    { name: 'Features', value: '• Indian numbers only (+91)\n• Built-in STD database\n• Mobile operator detection\n• OpenStreetMap integration\n• 100% FREE - No billing!' },
                    { name: 'Data Source', value: 'Local India STD database + OpenStreetMap' },
                    { name: '⚠️ Disclaimer', value: 'For educational purposes only. Respect privacy laws.' }
                )
            ]
        });
    }
});

// ============================================
// EXPRESS WEB SERVER (with OpenStreetMap iframe)
// ============================================
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Indian Phone Locator - NO API KEY!',
        version: '2.0.0',
        features: ['Indian numbers only', 'OpenStreetMap', '100% free'],
        discord: discordClient.isReady() ? 'connected' : 'disconnected',
        stats: {
            cities: Object.keys(config.india.cities).length,
            operators: Object.keys(config.india.operators).length
        },
        timestamp: new Date().toISOString()
    });
});

// API endpoint (no auth needed for demo)
app.get('/api/locate', (req, res) => {
    const phone = req.query.phone;
    if (!phone) {
        return res.status(400).json({ error: 'Missing phone parameter' });
    }
    
    const result = analyzeIndianNumber(phone);
    res.json(result);
});

// Web interface with OpenStreetMap
app.get('/web', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Indian Phone Locator - FREE</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { font-family: Arial; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #FF9933; border-bottom: 3px solid #138808; padding-bottom: 10px; }
                .flag { font-size: 48px; text-align: center; margin: 20px 0; }
                input, button { padding: 12px; margin: 5px; font-size: 16px; }
                input { width: 300px; border: 2px solid #ddd; border-radius: 5px; }
                button { background: #FF9933; color: white; border: none; border-radius: 5px; cursor: pointer; }
                button:hover { background: #FF8000; }
                #map { height: 400px; width: 100%; margin-top: 20px; border-radius: 10px; display: none; }
                #result { margin-top: 20px; padding: 20px; border-radius: 5px; display: none; }
                .success { background: #d4edda; border: 1px solid #c3e6cb; }
                .error { background: #f8d7da; border: 1px solid #f5c6cb; }
                .free-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px; display: inline-block; }
                .note { color: #666; font-size: 14px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="flag">🇮🇳</div>
                <h1>Indian Phone Number Locator</h1>
                <p><span class="free-badge">✅ NO API KEY REQUIRED!</span> <span class="free-badge">🗺️ OpenStreetMap</span></p>
                <p>Enter an Indian phone number (+91)</p>
                
                <input type="text" id="phone" placeholder="+91 98765 43210" value="+91">
                <button onclick="locate()">Locate Number</button>
                
                <div id="result"></div>
                <div id="map"></div>
                
                <div class="note">
                    <strong>Supported formats:</strong> +919876543210, 919876543210, 9876543210<br>
                    <strong>Data:</strong> Local India STD database + OpenStreetMap (free tiles)<br>
                    <strong>Note:</strong> 100% free - no Google billing required!
                </div>
            </div>
            
            <script>
                let map = null;
                let marker = null;
                
                async function locate() {
                    const phone = document.getElementById('phone').value;
                    const resultDiv = document.getElementById('result');
                    const mapDiv = document.getElementById('map');
                    
                    if (!phone) {
                        alert('Please enter a phone number');
                        return;
                    }
                    
                    resultDiv.style.display = 'block';
                    resultDiv.className = '';
                    resultDiv.innerHTML = 'Searching...';
                    
                    try {
                        const response = await fetch('/api/locate?phone=' + encodeURIComponent(phone));
                        const data = await response.json();
                        
                        if (data.error) {
                            resultDiv.className = 'error';
                            resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + data.error + '</p>';
                            mapDiv.style.display = 'none';
                        } else {
                            resultDiv.className = 'success';
                            resultDiv.innerHTML = \`
                                <h3>✅ Results</h3>
                                <p><strong>Number:</strong> \${data.phoneNumber.international}</p>
                                <p><strong>Operator:</strong> \${data.location.operator}</p>
                                <p><strong>City:</strong> \${data.location.city}</p>
                                <p><strong>State:</strong> \${data.location.state}</p>
                                <p><strong>Circle:</strong> \${data.location.circle}</p>
                                <p><strong>Coordinates:</strong> \${data.location.coordinates ? data.location.coordinates.lat + ', ' + data.location.coordinates.lng : 'Unknown'}</p>
                                <p><strong>STD Code:</strong> \${data.location.stdCode}</p>
                            \`;
                            
                            if (data.location.coordinates) {
                                const lat = data.location.coordinates.lat;
                                const lng = data.location.coordinates.lng;
                                
                                mapDiv.style.display = 'block';
                                
                                if (!map) {
                                    map = L.map('map').setView([lat, lng], 12);
                                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                        attribution: '© OpenStreetMap contributors'
                                    }).addTo(map);
                                    marker = L.marker([lat, lng]).addTo(map).bindPopup(data.location.city).openPopup();
                                } else {
                                    map.setView([lat, lng], 12);
                                    if (marker) map.removeLayer(marker);
                                    marker = L.marker([lat, lng]).addTo(map).bindPopup(data.location.city).openPopup();
                                }
                            } else {
                                mapDiv.style.display = 'none';
                            }
                        }
                    } catch (error) {
                        resultDiv.className = 'error';
                        resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + error.message + '</p>';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ============================================
// START THE APPLICATION
// ============================================
async function startApp() {
    try {
        // Start Express
        const server = app.listen(config.server.port, '0.0.0.0', () => {
            log('INFO', `🌐 Web server: http://localhost:${config.server.port}`);
            log('INFO', `🌐 Web interface: http://localhost:${config.server.port}/web`);
        });
        
        // Login to Discord
        await discordClient.login(config.discord.token);
        log('INFO', '✅ Discord bot connected');
        log('INFO', '🎉 Indian Phone Locator - NO API KEY VERSION! 🇮🇳');
        log('INFO', `📊 Cities in DB: ${Object.keys(config.india.cities).length}`);
        log('INFO', `📊 Operators: ${Object.keys(config.india.operators).length}`);
        
    } catch (error) {
        log('ERROR', 'Failed to start:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    log('INFO', '👋 Shutting down...');
    discordClient.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('INFO', '👋 Shutting down...');
    discordClient.destroy();
    process.exit(0);
});

// Start
startApp();
