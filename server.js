const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const signupRoute = require('./auth/signup'); // Import the signup route

dotenv.config(); // Load environment variables

const app = express();
app.use(bodyParser.json());

// Serve the HTML file for health check
app.use(express.static(path.join(__dirname, 'public')));

// Check if MONGO_URI is defined, otherwise terminate the server
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error('MongoDB URI is not defined in the environment variables.');
  process.exit(1); // Stop the server if no URI is found
}

console.log("MONGO_URI:", mongoURI); // Log the mongo URI to verify if it's loaded correctly

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1); // Exit if MongoDB connection fails
});

// Health check endpoint
app.get('/health-check', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'not connected';
    res.json({ server: 'up', database: dbStatus });
  } catch (error) {
    res.json({ server: 'down', database: 'not connected' });
  }
});

// Use the signup route
app.use('/signup', signupRoute); // Attach signup.js route to /signup path

// Define port for the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
