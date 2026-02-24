// index.js - Indian Phone Locator - NO API KEY REQUIRED!
// Complete working version for Render deployment

require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
// INDIA DATABASE - COMPLETE STD CODES
// ============================================
const INDIA_CITIES = {
    // METRO CITIES (2-digit STD codes)
    "11": { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, circle: "Delhi NCR", type: "Metro" },
    "22": { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, circle: "Mumbai", type: "Metro" },
    "33": { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, circle: "Kolkata", type: "Metro" },
    "44": { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, circle: "Chennai", type: "Metro" },
    "80": { city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946, circle: "Karnataka", type: "Metro" },
    "40": { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867, circle: "Andhra Pradesh", type: "Metro" },
    "20": { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, circle: "Maharashtra", type: "Major City" },
    "79": { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, circle: "Gujarat", type: "Metro" },
    
    // 3-digit STD codes
    "141": { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, circle: "Rajasthan", type: "Major City" },
    "522": { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, circle: "Uttar Pradesh", type: "Major City" },
    "512": { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, circle: "Uttar Pradesh", type: "Major City" },
    "712": { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, circle: "Maharashtra", type: "Major City" },
    "731": { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, circle: "Madhya Pradesh", type: "Major City" },
    "755": { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, circle: "Madhya Pradesh", type: "Major City" },
    "612": { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, circle: "Bihar", type: "Major City" },
    "461": { city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, circle: "Tamil Nadu", type: "City" },
    "471": { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, circle: "Kerala", type: "Major City" },
    "484": { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, circle: "Kerala", type: "Major City" },
    "422": { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, circle: "Tamil Nadu", type: "Major City" },
    "431": { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, circle: "Tamil Nadu", type: "Major City" },
    "413": { city: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083, circle: "Tamil Nadu", type: "City" },
    "821": { city: "Mysore", state: "Karnataka", lat: 12.2958, lng: 76.6394, circle: "Karnataka", type: "City" },
    "832": { city: "Mangalore", state: "Karnataka", lat: 12.9141, lng: 74.8560, circle: "Karnataka", type: "City" },
    "891": { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, circle: "Andhra Pradesh", type: "Major City" },
    "863": { city: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, circle: "Andhra Pradesh", type: "City" },
    "866": { city: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, circle: "Andhra Pradesh", type: "City" },
    "5422": { city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, circle: "Uttar Pradesh", type: "City" },
    "562": { city: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, circle: "Uttar Pradesh", type: "City" },
    "751": { city: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828, circle: "Madhya Pradesh", type: "City" },
    "761": { city: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864, circle: "Madhya Pradesh", type: "City" },
    "781": { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296, circle: "Chhattisgarh", type: "Major City" },
    "836": { city: "Hubli", state: "Karnataka", lat: 15.3647, lng: 75.1240, circle: "Karnataka", type: "City" }
};

const OPERATORS = {
    "70": "Reliance Jio", "71": "Reliance Jio", "72": "Reliance Jio", "73": "Reliance Jio",
    "74": "Reliance Jio", "75": "Reliance Jio", "76": "Reliance Jio", "77": "Reliance Jio",
    "78": "Reliance Jio", "79": "Reliance Jio",
    "80": "Airtel", "81": "Airtel", "82": "Airtel", "83": "Airtel",
    "84": "Airtel", "85": "Airtel", "86": "Airtel", "87": "Airtel", "88": "Airtel", "89": "Airtel",
    "90": "Vodafone Idea", "91": "Vodafone Idea", "92": "Vodafone Idea", "93": "Vodafone Idea",
    "94": "Vodafone Idea", "95": "Vodafone Idea", "96": "Vodafone Idea", "97": "Vodafone Idea",
    "98": "Vodafone Idea", "99": "Vodafone Idea"
};

// ============================================
// INDIAN NUMBER VALIDATOR
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
        
        if (!['6','7','8','9'].includes(number[0])) {
            return { valid: false, reason: 'Must start with 6,7,8,9' };
        }
        
        return { valid: true, number, formatted: `+91${number}` };
    } catch (e) {
        return { valid: false, reason: 'Invalid format' };
    }
}

