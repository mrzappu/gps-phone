// index.js - Indian Phone + IP Locator with Last Seen Location Stand
// Features: Phone lookup, IP tracking, and location history stand!

require('dotenv').config();
const config = require('./config');

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// CREATE DIRECTORIES
// ============================================
const logDir = path.join(__dirname, 'logs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ============================================
// LOCATION STAND (History Storage)
// ============================================
class LocationStand {
    constructor() {
        this.history = [];
        this.filePath = config.locationStand.filePath;
        this.maxHistory = config.locationStand.maxHistory;
        this.loadHistory();
    }
    
    // Load history from file
    loadHistory() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                this.history = JSON.parse(data);
                console.log(`📊 Loaded ${this.history.length} locations from history`);
            }
        } catch (error) {
            console.error('Error loading history:', error.message);
            this.history = [];
        }
    }
    
    // Save history to file
    saveHistory() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.history, null, 2));
        } catch (error) {
            console.error('Error saving history:', error.message);
        }
    }
    
    // Add location to stand
    addLocation(type, data) {
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            type: type, // 'phone' or 'ip'
            timestamp: new Date().toISOString(),
            query: data.query,
            result: {
                location: data.location,
                operator: data.operator || null,
                maps: data.maps,
                coordinates: data.coordinates
            },
            user: data.user || null
        };
        
        this.history.unshift(entry); // Add to beginning
        
        // Keep only maxHistory items
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
        
        this.saveHistory();
        console.log(`📍 Added to location stand: ${type} - ${data.query}`);
        return entry;
    }
    
    // Get all history
    getHistory(limit = this.maxHistory) {
        return this.history.slice(0, limit);
    }
    
    // Clear history
    clearHistory() {
        this.history = [];
        this.saveHistory();
        console.log('🗑️ Location stand cleared');
    }
    
    // Get last location
    getLastLocation() {
        return this.history.length > 0 ? this.history[0] : null;
    }
    
    // Format for Discord embed
    formatForDiscord() {
        if (this.history.length === 0) {
            return { description: '📍 No locations in stand yet. Use `!locate` or `!ip` to add!' };
        }
        
        const fields = [];
        this.history.slice(0, 10).forEach((entry, index) => {
            const date = new Date(entry.timestamp).toLocaleString('en-IN');
            const typeEmoji = entry.type === 'phone' ? '📱' : '🌐';
            const locationStr = entry.result.location.city 
                ? `${entry.result.location.city}, ${entry.result.location.state || entry.result.location.country}`
                : `${entry.result.location.city || entry.result.location.country || 'Unknown'}`;
            
            fields.push({
                name: `${index + 1}. ${typeEmoji} ${entry.query}`,
                value: `📍 ${locationStr}\n🕐 ${date}\nID: \`${entry.id.slice(-6)}\``,
                inline: false
            });
        });
        
        return {
            title: '📍 Location Stand - Last 10 Searches',
            fields: fields,
            footer: { text: `Total: ${this.history.length} locations` }
        };
    }
    
    // Format for web
    formatForWeb() {
        return this.history.map(entry => ({
            id: entry.id,
            type: entry.type,
            query: entry.query,
            timestamp: entry.timestamp,
            location: entry.result.location,
            coordinates: entry.result.coordinates,
            operator: entry.result.operator,
            maps: entry.result.maps
        }));
    }
}

// Initialize location stand
const locationStand = new LocationStand();

