const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Path to your User model
const { MailtrapClient } = require("mailtrap");

const router = express.Router();

// Mailtrap setup
const TOKEN = "f0f1e8442010950d2c90e4e048705a7b"; // Replace with your Mailtrap API token
const client = new MailtrapClient({ token: TOKEN });
const sender = {
  email: "hello@vesarecine.xyz", // Replace with your Mailtrap verified sender email
  name: "Your App Name", // Replace with your app name
};

// Signup route
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('Email already in use');
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate a 5-digit verification code
  const verificationCode = Math.floor(10000 + Math.random() * 90000); // 5-digit code

  // Create the user with a pending verification status
  const user = new User({
    name,
    email,
    password: hashedPassword,
    verificationCode, // Store the code in the database
    isVerified: false, // New field to track verification status
  });

  try {
    await user.save();

    // Send verification email
    const recipients = [{ email }];
    await client.send({
      from: sender,
      to: recipients,
      subject: "Verify your email address",
      text: `Welcome, ${name}! Your verification code is: ${verificationCode}`,
    });

    res.status(201).send('User created successfully. Please verify your email.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error. Please try again later.');
  }
});

// Email verification route
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  // Check if email and code are provided
  if (!email || !code) {
    return res.status(400).send('Email and verification code are required');
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if the code matches
    if (user.verificationCode === code) {
      user.isVerified = true; // Mark user as verified
      user.verificationCode = null; // Remove the code after verification
      await user.save();
      res.send('Email verified successfully.');
    } else {
      res.status(400).send('Invalid verification code.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error. Please try again later.');
  }
});

module.exports = router;
