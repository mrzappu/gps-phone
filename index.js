// index.js - Indian Phone + IP Locator
// Features: Phone number lookup + IP geolocation (FREE, no API keys!)

require('dotenv').config();
const config = require('./config');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// LOGGER
// ============================================
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${level.toUpperCase()}: ${args.join(' ')}`;
    console.log(message);
    fs.appendFileSync(path.join(logDir, 'app.log'), message + '\n');
}

// ============================================
// PHONE NUMBER VALIDATOR (Indian only)
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

// ============================================
// PHONE NUMBER ANALYZER
// ============================================
function analyzeIndianNumber(phoneInput) {
    log('info', `Analyzing phone: ${phoneInput}`);
    
    const validation = validateIndianNumber(phoneInput);
    if (!validation.valid) {
        return { success: false, error: validation.reason };
    }
    
    const { number, formatted } = validation;
    
    // Extract STD code
    let stdCode = '';
    let cityData = null;
    
    // Try different STD code lengths (4,3,2)
    for (const length of config.india.stdLengths) {
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
    
    if (config.india.operators[firstTwo]) {
        operator = config.india.operators[firstTwo];
        log('debug', `Operator found: ${firstTwo} -> ${operator}`);
    } else if (config.india.operators[firstThree]) {
        operator = config.india.operators[firstThree];
        log('debug', `Operator found: ${firstThree} -> ${operator}`);
    } else {
        log('debug', `No operator found for ${number}`);
    }
    
    return {
        success: true,
        type: 'phone',
        phoneNumber: {
            raw: phoneInput,
            clean: number,
            formatted: formatted,
            international: `+91 ${number.substring(0,5)} ${number.substring(5)}`,
            national: `0${number}`
        },
        location: {
            city: cityData ? cityData.city : 'Unknown',
            state: cityData ? cityData.state : 'Unknown',
            circle: cityData ? cityData.circle : 'Unknown',
            stdCode: stdCode || 'N/A',
            coordinates: cityData ? { lat: cityData.lat, lng: cityData.lng } : null
        },
        operator: operator,
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
// IP ADDRESS GEOLOCATION (FREE - no API key!)
// Uses ip-api.com - 45 requests/minute free [citation:3][citation:6]
// ============================================
async function locateIP(ipAddress) {
    log('info', `Locating IP: ${ipAddress}`);
    
    try {
        // Validate IP format (basic)
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        
        if (!ipRegex.test(ipAddress) && ipAddress !== 'me' && ipAddress !== 'my') {
            return { 
                success: false, 
                error: 'Invalid IP address format. Use IPv4 (8.8.8.8) or "me" for your own IP.' 
            };
        }
        
        // Handle "me" or "my" - get caller's IP
        let queryIP = ipAddress;
        if (ipAddress === 'me' || ipAddress === 'my') {
            queryIP = ''; // Empty means use requester's IP
        }
        
        // Call ip-api.com (FREE, no key required) [citation:3]
        const url = queryIP 
            ? `${config.ip.endpoint}${queryIP}?fields=${config.ip.fields}`
            : `${config.ip.endpoint}?fields=${config.ip.fields}`;
        
        log('debug', `IP API URL: ${url}`);
        
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;
        
        log('debug', `IP API response: ${JSON.stringify(data)}`);
        
        // Check for error [citation:6]
        if (data.status === 'fail') {
            return {
                success: false,
                error: data.message || 'IP lookup failed'
            };
        }
        
        // Check if mobile network [citation:2]
        const isMobile = data.mobile === true;
        const connectionType = isMobile ? '📱 Mobile Network' : '🏢 Broadband/Business';
        
        // Parse ASN [citation:2]
        let asnInfo = 'N/A';
        if (data.as) {
            const asParts = data.as.split(' ');
            asnInfo = asParts[0] || 'N/A';
        }
        
        // Build result
        return {
            success: true,
            type: 'ip',
            ip: {
                queried: ipAddress,
                resolved: data.query,
                hostname: data.reverse || 'N/A'
            },
            location: {
                country: data.country || 'Unknown',
                countryCode: data.countryCode || 'N/A',
                region: data.regionName || 'Unknown',
                city: data.city || 'Unknown',
                zip: data.zip || 'N/A',
                coordinates: data.lat && data.lon ? { lat: data.lat, lng: data.lon } : null,
                timezone: data.timezone || 'Unknown'
            },
            network: {
                isp: data.isp || 'Unknown',
                organization: data.org || 'Unknown',
                asn: asnInfo,
                connectionType: connectionType,
                mobile: isMobile,
                proxy: data.proxy || false
            },
            maps: {
                url: data.lat && data.lon ? 
                    `https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lon}#map=12/${data.lat}/${data.lon}` : 
                    null,
                staticImage: data.lat && data.lon ?
                    `${config.maps.staticMapService}?center=${data.lat},${data.lon}&zoom=${config.maps.defaultZoom}&size=${config.maps.mapSize}&markers=${data.lat},${data.lon},blue` :
                    null
            },
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        log('error', `IP lookup error: ${error.message}`);
        return {
            success: false,
            error: `IP lookup failed: ${error.message}`
        };
    }
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
    log('info', `✅ Discord bot logged in as ${discordClient.user.tag}`);
    discordClient.user.setActivity(config.discord.status, { type: 'LISTENING' });
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (config.discord.channelId && message.channel.id !== config.discord.channelId) return;
    
    if (!message.content.startsWith(config.discord.prefix)) return;
    
    const args = message.content.slice(config.discord.prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    // ===== PHONE LOCATE COMMAND =====
    if (config.discord.commands.phone.includes(command)) {
        if (args.length < 1) {
            const embed = new EmbedBuilder()
                .setColor(config.discord.embed.errorColor)
                .setTitle('❌ Missing Phone Number')
                .setDescription('Usage: `!locate +919876543210`\nExample: `!locate +919876543210`')
                .setFooter({ text: '🇮🇳 Indian numbers only (+91)' });
            return message.reply({ embeds: [embed] });
        }
        
        await message.channel.sendTyping();
        
        const processingMsg = await message.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔍 Analyzing Indian Phone Number')
                .setDescription(`Looking up **${args[0]}**...`)
            ]
        });
        
        const result = analyzeIndianNumber(args[0]);
        
        if (!result.success) {
            return await processingMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor(config.discord.embed.errorColor)
                    .setTitle('❌ Invalid Indian Number')
                    .setDescription(`Error: ${result.error}`)
                ]
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.discord.embed.phoneColor)
            .setTitle('🇮🇳 Indian Phone Number Report')
            .setDescription(`Results for **${result.phoneNumber.formatted}**`)
            .addFields(
                { name: '📞 Number', value: result.phoneNumber.international, inline: true },
                { name: '📱 Operator', value: result.operator, inline: true },
                { name: '📍 City', value: result.location.city, inline: true },
                { name: '🗺️ State', value: result.location.state, inline: true },
                { name: '📡 Circle', value: result.location.circle, inline: true },
                { name: '🔢 STD Code', value: result.location.stdCode, inline: true }
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
                    files: [{
                        attachment: Buffer.from(response.data),
                        name: `phone-${result.phoneNumber.clean}.png`
                    }]
                });
            } catch (e) {
                if (result.maps.url) {
                    await message.channel.send(`🗺️ Map: ${result.maps.url}`);
                }
            }
        }
    }
    
    // ===== IP LOCATE COMMAND (NEW!) =====
    else if (config.discord.commands.ip.includes(command)) {
        if (args.length < 1) {
            const embed = new EmbedBuilder()
                .setColor(config.discord.embed.errorColor)
                .setTitle('❌ Missing IP Address')
                .setDescription('Usage: `!ip 8.8.8.8` or `!ip me` (your own IP)')
                .addFields(
                    { name: 'Examples', value: '`!ip 8.8.8.8`\n`!ip 2001:4860:4860::8888`\n`!ip me`' }
                )
                .setFooter({ text: 'FREE IP geolocation - 45 requests/min [citation:3]' });
            return message.reply({ embeds: [embed] });
        }
        
        await message.channel.sendTyping();
        
        const processingMsg = await message.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🌐 Locating IP Address')
                .setDescription(`Looking up **${args[0]}**...`)
            ]
        });
        
        const result = await locateIP(args[0]);
        
        if (!result.success) {
            return await processingMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor(config.discord.embed.errorColor)
                    .setTitle('❌ IP Lookup Failed')
                    .setDescription(result.error)
                ]
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.discord.embed.ipColor)
            .setTitle('🌐 IP Address Geolocation Report')
            .setDescription(`Results for **${result.ip.resolved}**`)
            .addFields(
                { name: '📍 Location', value: `${result.location.city}, ${result.location.region}, ${result.location.country}`, inline: false },
                { name: '🌍 Country', value: `${result.location.country} (${result.location.countryCode})`, inline: true },
                { name: '🗺️ Coordinates', value: result.location.coordinates ? 
                    `${result.location.coordinates.lat}, ${result.location.coordinates.lng}` : 'Unknown', inline: true },
                { name: '⏰ Timezone', value: result.location.timezone, inline: true },
                { name: '🏢 ISP', value: result.network.isp, inline: true },
                { name: '📡 Connection', value: result.network.connectionType, inline: true },
                { name: '🔢 ASN', value: result.network.asn, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${config.discord.embed.footer} | Data: ip-api.com [citation:3]` });
        
        if (result.network.mobile) {
            embed.addFields({ name: '📱 Mobile Network', value: '✅ This is a mobile/cellular IP', inline: false });
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
                    files: [{
                        attachment: Buffer.from(response.data),
                        name: `ip-${result.ip.resolved}.png`
                    }]
                });
            } catch (e) {
                if (result.maps.url) {
                    await message.channel.send(`🗺️ Map: ${result.maps.url}`);
                }
            }
        }
    }
    
    // ===== HELP COMMAND =====
    else if (config.discord.commands.help.includes(command)) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🇮🇳 Indian Phone + IP Locator - Commands')
            .setDescription('**NO API KEYS REQUIRED!**')
            .addFields(
                { name: '📱 Phone Commands', value: '`!locate +919876543210` - Locate Indian phone number\n`!phone +919876543210` - Same as above' },
                { name: '🌐 IP Commands', value: '`!ip 8.8.8.8` - Locate IP address\n`!ip me` - Your own IP\n`!ip 2001:4860:4860::8888` - IPv6 supported' },
                { name: 'ℹ️ Other Commands', value: '`!help` - This menu\n`!stats` - Bot statistics' }
            )
            .setFooter({ text: 'Phone: India STD database | IP: ip-api.com (45/min free) [citation:3]' });
        
        await message.channel.send({ embeds: [embed] });
    }
    
    // ===== STATS COMMAND =====
    else if (config.discord.commands.stats.includes(command)) {
        await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📊 Bot Statistics')
                .addFields(
                    { name: '📱 Phone Cities', value: Object.keys(config.india.cities).length.toString(), inline: true },
                    { name: '📱 Operators', value: Object.keys(config.india.operators).length.toString(), inline: true },
                    { name: '🌐 IP Provider', value: 'ip-api.com (free) [citation:3]', inline: true },
                    { name: '🌐 IP Rate Limit', value: '45 requests/minute [citation:6]', inline: true },
                    { name: '🔑 API Keys', value: '✅ NONE!', inline: true },
                    { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 60)} min`, inline: true }
                )
            ]
        });
    }
});