// ============================================
// LOGGER
// ============================================
function log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${level.toUpperCase()}: ${args.join(' ')}`;
    console.log(message);
    fs.appendFileSync(path.join(logDir, 'app.log'), message + '\n');
}

// ============================================
// PHONE NUMBER VALIDATOR
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
function analyzeIndianNumber(phoneInput, user = null) {
    log('info', `Analyzing phone: ${phoneInput}`);
    
    const validation = validateIndianNumber(phoneInput);
    if (!validation.valid) {
        return { success: false, error: validation.reason };
    }
    
    const { number, formatted } = validation;
    
    // Extract STD code
    let stdCode = '';
    let cityData = null;
    
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
    } else if (config.india.operators[firstThree]) {
        operator = config.india.operators[firstThree];
    }
    
    const result = {
        success: true,
        type: 'phone',
        query: formatted,
        user: user,
        location: {
            city: cityData ? cityData.city : 'Unknown',
            state: cityData ? cityData.state : 'Unknown',
            circle: cityData ? cityData.circle : 'Unknown',
            stdCode: stdCode || 'N/A',
            country: 'India',
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
    
    // Add to location stand
    if (config.locationStand.enabled && result.location.city !== 'Unknown') {
        locationStand.addLocation('phone', {
            query: formatted,
            location: result.location,
            operator: operator,
            coordinates: result.location.coordinates,
            maps: result.maps,
            user: user
        });
    }
    
    return result;
}

// ============================================
// IP ADDRESS GEOLOCATION
// ============================================
async function locateIP(ipAddress, user = null) {
    log('info', `Locating IP: ${ipAddress}`);
    
    try {
        // Handle "me" or "my" - get caller's IP
        let queryIP = ipAddress;
        if (ipAddress === 'me' || ipAddress === 'my') {
            queryIP = '';
        }
        
        const url = queryIP 
            ? `${config.ip.endpoint}${queryIP}?fields=${config.ip.fields}`
            : `${config.ip.endpoint}?fields=${config.ip.fields}`;
        
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;
        
        if (data.status === 'fail') {
            return { success: false, error: data.message || 'IP lookup failed' };
        }
        
        const isMobile = data.mobile === true;
        const connectionType = isMobile ? '📱 Mobile Network' : '🏢 Broadband/Business';
        
        let asnInfo = 'N/A';
        if (data.as) {
            const asParts = data.as.split(' ');
            asnInfo = asParts[0] || 'N/A';
        }
        
        const result = {
            success: true,
            type: 'ip',
            query: data.query,
            user: user,
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
        
        // Add to location stand
        if (config.locationStand.enabled && result.location.city && result.location.city !== 'Unknown') {
            locationStand.addLocation('ip', {
                query: result.ip.resolved,
                location: result.location,
                operator: null,
                coordinates: result.location.coordinates,
                maps: result.maps,
                user: user
            });
        }
        
        return result;
        
    } catch (error) {
        log('error', `IP lookup error: ${error.message}`);
        return { success: false, error: `IP lookup failed: ${error.message}` };
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
    
    const targetChannel = config.discord.channelId;
    if (targetChannel && message.channel.id !== targetChannel && message.channel.id !== config.discord.standChannelId) return;
    
    if (!message.content.startsWith(config.discord.prefix)) return;
    
    const args = message.content.slice(config.discord.prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    // ===== PHONE LOCATE COMMAND =====
    if (config.discord.commands.phone.includes(command)) {
        if (args.length < 1) {
            const embed = new EmbedBuilder()
                .setColor(config.discord.embed.errorColor)
                .setTitle('❌ Missing Phone Number')
                .setDescription('Usage: `!locate +919876543210`\nExample: `!locate +919876543210`');
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
        
        const result = analyzeIndianNumber(args[0], message.author.tag);
        
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
            .setDescription(`Results for **${result.query}**`)
            .addFields(
                { name: '📱 Operator', value: result.operator, inline: true },
                { name: '📍 City', value: result.location.city, inline: true },
                { name: '🗺️ State', value: result.location.state, inline: true },
                { name: '📡 Circle', value: result.location.circle, inline: true },
                { name: '🔢 STD Code', value: result.location.stdCode, inline: true },
                { name: '🇮🇳 Country', value: result.location.country, inline: true }
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
        
        // Send to location stand channel if different
        if (config.discord.standChannelId && message.channel.id !== config.discord.standChannelId) {
            const standChannel = await discordClient.channels.fetch(config.discord.standChannelId).catch(() => null);
            if (standChannel) {
                const standEmbed = new EmbedBuilder()
                    .setColor(config.discord.embed.standColor)
                    .setTitle('📍 Added to Location Stand')
                    .setDescription(`📱 Phone: **${result.query}**\n📍 Location: ${result.location.city}, ${result.location.state}\n👤 By: ${message.author.tag}`)
                    .setTimestamp();
                await standChannel.send({ embeds: [standEmbed] }).catch(() => {});
            }
        }
        
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
                        name: `phone-${Date.now()}.png`
                    }]
                });
            } catch (e) {
                if (result.maps.url) {
                    await message.channel.send(`🗺️ Map: ${result.maps.url}`);
                }
            }
        }
    }
    
    // ===== IP LOCATE COMMAND =====
    else if (config.discord.commands.ip.includes(command)) {
        if (args.length < 1) {
            const embed = new EmbedBuilder()
                .setColor(config.discord.embed.errorColor)
                .setTitle('❌ Missing IP Address')
                .setDescription('Usage: `!ip 8.8.8.8` or `!ip me`');
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
        
        const result = await locateIP(args[0], message.author.tag);
        
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
                { name: '📡 Connection', value: result.network.connectionType, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: config.discord.embed.footer });
        
        await processingMsg.delete();
        await message.channel.send({ embeds: [embed] });
        
        // Send to location stand channel if different
        if (config.discord.standChannelId && message.channel.id !== config.discord.standChannelId) {
            const standChannel = await discordClient.channels.fetch(config.discord.standChannelId).catch(() => null);
            if (standChannel) {
                const standEmbed = new EmbedBuilder()
                    .setColor(config.discord.embed.standColor)
                    .setTitle('📍 Added to Location Stand')
                    .setDescription(`🌐 IP: **${result.ip.resolved}**\n📍 Location: ${result.location.city}, ${result.location.country}\n👤 By: ${message.author.tag}`)
                    .setTimestamp();
                await standChannel.send({ embeds: [standEmbed] }).catch(() => {});
            }
        }
        
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
                        name: `ip-${Date.now()}.png`
                    }]
                });
            } catch (e) {
                if (result.maps.url) {
                    await message.channel.send(`🗺️ Map: ${result.maps.url}`);
                }
            }
        }
    }
    
    // ===== LOCATION STAND COMMAND (NEW!) =====
    else if (config.discord.commands.stand.includes(command)) {
        await message.channel.sendTyping();
        
        const standData = locationStand.formatForDiscord();
        
        if (standData.description) {
            const embed = new EmbedBuilder()
                .setColor(config.discord.embed.standColor)
                .setTitle('📍 Location Stand')
                .setDescription(standData.description)
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.discord.embed.standColor)
            .setTitle(standData.title)
            .addFields(standData.fields)
            .setFooter(standData.footer)
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_stand')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('clear_stand')
                    .setLabel('🗑️ Clear')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await message.reply({ embeds: [embed], components: [row] });
    }
    
    // ===== CLEAR STAND COMMAND =====
    else if (config.discord.commands.clear.includes(command)) {
        locationStand.clearHistory();
        const embed = new EmbedBuilder()
            .setColor(config.discord.embed.standColor)
            .setTitle('🗑️ Location Stand Cleared')
            .setDescription('All location history has been cleared.')
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // ===== HELP COMMAND =====
    else if (config.discord.commands.help.includes(command)) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🇮🇳 Indian Phone + IP Locator - Commands')
            .setDescription('**Location Stand v3.0 - NO API KEYS!**')
            .addFields(
                { name: '📱 Phone Commands', value: '`!locate +919876543210` - Locate Indian phone\n`!phone +919876543210` - Same as above' },
                { name: '🌐 IP Commands', value: '`!ip 8.8.8.8` - Locate IP address\n`!ip me` - Your own IP' },
                { name: '📍 Location Stand', value: '`!stand` - Show last 10 locations\n`!clear` - Clear history' },
                { name: 'ℹ️ Other', value: '`!help` - This menu\n`!stats` - Bot statistics' }
            )
            .setFooter({ text: config.discord.embed.footer });
        
        await message.channel.send({ embeds: [embed] });
    }
    
    // ===== STATS COMMAND =====
    else if (config.discord.commands.stats.includes(command)) {
        const history = locationStand.getHistory();
        await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📊 Bot Statistics')
                .addFields(
                    { name: '📱 Phone Cities', value: Object.keys(config.india.cities).length.toString(), inline: true },
                    { name: '📱 Operators', value: Object.keys(config.india.operators).length.toString(), inline: true },
                    { name: '📍 Locations Stored', value: history.length.toString(), inline: true },
                    { name: '🌐 IP Provider', value: 'ip-api.com', inline: true },
                    { name: '🔑 API Keys', value: '✅ NONE!', inline: true },
                    { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 60)} min`, inline: true }
                )
            ]
        });
    }
});

