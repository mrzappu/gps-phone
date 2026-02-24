{
  "name": "phone-locator-bot",
  "version": "1.0.0",
  "description": "Complete phone number locator with Discord integration and Google Maps",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "build": "echo 'No build required'"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "express": "^4.18.2",
    "axios": "^1.6.2",
    "dotenv": "^16.3.1",
    "phonenumbers": "^1.0.2",
    "googlemaps": "^1.12.0",
    "@fastify/static": "^6.12.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
