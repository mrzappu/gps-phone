// index.js - Main application using config.js
require('dotenv').config();
const config = require('./config');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// LOGGER SETUP
// ============================================
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${level.toUpperCase()}: ${args.join(' ')}`;
    console.log(message);
    if (config.logging.file) {
        fs.appendFileSync(path.join(logDir, 'app.log'), message + '\n');
    }
}

// ============================================
// VALIDATE CONFIGURATION
// ============================================
const validation = config.validate();
if (!validation.valid) {
    log('error', 'Configuration validation failed:');
    validation.errors.forEach(err => log('error', `  - ${err}`));
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// ============================================
// PHONE NUMBER ANALYZER
// ============================================
function validateIndianNumber(phoneNumber) {
    try {
        let clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        let number = clean;
        if (clean.startsWith('+91')) number = clean.substring(3);
        else if (clean.startsWith('91')) number = clean.substring(2);
        else if (clean.startsWith('0')) number = clean.substring(1);
        
        if (!/^\d{10}$/.test(number)) {
            return { valid: false, reason: 'Must be 10 digits' };
        }
        
        if (!config.india.mobilePrefixes.includes(number[0])) {
            return { valid: false, reason: `Must start with ${config.india.mobilePrefixes.join(', ')}` };
        }
        
        return { valid: true, number, formatted: `+91${number}` };
    } catch (e) {
        return { valid: false, reason: 'Invalid format' };
    }
}

function analyzeIndianNumber(phoneInput) {
    log('info', `Analyzing: ${phoneInput}`);
    
    const validation = validateIndianNumber(phoneInput);
    if (!validation.valid) {
        return { success: false, error: validation.reason };
    }
    
    const { number, formatted } = validation;
    
    // Extract STD code
    let stdCode = '';
    let cityData = null;
    
    // Try different STD code lengths
    for (const length of config.india.stdCodeLengths) {
        const code = number.substring(0, length);
        if (config.india.cities[code]) {
            stdCode = code;
            cityData = config.india.cities[code];
            break;
        }
    }
    
    // Determine operator
    const firstTwo = number.substring(0, 2);
    const firstThree = number.substring(0, 3);
    let operator = 'Unknown';
    
    if (config.india.operators[firstTwo]) operator = config.india.operators[firstTwo];
    else if (config.india.operators[firstThree]) operator = config.india.operators[firstThree];
    
    // Build result
    return {
        success: true,
        phoneNumber: {
            raw: phoneInput,
            clean: number,
            formatted: formatted,
            international: `+91 ${number.substring(0,5)} ${number.substring(5)}`,
            national: `0${number}`,
            countryCode: config.india.countryCode,
            country: config.india.countryName
        },
        location: {
            city: cityData ? cityData.city : 'Unknown',
            state: cityData ? cityData.state : 'Unknown',
            circle: cityData ? cityData.circle : 'Unknown',
            stdCode: stdCode || 'N/A',
            coordinates: cityData ? { lat: cityData.lat, lng: cityData.lng } : null,
            population: cityData ? cityData.population : 'Unknown',
            type: cityData ? cityData.type : 'Unknown'
        },
        operator: {
            name: operator,
            circle: cityData ? cityData.circle : 'Unknown'
        },
        maps: {
            url: cityData ? 
                `https://www.openstreetmap.org/?mlat=${cityData.lat}&mlon=${cityData.lng}#map=12/${cityData.lat}/${cityData.lng}` : 
                null,
            staticImage: cityData ?
                `${config.maps.staticMapService}?center=${cityData.lat},${cityData.lng}&zoom=${config.maps.defaultZoom}&size=${config.maps.mapSize}&markers=${cityData.lat},${cityData.lng},red` :
                null
        },
        timestamp: new Date().toISOString()
    };
}

