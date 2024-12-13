const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Initialize dotenv for environment variables
dotenv.config();

// Initialize app and middleware
const app = express();
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.log("Failed to connect to MongoDB", err);
});

// Define User model
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  password: String,
}));

// API: Signup
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).send("Email already in use");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hashedPassword,
  });

  await user.save();

  res.status(201).send("User created successfully.");
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