// Button interactions for refresh/clear
discordClient.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === 'refresh_stand') {
        await interaction.deferUpdate();
        const standData = locationStand.formatForDiscord();
        const embed = new EmbedBuilder()
            .setColor(config.discord.embed.standColor)
            .setTitle(standData.title || '📍 Location Stand')
            .setFields(standData.fields || [])
            .setFooter(standData.footer || { text: '' })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
    
    if (interaction.customId === 'clear_stand') {
        locationStand.clearHistory();
        const embed = new EmbedBuilder()
            .setColor(config.discord.embed.standColor)
            .setTitle('🗑️ Location Stand Cleared')
            .setDescription('History has been cleared.')
            .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
    }
});

// ============================================
// EXPRESS WEB SERVER (with Location Stand)
// ============================================
const app = express();
const PORT = config.server.port;

app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/', (req, res) => {
    res.json({
        service: 'Indian Phone + IP Locator',
        version: '3.0.0',
        features: ['Phone lookup', 'IP geolocation', 'Location Stand (last 10)'],
        stats: {
            cities: Object.keys(config.india.cities).length,
            operators: Object.keys(config.india.operators).length,
            locationsStored: locationStand.getHistory().length
        },
        endpoints: {
            phone: '/api/phone?number=+919876543210',
            ip: '/api/ip?address=8.8.8.8',
            stand: '/api/stand',
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

// NEW: Location Stand API
app.get('/api/stand', (req, res) => {
    res.json({
        success: true,
        history: locationStand.formatForWeb(),
        total: locationStand.getHistory().length,
        maxHistory: config.locationStand.maxHistory
    });
});

app.delete('/api/stand', (req, res) => {
    locationStand.clearHistory();
    res.json({ success: true, message: 'Location stand cleared' });
});

// Web Interface with Location Stand
app.get('/web', (req, res) => {
    const history = locationStand.formatForWeb();
    const historyHtml = history.map((entry, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${entry.type === 'phone' ? '📱' : '🌐'}</td>
            <td>${entry.query}</td>
            <td>${entry.location.city || entry.location.country}</td>
            <td>${entry.location.state || entry.location.region || '-'}</td>
            <td>${entry.operator || '-'}</td>
            <td>${new Date(entry.timestamp).toLocaleString('en-IN')}</td>
        </tr>
    `).join('');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Indian Phone + IP Locator with Location Stand</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { font-family: Arial; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #FF9933; border-bottom: 3px solid #138808; padding-bottom: 10px; }
                h2 { color: #333; margin-top: 30px; }
                .tabs { display: flex; margin: 20px 0; }
                .tab { padding: 10px 20px; cursor: pointer; background: #ddd; margin-right: 5px; border-radius: 5px 5px 0 0; }
                .tab.active { background: #FF9933; color: white; }
                .tab-content { display: none; padding: 20px; border: 1px solid #ddd; border-radius: 0 5px 5px 5px; }
                .tab-content.active { display: block; }
                input, button { padding: 10px; margin: 5px; font-size: 16px; }
                input { width: 300px; border: 2px solid #ddd; border-radius: 5px; }
                button { background: #FF9933; color: white; border: none; border-radius: 5px; cursor: pointer; }
                button.danger { background: #dc3545; }
                #map { height: 400px; width: 100%; margin-top: 20px; border-radius: 10px; display: none; }
                .stand-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .stand-table th { background: #FF9933; color: white; padding: 10px; text-align: left; }
                .stand-table td { padding: 8px; border-bottom: 1px solid #ddd; }
                .stand-table tr:hover { background: #f5f5f5; }
                .stats { display: flex; gap: 20px; margin: 20px 0; }
                .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }
                .stat-card h3 { margin: 0; color: #FF9933; }
                .free-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px; display: inline-block; margin: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🇮🇳 Indian Phone + IP Locator</h1>
                <p>
                    <span class="free-badge">✅ NO API KEYS!</span>
                    <span class="free-badge">📱 Phone + 🌐 IP</span>
                    <span class="free-badge">📍 Location Stand</span>
                </p>
                
                <div class="stats">
                    <div class="stat-card">
                        <h3>${Object.keys(config.india.cities).length}</h3>
                        <p>Indian Cities</p>
                    </div>
                    <div class="stat-card">
                        <h3>${Object.keys(config.india.operators).length}</h3>
                        <p>Mobile Operators</p>
                    </div>
                    <div class="stat-card">
                        <h3>${history.length}</h3>
                        <p>Locations in Stand</p>
                    </div>
                </div>
                
                <div class="tabs">
                    <div class="tab active" onclick="showTab('phone')">📱 Phone Number</div>
                    <div class="tab" onclick="showTab('ip')">🌐 IP Address</div>
                    <div class="tab" onclick="showTab('stand')">📍 Location Stand</div>
                </div>
                
                <div id="phone-tab" class="tab-content active">
                    <h3>Locate Indian Phone Number (+91)</h3>
                    <input type="text" id="phone" placeholder="+91 98765 43210" value="+91">
                    <button onclick="locatePhone()">Locate Phone</button>
                    <div id="phone-result" style="margin-top:20px;"></div>
                    <div id="phone-map"></div>
                </div>
                
                <div id="ip-tab" class="tab-content">
                    <h3>Locate IP Address</h3>
                    <input type="text" id="ip" placeholder="8.8.8.8 or 'me'" value="8.8.8.8">
                    <button onclick="locateIP()">Locate IP</button>
                    <div id="ip-result" style="margin-top:20px;"></div>
                    <div id="ip-map"></div>
                </div>
                
                <div id="stand-tab" class="tab-content">
                    <h3>📍 Location Stand - Last ${config.locationStand.maxHistory} Searches</h3>
                    <button onclick="refreshStand()" style="margin-right:10px;">🔄 Refresh</button>
                    <button class="danger" onclick="clearStand()">🗑️ Clear All</button>
                    <table class="stand-table" id="stand-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Type</th>
                                <th>Query</th>
                                <th>City</th>
                                <th>State/Region</th>
                                <th>Operator/ISP</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historyHtml || '<tr><td colspan="7" style="text-align:center;">No locations yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <div id="map" style="height:400px; margin-top:20px; border-radius:10px; display:none;"></div>
            </div>
            
            <script>
                let map = null;
                let currentMarker = null;
                
                function showTab(tab) {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    
                    if (tab === 'phone') {
                        document.querySelectorAll('.tab')[0].classList.add('active');
                        document.getElementById('phone-tab').classList.add('active');
                    } else if (tab === 'ip') {
                        document.querySelectorAll('.tab')[1].classList.add('active');
                        document.getElementById('ip-tab').classList.add('active');
                    } else {
                        document.querySelectorAll('.tab')[2].classList.add('active');
                        document.getElementById('stand-tab').classList.add('active');
                    }
                }
                
                function initMap(lat, lng, popupText) {
                    if (!map) {
                        map = L.map('map').setView([lat, lng], 12);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap'
                        }).addTo(map);
                    } else {
                        map.setView([lat, lng], 12);
                        if (currentMarker) map.removeLayer(currentMarker);
                    }
                    
                    currentMarker = L.marker([lat, lng]).addTo(map)
                        .bindPopup(popupText)
                        .openPopup();
                    
                    document.getElementById('map').style.display = 'block';
                }
                
                async function locatePhone() {
                    const phone = document.getElementById('phone').value;
                    const resultDiv = document.getElementById('phone-result');
                    
                    resultDiv.innerHTML = 'Searching...';
                    
                    try {
                        const response = await fetch('/api/phone?number=' + encodeURIComponent(phone));
                        const data = await response.json();
                        
                        if (data.error) {
                            resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + data.error + '</p>';
                        } else {
                            resultDiv.innerHTML = \`
                                <h3>✅ Results</h3>
                                <p><strong>Number:</strong> \${data.query}</p>
                                <p><strong>Operator:</strong> \${data.operator}</p>
                                <p><strong>City:</strong> \${data.location.city}</p>
                                <p><strong>State:</strong> \${data.location.state}</p>
                                <p><strong>Circle:</strong> \${data.location.circle}</p>
                                <p><strong>STD Code:</strong> \${data.location.stdCode}</p>
                            \`;
                            
                            if (data.location.coordinates) {
                                initMap(data.location.coordinates.lat, data.location.coordinates.lng, data.location.city);
                                setTimeout(() => refreshStand(), 1000);
                            }
                        }
                    } catch (error) {
                        resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + error.message + '</p>';
                    }
                }
                
                async function locateIP() {
                    const ip = document.getElementById('ip').value;
                    const resultDiv = document.getElementById('ip-result');
                    
                    resultDiv.innerHTML = 'Searching...';
                    
                    try {
                        const response = await fetch('/api/ip?address=' + encodeURIComponent(ip));
                        const data = await response.json();
                        
                        if (data.error) {
                            resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + data.error + '</p>';
                        } else {
                            resultDiv.innerHTML = \`
                                <h3>✅ Results</h3>
                                <p><strong>IP:</strong> \${data.ip.resolved}</p>
                                <p><strong>Location:</strong> \${data.location.city}, \${data.location.region}, \${data.location.country}</p>
                                <p><strong>ISP:</strong> \${data.network.isp}</p>
                                <p><strong>Connection:</strong> \${data.network.connectionType}</p>
                            \`;
                            
                            if (data.location.coordinates) {
                                initMap(data.location.coordinates.lat, data.location.coordinates.lng, data.ip.resolved);
                                setTimeout(() => refreshStand(), 1000);
                            }
                        }
                    } catch (error) {
                        resultDiv.innerHTML = '<h3>❌ Error</h3><p>' + error.message + '</p>';
                    }
                }
                
                async function refreshStand() {
                    try {
                        const response = await fetch('/api/stand');
                        const data = await response.json();
                        
                        if (data.success) {
                            const tbody = document.querySelector('#stand-table tbody');
                            if (data.history.length === 0) {
                                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No locations yet</td></tr>';
                            } else {
                                tbody.innerHTML = data.history.map((entry, index) => \`
                                    <tr>
                                        <td>\${index + 1}</td>
                                        <td>\${entry.type === 'phone' ? '📱' : '🌐'}</td>
                                        <td>\${entry.query}</td>
                                        <td>\${entry.location.city || entry.location.country}</td>
                                        <td>\${entry.location.state || entry.location.region || '-'}</td>
                                        <td>\${entry.operator || entry.location.isp || '-'}</td>
                                        <td>\${new Date(entry.timestamp).toLocaleString('en-IN')}</td>
                                    </tr>
                                \`).join('');
                            }
                        }
                    } catch (error) {
                        console.error('Refresh error:', error);
                    }
                }
                
                async function clearStand() {
                    if (!confirm('Clear all location history?')) return;
                    
                    try {
                        const response = await fetch('/api/stand', { method: 'DELETE' });
                        const data = await response.json();
                        
                        if (data.success) {
                            document.querySelector('#stand-table tbody').innerHTML = 
                                '<tr><td colspan="7" style="text-align:center;">No locations yet</td></tr>';
                        }
                    } catch (error) {
                        alert('Error clearing history');
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
    log('info', `📍 Location Stand: ${locationStand.getHistory().length} locations stored`);
});

discordClient.login(config.discord.token).catch(e => {
    log('error', 'Discord login failed:', e.message);
});

log('info', '🚀 Indian Phone + IP Locator with Location Stand started');
log('info', `📊 Cities: ${Object.keys(config.india.cities).length}, Operators: ${Object.keys(config.india.operators).length}`);
log('info', `📍 Location Stand: ${config.locationStand.maxHistory} max history, saving to ${config.locationStand.filePath}`);