// ============================================
// ANALYZE FUNCTION
// ============================================
function analyzeIndianNumber(phoneInput) {
    log('INFO', `Analyzing: ${phoneInput}`);
    
    const validation = validateIndianNumber(phoneInput);
    if (!validation.valid) {
        return { success: false, error: validation.reason };
    }
    
    const { number, formatted } = validation;
    
    // Extract STD code
    let stdCode = '';
    let cityData = null;
    
    // Check for 4-digit STD first
    if (INDIA_CITIES[number.substring(0, 4)]) {
        stdCode = number.substring(0, 4);
        cityData = INDIA_CITIES[stdCode];
    }
    // Then 3-digit
    else if (INDIA_CITIES[number.substring(0, 3)]) {
        stdCode = number.substring(0, 3);
        cityData = INDIA_CITIES[stdCode];
    }
    // Then 2-digit
    else if (INDIA_CITIES[number.substring(0, 2)]) {
        stdCode = number.substring(0, 2);
        cityData = INDIA_CITIES[stdCode];
    }
    
    // Determine operator
    const firstTwo = number.substring(0, 2);
    const firstThree = number.substring(0, 3);
    let operator = 'Unknown';
    
    if (OPERATORS[firstTwo]) operator = OPERATORS[firstTwo];
    else if (OPERATORS[firstThree]) operator = OPERATORS[firstThree];
    
    // Number type
    let numberType = 'Mobile';
    if (number.startsWith('1800')) numberType = 'Toll Free';
    else if (number.startsWith('1860')) numberType = 'Toll Free';
    else if (operator !== 'Unknown') numberType = operator;
    
    return {
        success: true,
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
            coordinates: cityData ? { lat: cityData.lat, lng: cityData.lng } : null,
            operator: operator,
            type: numberType
        },
        maps: {
            url: cityData ? 
                `https://www.openstreetmap.org/?mlat=${cityData.lat}&mlon=${cityData.lng}#map=12/${cityData.lat}/${cityData.lng}` : 
                null,
            staticImage: cityData ?
                `https://staticmap.openstreetmap.de/staticmap.php?center=${cityData.lat},${cityData.lng}&zoom=12&size=600x300&markers=${cityData.lat},${cityData.lng},red` :
                null
        }
    };
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

discordClient.once('ready', () => {
    log('INFO', `✅ Bot logged in as ${discordClient.user.tag}`);
    discordClient.user.setActivity('!locate +91XXXXXXXXXX', { type: 'LISTENING' });
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (process.env.DISCORD_CHANNEL_ID && message.channel.id !== process.env.DISCORD_CHANNEL_ID) return;
    
    if (!message.content.startsWith('!')) return;
    
    const args = message.content.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    if (command === 'locate' || command === 'track') {
        if (args.length < 1) {
            return message.reply('Usage: `!locate +919876543210`');
        }
        
        await message.channel.sendTyping();
        
        const result = analyzeIndianNumber(args[0]);
        
        if (!result.success) {
            return message.reply(`❌ Error: ${result.error}`);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🇮🇳 Indian Phone Report')
            .setDescription(`Results for **${result.phoneNumber.formatted}**`)
            .addFields(
                { name: '📞 Number', value: result.phoneNumber.international, inline: true },
                { name: '📱 Operator', value: result.location.operator, inline: true },
                { name: '📍 City', value: result.location.city, inline: true },
                { name: '🗺️ State', value: result.location.state, inline: true },
                { name: '📡 Circle', value: result.location.circle, inline: true },
                { name: '🔢 STD', value: result.location.stdCode, inline: true }
            )
            .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
        
        if (result.maps.staticImage) {
            try {
                const response = await axios.get(result.maps.staticImage, { responseType: 'arraybuffer' });
                await message.channel.send({
                    files: [{
                        attachment: Buffer.from(response.data),
                        name: 'map.png'
                    }]
                });
            } catch (e) {
                if (result.maps.url) await message.channel.send(`🗺️ Map: ${result.maps.url}`);
            }
        }
    }
    
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🇮🇳 Commands')
            .setDescription('`!locate +91xxxxxxxxxx` - Locate Indian number\n`!help` - This help\n`!stats` - Bot stats');
        await message.channel.send({ embeds: [embed] });
    }
});

// ============================================
// EXPRESS WEB SERVER
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        bot: 'Indian Phone Locator',
        features: ['No API Key', 'OpenStreetMap', 'Free'],
        discord: discordClient.isReady() ? 'connected' : 'disconnected'
    });
});

app.get('/api/locate', (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.status(400).json({ error: 'Missing phone' });
    res.json(analyzeIndianNumber(phone));
});

app.get('/web', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Indian Phone Locator</title>
        <style>
            body{font-family:Arial;max-width:800px;margin:50px auto;padding:20px}
            input,button{padding:10px;margin:5px}
            #result{margin-top:20px}
        </style>
        </head>
        <body>
            <h1>🇮🇳 Indian Phone Locator</h1>
            <p>No API Key Required - Free OpenStreetMap</p>
            <input id="phone" placeholder="+919876543210" value="+91">
            <button onclick="locate()">Locate</button>
            <pre id="result"></pre>
            <script>
                async function locate(){
                    const phone=document.getElementById('phone').value;
                    const res=await fetch('/api/locate?phone='+phone);
                    const data=await res.json();
                    document.getElementById('result').innerHTML=JSON.stringify(data,null,2);
                }
            </script>
        </body>
        </html>
    `);
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    log('INFO', `✅ Web server on port ${PORT}`);
});

discordClient.login(process.env.DISCORD_BOT_TOKEN).catch(e => {
    log('ERROR', 'Discord login failed:', e.message);
});

log('INFO', '🚀 Indian Phone Locator starting...');
