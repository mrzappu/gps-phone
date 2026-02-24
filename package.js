{
  "name": "phone-locator-bot",
  "version": "2.0.0",
  "description": "Advanced phone number locator with Discord integration and Google Maps",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1",
    "postinstall": "echo 'Installation complete. Don\\'t forget to set up your .env file!'"
  },
  "keywords": [
    "phone",
    "location",
    "discord",
    "bot",
    "google-maps",
    "osint",
    "tracking"
  ],
  "author": "Rebel Dev",
  "license": "MIT",
  "dependencies": {
    "discord.js": "^14.14.1",
    "express": "^4.18.2",
    "axios": "^1.6.2",
    "dotenv": "^16.3.1",
    "google-libphonenumber": "^3.2.34",
    "node-fetch": "^2.7.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/phone-locator-bot.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/phone-locator-bot/issues"
  },
  "homepage": "https://github.com/yourusername/phone-locator-bot#readme"
}
