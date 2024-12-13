const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const User = require('./models/user'); // Import the User model

dotenv.config(); // Load environment variables

const app = express();
app.use(bodyParser.json());

// MongoDB URI from environment variables
const mongoURI = process.env.MONGO_URI;

// Check if MONGO_URI is defined, otherwise terminate the server
if (!mongoURI) {
  console.error('MongoDB URI is not defined in the environment variables.');
  process.exit(1); // Stop the server if no URI is found
}

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1); // Exit the server if connection fails
});

// Health check endpoint
app.get('/health-check', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'not connected';
    res.json({ server: 'up', database: dbStatus });
  } catch (error) {
    console.error('Error during health check:', error);
    res.json({ server: 'down', database: 'not connected' });
  }
});

// Signup route
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email already in use");
    }

    // Create and save new user
    const user = new User({
      email,
      password,  // Password will be hashed automatically by pre-save hook
    });

    await user.save();
    res.status(201).send("User created successfully.");
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).send("Error creating user");
  }
});

// Define port for the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