// ============================================
// DISCORD BOT (using config.discord)
// ============================================
if (config.features.enableDiscordBot) {
    const intents = [];
    if (config.discord.intents.guilds) intents.push(GatewayIntentBits.Guilds);
    if (config.discord.intents.messages) intents.push(GatewayIntentBits.GuildMessages);
    if (config.discord.intents.messageContent) intents.push(GatewayIntentBits.MessageContent);
    
    const discordClient = new Client({ intents });
    
    discordClient.once('ready', () => {
        log('info', `✅ Discord bot logged in as ${discordClient.user.tag}`);
        discordClient.user.setActivity(config.discord.status, { type: 'LISTENING' });
    });
    
    discordClient.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (config.discord.channelId && message.channel.id !== config.discord.channelId) return;
        
        if (!message.content.startsWith(config.discord.prefix)) return;
        
        const args = message.content.slice(config.discord.prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        
        // LOCATE COMMAND
        if (config.discord.commands.locate.includes(command)) {
            if (args.length < 1) {
                return message.reply(`Usage: \`${config.discord.prefix}locate +919876543210\``);
            }
            
            await message.channel.sendTyping();
            
            const result = analyzeIndianNumber(args[0]);
            
            if (!result.success) {
                return message.reply(`❌ Error: ${result.error}`);
            }
            
            const embed = new EmbedBuilder()
                .setColor(config.discord.embed.color)
                .setTitle('🇮🇳 Indian Phone Number Report')
                .setDescription(`Results for **${result.phoneNumber.formatted}**`)
                .addFields(
                    { name: '📞 Number', value: result.phoneNumber.international, inline: true },
                    { name: '📱 Operator', value: result.operator.name, inline: true },
                    { name: '📍 City', value: result.location.city, inline: true },
                    { name: '🗺️ State', value: result.location.state, inline: true },
                    { name: '📡 Circle', value: result.location.circle, inline: true },
                    { name: '🔢 STD Code', value: result.location.stdCode, inline: true },
                    { name: '👥 Population', value: result.location.population, inline: true },
                    { name: '🏙️ Type', value: result.location.type, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: config.discord.embed.footer });
            
            if (result.location.coordinates) {
                embed.addFields({
                    name: '🗺️ Coordinates',
                    value: `Lat: ${result.location.coordinates.lat}, Lng: ${result.location.coordinates.lng}`,
                    inline: false
                });
            }
            
            await message.channel.send({ embeds: [embed] });
            
            // Send map if available
            if (result.maps.staticImage && config.features.enableStaticMaps) {
                try {
                    const response = await axios.get(result.maps.staticImage, { 
                        responseType: 'arraybuffer',
                        timeout: 5000 
                    });
                    await message.channel.send({
                        files: [{
                            attachment: Buffer.from(response.data),
                            name: `map-${result.phoneNumber.clean}.png`
                        }]
                    });
                } catch (e) {
                    if (result.maps.url) {
                        await message.channel.send(`🗺️ View map: ${result.maps.url}`);
                    }
                }
            }
        }
        
        // HELP COMMAND
        else if (config.discord.commands.help.includes(command)) {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🇮🇳 Indian Phone Locator - Commands')
                .setDescription('**No API Key Required!**')
                .addFields(
                    { name: `${config.discord.prefix}locate +91xxxxxxxxxx`, value: 'Locate an Indian phone number' },
                    { name: `${config.discord.prefix}cities`, value: 'Show all supported cities' },
                    { name: `${config.discord.prefix}operators`, value: 'Show mobile operators' },
                    { name: `${config.discord.prefix}stats`, value: 'Bot statistics' },
                    { name: `${config.discord.prefix}help`, value: 'Show this help' }
                )
                .setFooter({ text: config.discord.embed.footer });
            
            await message.channel.send({ embeds: [embed] });
        }
        
        // CITIES COMMAND
        else if (config.discord.commands.cities.includes(command)) {
            const cities = Object.values(config.india.cities)
                .map(c => `${c.city} (${c.state})`)
                .slice(0, 25)
                .join('\n');
            
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🏙️ Supported Indian Cities')
                    .setDescription(cities)
                    .setFooter({ text: `Total: ${Object.keys(config.india.cities).length} cities` })
                ]
            });
        }
        
        // OPERATORS COMMAND
        else if (config.discord.commands.operators.includes(command)) {
            const ops = {};
            Object.entries(config.india.operators).forEach(([code, name]) => {
                ops[name] = ops[name] || [];
                ops[name].push(code);
            });
            
            const opText = Object.entries(ops)
                .map(([name, codes]) => `**${name}:** ${codes[0]}-${codes[codes.length-1]}`)
                .join('\n');
            
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('📱 Indian Mobile Operators')
                    .setDescription(opText)
                ]
            });
        }
        
        // STATS COMMAND
        else if (config.discord.commands.stats.includes(command)) {
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('📊 Bot Statistics')
                    .addFields(
                        { name: 'Cities in DB', value: Object.keys(config.india.cities).length.toString(), inline: true },
                        { name: 'Operators', value: Object.keys(config.india.operators).length.toString(), inline: true },
                        { name: 'Circles', value: config.india.circles.length.toString(), inline: true },
                        { name: 'API Keys', value: '✅ NONE!', inline: true },
                        { name: 'Maps', value: 'OpenStreetMap', inline: true },
                        { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} min`, inline: true }
                    )
                ]
            });
        }
    });
    
    // Login to Discord
    discordClient.login(config.discord.token).catch(e => {
        log('error', 'Discord login failed:', e.message);
    });
}

// ============================================
// EXPRESS WEB SERVER
// ============================================
if (config.features.enableWebServer) {
    const app = express();
    
    app.get('/', (req, res) => {
        res.json({
            service: 'Indian Phone Locator',
            version: '1.0.0',
            features: {
                discord: config.features.enableDiscordBot,
                maps: config.features.enableStaticMaps,
                apiKeys: 'None required'
            },
            stats: {
                cities: Object.keys(config.india.cities).length,
                operators: Object.keys(config.india.operators).length
            },
            timestamp: new Date().toISOString()
        });
    });
    
    app.get('/api/locate', (req, res) => {
        const phone = req.query.phone;
        if (!phone) {
            return res.status(400).json({ error: 'Missing phone parameter' });
        }
        res.json(analyzeIndianNumber(phone));
    });
    
    app.get('/web', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Indian Phone Locator</title>
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
                    #result { margin-top: 20px; padding: 20px; border-radius: 5px; display: none; background: #f0f0f0; }
                    .free-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="flag">🇮🇳</div>
                    <h1>Indian Phone Number Locator</h1>
                    <p><span class="free-badge">✅ NO API KEY REQUIRED!</span></p>
                    
                    <input type="text" id="phone" placeholder="+91 98765 43210" value="+91">
                    <button onclick="locate()">Locate Number</button>
                    
                    <div id="result"></div>
                    <div id="map"></div>
                </div>
                
                <script>
                    let map = null;
                    let marker = null;
                    
                    async function locate() {
                        const phone = document.getElementById('phone').value;
                        const resultDiv = document.getElementById('result');
                        const mapDiv = document.getElementById('map');
                        
                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = 'Searching...';
                        
                        try {
                            const response = await fetch('/api/locate?phone=' + encodeURIComponent(phone));
                            const data = await response.json();
                            
                            if (data.error) {
                                resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + data.error + '</p>';
                                mapDiv.style.display = 'none';
                            } else {
                                resultDiv.innerHTML = \`
                                    <h3>✅ Results</h3>
                                    <p><strong>Number:</strong> \${data.phoneNumber.international}</p>
                                    <p><strong>Operator:</strong> \${data.operator.name}</p>
                                    <p><strong>City:</strong> \${data.location.city}</p>
                                    <p><strong>State:</strong> \${data.location.state}</p>
                                    <p><strong>Circle:</strong> \${data.location.circle}</p>
                                    <p><strong>STD Code:</strong> \${data.location.stdCode}</p>
                                    <p><strong>Type:</strong> \${data.location.type}</p>
                                \`;
                                
                                if (data.location.coordinates) {
                                    const lat = data.location.coordinates.lat;
                                    const lng = data.location.coordinates.lng;
                                    
                                    mapDiv.style.display = 'block';
                                    
                                    if (!map) {
                                        map = L.map('map').setView([lat, lng], 12);
                                        L.tileLayer('${config.maps.tileServer}', {
                                            attribution: '${config.maps.attribution}'
                                        }).addTo(map);
                                        marker = L.marker([lat, lng]).addTo(map).bindPopup(data.location.city).openPopup();
                                    } else {
                                        map.setView([lat, lng], 12);
                                        if (marker) map.removeLayer(marker);
                                        marker = L.marker([lat, lng]).addTo(map).bindPopup(data.location.city).openPopup();
                                    }
                                }
                            }
                        } catch (error) {
                            resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + error.message + '</p>';
                        }
                    }
                </script>
            </body>
            </html>
        `);
    });
    
    app.listen(config.server.port, '0.0.0.0', () => {
        log('info', `✅ Web server running on port ${config.server.port}`);
        log('info', `🌐 Web interface: http://localhost:${config.server.port}/web`);
    });
}

log('info', '🚀 Indian Phone Locator started');
log('info', `📊 Cities: ${Object.keys(config.india.cities).length}, Operators: ${Object.keys(config.india.operators).length}`);