// ============================================
// EXPRESS WEB SERVER
// ============================================
const app = express();
const PORT = config.server.port;

app.get('/', (req, res) => {
    res.json({
        service: 'Indian Phone + IP Locator',
        version: '2.0.0',
        features: ['Indian phone numbers', 'IP geolocation (free)'],
        stats: {
            cities: Object.keys(config.india.cities).length,
            operators: Object.keys(config.india.operators).length,
            ipProvider: 'ip-api.com [citation:3]'
        },
        commands: {
            phone: '!locate +919876543210',
            ip: '!ip 8.8.8.8',
            web: '/web'
        }
    });
});

app.get('/api/phone', (req, res) => {
    const phone = req.query.number;
    if (!phone) return res.status(400).json({ error: 'Missing phone number' });
    res.json(analyzeIndianNumber(phone));
});

app.get('/api/ip', async (req, res) => {
    const ip = req.query.address || 'me';
    const result = await locateIP(ip);
    res.json(result);
});

app.get('/web', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Indian Phone + IP Locator</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { font-family: Arial; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #FF9933; border-bottom: 3px solid #138808; padding-bottom: 10px; }
                .tabs { display: flex; margin: 20px 0; }
                .tab { padding: 10px 20px; cursor: pointer; background: #ddd; margin-right: 5px; border-radius: 5px 5px 0 0; }
                .tab.active { background: #FF9933; color: white; }
                .tab-content { display: none; padding: 20px; border: 1px solid #ddd; border-radius: 0 5px 5px 5px; }
                .tab-content.active { display: block; }
                input, button { padding: 10px; margin: 5px; font-size: 16px; }
                input { width: 300px; border: 2px solid #ddd; border-radius: 5px; }
                button { background: #FF9933; color: white; border: none; border-radius: 5px; cursor: pointer; }
                #map { height: 400px; width: 100%; margin-top: 20px; border-radius: 10px; display: none; }
                .free-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🇮🇳 Indian Phone + IP Locator</h1>
                <p><span class="free-badge">✅ NO API KEYS!</span> <span class="free-badge">📱 Phone + 🌐 IP</span></p>
                
                <div class="tabs">
                    <div class="tab active" onclick="showTab('phone')">📱 Phone Number</div>
                    <div class="tab" onclick="showTab('ip')">🌐 IP Address</div>
                </div>
                
                <div id="phone-tab" class="tab-content active">
                    <h3>Locate Indian Phone Number (+91)</h3>
                    <input type="text" id="phone" placeholder="+91 98765 43210" value="+91">
                    <button onclick="locatePhone()">Locate Phone</button>
                </div>
                
                <div id="ip-tab" class="tab-content">
                    <h3>Locate IP Address</h3>
                    <input type="text" id="ip" placeholder="8.8.8.8 or 'me'" value="8.8.8.8">
                    <button onclick="locateIP()">Locate IP</button>
                </div>
                
                <div id="result" style="margin-top:20px; padding:20px; background:#f0f0f0; border-radius:5px; display:none;"></div>
                <div id="map"></div>
            </div>
            
            <script>
                let map = null;
                let marker = null;
                
                function showTab(tab) {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    
                    if (tab === 'phone') {
                        document.querySelector('.tab').classList.add('active');
                        document.getElementById('phone-tab').classList.add('active');
                    } else {
                        document.querySelectorAll('.tab')[1].classList.add('active');
                        document.getElementById('ip-tab').classList.add('active');
                    }
                }
                
                async function locatePhone() {
                    const phone = document.getElementById('phone').value;
                    await doLocate('/api/phone?number=' + encodeURIComponent(phone), 'phone');
                }
                
                async function locateIP() {
                    const ip = document.getElementById('ip').value;
                    await doLocate('/api/ip?address=' + encodeURIComponent(ip), 'ip');
                }
                
                async function doLocate(url, type) {
                    const resultDiv = document.getElementById('result');
                    const mapDiv = document.getElementById('map');
                    
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = 'Searching...';
                    
                    try {
                        const response = await fetch(url);
                        const data = await response.json();
                        
                        if (data.error) {
                            resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + data.error + '</p>';
                            mapDiv.style.display = 'none';
                        } else {
                            let html = '<h3>✅ Results</h3>';
                            
                            if (type === 'phone') {
                                html += '<p><strong>Number:</strong> ' + data.phoneNumber.international + '</p>';
                                html += '<p><strong>Operator:</strong> ' + data.operator + '</p>';
                                html += '<p><strong>City:</strong> ' + data.location.city + '</p>';
                                html += '<p><strong>State:</strong> ' + data.location.state + '</p>';
                                html += '<p><strong>STD Code:</strong> ' + data.location.stdCode + '</p>';
                            } else {
                                html += '<p><strong>IP:</strong> ' + data.ip.resolved + '</p>';
                                html += '<p><strong>Location:</strong> ' + data.location.city + ', ' + data.location.region + ', ' + data.location.country + '</p>';
                                html += '<p><strong>ISP:</strong> ' + data.network.isp + '</p>';
                                html += '<p><strong>Connection:</strong> ' + data.network.connectionType + '</p>';
                            }
                            
                            if (data.location && data.location.coordinates) {
                                const lat = data.location.coordinates.lat;
                                const lng = data.location.coordinates.lng;
                                
                                mapDiv.style.display = 'block';
                                
                                if (!map) {
                                    map = L.map('map').setView([lat, lng], 12);
                                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                        attribution: '© OpenStreetMap'
                                    }).addTo(map);
                                    marker = L.marker([lat, lng]).addTo(map).bindPopup('Location').openPopup();
                                } else {
                                    map.setView([lat, lng], 12);
                                    if (marker) map.removeLayer(marker);
                                    marker = L.marker([lat, lng]).addTo(map).bindPopup('Location').openPopup();
                                }
                            }
                            
                            resultDiv.innerHTML = html;
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

// ============================================
// START THE APPLICATION
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    log('info', `✅ Web server running on port ${PORT}`);
    log('info', `🌐 Web interface: http://localhost:${PORT}/web`);
    log('info', `📱 Phone API: http://localhost:${PORT}/api/phone?number=+919876543210`);
    log('info', `🌐 IP API: http://localhost:${PORT}/api/ip?address=8.8.8.8`);
});

discordClient.login(config.discord.token).catch(e => {
    log('error', 'Discord login failed:', e.message);
});

log('info', '🚀 Indian Phone + IP Locator started');
log('info', `📊 Cities: ${Object.keys(config.india.cities).length}, Operators: ${Object.keys(config.india.operators).length}`);
